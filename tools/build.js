// src/ と data/ から docs/ を生成する。実行: node tools/build.js
// 言語ごとに出力する(config.languages の先頭が既定言語でルート、ほかは /en/ など)。
// 翻訳がない問題はその言語では出さない。分野名・用語・UI文言は、翻訳がなければ既定言語で表示する。
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { validate } from './validate.js';
import { termMatcher, linkTerms, reportUrl } from '../src/js/util.js';
import { iconPng } from './icon.js';
import { figures, localizeFigure } from './figures.js';

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'docs');
const exists = p => fs.existsSync(path.join(root, p));
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const readJSON = p => JSON.parse(read(p));
const readOpt = (p, d) => (exists(p) ? readJSON(p) : d);
const write = (p, s) => {
  fs.mkdirSync(path.dirname(path.join(out, p)), { recursive: true });
  fs.writeFileSync(path.join(out, p), s);
};
const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const fill = (tpl, vars) => tpl.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? vars[k] : m));

// ---- 検査 ----
const { errors, warnings, translations } = validate();
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
translations.forEach(x => console.log(x));
warnings.forEach(w => console.log(`注意: ${w}`));

// ---- 読み込み ----
const config = readJSON('config.json');
const baseUrl = config.baseUrl.replace(/\/?$/, '/');
const base = new URL(baseUrl).pathname; // 例: /semicon-quiz/ または /
const langs = config.languages;
const defLang = langs[0].code;
const exams = readJSON('data/exams.json');
const categories = readJSON('data/categories.json');
const glossary = readJSON('data/glossary.json');
const figs = figures();
const layout = read('src/templates/layout.html');
const catTpl = read('src/templates/category.html');
const qTpl = read('src/templates/question.html');

const questions = {};
for (const c of categories) {
  const qs = readOpt(`data/questions/${c.id}.json`, []);
  questions[c.id] = qs.filter(q => q.reviewed || !config.onlyReviewed);
}

// modes/ のファイルを全部読み込む(ファイルを足せばモードが増える)
const modeDir = path.join(root, 'src/js/modes');
const modes = [];
for (const f of fs.readdirSync(modeDir).filter(f => f.endsWith('.js') && f !== 'index.js')) {
  const m = (await import(pathToFileURL(path.join(modeDir, f)))).default;
  modes.push({ ...m, file: f });
}
modes.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
// 言語コード → その言語で問題ページを作る問題IDの集合(既定言語はすべて、ほかは翻訳があるものだけ)
const hasQ = Object.fromEntries(langs.map(L => [L.code, new Set(categories.flatMap(c => L.code === langs[0].code
  ? questions[c.id].map(q => q.id)
  : Object.keys(readOpt(`data/i18n/${L.code}/questions/${c.id}.json`, {}))))]));
// 広告(AdSense)とアクセス解析(GA4)のタグ。config で未設定なら何も出さない
const adsenseTag = config.adsenseClient
  ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${esc(config.adsenseClient)}" crossorigin="anonymous"></script>`
  : '';
const ga4Tag = config.ga4Id
  ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${esc(config.ga4Id)}"></script>
