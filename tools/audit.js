// 品質点検(全件・機械的)。ビルドした docs/ と data/ を読み、ページを種類・言語・分野ごとに数え、
// 既存の検査(validate・check-content・check-site)が見ていない項目を調べる:
//   検索の構成: サイトマップと noindex の食い違い、canonical が自分以外、hreflang の行き先の欠け・片方向
//   リンク: ほかのページから1本もリンクされていない検索対象のページ(孤立)
//   表示: img の alt なし、埋め込みの失敗(中身が undefined・NaN・null だけの要素、[object Object])
//   問題データ: 選択肢の重複・空欄、解説の欠け、訳の欠け・余分、訳の選択肢の数の食い違い
// 結果: quality/audit-data/latest.json(件数と例)。標準出力に要約を出す。誤りがあれば終了コード1
// 実行: node tools/build.js のあと node tools/audit.js
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const docs = path.join(root, 'docs');
const readJSON = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const config = readJSON('config.json');
const baseUrl = config.baseUrl.replace(/\/?$/, '/');
const LANGS = ['en', 'zh-hant', 'ko', 'de', 'nl', 'fr']; // ja はパスの接頭辞なし
const EXAMPLES = 15; // 種類ごとに残す例の数

// ---- ページを集める
const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name === 'index.html') files.push(p);
  }
})(docs);

const compareCat = Object.fromEntries(readJSON('data/compare.json').map(c => [c.slug, c.cat]));
const toolCat = Object.fromEntries(fs.readdirSync(path.join(root, 'data/tools')).filter(f => f.endsWith('.json'))
  .map(f => readJSON(`data/tools/${f}`)).map(t => [t.slug, t.cat]));

