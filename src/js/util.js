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
  for (const { id, term, aliases = [] } of terms) {
    const m = term.match(/^(.*?)\s*[(（](.+?)[)）]/);
    for (const k of [term, ...(m ? [m[1], m[2]] : []), ...aliases]) {
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
  // 英字・数字の境界(「CMOS」を「CMOSFET」の中で一致させない)は、語の端が英数字のときだけ linkTerms で確かめる。
  // 正規表現の各語に境界を付けると100倍以上遅くなるため。日本語の語は「投影飛程Rp」「理想係数n」のように英字が続いても一致させる
  return { keys, re: new RegExp(`(${words.join('|')})`, 'gi') };
}

const ALNUM = /[A-Za-z0-9]/;
const bounded = (text, start, end) => !(ALNUM.test(text[start] ?? '') && ALNUM.test(text[start - 1] ?? ''))
  && !(ALNUM.test(text[end - 1] ?? '') && ALNUM.test(text[end] ?? ''));

// 同じ略語の別の意味。「HBM(人体モデル)」は静電気試験のモデルで、メモリのHBMではない
const OTHER_MEANING = /^\s*[(（]\s*(人体|人體|인체|human body|modèle du corps)/i;

// 文章を [文字列 | { text, id }] に分ける。各用語は最初の1回だけ
export function linkTerms(text, { keys, re }) {
  const parts = [];
  const used = new Set();
  let last = 0;
  re.lastIndex = 0;
  for (let m; (m = re.exec(text));) {
    // 英数字の途中で切れている一致は捨て、次の文字から探し直す
    if (!bounded(text, m.index, m.index + m[0].length)) { re.lastIndex = m.index + 1; continue; }
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
