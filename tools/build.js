// src/ と data/ から docs/ を生成する。実行: node tools/build.js
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { validate } from './validate.js';

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'docs');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const readJSON = p => JSON.parse(read(p));
const write = (p, s) => {
  fs.mkdirSync(path.dirname(path.join(out, p)), { recursive: true });
  fs.writeFileSync(path.join(out, p), s);
};
const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const fill = (tpl, vars) => tpl.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? vars[k] : m));

// ---- 検査 ----
const { errors } = validate();
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

// ---- 読み込み ----
const config = readJSON('config.json');
const baseUrl = config.baseUrl.replace(/\/?$/, '/');
const base = new URL(baseUrl).pathname; // 例: /semicon-quiz/ または /
const exams = readJSON('data/exams.json');
const categories = readJSON('data/categories.json');
const glossary = readJSON('data/glossary.json');
const layout = read('src/templates/layout.html');

const questions = {};
for (const c of categories) {
  const file = path.join(root, `data/questions/${c.id}.json`);
  const qs = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
  questions[c.id] = qs.filter(q => q.reviewed || !config.onlyReviewed);
}

// modes/ のファイルを全部読み込む（ファイルを足せばモードが増える）
const modeDir = path.join(root, 'src/js/modes');
const modes = [];
for (const f of fs.readdirSync(modeDir).filter(f => f.endsWith('.js') && f !== 'index.js')) {
  const m = (await import(pathToFileURL(path.join(modeDir, f)))).default;
  modes.push({ ...m, file: f });
}
modes.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));

// ---- 出力先を作り直す ----
fs.rmSync(out, { recursive: true, force: true });
fs.cpSync(path.join(root, 'src/css'), path.join(out, 'css'), { recursive: true });
fs.cpSync(path.join(root, 'src/js'), path.join(out, 'js'), { recursive: true });
write('js/modes/index.js',
  modes.map((m, i) => `import m${i} from './${m.file}';`).join('\n') +
  `\nexport default [${modes.map((_, i) => `m${i}`).join(', ')}];\n`);

// ---- データ ----
write('data/index.json', JSON.stringify({
  exams,
  categories: categories.map(c => ({ id: c.id, exam: c.exam, group: c.group, name: c.name, count: questions[c.id].length })),
}));
for (const c of categories) {
  write(`data/q/${c.id}.json`, JSON.stringify(questions[c.id].map(({ reviewed, source, ...q }) => q)));
}

// ---- HTML部品 ----
const groupOf = c => exams.find(e => e.id === c.exam).groups.find(g => g.id === c.group);
const quizUrl = (m, cat) => `${base}quiz/?mode=${m.id}${cat ? `&amp;c=${cat}` : ''}`;

const catCards = list => '<ul class="cat-grid">' + list.map(c => `
  <li><a class="cat-card" href="${base}c/${c.id}/">
    <span class="cat-name">${esc(c.name)}</span>
    <span class="cat-meta"><span>${questions[c.id].length}問</span><span>正答率 <b data-rate="${c.id}">—</b></span></span>
  </a></li>`).join('') + '</ul>';

const modeCards = (list, cat) => '<div class="mode-grid">' + list.map((m, i) => `
  <a class="mode-card${i === 0 ? ' primary' : ''}" href="${quizUrl(m, cat)}" rel="nofollow">
    <strong>${esc(m.label)}</strong><span>${esc(m.desc)}</span>
  </a>`).join('') + '</div>';

const categoryList = exams.map(e => `
<section class="exam">
  <h2>${esc(e.name)}：分野から選ぶ</h2>
  ${e.groups.map(g => `<h3 class="group-title">${esc(g.name)}</h3>
  ${catCards(categories.filter(c => c.exam === e.id && c.group === g.id))}`).join('\n')}
</section>`).join('\n');

const glossaryList = '<dl class="glossary">' + [...glossary]
  .sort((a, b) => a.reading.localeCompare(b.reading, 'ja'))
  .map(g => {
    const cat = categories.find(c => c.id === g.cat);
    return `
  <div class="term">
    <dt>${esc(g.term)}<small>${esc(g.reading)}</small></dt>
    <dd>${esc(g.desc)}${cat ? ` <a href="${base}c/${cat.id}/">関連：${esc(cat.name)} →</a>` : ''}</dd>
  </div>`;
  }).join('') + '</dl>';

const common = {
  base,
  siteName: esc(config.siteName),
  year: new Date().getFullYear(),
  contactFormUrl: esc(config.contactFormUrl),
  categoryList,
  glossaryList,
  topModes: modeCards(modes.filter(m => m.scope.includes('top'))),
  questionTotal: Object.values(questions).reduce((s, qs) => s + qs.length, 0),
  categoryTotal: categories.length,
};

// ---- ページ生成 ----
const sitemap = [];
function page({ path: p, out: file, title, fullTitle, description, noindex, scripts = [], ads = true, content }) {
  const url = baseUrl + p;
  const t = fullTitle || (title ? `${title} | ${config.siteName}` : config.siteName);
  const head = [
    noindex ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${url}">`,
    `<meta property="og:type" content="${p ? 'article' : 'website'}">`,
    `<meta property="og:title" content="${esc(t)}">`,
    `<meta property="og:description" content="${esc(description)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:site_name" content="${esc(config.siteName)}">`,
    '<meta name="twitter:card" content="summary">',
  ].join('\n');
  if (ads) scripts = ['ads.js', ...scripts];
  write(file || `${p}index.html`, fill(layout, {
    ...common,
    title: esc(t),
    description: esc(description),
    head,
    htmlAttrs: ads && config.adPlaceholders ? ' data-ad-ph' : '',
    content,
    scripts: scripts.map(s => `<script type="module" src="${base}js/${s}"></script>`).join('\n'),
  }));
  if (!noindex) sitemap.push(url);
}

// src/pages/*.html（ファイルを足せばページが増える）
for (const f of fs.readdirSync(path.join(root, 'src/pages')).filter(f => f.endsWith('.html'))) {
  const src = read(`src/pages/${f}`);
  const m = src.match(/^<!--\s*(\{[\s\S]*?\})\s*-->/);
  const name = f.slice(0, -5);
  page({ path: name === 'index' ? '' : `${name}/`, ...JSON.parse(m[1]), content: fill(src.slice(m[0].length), common) });
}

// 分野ページ /c/{id}/
const catTpl = read('src/templates/category.html');
for (const c of categories) {
  const g = groupOf(c);
  const count = questions[c.id].length;
  page({
    path: `c/${c.id}/`,
    title: `${c.name}の練習問題と解説`,
    description: c.description,
    scripts: ['progress.js'],
    content: fill(catTpl, {
      ...common,
      id: c.id,
      name: esc(c.name),
      description: esc(c.description),
      groupName: esc(g.name),
      count,
      intro: c.intro.split('\n').map(p => `<p>${esc(p)}</p>`).join('\n'),
      modes: count ? modeCards(modes.filter(m => m.scope.includes('category')), c.id) : '<p class="muted">この分野の問題は準備中です。</p>',
      siblings: catCards(categories.filter(x => x.exam === c.exam && x.group === c.group && x.id !== c.id)),
    }),
  });
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

console.log(`build完了: ${sitemap.length} ページ（sitemap掲載）, 問題 ${common.questionTotal} 問 → docs/`);
