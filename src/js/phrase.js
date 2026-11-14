// 日本語の短い文(見出し・ボタン・カードの題・選択肢)を、語の途中ではなく文節の切れ目で折り返すための区切り(<wbr>)を入れる。
// CSS の word-break: keep-all と組み合わせて使う(区切りのないところでは折り返さず、入りきらないときだけ overflow-wrap で切れる)。
// word-break: auto-phrase は iPhone の Safari が対応していないため、ビルド時(HTML)とクイズ画面(DOM)で同じ規則の区切りを入れる。
// 規則(辞書は使わない簡単なもの):
//  1. ひらがなの後ろに、漢字・カタカナ・英数字・開きカッコが続くところ(「電流の|向き」「による|発光」)。
//     ただし、漢字にはさまれた1字のひらがなは、助詞(の・が・を など)のときだけ(「使い方」「読み出し」は切らない)
//  2. 句読点・中黒・コロン・閉じカッコの後ろ(「構造・|電流」「違い：|構造」)
//  3. 漢字・カタカナ・英数字の後ろの開きカッコの前(「回路解析|(交流」)
const HIRA = /[ぁ-ゖ]/, KANJI = /[一-鿿々〆]/;
const START = /[一-鿿々〆ア-ヺA-Za-z0-9「『（(【［〔]/;
const OPEN = /[「『（(【［〔]/;
const AFTER = /[、。・：，）」』】］〕！？]/;
const CLOSE = /[、。・：，）」』】］〕！？ー\s)]/;
const PARTICLE = new Set(['の', 'が', 'を', 'に', 'で', 'と', 'は', 'も', 'へ', 'や']);

// text の中で区切りを入れる位置(その位置の文字の前で切れる)
export function phraseBreaks(text) {
  const at = [];
  for (let i = 1; i < text.length; i++) {
    const a = text[i - 1], b = text[i];
    if (CLOSE.test(b) || /\s/.test(a)) continue;
    if (HIRA.test(a) && START.test(b)) {
      let j = i - 1;
      while (j > 0 && HIRA.test(text[j - 1])) j--;
      if (i - j === 1 && j > 0 && KANJI.test(text[j - 1]) && KANJI.test(b) && !PARTICLE.has(a)) continue;
      at.push(i);
    } else if (AFTER.test(a) || (a === ':' && !/[\x00-\x7f]/.test(b))) at.push(i);
    else if (OPEN.test(b) && !OPEN.test(a)) at.push(i);
  }
  return at;
}

const insert = (text, mark) => {
  const at = phraseBreaks(text);
  if (!at.length) return text;
  let out = '', last = 0;
  for (const i of at) { out += text.slice(last, i) + mark; last = i; }
  return out + text.slice(last);
};

// ---- HTML(ビルド時): 対象の要素の中の文字にだけ <wbr> を入れる ----
// 対象: 見出し・ボタン・表の見出し・カードの題と短い説明・選択肢・パンくず
const TAGS = /^(h[1-4]|button|summary|th|dt|label)$/;
const CLASSES = /(?:^|\s)(btn|chip|cat-name|cat-blurb|cmp-card|course-card|tile-label|mode-card|choice-text|tg-name|tr-name|ref-tile|rail-h|hero-sample-q|q-text|breadcrumb|area-title|start-card|learn-next|tool-kicker|learn-rows|rail-related|search-list|fig-gallery)(?:\s|$)/;
// 1行で省略する要素(…で切る)には入れない(white-space: nowrap でも <wbr> では折り返すため)
const NOWRAP = /(?:^|\s)(tg-preview|tg-meta|tr-meta)(?:\s|$)/;
const SKIP = /^(script|style|pre|code|svg|math|textarea|select|option|title|kbd|samp)$/;
const VOID = /^(area|base|br|col|embed|hr|img|input|link|meta|source|track|wbr)$/;
export function phraseHtml(html) {
  const parts = html.split(/(<!--[\s\S]*?-->|<[^>]*>)/);
  const stack = []; // [名前, 対象か, 触らないか]
  let on = 0, skip = 0;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (i % 2) {
      const m = p.match(/^<(\/?)([a-zA-Z][\w-]*)/);
      if (!m) continue;
      const name = m[2].toLowerCase();
      if (m[1]) {
        const k = stack.map(x => x[0]).lastIndexOf(name);
        if (k < 0) continue;
        for (const [, o, s] of stack.splice(k)) { on -= o; skip -= s; }
      } else if (!VOID.test(name) && !p.endsWith('/>')) {
        const cls = p.match(/\sclass="([^"]*)"/)?.[1] ?? '';
        const o = TAGS.test(name) || CLASSES.test(cls) ? 1 : 0, s = SKIP.test(name) || NOWRAP.test(cls) ? 1 : 0;
        stack.push([name, o, s]); on += o; skip += s;
      }
    } else if (on > 0 && !skip && p) parts[i] = insert(p, '<wbr>');
  }
  return parts.join('');
}

// ---- DOM(クイズ画面): root の中の、selector に合う要素の文字に <wbr> を入れる ----
export function phraseDom(root, selector) {
  const doc = root.ownerDocument;
  for (const el of root.querySelectorAll(selector)) {
    const walker = doc.createTreeWalker(el, 4 /* SHOW_TEXT */);
    const nodes = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) if (!n.parentElement.closest('pre, code, svg, math, script, style, textarea')) nodes.push(n);
    for (const n of nodes) {
      const at = phraseBreaks(n.nodeValue);
      if (!at.length) continue;
      const frag = doc.createDocumentFragment();
      let last = 0;
      for (const i of at) { frag.append(n.nodeValue.slice(last, i), doc.createElement('wbr')); last = i; }
      frag.append(n.nodeValue.slice(last));
      n.replaceWith(frag);
    }
  }
}