<script>window.dataLayer = window.dataLayer || []; function gtag() { dataLayer.push(arguments); } gtag('js', new Date()); gtag('config', '${esc(config.ga4Id)}');</script>`
  : '';
const loc = (v, code) => (v && typeof v === 'object' ? v[code] ?? v[defLang] : v);

// ---- 出力先を作り直す ----
fs.rmSync(out, { recursive: true, force: true });
fs.cpSync(path.join(root, 'src/css'), path.join(out, 'css'), { recursive: true });
fs.cpSync(path.join(root, 'src/js'), path.join(out, 'js'), { recursive: true });
write('js/modes/index.js',
  modes.map((m, i) => `import m${i} from './${m.file}';`).join('\n') +
  `\nexport default [${modes.map((_, i) => `m${i}`).join(', ')}];\n`);

// ページの一覧: 言語ごとに src/pages/{言語}/*.html
const pageNames = code => (exists(`src/pages/${code}`) ? fs.readdirSync(path.join(root, `src/pages/${code}`)).filter(f => f.endsWith('.html')).map(f => f.slice(0, -5)) : []);
const pagePath = (L, name) => (name === 'index' ? L.path : `${L.path}${name}/`);

const sitemap = [];
for (const L of langs) buildLang(L);

function buildLang(L) {
  const code = L.code;
  const isDef = code === defLang;
  const S = { ...readJSON(`src/i18n/${defLang}.json`), ...readOpt(`src/i18n/${code}.json`, {}) };
  const t = (k, vars = {}) => (S[k] ?? k).replace(/\{(\w+)\}/g, (m, x) => (x in vars ? vars[x] : m));
  const tr = kind => (isDef ? {} : readOpt(`data/i18n/${code}/${kind}.json`, {}));
  const exT = tr('exams');
  const catT = tr('categories');
  const gloT = tr('glossary');
  const figT = tr('figures');
  const home = base + L.path;
  const siteName = loc(config.siteName, code);
  // モード名: 翻訳ファイルの mode_{id}_label などがあればそれを、なければモードのファイルに書いたものを使う
  const modeText = (m, k) => S[`mode_${m.id}_${k}`] ?? loc(m[k], code);

  const exName = e => exT[e.id]?.name ?? e.name;
  const grName = (e, g) => exT[e.id]?.groups?.[g.id] ?? g.name;
  const cats = categories.map(c => ({ ...c, ...(catT[c.id] || {}) }));
  const catOf = id => cats.find(c => c.id === id);
  const groupOf = c => {
    const e = exams.find(x => x.id === c.exam);
    return { exam: e, name: grName(e, e.groups.find(g => g.id === c.group)) };
  };

  // ---- データ ----
  const qs = {};
  for (const c of categories) {
    const tq = isDef ? {} : readOpt(`data/i18n/${code}/questions/${c.id}.json`, {});
    // choiceNotes は訳がある言語だけで表示する(既定言語の補足が混ざらないように)
    // 図(figure)は、この言語の文字にした SVG を figureSvg として渡す(訳が足りなければ出さない)
    qs[c.id] = questions[c.id].filter(q => isDef || tq[q.id]).map(({ reviewed, source, choiceNotes, figure, ...q }) => {
      const figureSvg = figure ? localizeFigure(figs[figure], figT[figure], isDef) : null;
      return { ...q, ...(isDef ? { choiceNotes } : {}), ...(tq[q.id] || {}), ...(figureSvg ? { figureSvg } : {}) };
    });
    write(`data/${code}/q/${c.id}.json`, JSON.stringify(qs[c.id]));
  }
  // 用語集。key(既定言語の用語名)を言語共通のアンカーIDにする
  const terms = glossary.map(g => ({ ...g, ...(gloT[g.term] || {}), key: g.term, reading: gloT[g.term] ? '' : g.reading }));
  const glossaryIndex = terms.map(g => ({ id: g.key, term: g.term }));
  const matcher = termMatcher(glossaryIndex);
  write(`data/${code}/index.json`, JSON.stringify({
    lang: code,
    locale: L.locale,
    siteName,
    strings: S,
    exams: exams.map(e => ({ id: e.id, name: exName(e), groups: e.groups.map(g => ({ id: g.id, name: grName(e, g) })) })),
    categories: cats.map(c => ({ id: c.id, exam: c.exam, group: c.group, name: c.name, count: qs[c.id].length })),
    glossary: glossaryIndex,
    modes: Object.fromEntries(modes.map(m => [m.id, { label: modeText(m, 'label'), empty: modeText(m, 'empty') ?? null }])),
    reportFormUrl: config.reportFormUrl ?? null,
  }));
  // PWA のマニフェスト(言語ごと。ホーム画面から開くとその言語のトップになる)
  write(`${L.path}manifest.json`, JSON.stringify({
    name: siteName,
    short_name: siteName,
    lang: L.htmlLang,
    start_url: home,
    scope: base,
    display: 'standalone',
    background_color: '#f5f8fb',
    theme_color: '#1d64c8',
    icons: [
      { src: `${base}icon-192.png`, sizes: '192x192', type: 'image/png' },
      { src: `${base}icon-512.png`, sizes: '512x512', type: 'image/png' },
      { src: `${base}icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }, null, 2));

  // ---- HTML部品 ----
  const quizUrl = (m, cat) => `${home}quiz/?mode=${m.id}${cat ? `&amp;c=${cat}` : ''}`;
  const catCards = list => '<ul class="cat-grid">' + list.map(c => `
  <li><a class="cat-card" href="${home}c/${c.id}/">
    <span class="cat-name">${esc(c.name)}</span>
    <span class="cat-meta"><span>${t('n_questions', { n: qs[c.id].length })}</span><span>${t('rate_label')} <b data-rate="${c.id}">—</b></span></span>
  </a></li>`).join('') + '</ul>';
  const modeCards = (list, cat) => '<div class="mode-grid">' + list.map((m, i) => `
  <a class="mode-card${i === 0 ? ' primary' : ''}" href="${quizUrl(m, cat)}" rel="nofollow">
    <strong>${esc(modeText(m, 'label'))}</strong><span>${esc(modeText(m, 'desc'))}</span>
  </a>`).join('') + '</div>';
  const categoryList = exams.map(e => `
<section class="exam">
  <h2>${esc(t('exam_heading', { exam: exName(e) }))}</h2>
  ${e.groups.map(g => `<h3 class="group-title">${esc(grName(e, g))}</h3>
  ${catCards(cats.filter(c => c.exam === e.id && c.group === g.id))}`).join('\n')}
</section>`).join('\n');

  terms.sort((a, b) => (isDef ? a.reading.localeCompare(b.reading, 'ja') : a.term.localeCompare(b.term, L.locale)));
  // 用語集は試験の区分 → 分野の順にまとめる(分野の中は読み順)。上に分野へのジャンプ用リンクを置く
  const termItem = g => `
    <div class="term" id="${esc(g.key)}">
      <dt>${esc(g.term)}${g.reading ? `<small>${esc(g.reading)}</small>` : ''}</dt>
      <dd>${esc(g.desc)}</dd>
    </div>`;
  const gloGroups = exams.flatMap(e => e.groups.map(g => ({
    name: grName(e, g),
    cats: cats.filter(c => c.exam === e.id && c.group === g.id)
      .map(c => ({ c, list: terms.filter(x => x.cat === c.id) })).filter(x => x.list.length),
  }))).filter(g => g.cats.length);
  const glossaryList = `<nav class="glossary-nav" aria-label="${esc(t('glossary_nav'))}">${gloGroups.map(g => `
  <p><b>${esc(g.name)}</b>${g.cats.map(({ c, list }) => ` <a class="chip" href="#cat-${c.id}">${esc(c.name)} <small>${list.length}</small></a>`).join('')}</p>`).join('')}
</nav>` + gloGroups.map(g => `
<section class="glossary-group">
  <h2>${esc(g.name)}</h2>${g.cats.map(({ c, list }) => `
  <section class="glossary-cat" id="cat-${c.id}">
    <h3>${esc(c.name)}<a href="${home}c/${c.id}/">${esc(t('glossary_to_quiz'))}</a></h3>
    <dl class="glossary">${list.map(termItem).join('')}
    </dl>
  </section>`).join('')}
</section>`).join('') + (terms.some(g => !catOf(g.cat)) ? `
<dl class="glossary">${terms.filter(g => !catOf(g.cat)).map(termItem).join('')}</dl>` : '');

  // 問題ページ用
  const mark = n => String.fromCharCode(65 + n);
  const short = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
  const qUrl = (cat, id, l = L) => `${l.path}q/${cat}/${id}/`;
  const linked = text => linkTerms(text, matcher).map(p => (typeof p === 'string' ? esc(p)
    : `<a class="term-link" href="${home}glossary/#${encodeURIComponent(p.id)}">${esc(p.text)}</a>`)).join('');
  const reportLink = id => (config.reportFormUrl
    ? `<p class="q-report"><a class="report-link" href="${esc(reportUrl(config.reportFormUrl, id, code))}" target="_blank" rel="noopener nofollow">${esc(t('report_error'))}</a></p>`
    : '');
  const qLinks = list => '<ol class="q-list">' + list.map(q => `
  <li${q.level ? ` data-level="${q.level}"` : ''}><a href="${base}${qUrl(q.cat, q.id)}">${esc(q.question)}</a></li>`).join('') + '</ol>';
  // 難易度の絞り込みボタン(level のある問題があるときだけ。動きは level.js)
  const levelFilter = list => (list.some(q => q.level) ? `<div class="level-filter" role="group">${
    ['', 1, 2, 3].map(lv => `<button type="button" class="chip" data-level-btn="${lv}"${lv ? '' : ' aria-pressed="true"'}>${esc(t(`level_${lv || 'all'}`))}</button>`).join('')}</div>` : '');
  const choiceNotes = q => (q.choiceNotes ? '<ul class="choice-notes">' + q.choiceNotes.map((note, k) =>
    (note ? `<li><b>${mark(k)}. </b>${esc(note)}</li>` : '')).join('') + '</ul>' : '');

  const common = {
    base, home, lang: code, htmlLang: L.htmlLang,
    siteName: esc(siteName),
    year: new Date().getFullYear(),
    contactFormUrl: esc(config.contactFormUrl),
    categoryList, glossaryList,
    topModes: modeCards(modes.filter(m => m.scope.includes('top'))),
    questionTotal: Object.values(qs).reduce((s, x) => s + x.length, 0),
    categoryTotal: categories.length,
    // プライバシーポリシーの「広告・アクセス解析」: 使っているサービスの説明だけを出す
    adsPolicy: [config.adsenseClient && S.policy_adsense, config.ga4Id && S.policy_ga4].filter(Boolean).map(x => `<p>${x}</p>`).join('\n')
      || `<p>${S.policy_none}</p>`,
    ...Object.fromEntries(Object.entries(S).map(([k, v]) => [`t_${k}`, v])),
  };

  // ---- ページ生成 ----
  // alt: 言語コード → その言語での同じページのパス(なければ省略)
  // fallback: 同じページがない言語へ切り替えるときの行き先(既定はその言語のトップ)
  function page({ path: p, alt, fallback = x => x.path, out: file, title, fullTitle, description, noindex, scripts = [], ads = true, content }) {
    const url = baseUrl + p;
    const tt = fullTitle || (title ? `${title} | ${siteName}` : siteName);
    const alts = langs.filter(x => alt[x.code] != null);
    const head = [
      noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${url}">`,
      ...(noindex ? [] : alts.map(x => `<link rel="alternate" hreflang="${x.htmlLang}" href="${baseUrl}${alt[x.code]}">`)),
      !noindex && alt[defLang] != null ? `<link rel="alternate" hreflang="x-default" href="${baseUrl}${alt[defLang]}">` : '',
      `<meta property="og:type" content="${p === L.path ? 'website' : 'article'}">`,
      `<meta property="og:title" content="${esc(tt)}">`,
      `<meta property="og:description" content="${esc(description)}">`,
      `<meta property="og:url" content="${url}">`,
      `<meta property="og:site_name" content="${esc(siteName)}">`,
      `<meta property="og:locale" content="${L.locale.replace('-', '_')}">`,
      '<meta name="twitter:card" content="summary">',
      `<link rel="manifest" href="${home}manifest.json">`,
      `<link rel="icon" href="${base}icon-192.png" type="image/png">`,
      `<link rel="apple-touch-icon" href="${base}icon-192.png">`,
      ads ? adsenseTag : '', // クイズ画面(ads:false)には広告を出さない
      ga4Tag,
    ].filter(Boolean).join('\n');
    const langLinks = langs.map(x => x.code === code
      ? `<span aria-current="true">${esc(x.label)}</span>`
      : alt[x.code] != null
        ? `<a href="${base}${alt[x.code]}" hreflang="${x.htmlLang}" lang="${x.htmlLang}">${esc(x.label)}</a>`
        : `<a href="${base}${fallback(x)}" lang="${x.htmlLang}">${esc(x.label)}</a>`).join('');
    if (ads) scripts = ['ads.js', ...scripts];
    write(file || `${p}index.html`, fill(layout, {
      ...common,
      title: esc(tt),
      description: esc(description),
      head,
      langLinks,
      htmlAttrs: ads && config.adPlaceholders && !config.adsenseClient ? ' data-ad-ph' : '',
      content,
      scripts: scripts.map(s => `<script type="module" src="${base}js/${s}"></script>`).join('\n'),
    }));
    if (!noindex) sitemap.push(url);
  }

  // src/pages/{言語}/*.html(ファイルを足せばページが増える)
  for (const name of pageNames(code)) {
    const src = read(`src/pages/${code}/${name}.html`);
    const m = src.match(/^<!--\s*(\{[\s\S]*?\})\s*-->/);
    const alt = Object.fromEntries(langs.filter(x => pageNames(x.code).includes(name)).map(x => [x.code, pagePath(x, name)]));
    page({ path: pagePath(L, name), alt, ...JSON.parse(m[1]), content: fill(src.slice(m[0].length), common) });
  }

  // 分野ページ /c/{id}/
  const catAlt = id => Object.fromEntries(langs.map(x => [x.code, `${x.path}c/${id}/`]));
  for (const c of cats) {
    const g = groupOf(c);
    const count = qs[c.id].length;
    const pqs = qs[c.id].map(q => ({ ...q, cat: c.id }));
    const filter = levelFilter(pqs);
    page({
      path: `${L.path}c/${c.id}/`,
      alt: catAlt(c.id),
      title: t('category_title', { name: c.name }),
      description: c.description,
      scripts: filter ? ['progress.js', 'level.js'] : ['progress.js'],
      content: fill(catTpl, {
        ...common,
        id: c.id,
        name: esc(c.name),
        description: esc(c.description),
        groupName: esc(g.name),
        count,
        keyPoints: esc(t('key_points', { name: c.name })),
        otherInGroup: esc(t('other_in_group', { group: g.name })),
        intro: c.intro.split('\n').map(p => `<p>${esc(p)}</p>`).join('\n'),
        modes: count ? filter + modeCards(modes.filter(m => m.scope.includes('category')), c.id) : `<p class="muted">${esc(t('preparing'))}</p>`,
        siblings: catCards(cats.filter(x => x.exam === c.exam && x.group === c.group && x.id !== c.id)),
        questionList: pqs.length ? `<section>
  <h2>${esc(t('question_list', { name: c.name, n: pqs.length }))}</h2>
  ${qLinks(pqs)}
</section>` : '',
      }),
    });

    // 問題ページ /q/{分野ID}/{問題ID}/
    const solve = modes.find(m => m.id === 'category');
    pqs.forEach((q, n) => {
      // 関連問題: 同じ分野で後ろに続く5問(末尾の次は先頭)
      const related = [...new Set([1, 2, 3, 4, 5].map(k => pqs[(n + k) % pqs.length]))].filter(r => r !== q);
      page({
        path: qUrl(c.id, q.id),
        alt: Object.fromEntries(langs.filter(x => hasQ[x.code].has(q.id)).map(x => [x.code, qUrl(c.id, q.id, x)])),
        fallback: x => `${x.path}c/${c.id}/`,
        title: t('question_title', { name: c.name, q: short(q.question, 50) }),
        description: short(q.question, 150),
        content: fill(qTpl, {
          ...common,
          catUrl: `${home}c/${c.id}/`,
          catName: esc(c.name),
          groupName: esc(g.name),
          question: esc(q.question),
          choices: q.choices.map((ch, k) => `<li><span class="choice-mark">${mark(k)}</span><span class="choice-text">${esc(ch)}</span></li>`).join('\n'),
          answerIs: esc(t('answer_is', { mark: mark(q.answer), text: q.choices[q.answer] })),
          explanation: linked(q.explanation),
          figure: q.figureSvg ? `<figure class="fig">${q.figureSvg}</figure>` : '',
          choiceNotes: choiceNotes(q),
          report: reportLink(q.id),
          solveUrl: quizUrl(solve, c.id),
          solveLabel: esc(modeText(solve, 'label')),
          toCategory: esc(t('to_category')),
          related: related.length ? `<h2>${esc(t('related_questions', { name: c.name }))}</h2>\n${qLinks(related)}` : '',
        }),
      });
    });
  }
}

