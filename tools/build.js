// src/ と data/ から docs/ を生成する。実行: node tools/build.js
// 言語ごとに出力する(既定言語はルート、ほかは /en/ /zh/ など)。翻訳がない項目は既定言語で表示する。
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { validate } from './validate.js';

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
const { errors, warnings } = validate();
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
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
const layout = read('src/templates/layout.html');
const catTpl = read('src/templates/category.html');

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
  const home = base + L.path;
  const siteName = loc(config.siteName, code);

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
    qs[c.id] = questions[c.id].map(({ reviewed, source, ...q }) => ({ ...q, ...(tq[q.id] || {}) }));
    write(`data/${code}/q/${c.id}.json`, JSON.stringify(qs[c.id]));
  }
  write(`data/${code}/index.json`, JSON.stringify({
    lang: code,
    locale: L.locale,
    strings: S,
    exams: exams.map(e => ({ id: e.id, name: exName(e), groups: e.groups.map(g => ({ id: g.id, name: grName(e, g) })) })),
    categories: cats.map(c => ({ id: c.id, exam: c.exam, group: c.group, name: c.name, count: qs[c.id].length })),
  }));

  // ---- HTML部品 ----
  const quizUrl = (m, cat) => `${home}quiz/?mode=${m.id}${cat ? `&amp;c=${cat}` : ''}`;
  const catCards = list => '<ul class="cat-grid">' + list.map(c => `
  <li><a class="cat-card" href="${home}c/${c.id}/">
    <span class="cat-name">${esc(c.name)}</span>
    <span class="cat-meta"><span>${t('n_questions', { n: qs[c.id].length })}</span><span>${t('rate_label')} <b data-rate="${c.id}">—</b></span></span>
  </a></li>`).join('') + '</ul>';
  const modeCards = (list, cat) => '<div class="mode-grid">' + list.map((m, i) => `
  <a class="mode-card${i === 0 ? ' primary' : ''}" href="${quizUrl(m, cat)}" rel="nofollow">
    <strong>${esc(loc(m.label, code))}</strong><span>${esc(loc(m.desc, code))}</span>
  </a>`).join('') + '</div>';
  const categoryList = exams.map(e => `
<section class="exam">
  <h2>${esc(t('exam_heading', { exam: exName(e) }))}</h2>
  ${e.groups.map(g => `<h3 class="group-title">${esc(grName(e, g))}</h3>
  ${catCards(cats.filter(c => c.exam === e.id && c.group === g.id))}`).join('\n')}
</section>`).join('\n');

  const terms = glossary.map(g => ({ ...g, ...(gloT[g.term] || {}), reading: gloT[g.term] ? '' : g.reading }));
  terms.sort((a, b) => (isDef ? a.reading.localeCompare(b.reading, 'ja') : a.term.localeCompare(b.term, L.locale)));
  const glossaryList = '<dl class="glossary">' + terms.map(g => {
    const c = catOf(g.cat);
    return `
  <div class="term">
    <dt>${esc(g.term)}${g.reading ? `<small>${esc(g.reading)}</small>` : ''}</dt>
    <dd>${esc(g.desc)}${c ? ` <a href="${home}c/${c.id}/">${esc(t('related', { name: c.name }))}</a>` : ''}</dd>
  </div>`;
  }).join('') + '</dl>';

  const common = {
    base, home, lang: code, htmlLang: L.htmlLang,
    siteName: esc(siteName),
    year: new Date().getFullYear(),
    contactFormUrl: esc(config.contactFormUrl),
    categoryList, glossaryList,
    topModes: modeCards(modes.filter(m => m.scope.includes('top'))),
    questionTotal: Object.values(qs).reduce((s, x) => s + x.length, 0),
    categoryTotal: categories.length,
    ...Object.fromEntries(Object.entries(S).map(([k, v]) => [`t_${k}`, v])),
  };

  // ---- ページ生成 ----
  // alt: 言語コード → その言語での同じページのパス(なければ省略)
  function page({ path: p, alt, out: file, title, fullTitle, description, noindex, scripts = [], ads = true, content }) {
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
    ].filter(Boolean).join('\n');
    const langLinks = alts.map(x => x.code === code
      ? `<span aria-current="true">${esc(x.label)}</span>`
      : `<a href="${base}${alt[x.code]}" hreflang="${x.htmlLang}" lang="${x.htmlLang}">${esc(x.label)}</a>`).join('');
    if (ads) scripts = ['ads.js', ...scripts];
    write(file || `${p}index.html`, fill(layout, {
      ...common,
      title: esc(tt),
      description: esc(description),
      head,
      langLinks,
      htmlAttrs: ads && config.adPlaceholders ? ' data-ad-ph' : '',
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
    page({
      path: `${L.path}c/${c.id}/`,
      alt: catAlt(c.id),
      title: t('category_title', { name: c.name }),
      description: c.description,
      scripts: ['progress.js'],
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
        modes: count ? modeCards(modes.filter(m => m.scope.includes('category')), c.id) : `<p class="muted">${esc(t('preparing'))}</p>`,
        siblings: catCards(cats.filter(x => x.exam === c.exam && x.group === c.group && x.id !== c.id)),
      }),
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

const total = Object.values(questions).reduce((s, x) => s + x.length, 0);
console.log(`build完了: ${langs.length}言語, ${sitemap.length} ページ（sitemap掲載）, 問題 ${total} 問 → docs/`);
