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
// 検索エンジンに既定として伝える言語(x-default)。ほかの言語のページには、この言語版への案内を出す
const mainLang = config.mainLang ?? defLang;
const mainL = langs.find(x => x.code === mainLang);
const mainS = { ...readJSON(`src/i18n/${defLang}.json`), ...readOpt(`src/i18n/${mainLang}.json`, {}) };
const exams = readJSON('data/exams.json');
const categories = readJSON('data/categories.json');
const glossary = readJSON('data/glossary.json');
// 用語ページのURL(/term/{slug}/)。英語の用語名から作る(glossary.json の slug で上書きできる)
const gloEn = readOpt('data/i18n/en/glossary.json', {});
const termSlug = Object.fromEntries(glossary.map(g => [g.term, g.slug
  ?? (gloEn[g.term]?.term ?? g.term).toLowerCase().replace(/\(.*?\)/g, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')]));
const courses = readOpt('data/courses.json', []);
const lastmodPrev = readOpt('data/lastmod.json', {}); // 前回までの更新日(構造化データの dateModified に使う)
const compares = readOpt('data/compare.json', []); // 用語の違い比較ページ(/compare/{slug}/)。英語などの訳は data/i18n/{言語}/compare.json
const figs = figures();
// 図を単独のSVGファイルとして出す(画像検索用)ときのスタイル。サイトのCSSの色と、`.fig` の規則から作る
const siteCss = read('src/css/style.css');
const cssVars = block => [...block.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(m => `${m[1]}:${m[2].trim()}`).join(';');
const figStyle = `:root{${cssVars(siteCss.match(/:root \{([\s\S]*?)\n\}/)[1])}}`
  + `@media (prefers-color-scheme: dark){:root{${cssVars(siteCss.match(/prefers-color-scheme: dark\) \{\s*:root \{([\s\S]*?)\n  \}/)[1])}}}`
  + 'text{font-family:system-ui,-apple-system,"Segoe UI","Hiragino Sans","Noto Sans JP",sans-serif}'
  + siteCss.split('\n').filter(l => /^\.fig [^{]+\{/.test(l) && !/^\.fig svg/.test(l)).map(l => l.replace(/^\.fig /, '').replace(/font-family:\s*inherit;?/, '')).join('');
const xmlText = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const figTitle = svg => xmlText((svg.match(/<title>([^<]*)<\/title>/) || [, ''])[1]);
const figSize = svg => (svg.match(/viewBox="[\d.]+ [\d.]+ ([\d.]+) ([\d.]+)"/) || [, 600, 300]).slice(1).map(Number);
// 単独で開いても色が付き(ダークモードにも対応)、背景もあるSVGにする
function standaloneSvg(svg) {
  const [w, h] = figSize(svg);
  return svg.replace(/^(<svg[^>]*>)/, `$1<style>${figStyle}</style><rect width="${w}" height="${h}" style="fill:var(--surface)"/>`);
}
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
      return { ...q, ...(isDef ? { choiceNotes } : {}), ...(tq[q.id] || {}), ...(figureSvg ? { figureSvg, figureId: figure } : {}) };
    });
    write(`data/${code}/q/${c.id}.json`, JSON.stringify(qs[c.id]));
  }
  // 問題がまだない分野(準備中)は、一覧・コース・分野数から外す。分野ページだけは「準備中」で作る(noindex)
  const live = cats.filter(c => qs[c.id].length);
  // 用語集。key(既定言語の用語名)を言語共通のアンカーIDにする
  const terms = glossary.map(g => ({ ...g, ...(gloT[g.term] || {}), key: g.term, reading: gloT[g.term] ? '' : g.reading }));
  const glossaryIndex = terms.map(g => ({ id: g.key, term: g.term, slug: termSlug[g.key] }));
  const matcher = termMatcher(glossaryIndex);
  write(`data/${code}/index.json`, JSON.stringify({
    lang: code,
    locale: L.locale,
    siteName,
    strings: S,
    exams: exams.map(e => ({ id: e.id, name: exName(e), groups: e.groups.map(g => ({ id: g.id, name: grName(e, g) })) })),
    categories: live.map(c => ({ id: c.id, exam: c.exam, group: c.group, name: c.name, count: qs[c.id].length })),
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
  ${e.groups.map(g => ({ g, list: live.filter(c => c.exam === e.id && c.group === g.id) })).filter(x => x.list.length)
    .map(({ g, list }) => `<h3 class="group-title">${esc(grName(e, g))}</h3>
  ${catCards(list)}`).join('\n')}
</section>`).join('\n');

  terms.sort((a, b) => (isDef ? a.reading.localeCompare(b.reading, 'ja') : a.term.localeCompare(b.term, L.locale)));
  // 用語集は試験の区分 → 分野の順にまとめる(分野の中は読み順)。上に分野へのジャンプ用リンクを置く
  const termItem = g => `
    <div class="term" id="${esc(g.key)}">
      <dt><a href="${home}term/${termSlug[g.key]}/">${esc(g.term)}</a>${g.reading ? `<small>${esc(g.reading)}</small>` : ''}</dt>
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
    : `<a class="term-link" href="${home}term/${termSlug[p.id]}/">${esc(p.text)}</a>`)).join('');
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

  // 学習コース: トップの一覧と /course/{id}/ のページ(進み具合の表示は course.js)
  // コースの分野のうち、問題がまだない分野は準備ができるまで外す
  const liveCourses = courses.map(co => ({ ...co, steps: co.steps.filter(id => qs[id]?.length) })).filter(co => co.steps.length);
  const courseList = liveCourses.length ? `<section id="courses">
  <h2>${esc(t('course_heading'))}</h2>
  <p class="muted">${esc(t('course_lead'))}</p>
  <div class="course-grid">${liveCourses.map(co => `
  <a class="course-card" href="${home}course/${co.id}/" data-course-card="${co.steps.map(id => `${id}:${qs[id].length}`).join(' ')}">
    <strong>${esc(loc(co.name, code))}</strong>
    <span>${esc(loc(co.desc, code))}</span>
    <span class="course-meta"><span>${esc(t('course_steps_n', { n: co.steps.length }))}</span><b data-course-done></b></span>
    <span class="meter"><span class="meter-bar" style="width:0%"></span></span>
  </a>`).join('')}
  </div>
</section>` : '';

  // ---- 用語の違い比較 ----
  const cmpT = tr('compare');
  const cmp = compares.filter(e => isDef || cmpT[e.slug]).map(e => ({ ...e, ...(isDef ? {} : cmpT[e.slug]) }));
  const qById = new Map(categories.flatMap(c => qs[c.id].map(q => [q.id, { ...q, cat: c.id }])));
  const abs = x => new URL(x, baseUrl).href;
  const cmpUrl = e => `${home}compare/${e.slug}/`;
  for (const e of cmp) {
    const where = `data/compare.json「${e.slug}」`;
    if (!e.rows.length || e.rows.some(r => r.length !== e.items.length + 1)) throw new Error(`${where}(${code}): rows の列数が items と合っていません`);
    for (const k of e.terms ?? []) if (!glossary.some(g => g.term === k)) throw new Error(`${where}: 用語集にない語 ${k}`);
    for (const id of e.questions ?? []) if (isDef && !qById.has(id)) throw new Error(`${where}: 存在しない問題 ${id}`);
    if (!catOf(e.cat)) throw new Error(`${where}: 存在しない分野 ${e.cat}`);
    if ((e.faq ?? []).some(f => !Array.isArray(f) || f.length !== 2 || f.some(x => typeof x !== 'string'))) throw new Error(`${where}(${code}): faq は [質問, 答え] の配列にしてください`);
  }
  const cmpCards = list => '<ul class="cmp-list">' + list.map(e => `
  <li><a class="cmp-card" href="${cmpUrl(e)}"><strong>${esc(e.title)}</strong><span>${esc(short(e.description, 110))}</span></a></li>`).join('') + '</ul>';
  // 比較の一覧(用語集と同じ作り): 区分 → 分野の順にまとめる
  const cmpGroups = exams.flatMap(e => e.groups.map(g => ({
    name: grName(e, g),
    cats: cats.filter(c => c.exam === e.id && c.group === g.id)
      .map(c => ({ c, list: cmp.filter(x => x.cat === c.id) })).filter(x => x.list.length),
  }))).filter(g => g.cats.length);
  const cmpItem = e => `
    <div class="term" id="cmp-${esc(e.slug)}">
      <dt><a href="${cmpUrl(e)}">${esc(e.title)}</a></dt>
      <dd>${esc(e.description)}</dd>
    </div>`;
  const compareIndex = `<nav class="glossary-nav" aria-label="${esc(t('glossary_nav'))}">${cmpGroups.map(g => `
  <p><b>${esc(g.name)}</b>${g.cats.map(({ c, list }) => ` <a class="chip" href="#cat-${c.id}">${esc(c.name)} <small>${list.length}</small></a>`).join('')}</p>`).join('')}
</nav>` + cmpGroups.map(g => `
<section class="glossary-group">
  <h2>${esc(g.name)}</h2>${g.cats.map(({ c, list }) => `
  <section class="glossary-cat" id="cat-${c.id}">
    <h3>${esc(c.name)}<a href="${home}c/${c.id}/">${esc(t('glossary_to_quiz'))}</a></h3>
    <dl class="glossary">${list.map(cmpItem).join('')}
    </dl>
  </section>`).join('')}
</section>`).join('');
  const cmpSection = (heading, list) => (list.length ? `<section>
  <h2>${esc(heading)}</h2>
  ${cmpCards(list)}
</section>` : '');

  // ---- 参考書(Amazonアソシエイト): 分野ページに検索リンクを出す。config.amazonTag に言語がなければ出さない ----
  const amazonTag = config.amazonTag?.[code];
  const amazonHost = config.amazonDomain?.[code] || 'www.amazon.co.jp';
  const booksData = isDef ? readOpt('data/books.json', {}) : readOpt(`data/i18n/${code}/books.json`, {});
  const bookSection = c => {
    if (!amazonTag) return '';
    const kws = booksData[c.id] || [`${t('books_fallback')} ${c.name.replace(/[(（].*?[)）]/g, '')}`];
    const links = kws.map(kw => `<li><a href="https://${amazonHost}/s?k=${encodeURIComponent(kw)}&amp;tag=${esc(amazonTag)}" target="_blank" rel="sponsored nofollow noopener">${esc(t('books_link', { kw }))}</a></li>`).join('');
    return `<section class="books">
  <h2>${esc(t('books_heading', { name: c.name }))} <small class="pr-badge">${esc(t('books_pr'))}</small></h2>
  <ul>${links}</ul>
  <p class="muted">${esc(t('books_note'))}</p>
</section>`;
  };

  // ---- 図解集(/figures/)と、問題・用語ページの図 ----
  const figList = Object.keys(figs).map(id => ({ id, svg: localizeFigure(figs[id], figT[id], isDef) })).filter(x => x.svg)
    .map(x => ({ ...x, title: figTitle(x.svg), size: figSize(x.svg) }));
  const figUse = {}; // 図ID → その図を使う問題(この言語で出せるもの)
  for (const c of categories) for (const q of questions[c.id]) {
    if (q.figure && qById.has(q.id)) (figUse[q.figure] = figUse[q.figure] || []).push(qById.get(q.id));
  }
  figList.sort((a, b) => (categories.findIndex(c => c.id === figUse[a.id]?.[0]?.cat) + 1 || 999) - (categories.findIndex(c => c.id === figUse[b.id]?.[0]?.cat) + 1 || 999));
  for (const x of figList) write(`img/${code}/${x.id}.svg`, standaloneSvg(x.svg));
  const figureHtml = (svg, id) => `<figure class="fig">${svg}<figcaption class="fig-cap">${esc(figTitle(svg))} · <a href="${home}figures/#fig-${id}">${esc(t('figure_open'))}</a></figcaption></figure>`;
  const figureGallery = `<div class="fig-grid">${figList.map(x => `
  <figure class="fig-item" id="fig-${x.id}">
    <img src="${base}img/${code}/${x.id}.svg" alt="${esc(x.title)}" width="${x.size[0]}" height="${x.size[1]}" loading="lazy">
    <figcaption><strong>${esc(x.title)}</strong>${figUse[x.id]?.length ? `<span class="muted">${esc(t('figure_used_in'))}: ${figUse[x.id].slice(0, 2).map(q => `<a href="${base}${qUrl(q.cat, q.id)}">${esc(short(q.question, 48))}</a>`).join(' / ')}</span>` : ''}</figcaption>
  </figure>`).join('')}
</div>`;
  const figureLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': figList.map(x => ({ '@type': 'ImageObject', contentUrl: abs(`${base}img/${code}/${x.id}.svg`), name: x.title, caption: x.title, inLanguage: L.htmlLang })),
  }).replace(/</g, '\\u003c');

  // ---- サイト内検索の索引(検索ページが最初に読み込む。動きは search.js) ----
  const searchItems = [
    ...cmp.map(e => ({ t: 'c', n: e.title, u: `compare/${e.slug}/`, x: `${e.description} ${e.items.join(' ')}` })),
    ...terms.map(g => ({ t: 't', n: g.term, u: `term/${termSlug[g.key]}/`, x: `${g.desc} ${isDef ? '' : g.key}` })),
    ...live.map(c => ({ t: 'k', n: c.name, u: `c/${c.id}/`, x: c.description })),
    ...figList.map(x => ({ t: 'f', n: x.title, u: `figures/#fig-${x.id}`, x: '' })),
    ...live.flatMap(c => qs[c.id].map(q => ({ t: 'q', n: q.question, u: `q/${c.id}/${q.id}/`, x: c.name }))),
  ];
  write(`data/${code}/search.json`, JSON.stringify({
    strings: Object.fromEntries(['search_none', 'search_hint', 'search_more', 'search_count', 'search_g_c', 'search_g_t', 'search_g_k', 'search_g_f', 'search_g_q'].map(k => [k, S[k]])),
    items: searchItems,
  }));

  // 比較ページの「関連する比較」: 共通の用語・同じ分野・同じ区分の近いものを選ぶ
  const relatedCmp = e => {
    const grp = x => catOf(x.cat)?.group;
    return cmp.filter(x => x !== e)
      .map(x => ({ x, s: 2 * (x.terms ?? []).filter(k => (e.terms ?? []).includes(k)).length + (x.cat === e.cat ? 4 : 0) + (grp(x) === grp(e) ? 1 : 0) }))
      .sort((a, b) => b.s - a.s).slice(0, 6).map(r => r.x);
  };

  const common = {
    base, home, lang: code, htmlLang: L.htmlLang,
    siteName: esc(siteName),
    year: new Date().getFullYear(),
    contactFormUrl: esc(loc(config.contactFormUrl, code)),
    categoryList, glossaryList, courseList, compareIndex, figureGallery, figureLd,
    topModes: modeCards(modes.filter(m => m.scope.includes('top'))),
    questionTotal: Object.values(qs).reduce((s, x) => s + x.length, 0),
    categoryTotal: live.length,
    // プライバシーポリシーの「広告・アクセス解析」: 使っているサービスの説明だけを出す
    adsPolicy: [config.adsenseClient && S.policy_adsense, S.policy_affiliate, config.ga4Id && S.policy_ga4].filter(Boolean).map(x => `<p>${x}</p>`).join('\n')
      || `<p>${S.policy_none}</p>`,
    ...Object.fromEntries(Object.entries(S).map(([k, v]) => [`t_${k}`, v])),
  };

  // ---- ページ生成 ----
  // alt: 言語コード → その言語での同じページのパス(なければ省略)
  // fallback: 同じページがない言語へ切り替えるときの行き先(既定はその言語のトップ)
  function page({ path: p, alt, fallback = x => x.path, out: file, title, fullTitle, description, noindex, scripts = [], ads = true, langBanner = true, jsonld = null, content }) {
    const url = baseUrl + p;
    const tt = fullTitle || (title ? `${title} | ${siteName}` : siteName);
    const alts = langs.filter(x => alt[x.code] != null);
    const head = [
      noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${url}">`,
      ...(noindex ? [] : alts.map(x => `<link rel="alternate" hreflang="${x.htmlLang}" href="${baseUrl}${alt[x.code]}">`)),
      !noindex && alt[mainLang] != null ? `<link rel="alternate" hreflang="x-default" href="${baseUrl}${alt[mainLang]}">` : '',
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
      jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, '\\u003c')}</script>` : '',
      ads ? adsenseTag : '', // クイズ画面(ads:false)には広告を出さない
      ga4Tag,
    ].filter(Boolean).join('\n');
    const langLinks = langs.map(x => x.code === code
      ? `<span aria-current="true">${esc(x.label)}</span>`
      : alt[x.code] != null
        ? `<a href="${base}${alt[x.code]}" hreflang="${x.htmlLang}" lang="${x.htmlLang}">${esc(x.label)}</a>`
        : `<a href="${base}${fallback(x)}" lang="${x.htmlLang}">${esc(x.label)}</a>`).join('');
    // ヘッダーのナビ(いまいるページには aria-current を付ける)
    const headerNav = [['', S.nav_home], ['stats/', S.nav_stats], ['glossary/', S.nav_glossary], ...(cmp.length ? [['compare/', S.nav_compare]] : []), ['contact/', S.nav_contact]]
      .map(([sub, label]) => `<a href="${home}${sub}"${p === L.path + sub ? ' aria-current="page"' : ''}>${esc(label)}</a>`).join('');
    // 既定言語以外のページ: ブラウザの言語がこのページの言語でない人に、既定言語版への案内を出す(閉じたら以後出さない)
    const mainHref = langBanner && code !== mainLang ? base + (alt[mainLang] ?? fallback(mainL)) : null;
    const bannerHtml = mainHref ? `<div class="lang-banner" lang="${mainL.htmlLang}" hidden><div class="wrap"><a href="${mainHref}" hreflang="${mainL.htmlLang}">${esc(mainS.lang_banner)}</a><button type="button" aria-label="${esc(mainS.lang_banner_close)}">×</button></div></div>
<script>(() => { const b = document.currentScript.previousElementSibling, k = 'langBannerClosed', l = document.documentElement.lang; let c; try { c = localStorage.getItem(k); } catch {} if (c || (navigator.languages || [navigator.language]).some(x => x && x.toLowerCase().startsWith(l))) return; b.hidden = false; b.querySelector('button').onclick = () => { b.hidden = true; try { localStorage.setItem(k, '1'); } catch {} }; })();</script>` : '';
    if (ads) scripts = ['ads.js', ...scripts];
    write(file || `${p}index.html`, fill(layout, {
      ...common,
      title: esc(tt),
      description: esc(description),
      head,
      langLinks,
      headerNav,
      langBanner: bannerHtml,
      htmlAttrs: ads && config.adPlaceholders && !config.adsenseClient ? ' data-ad-ph' : ads && config.adsenseClient && config.adsenseSlots ? ` data-adsense-client="${esc(config.adsenseClient)}" data-adsense-slots="${esc(JSON.stringify(config.adsenseSlots))}"` : '',
      content,
      scripts: scripts.map(s => `<script type="module" src="${base}js/${s}"></script>`).join('\n'),
    }));
    // 更新日の判定用に、本文(タイトル・説明・内容)のハッシュを残す。ヘッダーなど全ページ共通の部分は含めない
    if (!noindex) sitemap.push({ url, hash: crypto.createHash('sha1').update(tt + description + content).digest('hex').slice(0, 16) });
  }

  // src/pages/{言語}/*.html(ファイルを足せばページが増える)
  for (const name of pageNames(code)) {
    const src = read(`src/pages/${code}/${name}.html`);
    const m = src.match(/^<!--\s*(\{[\s\S]*?\})\s*-->/);
    const alt = Object.fromEntries(langs.filter(x => pageNames(x.code).includes(name)).map(x => [x.code, pagePath(x, name)]));
    page({ path: pagePath(L, name), alt, ...JSON.parse(fill(m[1], common)), content: fill(src.slice(m[0].length), common) });
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
      noindex: !count,
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
        siblings: catCards(live.filter(x => x.exam === c.exam && x.group === c.group && x.id !== c.id)),
        compareLinks: cmpSection(t('compare_in_cat'), cmp.filter(e => e.cat === c.id)),
        books: bookSection(c),
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
          code: q.code ? `<pre class="q-code" data-lang="${esc(q.codeLang ?? '')}"><code>${esc(q.code)}</code></pre>` : '',
          choices: q.choices.map((ch, k) => `<li><span class="choice-mark">${mark(k)}</span><span class="choice-text">${esc(ch)}</span></li>`).join('\n'),
          answerIs: esc(t('answer_is', { mark: mark(q.answer), text: q.choices[q.answer] })),
          explanation: linked(q.explanation),
          figure: q.figureSvg ? figureHtml(q.figureSvg, q.figureId) : '',
          choiceNotes: choiceNotes(q),
          report: reportLink(q.id),
          solveUrl: quizUrl(solve, c.id),
          solveLabel: esc(modeText(solve, 'label')),
          toCategory: esc(t('to_category')),
          nextQ: pqs.length > 1 ? `<nav class="q-nav"><a class="btn btn-ghost" href="${base}${qUrl(c.id, pqs[(n + pqs.length - 1) % pqs.length].id)}" rel="prev">${esc(t('q_prev'))}</a><a class="btn btn-primary" href="${base}${qUrl(c.id, pqs[(n + 1) % pqs.length].id)}" rel="next">${esc(t('q_next'))}</a></nav>` : '',
          compareLinks: cmpSection(t('compare_in_cat'), cmp.filter(e => e.cat === c.id).slice(0, 3)),
          books: bookSection(c),
          related: related.length ? `<h2>${esc(t('related_questions', { name: c.name }))}</h2>\n${qLinks(related)}` : '',
        }),
      });
    });
  }

  // 学習コースのページ /course/{id}/
  const solveMode = modes.find(m => m.id === 'category');
  for (const co of liveCourses) {
    const name = loc(co.name, code);
    page({
      path: `${L.path}course/${co.id}/`,
      alt: Object.fromEntries(langs.map(x => [x.code, `${x.path}course/${co.id}/`])),
      title: t('course_title', { name }),
      description: loc(co.desc, code),
      scripts: ['course.js'],
      content: `<nav class="breadcrumb"><a href="${home}">${esc(t('breadcrumb_top'))}</a> <span>›</span> <a href="${home}#courses">${esc(t('course_heading'))}</a></nav>
<h1>${esc(name)}</h1>
<p class="lead">${esc(loc(co.desc, code))}</p>
<div class="course-progress" data-course-progress="${esc(t('course_progress'))}">
  <p class="course-progress-text"></p>
  <span class="meter"><span class="meter-bar" style="width:0%"></span></span>
</div>
<div class="course-next" hidden data-solve="${home}quiz/?mode=${solveMode.id}&c=" data-all-done="${esc(t('course_all_done'))}">
  <p class="course-next-label">${esc(t('course_next'))}</p>
  <p class="course-next-name"></p>
  <p><a class="btn btn-primary" href="#">${esc(modeText(solveMode, 'label'))}</a></p>
</div>
<ol class="course-steps" data-done-label="${esc(t('course_step_done'))}">${co.steps.map(id => catOf(id)).map(c => `
  <li class="course-step" data-cat="${c.id}" data-count="${qs[c.id].length}">
    <a href="${home}c/${c.id}/"><span class="step-name">${esc(c.name)}</span><span class="step-status"></span></a>
    <span class="step-meta">${t('n_questions', { n: qs[c.id].length })} · ${esc(t('rate_label'))} <b data-rate="${c.id}">—</b> · ${esc(t('answered_label'))} <span data-answered="${c.id}">0</span></span>
  </li>`).join('')}
</ol>
<p class="muted">${esc(t('course_rule'))}</p>`,
    });
  }

  const miniQ = q => `
  <article class="q-mini">
    <h3><a href="${base}${qUrl(q.cat, q.id)}">${esc(q.question)}</a></h3>
    <ol class="q-choices">${q.choices.map((ch, k) => `<li><span class="choice-mark">${mark(k)}</span><span class="choice-text">${esc(ch)}</span></li>`).join('')}</ol>
    <details class="q-answer"><summary>${esc(t('answer_toggle'))}</summary><p class="verdict ok">${esc(t('answer_is', { mark: mark(q.answer), text: q.choices[q.answer] }))}</p><p class="explanation">${linked(q.explanation)}</p></details>
  </article>`;

  // 比較ページ /compare/ と /compare/{slug}/
  const cmpLangs = slug => langs.filter(x => x.code === defLang || readOpt(`data/i18n/${x.code}/compare.json`, {})[slug]);
  if (cmp.length) {
    const crumbs = (...items) => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: items.map(([name, url], i) => ({ '@type': 'ListItem', position: i + 1, name, item: abs(url) })) });
    const topCrumb = [t('breadcrumb_top'), home];
    const idxCrumb = [t('breadcrumb_compare'), `${home}compare/`];
    for (const e of cmp) {
      const c = catOf(e.cat);
      const quiz = (e.questions ?? []).map(id => qById.get(id)).filter(Boolean);
      const keyTerms = (e.terms ?? []).map(k => terms.find(x => x.key === k)).filter(Boolean);
      const faq = e.faq ?? [];
      const mini = quiz.filter(q => !q.code).slice(0, 3);
      const modified = lastmodPrev[`${L.path}compare/${e.slug}/`]?.date ?? new Date().toLocaleDateString('sv-SE');
      page({
        path: `${L.path}compare/${e.slug}/`,
        alt: Object.fromEntries(cmpLangs(e.slug).map(x => [x.code, `${x.path}compare/${e.slug}/`])),
        fallback: x => `${x.path}compare/`,
        title: e.title,
        description: e.description,
        scripts: ['compare.js'],
        jsonld: [
          crumbs(topCrumb, idxCrumb, [e.title, cmpUrl(e)]),
          { '@context': 'https://schema.org', '@type': 'Article', headline: e.title, description: e.description, inLanguage: L.htmlLang, dateModified: modified,
            mainEntityOfPage: abs(cmpUrl(e)), author: { '@type': 'Organization', name: siteName }, publisher: { '@type': 'Organization', name: siteName } },
          ...(faq.length ? [{ '@context': 'https://schema.org', '@type': 'FAQPage',
            mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }] : []),
        ],
        content: `<nav class="breadcrumb"><a href="${home}">${esc(t('breadcrumb_top'))}</a> <span>›</span> <a href="${home}compare/">${esc(t('breadcrumb_compare'))}</a></nav>
<article class="compare-page">
  <h1>${esc(e.title)}</h1>
  <p class="lead">${esc(e.lead)}</p>
  <div class="cmp-tools">
    <button type="button" class="btn btn-ghost" data-copy-table data-done="${esc(t('compare_copied'))}">${esc(t('compare_copy'))}</button>
    <button type="button" class="btn btn-ghost" data-share data-done="${esc(t('compare_link_copied'))}">${esc(t('compare_share'))}</button>
  </div>
  <div class="table-wrap">
    <table class="compare">
      <thead><tr><th scope="col">${esc(t('compare_aspect'))}</th>${e.items.map(x => `<th scope="col">${esc(x)}</th>`).join('')}</tr></thead>
      <tbody>${e.rows.map(([label, ...cells]) => `
        <tr><th scope="row">${esc(label)}</th>${cells.map(x => `<td>${esc(x)}</td>`).join('')}</tr>`).join('')}
      </tbody>
    </table>
  </div>
  <p class="muted compare-note">${esc(t('compare_note'))}</p>
</article>
<div data-ad="compare"></div>
<section>
  <h2>${esc(t('compare_when'))}</h2>
  <dl class="compare-when">${e.when.map(([k, v]) => `
    <dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}
  </dl>
</section>
${faq.length ? `<section class="faq">
  <h2>${esc(t('compare_faq'))}</h2>${faq.map(([q, a]) => `
  <h3>${esc(q)}</h3>
  <p>${esc(a)}</p>`).join('')}
</section>` : ''}
${quiz.length ? `<section>
  <h2>${esc(t('compare_quiz'))}</h2>${mini.map(miniQ).join('')}
  ${quiz.length > mini.length ? qLinks(quiz.filter(q => !mini.includes(q))) : ''}
  <p><a class="btn btn-primary" href="${home}c/${c.id}/">${esc(t('compare_to_category', { name: c.name }))}</a></p>
</section>` : ''}
${keyTerms.length ? `<section>
  <h2>${esc(t('compare_terms'))}</h2>
  <dl class="glossary">${keyTerms.map(x => `
    <div class="term"><dt><a href="${home}term/${termSlug[x.key]}/">${esc(x.term)}</a></dt><dd>${esc(x.desc)}</dd></div>`).join('')}
  </dl>
</section>` : ''}
${cmpSection(t('compare_more'), relatedCmp(e))}`,
      });
    }
  }

  // 用語ページ /term/{slug}/ : 定義、その用語が出てくる問題(問題文・解説の自動リンクから逆引き)、関連する用語
  const termIds = text => linkTerms(text, matcher).filter(x => typeof x !== 'string').map(x => x.id);
  const termQs = new Map(terms.map(g => [g.key, []]));
  for (const c of cats) for (const q of qs[c.id]) {
    const inQ = new Set(termIds(q.question));
    const ids = new Set([...inQ, ...termIds(q.explanation)]);
    for (const id of ids) termQs.get(id).push({ ...q, cat: c.id, ids, inQ: inQ.has(id) });
  }
  for (const g of terms) {
    // 問題文に用語が出てくる問題を先に並べる
    const list = termQs.get(g.key).sort((a, b) => b.inQ - a.inQ);
    const fig = list.find(q => q.inQ && q.figureSvg);
    // 解説からの抜き出し: 用語を含む最初の文(最大3問ぶん)
    const quotes = list.map(q => ({ q, s: q.explanation.split(/(?<=。)|(?<=[.!?])\s+/).map(x => x.trim()).find(x => termIds(x).includes(g.key)) }))
      .filter(x => x.s).slice(0, 5);
    // 関連する用語: 同じ問題によく一緒に出てくる語 → 同じ分野の語
    const co = new Map();
    for (const q of list) for (const id of q.ids) if (id !== g.key) co.set(id, (co.get(id) || 0) + 1);
    const rel = [...[...co].sort((a, b) => b[1] - a[1]).map(([id]) => id),
      ...terms.filter(x => x.cat === g.cat && x.key !== g.key).map(x => x.key)];
    const related = [...new Set(rel)].slice(0, 10).map(id => terms.find(x => x.key === id));
    const c = catOf(g.cat);
    // どの分野の何問に出てくるか(本文の要約)と、その場で解ける練習問題
    const byCat = new Map();
    for (const q of list) byCat.set(q.cat, (byCat.get(q.cat) || 0) + 1);
    const topCats = [...byCat].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => catOf(id).name);
    const termSummary = list.length ? `<p class="muted term-summary">${esc(t('term_summary', { term: g.term, n: list.length, k: byCat.size, topics: topCats.join(', ') }))}</p>` : '';
    const pickable = list.filter(q => !q.code);
    const pick = (pickable.some(q => q.inQ) ? pickable.filter(q => q.inQ) : pickable).slice(0, 2);
    const practiceHtml = pick.length ? `<section>
  <h2>${esc(t('term_practice', { term: g.term }))}</h2>${pick.map(q => `
  <article class="q-mini">
    <h3><a href="${base}${qUrl(q.cat, q.id)}">${esc(q.question)}</a></h3>
    <ol class="q-choices">${q.choices.map((ch, k) => `<li><span class="choice-mark">${mark(k)}</span><span class="choice-text">${esc(ch)}</span></li>`).join('')}</ol>
    <details class="q-answer"><summary>${esc(t('answer_toggle'))}</summary><p class="verdict ok">${esc(t('answer_is', { mark: mark(q.answer), text: q.choices[q.answer] }))}</p><p class="explanation">${linked(q.explanation)}</p></details>
  </article>`).join('')}
</section>` : '';
    page({
      path: `${L.path}term/${termSlug[g.key]}/`,
      alt: Object.fromEntries(langs.map(x => [x.code, `${x.path}term/${termSlug[g.key]}/`])),
      title: t('term_title', { term: g.term }),
      description: short(g.desc, 150),
      noindex: !list.length, // 問題に一度も出てこない用語のページは検索に出さない
      content: `<nav class="breadcrumb"><a href="${home}">${esc(t('breadcrumb_top'))}</a> <span>›</span> <a href="${home}glossary/">${esc(S.nav_glossary)}</a>${c ? ` <span>›</span> <a href="${home}glossary/#cat-${c.id}">${esc(c.name)}</a>` : ''}</nav>
<article class="term-page">
  <h1>${esc(t('term_heading', { term: g.term }))}</h1>
  ${g.reading ? `<p class="muted">${esc(g.reading)}</p>` : ''}
  <p class="lead">${esc(g.desc)}</p>
  ${isDef ? '' : `<p class="muted">${esc(t('term_ja_name'))}: <span lang="ja">${esc(g.key)}</span></p>`}
  ${termSummary}
  ${fig ? figureHtml(fig.figureSvg, fig.figureId) : ''}
  ${c ? `<p>${esc(t('term_category'))}: <a href="${home}c/${c.id}/">${esc(c.name)}</a></p>` : ''}
</article>
${practiceHtml}
${quotes.length ? `<section>
  <h2>${esc(t('term_quotes', { term: g.term }))}</h2>
  <ul class="term-quotes">${quotes.map(({ q, s }) => `<li><p>${esc(s)}</p><a href="${base}${qUrl(q.cat, q.id)}">${esc(short(q.question, 60))}</a></li>`).join('')}</ul>
</section>` : ''}
${list.length ? `<section>
  <h2>${esc(t('term_questions', { term: g.term, n: list.length }))}</h2>
  ${qLinks(list.slice(0, 15))}
</section>` : ''}
${c ? bookSection(c) : ''}
<div data-ad="term"></div>
${cmpSection(t('compare_in_term'), cmp.filter(e => (e.terms ?? []).includes(g.key)))}
${related.length ? `<section>
  <h2>${esc(t('term_related'))}</h2>
  <p class="term-chips">${related.map(x => `<a class="chip" href="${home}term/${termSlug[x.key]}/">${esc(x.term)}</a>`).join(' ')}</p>
</section>` : ''}
<p><a class="btn btn-ghost" href="${home}glossary/">${esc(t('term_to_glossary'))}</a></p>`,
    });
  }
}