const pages = new Map(); // url path → 情報
for (const f of files) {
  const rel = '/' + path.relative(docs, f).replace(/index\.html$/, '').split(path.sep).join('/');
  const html = fs.readFileSync(f, 'utf8');
  const seg = rel.split('/').filter(Boolean);
  const lang = LANGS.includes(seg[0]) ? seg.shift() : 'ja';
  const type = seg.length === 0 ? 'top' : seg.length === 1 ? `${seg[0]}-index` : seg[0];
  let field = '';
  if (type === 'q' || type === 'c') field = seg[1];
  else if (type === 'compare') field = compareCat[seg[1]] ?? '';
  else if (type === 'tools') field = toolCat[seg[1]] ?? '';
  // 用語ページとやさしい解説は、ページの中の分野ページへのリンク(/c/{分野}/)で分野を決める
  else if (type === 'term' || type === 'learn') field = (html.match(/href="(?:\/[a-z-]+)?\/c\/([a-z0-9-]+)\/"/) ?? [])[1] ?? '';
  const noindex = /<meta name="robots" content="[^"]*noindex/.test(html);
  const canonical = (html.match(/<link rel="canonical" href="([^"]*)"/) ?? [])[1] ?? null;
  const hreflang = [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)].map(m => [m[1], m[2]]);
  const links = new Set([...html.matchAll(/href="(\/[^"#?]*)/g)].map(m => m[1].replace(/([^/])$/, '$1/')).filter(h => !/\.[a-z0-9]+\/$/i.test(h)));
  const imgNoAlt = [...html.matchAll(/<img\b(?![^>]*\balt=)[^>]*>/g)].length;
  // 本文の崩れ(スクリプトとJSON-LDを除いた表示テキスト)
  // 解説の中の「NaN」「undefined reference」、シェルの ${f%.log} などは正しい内容なので数えない。
  // コード・リンク・用語名の欄を除き、要素の中身がその語だけのもの(埋め込みの失敗)と [object Object] だけを見る
  const body = html.replace(/<(script|style|pre|code)\b[\s\S]*?<\/\1>/g, '');
  const broken = [...body.matchAll(/<([a-z0-9]+)\b[^>]*>\s*(undefined|NaN|null)\s*</g)].filter(m => !['a', 'span'].includes(m[1])).map(m => m[2])
    .concat(body.replace(/<[^>]+>/g, ' ').match(/\[object Object\]/g) ?? []);
  pages.set(rel, { rel, lang, type, field, noindex, canonical, hreflang, links, imgNoAlt, broken });
}

// ---- サイトマップ
const sitemapUrls = new Set();
const mapDir = path.join(docs, 'sitemaps');
for (const f of fs.existsSync(mapDir) ? fs.readdirSync(mapDir) : []) {
  for (const m of fs.readFileSync(path.join(mapDir, f), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)) sitemapUrls.add(m[1].replace(baseUrl, '/'));
}

const issues = {}; // 種類 → { n, examples }
const add = (kind, example) => {
  const x = issues[kind] ??= { n: 0, examples: [] };
  x.n++;
  if (x.examples.length < EXAMPLES) x.examples.push(example);
};

// ---- 検索の構成
const inbound = new Map();
for (const p of pages.values()) for (const l of p.links) if (l !== p.rel) inbound.set(l, (inbound.get(l) ?? 0) + 1);
for (const p of pages.values()) {
  const inMap = sitemapUrls.has(p.rel);
  if (p.noindex && inMap) add('seo: noindex なのにサイトマップにある', p.rel);
  if (!p.noindex && !inMap && p.type !== '404') add('seo: 検索対象なのにサイトマップにない', p.rel);
  if (!p.noindex && p.canonical && p.canonical !== baseUrl.replace(/\/$/, '') + p.rel) add('seo: canonical が自分以外', `${p.rel} → ${p.canonical}`);
  if (!p.noindex && !p.canonical) add('seo: canonical がない', p.rel);
  for (const [hl, href] of p.hreflang) {
    const t = pages.get(href.replace(baseUrl, '/'));
    if (!t) add('seo: hreflang の行き先のページがない', `${p.rel} [${hl}] → ${href}`);
    else if (t.noindex) add('seo: hreflang の行き先が noindex', `${p.rel} [${hl}] → ${href}`);
    else if (!t.hreflang.some(([, h]) => h.replace(baseUrl, '/') === p.rel)) add('seo: hreflang が片方向(戻りがない)', `${p.rel} [${hl}] → ${href}`);
  }
  if (!p.noindex && !(inbound.get(p.rel) > 0) && p.type !== 'top') add('link: 検索対象なのにどこからもリンクされていない', p.rel);
  if (p.imgNoAlt) add('display: alt のない画像', `${p.rel} (${p.imgNoAlt})`);
  if (p.broken.length) add('display: 本文に undefined・NaN などが出ている', `${p.rel} (${[...new Set(p.broken)].join(' ')})`);
}
for (const u of sitemapUrls) if (!pages.has(u)) add('seo: サイトマップの URL にページがない', u);

// ---- 問題データ
// 選択肢の比較は空白だけをそろえる(NFKC や大文字小文字をそろえると「2ⁿ」と「2n」、「N」と「n」が同じになってしまう)
const norm = s => String(s ?? '').replace(/\s+/g, ' ').trim();
const qDir = path.join(root, 'data/questions');
const jaQ = new Map();
for (const f of fs.readdirSync(qDir).filter(f => f.endsWith('.json'))) {
  for (const q of readJSON(`data/questions/${f}`)) {
    jaQ.set(q.id, q);
    const ch = q.choices ?? [];
    if (ch.some(c => !norm(c))) add('question: 空の選択肢(ja)', q.id);
    if (new Set(ch.map(norm)).size !== ch.length) add('question: 同じ選択肢が2つ以上(ja)', q.id);
    if (!norm(q.explanation)) add('question: 解説がない(ja)', q.id);
    if (norm(q.question) && ch.some(c => norm(c) === norm(q.question))) add('question: 選択肢が問題文と同じ(ja)', q.id);
  }
}
const qCount = { ja: jaQ.size };
for (const l of LANGS) {
  const dir = path.join(root, `data/i18n/${l}/questions`);
  if (!fs.existsSync(dir)) continue;
  let n = 0;
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
    const tr = readJSON(`data/i18n/${l}/questions/${f}`);
    for (const [id, t] of Object.entries(tr)) {
      n++;
      const q = jaQ.get(id);
      if (!q) { add(`question: 日本語にない問題の訳(${l})`, id); continue; }
      if (!Array.isArray(t.choices) || t.choices.length !== q.choices.length) add(`question: 訳の選択肢の数が違う(${l})`, id);
      else {
        if (t.choices.some(c => !norm(c))) add(`question: 訳に空の選択肢(${l})`, id);
        if (new Set(t.choices.map(norm)).size !== t.choices.length) add(`question: 訳で同じ選択肢が2つ以上(${l})`, id);
      }
      if (!norm(t.question) || !norm(t.explanation)) add(`question: 訳の問題文か解説がない(${l})`, id);
    }
  }
  qCount[l] = n;
}

// ---- 件数(言語 × 種類、検索対象/noindex)と、分野ごとの件数(日本語・英語・繁体字)
const counts = {};
for (const p of pages.values()) {
  const k = `${p.lang}|${p.type}`;
  const c = counts[k] ??= { index: 0, noindex: 0 };
  c[p.noindex ? 'noindex' : 'index']++;
}
const byField = {};
for (const p of pages.values()) {
  if (!['ja', 'en', 'zh-hant'].includes(p.lang) || !['q', 'term', 'compare', 'tools', 'learn'].includes(p.type)) continue;
  const f = byField[p.field || '(なし)'] ??= {};
  const k = `${p.type}${p.noindex ? '(noindex)' : ''}`;
  f[k] = (f[k] ?? 0) + 1;
}

// ---- 種類どうしのつながり(問題 → 用語、用語 → ツール・問題、ツール → 用語)。検索対象のページだけで数える
const linkTo = (p, t) => [...p.links].some(l => pages.get(l)?.type === t);
const linkStats = {};
for (const [from, to] of [['q', 'term'], ['term', 'tools'], ['term', 'q'], ['term', 'learn'], ['tools', 'term'], ['tools', 'q'], ['learn', 'term'], ['compare', 'term']]) {
  const list = [...pages.values()].filter(p => p.type === from && !p.noindex);
  const n = list.filter(p => linkTo(p, to)).length;
  linkStats[`${from} → ${to}`] = { pages: list.length, linked: n, rate: list.length ? Math.round((n / list.length) * 1000) / 10 : null };
}

const errorKinds = Object.keys(issues).filter(k => /^seo: (noindex なのに|サイトマップの URL|hreflang の行き先のページ|canonical が自分)|^question: (空|同じ|解説|訳の選択肢の数)|^display: 本文/.test(k));
const result = { date: new Date().toISOString().slice(0, 10), pages: pages.size, sitemapUrls: sitemapUrls.size, questions: qCount, counts, byField, linkStats, issues };
fs.mkdirSync(path.join(root, 'quality/audit-data'), { recursive: true });
fs.writeFileSync(path.join(root, 'quality/audit-data/latest.json'), JSON.stringify(result, null, 1) + '\n');

console.log(`ページ ${pages.size} 件(サイトマップ ${sitemapUrls.size} URL)、問題 ${Object.entries(qCount).map(([l, n]) => `${l} ${n}`).join(' / ')}`);
for (const [k, v] of Object.entries(linkStats)) console.log(`つながり: ${k} … ${v.linked}/${v.pages}(${v.rate}%)`);
for (const [k, v] of Object.entries(issues).sort()) console.log(`${errorKinds.includes(k) ? '誤り' : '注意'}: ${k} … ${v.n} 件(例: ${v.examples.slice(0, 3).join(' / ')})`);
if (!Object.keys(issues).length) console.log('OK: 問題は見つかりませんでした');
process.exitCode = errorKinds.length ? 1 : 0;
