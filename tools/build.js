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
// 「Numbers Every Chip Engineer Should Know」(英語のみ。/en/numbers/)。各数値に根拠の問題IDを付ける
const numbers = readOpt('data/numbers.json', []);
const numbersLang = 'en';
const numbersQ = [...new Set(numbers.flatMap(g => g.items.flatMap(x => x.questions ?? [])))];
// 計算ツール(/tools/{slug}/)。data/tools/*.json に1ツール1ファイル(order 順)。文言は言語ごとで、訳のある言語だけページを作る
const tools = exists('data/tools') ? fs.readdirSync(path.join(root, 'data/tools')).filter(f => f.endsWith('.json'))
  .map(f => readJSON(`data/tools/${f}`)).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) : [];
const toolsIn = code => tools.filter(x => x.text[code]);
const compares = readOpt('data/compare.json', []); // 用語の違い比較ページ(/compare/{slug}/)。英語などの訳は data/i18n/{言語}/compare.json
// ニュースに出た用語(/news-terms/)。用語集の語に「なぜ今話題なのか」などを足す。訳は data/i18n/{言語}/news-terms.json
const newsTerms = readOpt('data/news-terms.json', []);
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
  // {n|question|questions} は n が 1 のとき前、それ以外は後ろの語にする(英語などの単数・複数)
  const t = (k, vars = {}) => (S[k] ?? k)
    .replace(/\{(\w+)\|([^|}]*)\|([^}]*)\}/g, (m, x, one, many) => (x in vars ? (Number(vars[x]) === 1 ? one : many) : m))
    .replace(/\{(\w+)\}/g, (m, x) => (x in vars ? vars[x] : m));
  const tr = kind => (isDef ? {} : readOpt(`data/i18n/${code}/${kind}.json`, {}));
  const exT = tr('exams');
  const catT = tr('categories');
  const gloT = tr('glossary');
  const figT = tr('figures');
  // ニュース用語: 日付・問題・リンク先は既定言語のファイルのものを使い、文章だけ訳で置き換える(訳がなければその言語では出さない)
  const nwT = tr('news-terms');
  const news = newsTerms.filter(e => isDef || nwT[e.term]).map(e => {
    const x = isDef ? {} : nwT[e.term];
    return { ...e, label: x.label ?? e.label, short: x.short ?? e.short, background: x.background ?? e.background, diff: x.diff ?? e.diff,
      why: e.why.map((w, i) => ({ ...w, text: isDef ? w.text : x.why?.[i] })) };
  }).sort((a, b) => b.period[1].localeCompare(a.period[1]) || b.period[0].localeCompare(a.period[0]));
  const newsOf = key => news.find(e => e.term === key);
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
  // 詳しい解説(about)とよくある質問(faq)は言語ごとに持つ。既定言語の分がほかの言語のページに混ざらないよう外す
  const terms = glossary.map(({ about, faq, ...g }) => ({ ...g, ...(isDef ? { about, faq } : {}), ...(gloT[g.term] || {}), key: g.term, reading: gloT[g.term] ? '' : g.reading }));
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
    numbersQ,
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
    <span class="cat-name">${esc(c.name)}</span>${c.blurb ? `
    <span class="cat-blurb">${esc(c.blurb)}</span>` : ''}
    <span class="cat-meta"><span>${t('n_questions', { n: qs[c.id].length })}</span><span class="cat-rate" hidden>${t('rate_label')} <b data-rate="${c.id}"></b></span></span>
    <span class="meter" hidden><span class="meter-bar" data-progress="${c.id}:${qs[c.id].length}" style="width:0%"></span></span>
  </a></li>`).join('') + '</ul>';
  const modeCards = (list, cat) => '<div class="mode-grid">' + list.map((m, i) => `
  <a class="mode-card${i === 0 ? ' primary' : ''}" href="${quizUrl(m, cat)}" rel="nofollow">
    <strong>${esc(modeText(m, 'label'))}</strong><span>${esc(modeText(m, 'desc'))}</span>
  </a>`).join('') + '</div>';
  // トップの開始ボタン。「クイズを始める」は初心者向けコースの最初の分野の10問(コースがなければ全分野から10問)。
  // 学習履歴があれば progress.js が下に「続き・今日の復習・苦手問題」を出す(保存できない環境では出さない)
  const introCourse = courses.find(co => co.id === 'intro');
  const firstCat = introCourse?.steps.find(id => qs[id]?.length);
  const startHref = firstCat ? `${home}quiz/?mode=category&amp;c=${firstCat}&amp;n=10` : `${home}quiz/?mode=random`;
  const startCard = (href, title, desc, extra = '') => `<a class="start-card" href="${href}"${extra}><strong>${title}</strong><span>${desc}</span></a>`;
  const startPanel = `<div class="hero-cta">
    <a class="btn btn-primary btn-lg" href="${startHref}" rel="nofollow" data-track="home_start_quiz">${esc(t('home_cta_start'))}</a>
    <a class="btn btn-ghost btn-lg" href="#topics" data-track="home_pick_topic">${esc(t('home_cta_pick'))}</a>
  </div>
  <p class="hero-note">${esc(t('home_cta_note'))}</p>`;
  const startBack = `<section class="start" data-start="back" hidden>
  <h2>${esc(t('home_back_heading'))}</h2>
  <div class="start-grid" data-cats="${esc(JSON.stringify(Object.fromEntries(live.map(c => [c.id, c.name]))))}">
    ${startCard(`${home}quiz/?mode=category&amp;n=10`, esc(t('start_continue')), esc(t('start_continue_desc')), ' rel="nofollow" data-continue data-track="home_continue"')}
    ${startCard(`${home}quiz/?mode=review`, esc(t('start_review')), esc(t('start_review_desc')), ' rel="nofollow" data-due hidden data-track="home_review"')}
    ${startCard(`${home}quiz/?mode=weak`, esc(t('start_weak')), esc(t('start_weak_desc')), ' rel="nofollow" data-weak hidden data-track="home_weak"')}
  </div>
</section>`;
  // トップの「できること」: メニューを開かなくても主な機能が分かるカード(実在するページだけ。見出しはヘッダーの名前とそろえる)
  const feature = (href, title, desc, track) => `<a class="feature-card" href="${href}" data-track="${track}"><strong>${esc(title)}</strong><span>${esc(desc)}</span></a>`;
  const homeFeatures = `<section class="features" aria-labelledby="features-h">
  <h2 id="features-h" class="visually-hidden">${esc(t('home_feat_heading'))}</h2>
  <div class="feature-grid">
    ${feature('#topics', S.nav_topics, t('home_feat_topics_desc', { n: live.length }), 'home_feat_topics')}
    ${courses.length ? feature('#courses', S.course_heading, t('home_feat_courses_desc'), 'home_feat_courses') : ''}
    ${feature(`${home}glossary/`, S.nav_glossary, t('home_feat_glossary_desc'), 'home_feat_glossary')}
    ${compares.some(e => isDef || tr('compare')[e.slug]) ? feature(`${home}compare/`, S.nav_compare, t('home_feat_compare_desc'), 'home_feat_compare') : ''}
    ${feature(`${home}figures/`, S.footer_figures, t('home_feat_figures_desc'), 'home_feat_figures')}
    ${toolsIn(code).length ? feature(`${home}tools/`, S.nav_tools, t('home_feat_tools_desc'), 'home_feat_tools') : ''}
    ${news.length ? feature(`${home}news-terms/`, S.news_title, t('home_feat_news_desc'), 'home_feat_news') : ''}
  </div>
</section>`;
  // 先頭の #topics はヘッダーの Topics と「分野から選ぶ」からのジャンプ先。大分類(試験の区分)ごとの目次を置く
  const examGroups = e => e.groups.map(g => ({ g, list: live.filter(c => c.exam === e.id && c.group === g.id) })).filter(x => x.list.length);
  const categoryList = `<div id="topics"></div>