// ---- sitemap / robots / その他 ----
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemap.map(u => `  <url><loc>${u}</loc></url>`).join('\n')}
</urlset>
`);
write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${baseUrl}sitemap.xml\n`);
write('.nojekyll', '');
if (config.cname) write('CNAME', config.cname + '\n');
// AdSense の販売者情報(adsenseClient が ca-pub-XXXX のとき pub-XXXX を書く)
if (config.adsenseClient) write('ads.txt', `google.com, ${config.adsenseClient.replace(/^ca-/, '')}, DIRECT, f08c47fec0942fa0\n`);

// ---- PWA: アイコンと Service Worker ----
for (const size of [192, 512]) write(`icon-${size}.png`, iconPng(size));
// 最初に保存しておくファイル: 各言語のトップ・クイズ・成績のページと問題データ、JS・CSS・アイコン
const files = dir => fs.readdirSync(path.join(out, dir), { recursive: true }).map(f => `${dir}/${f.replaceAll('\\', '/')}`)
  .filter(f => fs.statSync(path.join(out, f)).isFile());
const precache = [
  ...langs.flatMap(L => [L.path, `${L.path}quiz/`, `${L.path}stats/`, `${L.path}manifest.json`, ...files(`data/${L.code}`)]),
  ...files('js'), ...files('css'), 'icon-192.png', 'icon-512.png',
];
// 中身が変わったら版も変わり、古いキャッシュは消える
const hash = crypto.createHash('sha1');
for (const f of precache) hash.update(fs.readFileSync(path.join(out, f.endsWith('/') || !f ? `${f}index.html` : f)));
write('sw.js', fill(read('src/templates/sw.js'), {
  version: hash.digest('hex').slice(0, 10),
  base: JSON.stringify(base),
  precache: JSON.stringify(precache.map(f => base + f), null, 2),
}));

const total = Object.values(questions).reduce((s, x) => s + x.length, 0);
console.log(`build完了: ${langs.length}言語, ${sitemap.length} ページ（sitemap掲載）, 問題 ${total} 問 → docs/`);
