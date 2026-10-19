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
  // カタカナだけの語は、長いカタカナ語の一部には一致させない(「ジクロロシラン」の中の「シラン」など)
  const words = [...keys.keys()].sort((a, b) => b.length - a.length)
    .map(k => {
      const w = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return /^[ァ-ヶー・]+$/.test(k) ? `(?<![ァ-ヶー])${w}(?![ァ-ヶー])` : w;
    });
  return { keys, re: new RegExp(`(?<![A-Za-z0-9])(${words.join('|')})(?![A-Za-z0-9])`, 'gi') };
}

// 同じ略語の別の意味。「HBM(人体モデル)」は静電気試験のモデルで、メモリのHBMではない
const OTHER_MEANING = /^\s*[(（]\s*(人体|人體|인체|human body|modèle du corps)/i;

// 文章を [文字列 | { text, id }] に分ける。各用語は最初の1回だけ
export function linkTerms(text, { keys, re }) {
  const parts = [];
  const used = new Set();
  let last = 0;
  for (const m of text.matchAll(re)) {
    const id = keys.get(m[0].toLowerCase());
    // ハイフンでつながった別の略語の一部(「ICP-MS」の中の「ICP」など)はリンクしない。「SiC-based」「GPIO-Pins」「MEMS-Gyroskop」は対象
    const end = m.index + m[0].length;
    const acronym = /^[A-Z0-9]+$/.test(m[0]);
    if (used.has(id) || (acronym && (/^-[A-Z0-9]{2,}(?![a-z])/.test(text.slice(end, end + 12))
      || /(?:^|[^A-Za-z0-9])[A-Z0-9]{2,}-$/.test(text.slice(Math.max(0, m.index - 12), m.index))
      || OTHER_MEANING.test(text.slice(end, end + 24))))) continue;
    used.add(id);
    parts.push(text.slice(last, m.index), { text: m[0], id });
    last = m.index + m[0].length;
  }
  parts.push(text.slice(last));
  return parts.filter(p => p !== '');
}