// ---- sitemap / robots / その他 ----
// data/lastmod.json に「ページ → 本文のハッシュと更新日」を記録し、本文が変わったページだけ更新日(lastmod)を今日にする
const lastmodFile = path.join(root, 'data/lastmod.json');
const lastmodOld = fs.existsSync(lastmodFile) ? JSON.parse(fs.readFileSync(lastmodFile, 'utf8')) : {};
const today = new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD(端末の日付)
const pageKey = url => url.slice(baseUrl.length) || '/';
const lastmod = Object.fromEntries(sitemap.map(({ url, hash }) =>
  [pageKey(url), lastmodOld[pageKey(url)]?.hash === hash ? lastmodOld[pageKey(url)] : { hash, date: today }]));
fs.writeFileSync(lastmodFile, '{\n' + Object.entries(lastmod).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(',\n') + '\n}\n');
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemap.map(({ url }) => `  <url><loc>${url}</loc><lastmod>${lastmod[pageKey(url)].date}</lastmod></url>`).join('\n')}
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
  ...langs.flatMap(L => [L.path, `${L.path}quiz/`, `${L.path}stats/`, `${L.path}manifest.json`, ...files(`data/${L.code}`).filter(f => !f.endsWith("/search.json"))]),
  ...files('js'), ...files('css'), 'icon-192.png', 'icon-512.png',
];
// 中身が変わったら版も変わり、古いキャッシュは消える
const hash = crypto.createHash('sha1');
for (const f of precache) hash.update(fs.readFileSync(path.join(out, f.endsWith('/') || !f ? `${f}index.html` : f)));
write('sw.js', fill(read('src/templates/sw.js'), {
  version: hash.digest('hex').slice(0, 10),
  base: JSON.stringify(base),
  homes: JSON.stringify(langs.map(L => base + L.path).sort((a, b) => b.length - a.length)),
  precache: JSON.stringify(precache.map(f => base + f), null, 2),
}));

const total = Object.values(questions).reduce((s, x) => s + x.length, 0);
console.log(`build完了: ${langs.length}言語, ${sitemap.length} ページ（sitemap掲載）, 問題 ${total} 問 → docs/`);