<nav class="topic-index" aria-label="${esc(t('topics_index'))}">
  <h2>${esc(t('topics_index'))}</h2>
  ${exams.map(e => `<p><b>${esc(exName(e))}</b>${examGroups(e).map(({ g, list }) => ` <a class="chip" href="#g-${e.id}-${g.id}">${esc(grName(e, g))} <small>${list.length}</small></a>`).join('')}</p>`).join('\n  ')}
</nav>` + exams.map(e => `
<section class="exam">
  <h2>${esc(t('exam_heading', { exam: exName(e) }))}</h2>
  ${examGroups(e).map(({ g, list }) => `<h3 class="group-title" id="g-${e.id}-${g.id}">${esc(grName(e, g))}</h3>
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
  // 問題ページのタイトル。問題文の頭が同じ問題で重ならないように、重なったら長めに出し、それでも重なれば番号を添える
  const qTitles = new Set();
  const qTitle = (c, q) => {
    const make = len => t('question_title', { name: c.name, q: short(q.question, len) });
    let title = [50, 80, 120].map(make).find(x => !qTitles.has(x)) ?? `${make(50)} (${q.id.split('-').pop()})`;
    qTitles.add(title);
    return title;
  };
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

  // 静的な問題ブロック(個別問題・用語・比較ページ)を、その場で解けるようにするための属性(動きは answer.js)
  const qData = q => ` data-qid="${esc(q.id)}" data-cat="${esc(q.cat)}" data-answer="${q.answer}" data-correct="${esc(t('correct'))}" data-incorrect="${esc(t('incorrect', { mark: mark(q.answer) }))}"`;

  // 用語ページの説明文(検索結果に出る): 文の途中で「…」と切らず、収まる文までにする。
  // 余裕があれば練習問題の数を添える(検索から来た人に、解ける問題があることを伝える)
  const termDescription = (desc, n) => {
    const sentences = desc.match(/[^。.!?！？]+(?:[。！？]|[.!?](?=\s|$))\s*/g) ?? [desc];
    let text = '';
    for (const x of sentences) {
      if ((text + x).trim().length > 150) break;
      text += x;
    }
    text = text.trim() || short(desc, 150);
    const more = n ? t('term_desc_more', { n }) : '';
    const sep = /[。！？]$/.test(text) ? '' : ' '; // 日本語・中国語は句点のあとに空白を入れない
    return more && text.length + more.length + 1 <= 160 ? `${text}${sep}${more}` : text;
  };

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
  const crumbs = (...items) => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, url], i) => ({ '@type': 'ListItem', position: i + 1, name, item: abs(url) })) });
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
    // トップ下部の「ほかの練習方法」(ランダム10問は上の入口にあるので除く)
    moreModes: modeCards(modes.filter(m => m.scope.includes('top') && m.id !== 'random')).replace('mode-grid', 'mode-grid compact'),
    startPanel, startBack, homeFeatures,
    // 用語集の上に出す、ニュース用語の一覧への案内
    newsTermsLink: news.length ? `<p class="news-link"><a class="chip" href="${home}news-terms/">${esc(S.news_title)}</a> <span class="muted">${esc(t('glossary_news_link', { terms: news.slice(0, 3).map(e => e.label ?? terms.find(g => g.key === e.term).term).join(', ') }))}</span></p>` : '',
    // トップ下部の計算ツールの一覧(訳のあるツールだけ)
    toolList: toolsIn(code).length ? `<section>
  <h2><a href="${home}tools/">${esc(S.tools_title)}</a></h2>
  <div class="mode-grid compact">${toolsIn(code).map(y => `<a class="mode-card" href="${home}tools/${y.slug}/"><strong>${esc(y.text[code].h1)}</strong><span>${esc(y.text[code].card)}</span></a>`).join('')}</div>
</section>` : '',
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
      ? `<span aria-current="true" lang="${x.htmlLang}">${esc(x.label)}</span>`
      : alt[x.code] != null
        ? `<a href="${base}${alt[x.code]}" hreflang="${x.htmlLang}" lang="${x.htmlLang}" data-lang="${x.code}">${esc(x.label)}</a>`
        : `<a href="${base}${fallback(x)}" lang="${x.htmlLang}" data-lang="${x.code}">${esc(x.label)}</a>`).join('');
    // ヘッダーのナビ(いまいるページには aria-current を付ける)。
    // PC: Topics / 用語集 / 比較 / 図解 / 計算ツール / Progress。スマートフォン: ホームを加えて Menu に縦に並べる
    const navLink = ([sub, label]) => `<a href="${home}${sub}"${p === L.path + sub ? ' aria-current="page"' : ''}>${esc(label)}</a>`;
    const resources = [['glossary/', S.nav_glossary], ...(cmp.length ? [['compare/', S.nav_compare]] : []), ['figures/', S.footer_figures],
      ...(numbers.length && code === numbersLang ? [['numbers/', 'Key numbers']] : []),
      ...(toolsIn(code).length ? [['tools/', S.nav_tools]] : [])];
    // 用語集・比較・図解・計算ツールはそれぞれ独立した項目として並べる(PC ではホームはロゴから戻る)
    const headerNav = [['#topics', S.nav_topics], ...resources, ['stats/', S.nav_stats]].map(navLink).join('');
    const navMenu = [['', S.nav_home], ['#topics', S.nav_topics], ...resources, ['stats/', S.nav_stats]].map(navLink).join('');
    // 既定言語以外のページ: ブラウザの言語がこのページの言語でない人に、既定言語版への案内を出す(閉じたら以後出さない)
    const mainHref = langBanner && code !== mainLang ? base + (alt[mainLang] ?? fallback(mainL)) : null;
    const bannerHtml = mainHref ? `<div class="lang-banner" lang="${mainL.htmlLang}" hidden><div class="wrap"><a href="${mainHref}" hreflang="${mainL.htmlLang}">${esc(mainS.lang_banner)}</a><button type="button" aria-label="${esc(mainS.lang_banner_close)}">×</button></div></div>
<script>(() => { const b = document.currentScript.previousElementSibling, k = 'langBannerClosed', l = document.documentElement.lang.toLowerCase().split('-')[0]; let c; try { c = localStorage.getItem(k) || localStorage.getItem('langChoice'); } catch {} if (c || (navigator.languages || [navigator.language]).some(x => x && x.toLowerCase().startsWith(l))) return; b.hidden = false; b.querySelector('button').onclick = () => { b.hidden = true; try { localStorage.setItem(k, '1'); } catch {} }; })();</script>` : '';
    if (ads) scripts = ['ads.js', ...scripts];
    write(file || `${p}index.html`, fill(layout, {
      ...common,
      title: esc(tt),
      description: esc(description),
      head,
      langLinks,
      langCurrent: esc(L.label),
      headerNav,
      navMenu,
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
    // トップ: 検索結果のサイト名になる WebSite(各言語のサイト名を別名として添える)
    const jsonld = name === 'index' ? { '@context': 'https://schema.org', '@type': 'WebSite', name: siteName, url: abs(L.path),
      alternateName: [...new Set(Object.values(config.siteName))].filter(x => x !== siteName), inLanguage: L.htmlLang } : null;
    page({ path: pagePath(L, name), alt, jsonld, ...JSON.parse(fill(m[1], common)), content: fill(src.slice(m[0].length), common) });
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
      jsonld: crumbs([S.nav_home, home], [c.name, `${home}c/${c.id}/`]),
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
        // 主ボタンは「10問練習」。全問・苦手問題はその横に並べる
        modes: count ? filter + modeCards(modes.filter(m => m.scope.includes('category')), c.id)
          .replace('<a class="mode-card primary"', '<a class="mode-card"')
          .replace('<div class="mode-grid">', `<div class="mode-grid">
  <a class="mode-card primary" href="${home}quiz/?mode=category&amp;c=${c.id}&amp;n=10" rel="nofollow">
    <strong>${esc(t('practice_10'))}</strong><span>${esc(t('practice_10_desc'))}</span>
  </a>`) + toolsIn(code).filter(x => x.cats.includes(c.id))
          .map(x => `\n<p><a class="btn btn-ghost" href="${home}tools/${x.slug}/">${esc(x.text[code].nav)} →</a></p>`).join('')
          : `<p class="muted">${esc(t('preparing'))}</p>`,
        siblings: catCards(live.filter(x => x.exam === c.exam && x.group === c.group && x.id !== c.id)),
        compareLinks: cmpSection(t('compare_in_cat'), cmp.filter(e => e.cat === c.id)),
        books: bookSection(c),
        // 問題一覧は折りたたむ(リンクは HTML に残るので、各問題ページへの内部リンクは保たれる)
        questionList: pqs.length ? `<details class="q-list-box">
  <summary><h2>${esc(t('question_list', { name: c.name, n: pqs.length }))}</h2></summary>
  ${qLinks(pqs)}
</details>` : '',
      }),
    });

    // 問題ページ /q/{分野ID}/{問題ID}/
    const solve = modes.find(m => m.id === 'category');
    // 検索結果の説明文: 問題文のあとに解説の最初の文を続ける(文の途中で切らない。日中韓は短めに)
    const cjk = ['ja', 'zh-hant', 'ko', 'zh'].includes(code);
    const descMax = cjk ? 110 : 155;
    const joint = text => (/[。！？]$/.test(text) || (code !== 'ko' && cjk && /[?]$/.test(text)) ? '' : ' '); // 文と文の間の空白(日本語・中国語の句点のあとは入れない)
    const qDescription = q => {
      let text = q.question.trim();
      for (const x of q.explanation.match(/[^。.!?！？]+(?:[。！？]|[.!?](?=\s|$))\s*/g) ?? []) {
        if ((text + joint(text) + x).trim().length > descMax) break;
        text = (text + joint(text) + x).trim();
      }
      // 最初の文も収まらないときは、収まるところで切る
      if (text === q.question.trim()) text = short(`${text}${joint(text)}${q.explanation.trim()}`, descMax);
      return short(text, descMax + 5);
    };
    pqs.forEach((q, n) => {
      // 関連問題: 同じ分野で後ろに続く5問(末尾の次は先頭)
      const related = [...new Set([1, 2, 3, 4, 5].map(k => pqs[(n + k) % pqs.length]))].filter(r => r !== q);
      page({
        path: qUrl(c.id, q.id),
        alt: Object.fromEntries(langs.filter(x => hasQ[x.code].has(q.id)).map(x => [x.code, qUrl(c.id, q.id, x)])),
        fallback: x => `${x.path}c/${c.id}/`,
        title: qTitle(c, q),
        description: qDescription(q),
        jsonld: crumbs([S.nav_home, home], [c.name, `${home}c/${c.id}/`], [short(q.question, 60), `${base}${qUrl(c.id, q.id)}`]),
        scripts: ['answer.js'],
        content: fill(qTpl, {
          ...common,
          catUrl: `${home}c/${c.id}/`,
          catName: esc(c.name),
          groupName: esc(g.name),
          question: esc(q.question),
          qData: qData({ ...q, cat: c.id }),
          continueUrl: `${home}quiz/?mode=category&amp;c=${c.id}&amp;n=9&amp;skip=${q.id}`,
          continueLabel: esc(t('q_continue', { name: c.name })),
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
  <article class="q-mini"${qData(q)}>
    <h3><a href="${base}${qUrl(q.cat, q.id)}">${esc(q.question)}</a></h3>
    <ol class="q-choices">${q.choices.map((ch, k) => `<li><span class="choice-mark">${mark(k)}</span><span class="choice-text">${esc(ch)}</span></li>`).join('')}</ol>
    <details class="q-answer"><summary>${esc(t('answer_toggle'))}</summary><p class="verdict ok">${esc(t('answer_is', { mark: mark(q.answer), text: q.choices[q.answer] }))}</p><p class="explanation">${linked(q.explanation)}</p></details>
  </article>`;

  // 数値のページ /en/numbers/(英語版のみ)。数値ごとに根拠の問題へリンクし、上部から10問のドリルへ
  if (numbers.length && code === numbersLang) {
    const qLink = id => qById.get(id) ? `<a href="${base}${qUrl(qById.get(id).cat, id)}">Practice</a>` : '';
    page({
      path: `${L.path}numbers/`,
      alt: { [code]: `${L.path}numbers/` },
      title: 'Numbers Every Chip Engineer Should Know',
      description: 'The orders of magnitude every semiconductor and computer engineer should know: band gaps, thermal voltage, DRAM refresh, EUV wavelength, cache latencies and more, each linked to a practice question.',
      content: `<nav class="breadcrumb"><a href="${home}">${esc(t('breadcrumb_top'))}</a></nav>
<h1>Numbers Every Chip Engineer Should Know</h1>
<p class="lead">The orders of magnitude worth carrying in your head, from silicon's band gap to DRAM latency. Each value links to a practice question with a full explanation. Values are typical figures; the notes give the conditions.</p>
<p><a class="btn btn-primary" href="${home}quiz/?mode=numbers" rel="nofollow">Test yourself: 10 questions</a></p>
<nav class="glossary-nav" aria-label="Groups"><p>${numbers.map((g, i) => `<a class="chip" href="#n${i + 1}">${esc(g.group)}</a>`).join(' ')}</p></nav>
${numbers.map((g, i) => `<section id="n${i + 1}">
  <h2>${esc(g.group)}</h2>
  <div class="table-wrap"><table class="numbers">
    <thead><tr><th scope="col">Quantity</th><th scope="col">Value</th><th scope="col"><span class="visually-hidden">Practice</span></th></tr></thead>
    <tbody>${g.items.map(x => `
      <tr id="${esc(x.id)}"><th scope="row">${esc(x.label)}${x.note ? `<small>${esc(x.note)}</small>` : ''}</th><td class="num-value">${esc(x.value)}</td><td class="num-q">${(x.questions ?? []).slice(0, 1).map(qLink).join('')}</td></tr>`).join('')}
    </tbody>
  </table></div>
</section>`).join('\n')}
<p class="muted">Every value on this page also appears in at least one question on this site. Found an error? Let us know via the <a href="${home}contact/">contact page</a>.</p>
<div data-ad="numbers"></div>`,
    });
  }

  // 計算ツール。計算はブラウザ側の {id}.js で行い、HTMLには入力欄・結果の枠・解説を置く。
  // ツールごとに違う部分(入力欄と結果の枠)は toolBody[id] が作り、解説・練習問題・よくある質問・関連用語は共通
  const field = (name, label, value, attrs = '') => `<label class="dy-field"><span>${esc(label)}</span><input name="${name}" type="number" inputmode="decimal" value="${value}" ${attrs}></label>`;
  const select = (name, label, options, value) => `<label class="dy-field"><span>${esc(label)}</span><select name="${name}">${options.map(([v, text]) => `<option value="${v}"${v === value ? ' selected' : ''}>${esc(text)}</option>`).join('')}</select></label>`;
  const stat = (key, label) => `<div><dt>${esc(label)}</dt><dd data-out="${key}">–</dd></div>`;
  const toolBody = {
    'die-yield': x => `<form id="dy-form" class="dy-form">
    <h2>${esc(x.in_heading)}</h2>
    ${select('d', x.wafer, [150, 200, 300, 450].map(v => [v, `${v} mm`]), 300)}
    ${field('w', x.die_w, 10, 'min="0.1" step="0.1"')}
    ${field('h', x.die_h, 10, 'min="0.1" step="0.1"')}
    ${field('scribe', x.scribe, 100, 'min="0" step="10"')}
    ${field('edge', x.edge, 3, 'min="0" step="0.5"')}
    ${field('d0', x.d0, 0.1, 'min="0" step="0.01"')}
    ${field('alpha', x.alpha, 3, 'min="0.1" step="0.5"')}
    ${field('cost', x.cost, 10000, 'min="0" step="100"')}
  </form>
  <section class="dy-out" aria-live="polite">
    <h2>${esc(x.out_heading)}</h2>
    <dl class="dy-stats">${stat('area', x.area)}${stat('gross', x.gross)}${stat('formula', x.gross_formula)}</dl>
    <div class="table-wrap"><table class="dy-table">
      <thead><tr><th scope="col">${esc(x.model)}</th><th scope="col">${esc(x.yield)}</th><th scope="col">${esc(x.good)}</th><th scope="col">${esc(x.cpgd)}</th></tr></thead>
      <tbody>${['poisson', 'murphy', 'negbin'].map(m => `<tr><th scope="row">${esc(x[m])}</th><td data-out="${m}-y">–</td><td data-out="${m}-good">–</td><td data-out="${m}-cost">–</td></tr>`).join('')}</tbody>
    </table></div>
  </section>
  <section class="dy-map">
    <h2>${esc(x.map_heading)}</h2>
    <canvas id="dy-map" width="320" height="320" role="img" aria-label="${esc(x.map_heading)}"></canvas>
    <p class="dy-legend"><span class="dy-key ok"></span>${esc(x.legend_good)} <span class="dy-key ng"></span>${esc(x.legend_bad)} · ${esc(x.legend_sim)}: <b data-out="sim">–</b></p>
    <p><button type="button" class="btn btn-ghost btn-small" id="dy-rerun">${esc(x.rerun)}</button></p>
    <p class="muted">${esc(x.map_note)}</p>
  </section>`,
    litho: x => `<form id="litho-form" class="dy-form">
    <h2>${esc(x.in_heading)}</h2>
    ${select('lambda', x.lambda, [[436, 'g-line 436 nm'], [365, 'i-line 365 nm'], [248, 'KrF 248 nm'], [193, 'ArF 193 nm'], [13.5, 'EUV 13.5 nm']], 193)}
    ${field('na', x.na, 1.35, 'min="0.05" max="1.8" step="0.01"')}
    ${field('k1', x.k1, 0.28, 'min="0.1" max="1" step="0.01"')}
    ${field('k2', x.k2, 0.5, 'min="0.1" max="2" step="0.05"')}
    ${field('pitch', x.pitch, 64, 'min="1" step="1"')}
  </form>
  <section class="dy-out" aria-live="polite">
    <h2>${esc(x.out_heading)}</h2>
    <dl class="dy-stats">${stat('hp', x.res)}${stat('minpitch', x.minpitch)}${stat('dof', x.dof)}${stat('passes', x.passes)}</dl>
    <p class="muted">${esc(x.passes_note)}</p>
  </section>
  <section class="dy-out">
    <h2>${esc(x.table_heading)}</h2>
    <div class="table-wrap"><table class="dy-table" id="litho-table">
      <thead><tr><th scope="col">${esc(x.col_tool)}</th><th scope="col">λ</th><th scope="col">NA</th><th scope="col">${esc(x.col_res)}</th><th scope="col">${esc(x.col_dof)}</th></tr></thead>
      <tbody></tbody>
    </table></div>
    <p class="muted">${esc(x.table_note)}</p>
  </section>`,
    sta: x => `<form id="sta-form" class="dy-form">
    <h2>${esc(x.in_heading)}</h2>
    ${field('period', x.period, 2, 'min="0.01" step="0.05"')}
    ${field('tcqmax', x.tcqmax, 0.15, 'min="0" step="0.01"')}
    ${field('tcqmin', x.tcqmin, 0.08, 'min="0" step="0.01"')}
    ${field('combmax', x.combmax, 1.5, 'min="0" step="0.05"')}
    ${field('combmin', x.combmin, 0.05, 'min="0" step="0.01"')}
    ${field('setup', x.setup, 0.06, 'min="0" step="0.01"')}
    ${field('hold', x.hold, 0.04, 'min="0" step="0.01"')}
    ${field('skew', x.skew, 0, 'step="0.01"')}
    ${field('unc', x.unc, 0.05, 'min="0" step="0.01"')}
  </form>
  <section class="dy-out" aria-live="polite">
    <h2>${esc(x.out_heading)}</h2>
    <dl class="dy-stats">${stat('setup-slack', x.setup_slack)}${stat('hold-slack', x.hold_slack)}${stat('fmax', x.fmax)}</dl>
    <svg id="sta-chart" class="sta-chart" viewBox="0 0 600 170" role="img" aria-label="${esc(x.chart_label)}"
      data-labels="${esc(JSON.stringify({ launch: x.lbl_launch, capture: x.lbl_capture, max: x.lbl_arrival_max, min: x.lbl_arrival_min, req: x.lbl_required, hold: x.lbl_hold }))}"></svg>
    <p class="dy-legend"><span class="dy-key ok"></span>${esc(x.legend_ok)} <span class="dy-key ng"></span>${esc(x.legend_ng)}</p>
    <p class="muted">${esc(x.chart_note)}</p>
  </section>`,
    'mosfet-iv': x => `<form id="iv-form" class="dy-form">
    <h2>${esc(x.in_heading)}</h2>
    ${field('vth', x.vth, 0.5, 'min="0" step="0.05"')}
    ${field('kp', x.kp, 200, 'min="1" step="10"')}
    ${field('wl', x.wl, 10, 'min="0.1" step="0.5"')}
    ${field('lambda', x.lambda, 0.05, 'min="0" step="0.01"')}
    ${field('vgs', x.vgs, 1.5, 'min="0" step="0.05"')}
    ${field('vds', x.vds, 1.2, 'min="0" step="0.05"')}
    ${field('vdd', x.vdd, 3.3, 'min="0.1" step="0.1"')}
  </form>
  <section class="dy-out" aria-live="polite">
    <h2>${esc(x.out_heading)}</h2>
    <dl class="dy-stats">${stat('region', x.region)}${stat('id', x.id)}${stat('vdsat', x.vdsat)}${stat('gm', x.gm)}${stat('ro', x.ro)}</dl>
    <svg id="iv-chart" class="sta-chart" viewBox="0 0 600 340" role="img" aria-label="${esc(x.chart_label)}"
      data-labels="${esc(JSON.stringify({ cutoff: x.r_cutoff, linear: x.r_linear, sat: x.r_sat, op: x.lbl_op }))}"></svg>
    <p class="muted">${esc(x.chart_note)}</p>
  </section>`,
    thermal: x => `<form id="th-form" class="dy-form">
    <h2>${esc(x.in_heading)}</h2>
    ${field('p', x.p, 1, 'min="0" step="0.1"')}
    ${field('ta', x.ta, 25, 'step="1"')}
    ${field('tjmax', x.tjmax, 125, 'step="5"')}
    ${field('tja', x.tja, 50, 'min="0" step="1"')}
    ${field('tjc', x.tjc, 1, 'min="0" step="0.1"')}
    ${field('tcs', x.tcs, 0.5, 'min="0" step="0.1"')}
    ${field('tsa', x.tsa, 3, 'min="0" step="0.5"')}
  </form>
  <section class="dy-out" aria-live="polite">
    <h2>${esc(x.out_heading)}</h2>
    <div class="table-wrap"><table class="dy-table">
      <thead><tr><th scope="col"></th><th scope="col">${esc(x.col_tj)}</th><th scope="col">${esc(x.col_margin)}</th><th scope="col">${esc(x.col_pmax)}</th></tr></thead>
      <tbody>
        <tr><th scope="row">${esc(x.row_ja)}</th><td data-out="ja-tj">–</td><td data-out="ja-margin">–</td><td data-out="ja-pmax">–</td></tr>
        <tr><th scope="row">${esc(x.row_hs)} (<span data-out="hs-theta">–</span>)</th><td data-out="hs-tj">–</td><td data-out="hs-margin">–</td><td data-out="hs-pmax">–</td></tr>
      </tbody>
    </table></div>
    <p class="muted">${esc(x.note)}</p>
  </section>`,
    'mem-bw': x => `<form id="bw-form" class="dy-form">
    <h2>${esc(x.in_heading)}</h2>
    ${select('preset', x.preset, [['', x.custom], [0, 'DDR4-3200'], [1, 'DDR5-6400'], [2, 'LPDDR5X-8533'], [3, 'GDDR6 16 Gb/s'], [4, 'HBM3 6.4 Gb/s']], 0)}
    ${field('rate', x.rate, 3200, 'min="1" step="100"')}
    ${field('width', x.width, 64, 'min="1" step="8"')}
    ${field('count', x.count, 1, 'min="1" step="1"')}
    ${field('eff', x.eff, 70, 'min="1" max="100" step="5"')}
  </form>
  <section class="dy-out" aria-live="polite">
    <h2>${esc(x.out_heading)}</h2>
    <dl class="dy-stats">${stat('peak', x.peak)}${stat('eff', x.effective)}${stat('pin', x.pin)}${stat('per-ns', x.per_ns)}</dl>
  </section>
  <section class="dy-out">
    <h2>${esc(x.table_heading)}</h2>
    <div class="table-wrap"><table class="dy-table" id="bw-table">
      <thead><tr><th scope="col">${esc(x.col_std)}</th><th scope="col">MT/s</th><th scope="col">${esc(x.col_width)}</th><th scope="col">${esc(x.col_peak)}</th></tr></thead>
      <tbody></tbody>
    </table></div>
    <p class="muted">${esc(x.table_note)}</p>
  </section>`,
    'adc-snr': x => `<form id="adc-form" class="dy-form">
    <h2>${esc(x.in_heading)}</h2>
    ${field('bits', x.bits, 12, 'min="1" max="32" step="1"')}
    ${field('fs', x.fs, 2, 'min="0.001" step="0.1"')}
    ${field('fin', x.fin, 10, 'min="0" step="1"')}
    ${field('jitter', x.jitter, 1, 'min="0" step="0.1"')}
    ${field('osr', x.osr, 1, 'min="1" step="1"')}
    ${field('sinad', x.sinad, 70, 'step="0.5"')}
  </form>
  <section class="dy-out" aria-live="polite">
    <h2>${esc(x.out_heading)}</h2>
    <dl class="dy-stats">${stat('lsb', x.lsb)}${stat('snr-q', x.snr_q)}${stat('snr-j', x.snr_j)}${stat('snr', x.snr)}${stat('enob', x.enob)}${stat('enob-in', x.enob_in)}</dl>
    <p class="muted">${esc(x.note)}</p>
  </section>`,
    amdahl: x => `<form id="am-form" class="dy-form">
    <h2>${esc(x.in_heading)}</h2>
    ${field('p', x.p, 95, 'min="0" max="100" step="1"')}
    ${field('n', x.n, 16, 'min="1" step="1"')}
  </form>
  <section class="dy-out" aria-live="polite">
    <h2>${esc(x.out_heading)}</h2>
    <dl class="dy-stats">${stat('amdahl', x.amdahl)}${stat('eff', x.eff)}${stat('limit', x.limit)}${stat('gustafson', x.gustafson)}</dl>
    <svg id="am-chart" class="sta-chart" viewBox="0 0 600 320" role="img" aria-label="${esc(x.chart_label)}" data-labels="${esc(JSON.stringify({ x: x.x_label, y: x.y_label }))}"></svg>
    <p class="muted">${esc(x.chart_note)}</p>
  </section>`,
    'cache-calc': x => `<form id="cc-form" class="dy-form">
    <h2>${esc(x.in_heading)}</h2>
    ${field('abits', x.abits, 32, 'min="8" max="64" step="1"')}
    ${field('size', x.size, 32, 'min="1" step="1"')}
    ${field('line', x.line, 64, 'min="1" step="1"')}
    ${field('ways', x.ways, 8, 'min="1" step="1"')}
    ${field('hit', x.hit, 4, 'min="0" step="1"')}
    ${field('miss', x.miss, 5, 'min="0" max="100" step="0.5"')}
    ${field('penalty', x.penalty, 100, 'min="0" step="10"')}
  </form>
  <section class="dy-out" aria-live="polite">
    <h2>${esc(x.out_heading)}</h2>
    <p class="muted">${esc(x.bar_heading)}</p>
    <div id="cc-bar" class="cc-bar" data-tag="${esc(x.tag)}" data-index="${esc(x.index)}" data-offset="${esc(x.offset)}" data-cycles="${esc(x.cycles)}"></div>
    <p id="cc-warn" class="muted" hidden>${esc(x.warn)}</p>
    <dl class="dy-stats">${stat('lines', x.lines)}${stat('sets', x.sets)}${stat('tag', x.tag)}${stat('index', x.index)}${stat('offset', x.offset)}${stat('amat', x.amat)}</dl>
  </section>`,
    'cmos-power': x => `<form id="cp-form" class="dy-form">
    <h2>${esc(x.in_heading)}</h2>
    ${field('alpha', x.alpha, 0.1, 'min="0" max="1" step="0.01"')}
    ${field('c', x.c, 1, 'min="0" step="0.1"')}
    ${field('v', x.v, 1.0, 'min="0" step="0.05"')}
    ${field('f', x.f, 2, 'min="0" step="0.1"')}
    ${field('ileak', x.ileak, 100, 'min="0" step="10"')}
    ${field('scale', x.scale, 80, 'min="10" max="100" step="5"')}
  </form>
  <section class="dy-out" aria-live="polite">
    <h2>${esc(x.out_heading)}</h2>
    <dl class="dy-stats">${stat('dyn', x.dyn)}${stat('stat', x.stat)}${stat('total', x.total)}${stat('share', x.share)}${stat('dvfs', x.dvfs)}${stat('dvfs-ratio', x.dvfs_ratio)}</dl>
    <p class="muted">${esc(x.note)}</p>
  </section>`,
    'pn-junction': x => `<form id="pn-form" class="dy-form">
    <h2>${esc(x.in_heading)}</h2>
    ${select('mat', x.mat, [['si', x.mat_si], ['ge', x.mat_ge], ['gaas', x.mat_gaas]], 'si')}
    ${field('na', x.na, '1e17', 'step="any"')}
    ${field('nd', x.nd, '1e16', 'step="any"')}
    ${field('vr', x.vr, 0, 'step="0.1"')}
  </form>
  <section class="dy-out" aria-live="polite">
    <h2>${esc(x.out_heading)}</h2>
    <p id="pn-warn" class="muted" hidden>${esc(x.warn)}</p>
    <dl class="dy-stats">${stat('vbi', x.vbi)}${stat('w', x.w)}${stat('xn', x.xn)}${stat('xp', x.xp)}${stat('emax', x.emax)}${stat('cj', x.cj)}</dl>
    <p class="muted">${esc(x.note)}</p>
  </section>`,
    oxidation: x => `<form id="ox-form" class="dy-form">
    <h2>${esc(x.in_heading)}</h2>
    ${select('kind', x.kind, [['dry', x.dry], ['wet', x.wet]], 'dry')}
    ${select('orient', x.orient, [['100', '(100)'], ['111', '(111)']], '100')}
    ${field('temp', x.temp, 1000, 'min="700" max="1300" step="10"')}
    ${field('time', x.time, 1, 'min="0" step="0.1"')}
    ${field('xi', x.xi, 0, 'min="0" step="1"')}
  </form>
  <section class="dy-out" aria-live="polite">
    <h2>${esc(x.out_heading)}</h2>
    <dl class="dy-stats">${stat('x', x.x)}${stat('grown', x.grown)}${stat('si', x.si)}${stat('b', x.b)}${stat('ba', x.ba)}</dl>
    <svg id="ox-chart" class="sta-chart" viewBox="0 0 600 320" role="img" aria-label="${esc(x.chart_label)}" data-labels="${esc(JSON.stringify({ x: x.x_label, y: x.y_label }))}"></svg>
    <p class="muted">${esc(x.note)}</p>
  </section>`,
    'interconnect-rc': x => `<form id="rc-form" class="dy-form">
    <h2>${esc(x.in_heading)}</h2>
    ${select('metal', x.metal, [['cu', 'Cu', 1.7], ['al', 'Al', 2.7], ['w', 'W', 5.3], ['co', 'Co', 6.2], ['ru', 'Ru', 7.1]].map(([v, name, rho]) => [v, `${name} ${rho} µΩ·cm`]), 'cu')}
    ${field('rhox', x.rhox, 1, 'min="1" step="0.1"')}
    ${field('w', x.w, 50, 'min="1" step="5"')}
    ${field('t', x.t, 100, 'min="1" step="5"')}
    ${field('s', x.s, 50, 'min="1" step="5"')}
    ${field('h', x.h, 100, 'min="1" step="5"')}
    ${field('k', x.k, 2.7, 'min="1" step="0.1"')}
    ${field('len', x.len, 1000, 'min="1" step="100"')}
    ${field('rdrv', x.rdrv, 1000, 'min="0" step="100"')}
    ${field('cl', x.cl, 10, 'min="0" step="1"')}
  </form>
  <section class="dy-out" aria-live="polite">
    <h2>${esc(x.out_heading)}</h2>
    <dl class="dy-stats">${stat('r-len', x.r_len)}${stat('r', x.r)}${stat('c-len', x.c_len)}${stat('c', x.c)}${stat('cc-share', x.cc_share)}${stat('wire', x.wire)}${stat('total', x.total)}</dl>
    <svg id="rc-chart" class="sta-chart" viewBox="0 0 600 320" role="img" aria-label="${esc(x.chart_label)}" data-labels="${esc(JSON.stringify({ x: x.x_label, y: x.y_label }))}"></svg>
    <p class="muted">${esc(x.chart_note)}</p>
    <p class="muted">${esc(x.note)}</p>
  </section>`,
    jitter: x => `<form id="jt-form" class="dy-form">
    <h2>${esc(x.in_heading)}</h2>
    ${field('f0', x.f0, 100, 'min="0.001" step="any"')}
    ${field('lo', x.lo, 12, 'min="0.001" step="any"')}
    ${field('hi', x.hi, 20, 'min="0.001" step="any"')}
    ${[['1 kHz', -110], ['10 kHz', -120], ['100 kHz', -130], ['1 MHz', -145], ['10 MHz', -155], ['20 MHz', -155]].map(([f, v], i) => field(`p${i}`, x.pn_at.replace('{f}', f), v, 'max="0" step="1"')).join('\n    ')}
  </form>
  <section class="dy-out" aria-live="polite">
    <h2>${esc(x.out_heading)}</h2>
    <p id="jt-warn" class="muted" hidden>${esc(x.warn)}</p>
    <dl class="dy-stats">${stat('integ', x.integ)}${stat('mrad', x.mrad)}${stat('deg', x.deg)}${stat('jitter', x.jitter)}</dl>
    <svg id="jt-chart" class="sta-chart" viewBox="0 0 600 320" role="img" aria-label="${esc(x.chart_label)}" data-labels="${esc(JSON.stringify({ x: x.x_label, y: x.y_label }))}"></svg>
    <p class="muted">${esc(x.chart_note)}</p>
    <div class="table-wrap"><table class="dy-table">
      <thead><tr><th scope="col">${esc(x.col_seg)}</th><th scope="col">${esc(x.col_share)}</th></tr></thead>
      <tbody>${['1 kHz – 10 kHz', '10 kHz – 100 kHz', '100 kHz – 1 MHz', '1 MHz – 10 MHz', '10 MHz – 20 MHz', x.row_out].map((r, i) => `<tr><th scope="row">${esc(r)}</th><td data-out="seg${i}">–</td></tr>`).join('')}</tbody>
    </table></div>
    <p class="muted">${esc(x.note)}</p>
  </section>`,
    pdn: x => `<form id="pdn-form" class="dy-form">
    <h2>${esc(x.in_heading)}</h2>
    ${field('v', x.v, 1.0, 'min="0.01" step="0.05"')}
    ${field('ripple', x.ripple, 5, 'min="0.1" step="0.5"')}
    ${field('di', x.di, 10, 'min="0.001" step="1"')}
    ${field('c', x.c, 1, 'min="0.0001" step="any"')}
    ${field('esr', x.esr, 10, 'min="0.01" step="1"')}
    ${field('esl', x.esl, 0.5, 'min="0.001" step="0.05"')}
    ${field('n', x.n, 10, 'min="1" step="1"')}
  </form>
  <section class="dy-out" aria-live="polite">
    <h2>${esc(x.out_heading)}</h2>
    <dl class="dy-stats">${stat('zt', x.zt)}${stat('srf', x.srf)}${stat('zsrf', x.zsrf)}${stat('flo', x.flo)}${stat('fhi', x.fhi)}${stat('nmin', x.nmin)}</dl>
    <p id="pdn-warn" class="muted" hidden>${esc(x.warn)}</p>
    <svg id="pdn-chart" class="sta-chart" viewBox="0 0 600 320" role="img" aria-label="${esc(x.chart_label)}" data-labels="${esc(JSON.stringify({ x: x.x_label, y: x.y_label }))}"></svg>
    <p class="muted">${esc(x.chart_note)}</p>
    <p class="muted">${esc(x.note)}</p>
  </section>`,
    'quiz-set': x => `<form id="qs-form" class="dy-form qs-form">
    <h2>${esc(x.in_heading)}</h2>
    <label class="dy-field qs-wide"><span>${esc(x.name_label)}</span><input name="t" type="text" maxlength="80" placeholder="${esc(x.name_ph)}"></label>
    ${select('n', x.count_label, [5, 10, 20, 30, 50].map(v => [v, String(v)]), 10)}
    <fieldset class="qs-topics qs-wide">
      <legend>${esc(x.topics_label)} <button type="button" class="btn btn-ghost btn-small" data-all>${esc(x.all)}</button> <button type="button" class="btn btn-ghost btn-small" data-none>${esc(x.none)}</button></legend>
      ${exams.flatMap(e => e.groups.map(gr => live.filter(c => c.exam === e.id && c.group === gr.id))).filter(l => l.length).map(l => `<div class="qs-group">${l.map(c => `<label><input type="checkbox" name="c" value="${c.id}"> ${esc(c.name)}</label>`).join('')}</div>`).join('')}
    </fieldset>
    <p class="qs-wide"><button type="submit" class="btn btn-primary">${esc(x.make)}</button></p>
  </form>
  <section class="dy-out" id="qs-out" hidden aria-live="polite">
    <h2>${esc(x.result_heading)}</h2>
    <p><input type="text" id="qs-url" class="qs-url" readonly></p>
    <p><button type="button" class="btn btn-primary btn-small" id="qs-copy" data-done="${esc(x.copied)}">${esc(x.copy)}</button> <a class="btn btn-ghost btn-small" id="qs-open" href="#" target="_blank" rel="noopener">${esc(x.open)}</a></p>
    <p class="muted">${esc(x.note)}</p>
  </section>`,
  };
  const toolPath = (tool, x) => `${x.path}tools/${tool.slug}/`;
  for (const tool of toolsIn(code)) {
    const x = tool.text[code];
    const tq = (tool.questions ?? []).map(id => qById.get(id)).filter(Boolean);
    const tt = (tool.terms ?? []).map(k => terms.find(y => y.key === k)).filter(Boolean);
    const tc = catOf(tool.cat);
    page({
      path: toolPath(tool, L),
      alt: Object.fromEntries(langs.filter(y => tool.text[y.code]).map(y => [y.code, toolPath(tool, y)])),
      fallback: y => `${y.path}tools/`,
      title: x.title,
      description: x.description,
      scripts: [`${tool.id}.js`, 'answer.js'],
      jsonld: [
        crumbs([t('breadcrumb_top'), home], [S.tools_title, `${home}tools/`], [x.h1, toolPath(tool, L)]),
        { '@context': 'https://schema.org', '@type': 'WebApplication', name: x.h1, description: x.description, url: abs(toolPath(tool, L)), inLanguage: L.htmlLang,
          applicationCategory: 'EducationalApplication', operatingSystem: 'Any', offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } },
        { '@context': 'https://schema.org', '@type': 'FAQPage',
          mainEntity: x.faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
      ],
      content: `<nav class="breadcrumb"><a href="${home}">${esc(t('breadcrumb_top'))}</a> <span>›</span> <a href="${home}tools/">${esc(S.tools_title)}</a></nav>
<h1>${esc(x.h1)}</h1>
<p class="lead">${esc(x.lead)}</p>
<div class="dy">
  ${toolBody[tool.id](x)}
  <section class="dy-out" id="sweep" hidden>
    <h2>${esc(S.sweep_heading)}</h2>
    <div class="sweep-pick">
      <label class="dy-field"><span>${esc(S.sweep_x)}</span><select name="sweep-x"></select></label>
      <label class="dy-field"><span>${esc(S.sweep_y)}</span><select name="sweep-y"></select></label>
    </div>
    <svg class="sta-chart" viewBox="0 0 600 320" role="img" aria-label="${esc(S.sweep_heading)}"></svg>
    <p class="muted">${esc(S.sweep_note)}</p>
  </section>
</div>
${x.sections.map(sec => `<section class="term-about">
  <h2>${esc(sec.h)}</h2>
  <p>${linked(sec.p)}</p>
</section>`).join('\n')}
${tc && qs[tc.id]?.length ? `<p><a class="btn btn-primary" href="${home}quiz/?mode=category&amp;c=${tc.id}&amp;n=10" rel="nofollow">${esc(x.practice)}</a></p>` : ''}
${tq.length ? `<section>${tq.map(miniQ).join('')}</section>` : ''}
<section class="faq">
  <h2>${esc(t('compare_faq'))}</h2>${x.faq.map(f => `
  <h3>${esc(f.q)}</h3>
  <p>${esc(f.a)}</p>`).join('')}
</section>
<div data-ad="tool"></div>
${tt.length ? `<section>
  <h2>${esc(x.related)}</h2>
  <p class="term-chips">${tt.map(y => `<a class="chip" href="${home}term/${termSlug[y.key]}/">${esc(y.term)}</a>`).join(' ')}</p>
</section>` : ''}
${toolsIn(code).length > 1 ? `<section>
  <h2>${esc(S.tools_title)}</h2>
  <div class="mode-grid compact">${toolsIn(code).filter(y => y !== tool).map(y => `<a class="mode-card" href="${home}tools/${y.slug}/"><strong>${esc(y.text[code].h1)}</strong><span>${esc(y.text[code].card)}</span></a>`).join('')}</div>
</section>` : ''}`,
    });
  }
  // 計算ツールの一覧 /tools/
  if (toolsIn(code).length) {
    page({
      path: `${L.path}tools/`,
      alt: Object.fromEntries(langs.filter(y => toolsIn(y.code).length).map(y => [y.code, `${y.path}tools/`])),
      title: S.tools_title,
      description: S.tools_lead,
      content: `<nav class="breadcrumb"><a href="${home}">${esc(t('breadcrumb_top'))}</a></nav>
<h1>${esc(S.tools_title)}</h1>
<p class="lead">${esc(S.tools_lead)}</p>
<div class="mode-grid">${toolsIn(code).map(y => `<a class="mode-card" href="${home}tools/${y.slug}/"><strong>${esc(y.text[code].h1)}</strong><span>${esc(y.text[code].card)}</span></a>`).join('')}</div>
<div data-ad="tools"></div>`,
    });
  }

  // 比較ページ /compare/ と /compare/{slug}/
  const cmpLangs = slug => langs.filter(x => x.code === defLang || readOpt(`data/i18n/${x.code}/compare.json`, {})[slug]);
  if (cmp.length) {
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
        scripts: ['compare.js', 'answer.js'],
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

  // ニュース用語の一覧 /news-terms/(新しい順)。各語のページは用語ページ(/term/{slug}/)に「なぜ今話題なのか」などを足したもの
  const ym = /^\d{4}-(?:\d{2}(?:-\d{2})?|Q[1-4])$/;
  for (const e of news) {
    const where = `data/news-terms.json「${e.term}」`;
    if (!glossary.some(g => g.term === e.term)) throw new Error(`${where}: 用語集にない語です(先に glossary.json に足してください)`);
    if (e.period?.length !== 2 || e.period.some(d => !ym.test(d))) throw new Error(`${where}: period は ["YYYY-MM", "YYYY-MM"] にしてください`);
    if (e.why.some(w => !ym.test(w.date) || !w.text)) throw new Error(`${where}(${code}): why の date(YYYY-MM-DD / YYYY-MM / YYYY-Qn)か本文がありません`);
    if (!e.short || !e.diff) throw new Error(`${where}(${code}): short と diff は必須です`);
    if (e.question && isDef && !qById.has(e.question)) throw new Error(`${where}: 存在しない問題 ${e.question}`);
    for (const k of e.terms ?? []) if (!glossary.some(g => g.term === k)) throw new Error(`${where}: 用語集にない語 ${k}`);
    for (const id of e.figures ?? []) if (!figs[id]) throw new Error(`${where}: 存在しない図 ${id}`);
  }
  const fmtDate = d => {
    const [y, m, day] = d.split('-');
    if (m.startsWith('Q')) return t('news_quarter', { y, q: m.slice(1) });
    return new Intl.DateTimeFormat(L.locale, { year: 'numeric', month: 'long', ...(day ? { day: 'numeric' } : {}), timeZone: 'UTC' })
      .format(new Date(Date.UTC(+y, +m - 1, +(day ?? 1))));
  };
  const newsPeriod = e => t('news_period', { from: fmtDate(e.period[0]), to: fmtDate(e.period[1]) });
  const newsName = e => e.label ?? terms.find(g => g.key === e.term).term;
  if (news.length) {
    const newsUrl = `${home}news-terms/`;
    page({
      path: `${L.path}news-terms/`,
      alt: Object.fromEntries(langs.filter(x => x.code === defLang || Object.keys(readOpt(`data/i18n/${x.code}/news-terms.json`, {})).length).map(x => [x.code, `${x.path}news-terms/`])),
      title: S.news_title,
      description: t('news_description', { terms: news.slice(0, 5).map(newsName).join(', ') }),
      jsonld: [
        crumbs([t('breadcrumb_top'), home], [S.nav_glossary, `${home}glossary/`], [S.news_title, newsUrl]),
        { '@context': 'https://schema.org', '@type': 'ItemList', name: S.news_title,
          itemListElement: news.map((e, i) => ({ '@type': 'ListItem', position: i + 1, name: newsName(e), url: abs(`${home}term/${termSlug[e.term]}/`) })) },
      ],
      content: `<nav class="breadcrumb"><a href="${home}">${esc(t('breadcrumb_top'))}</a> <span>›</span> <a href="${home}glossary/">${esc(S.nav_glossary)}</a></nav>
<h1>${esc(S.news_title)}</h1>
<p class="lead">${esc(S.news_lead)}</p>
<ul class="cmp-list news-list">${news.map(e => `
  <li><a class="cmp-card" href="${home}term/${termSlug[e.term]}/"><strong>${esc(newsName(e))}</strong><span class="news-period">${esc(newsPeriod(e))}</span><span>${esc(e.short)}</span></a></li>`).join('')}
</ul>
<p class="muted">${esc(S.news_note)}</p>
<div data-ad="glossary"></div>
<p><a class="btn btn-ghost" href="${home}glossary/">${esc(t('term_to_glossary'))}</a></p>`,
    });
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
    // ニュース用語は、確認問題として指定した1問だけを出す
    const nw = newsOf(g.key);
    const nwQ = nw?.question && qById.get(nw.question);
    const pick = nwQ ? [nwQ] : (pickable.some(q => q.inQ) ? pickable.filter(q => q.inQ) : pickable).slice(0, 2);
    const practiceHtml = pick.length ? `<section>
  <h2>${esc(t('term_practice', { term: g.term }))}</h2>${pick.map(q => `
  <article class="q-mini"${qData(q)}>
    <h3><a href="${base}${qUrl(q.cat, q.id)}">${esc(q.question)}</a></h3>
    <ol class="q-choices">${q.choices.map((ch, k) => `<li><span class="choice-mark">${mark(k)}</span><span class="choice-text">${esc(ch)}</span></li>`).join('')}</ol>
    <details class="q-answer"><summary>${esc(t('answer_toggle'))}</summary><p class="verdict ok">${esc(t('answer_is', { mark: mark(q.answer), text: q.choices[q.answer] }))}</p><p class="explanation">${linked(q.explanation)}</p></details>
  </article>`).join('')}
</section>` : '';
    // 詳しい解説(about: 見出しと段落)とよくある質問(faq)。用語集の訳にあるときだけ出す(今は表示回数の多い英語の用語)
    // 段落の中の用語は、このページ自身の語を除いて用語ページにリンクする
    const linkedOther = text => linkTerms(text, matcher).map(p => (typeof p === 'string' ? esc(p)
      : p.id === g.key ? esc(p.text) : `<a class="term-link" href="${home}term/${termSlug[p.id]}/">${esc(p.text)}</a>`)).join('');
    const about = g.about ?? [];
    const faq = g.faq ?? [];
    const aboutHtml = about.map(s => `<section class="term-about">
  <h2>${esc(s.h)}</h2>
  <p>${linkedOther(s.p)}</p>
</section>`).join('\n');
    const faqHtml = faq.length ? `<section class="faq">
  <h2>${esc(t('compare_faq'))}</h2>${faq.map(x => `
  <h3>${esc(x.q)}</h3>
  <p>${esc(x.a)}</p>`).join('')}
</section>` : '';
    // ニュース用語: 「ひとことで言うと」「なぜ今話題なのか(日付つき)」を解説の前に、「既存技術との違い」を解説の後に置く
    const termCmp = cmp.filter(e => (e.terms ?? []).includes(g.key) || termIds([e.title, ...(e.items ?? [])].join(' ')).includes(g.key));
    const nwFigs = (nw?.figures ?? []).filter(id => id !== fig?.figureId).map(id => ({ id, svg: localizeFigure(figs[id], figT[id], isDef) })).filter(x => x.svg);
    const newsHtml = nw ? `<section class="news-term">
  <p class="news-badge"><a href="${home}news-terms/">${esc(S.news_title)}</a> · ${esc(t('news_period_label'))}: ${esc(newsPeriod(nw))}</p>
  <h2>${esc(t('news_short'))}</h2>
  <p>${linkedOther(nw.short)}</p>
  <h2>${esc(t('news_why'))}</h2>
  <ul class="news-why">${nw.why.map(w => `<li><time datetime="${/Q/.test(w.date) ? w.date.slice(0, 4) : w.date}">${esc(fmtDate(w.date))}</time> ${esc(w.text)}</li>`).join('')}</ul>
  ${nw.background ? `<p>${linkedOther(nw.background)}</p>` : ''}
  <details class="news-sources"><summary>${esc(t('news_sources'))}</summary><ul>${nw.sources.map(x => `<li><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.name)}</a>${x.date ? ` (${esc(fmtDate(x.date))})` : ''}</li>`).join('')}</ul></details>
</section>
${nwFigs.map(x => figureHtml(x.svg, x.id)).join('\n')}` : '';
    const diffHtml = nw ? `<section>
  <h2>${esc(t('news_diff'))}</h2>
  <p>${linkedOther(nw.diff)}</p>
  ${termCmp.length ? cmpCards(termCmp) : ''}
</section>` : '';
    if (nw) related.unshift(...(nw.terms ?? []).map(k => terms.find(x => x.key === k)).filter(x => x && !related.includes(x)));
    const termUrl = `${home}term/${termSlug[g.key]}/`;
    page({
      path: `${L.path}term/${termSlug[g.key]}/`,
      alt: Object.fromEntries(langs.map(x => [x.code, `${x.path}term/${termSlug[g.key]}/`])),
      title: t('term_title', { term: g.term }),
      description: termDescription(g.desc, list.length),
      scripts: ['answer.js'],
      noindex: !list.length && !nw, // 問題に一度も出てこない用語のページは検索に出さない(ニュース用語は出す)
      jsonld: [
        crumbs([t('breadcrumb_top'), home], [S.nav_glossary, `${home}glossary/`], [g.term, termUrl]),
        { '@context': 'https://schema.org', '@type': 'DefinedTerm', name: g.term, description: g.desc, url: abs(termUrl), inLanguage: L.htmlLang,
          inDefinedTermSet: { '@type': 'DefinedTermSet', name: S.nav_glossary, url: abs(`${home}glossary/`) } },
        ...(faq.length ? [{ '@context': 'https://schema.org', '@type': 'FAQPage',
          mainEntity: faq.map(x => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: x.a } })) }] : []),
        ...(nw ? [{ '@context': 'https://schema.org', '@type': 'Article', headline: t('term_title', { term: g.term }), description: nw.short, inLanguage: L.htmlLang,
          datePublished: nw.added, dateModified: lastmodPrev[`${L.path}term/${termSlug[g.key]}/`]?.date ?? new Date().toLocaleDateString('sv-SE'),
          mainEntityOfPage: abs(termUrl), author: { '@type': 'Organization', name: siteName }, publisher: { '@type': 'Organization', name: siteName } }] : []),
      ],
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
${newsHtml ? `${newsHtml}\n` : ''}${aboutHtml}
${diffHtml ? `${diffHtml}\n` : ''}${practiceHtml}
${faqHtml}
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
${nw ? '' : cmpSection(t('compare_in_term'), termCmp)}
${toolsIn(code).some(y => (y.terms ?? []).includes(g.key)) ? `<section>
  <h2>${esc(S.tools_title)}</h2>
  <div class="mode-grid compact">${toolsIn(code).filter(y => (y.terms ?? []).includes(g.key)).map(y => `<a class="mode-card" href="${home}tools/${y.slug}/"><strong>${esc(y.text[code].h1)}</strong><span>${esc(y.text[code].card)}</span></a>`).join('')}</div>
</section>` : ''}
${related.length ? `<section>
  <h2>${esc(t('term_related'))}</h2>
  <p class="term-chips">${related.slice(0, 10).map(x => `<a class="chip" href="${home}term/${termSlug[x.key]}/">${esc(x.term)}</a>`).join(' ')}</p>
</section>` : ''}
${nw ? `<p><a class="btn btn-ghost" href="${home}news-terms/">${esc(t('news_to_list'))}</a></p>\n` : ''}<p><a class="btn btn-ghost" href="${home}glossary/">${esc(t('term_to_glossary'))}</a></p>`,
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
