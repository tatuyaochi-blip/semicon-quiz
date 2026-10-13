// DOMに依存しない共通関数（build.js からも読み込まれる）

export function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const sample = (list, n) => shuffle(list).slice(0, n);

// 誤り報告フォームのURL: テンプレートの {id} {lang} を埋める
export const reportUrl = (tpl, id, lang) =>
  tpl.replace('{id}', encodeURIComponent(id)).replace('{lang}', encodeURIComponent(lang));

// 用語集の語から検索用の正規表現を作る。terms: [{ id, term }]
// 「SiC(炭化ケイ素)」は「SiC(炭化ケイ素)」「SiC」「炭化ケイ素」のどれにも一致させる
export function termMatcher(terms) {
  const keys = new Map();
  for (const { id, term } of terms) {
    const m = term.match(/^(.*?)\s*[(（](.+?)[)）]/);
    for (const k of [term, ...(m ? [m[1], m[2]] : [])]) {
      const key = k.trim().toLowerCase();
      if (key.length >= 2 && !keys.has(key)) keys.set(key, id);
    }
  }
  const words = [...keys.keys()].sort((a, b) => b.length - a.length)
    .map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return { keys, re: new RegExp(`(?<![A-Za-z0-9])(${words.join('|')})(?![A-Za-z0-9])`, 'gi') };
}

// 文章を [文字列 | { text, id }] に分ける。各用語は最初の1回だけ
export function linkTerms(text, { keys, re }) {
  const parts = [];
  const used = new Set();
  let last = 0;
  for (const m of text.matchAll(re)) {
    const id = keys.get(m[0].toLowerCase());
    if (used.has(id)) continue;
    used.add(id);
    parts.push(text.slice(last, m.index), { text: m[0], id });
    last = m.index + m[0].length;
  }
  parts.push(text.slice(last));
  return parts.filter(p => p !== '');
}
