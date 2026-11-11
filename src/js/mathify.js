// 本文の中の数式と単位を読みやすく整える(ビルド時の HTML と、クイズ画面の DOM の両方で使う)。
// 1. 「数値 単位」の間のスペースを、行が切れないスペース(U+00A0)にする(0.5 V、200 µA/V²、0.05 /V)
// 2. 演算子の前後で行が切れないようにする。長い式は「=」の前でだけ切れる(値の代入 Vth = 0.5 V は切らない)
// 3. 電気・デバイスの記号の添字を下付きにする(VGS → V_GS、μnCox → μ_n C_ox、gm → g_m)。
//    IC・ID・NA など、ほかの意味もある語は、式の中で、同じ段落にデバイスの記号があるときだけ変える
// 文字列の中の下付きは SUB0 … SUB1 で囲んで返し、HTML では <sub>、DOM では sub 要素にする
const NB = ' ', SUB0 = '', SUB1 = '';
const sub = s => `${SUB0}${s}${SUB1}`;

// 単位(数値の直後に来るもの)。後ろに英字が続くとき(単語)は単位としない
const PREFIX = '[µμmkKMGTnpfac]?';
const UNIT = `(?:${PREFIX}(?:Ω|Hz|eV|V|A|W|F|H|J|K|N|Pa|s|m|g|b|B|bit|bps|mol|Wb|T|S|C)|%|‰|℃|°C|°|Å|dB[a-zµ]{0,2}|dBc|ppm|ppb|FIT|DPPM|min|h|Torr|sccm|slm|rpm|fps|at%|wt%|cm|mm|nm|µm|μm|pm|km|ms|ns|ps|fs|µs|μs|mA|µA|μA|nA|pA|kV|mV|µV|μV|GT)`;
const UNIT_TAIL = '(?:[²³]|⁻[¹²³])?(?:[/·⋅][A-Za-zµμΩ℃°]+(?:[²³]|⁻[¹²³])?)*';
const NUM_UNIT = new RegExp(`([\\d⁰¹²³⁴-⁹])[ ${NB}](?=${UNIT}${UNIT_TAIL}(?![A-Za-z]))`, 'g');
const NUM_PER = new RegExp(`(\\d)[ ${NB}](?=/[A-Za-zµμΩ℃])`, 'g');

// 添字: どこに出ても意味が1つに決まる記号
const SURE = [
  // ギリシャ文字で始まる記号を先に(μnCox の μn を先に変えてから Cox を見る)
  [/[µμ](n|p|eff)(?![a-z])/g, (m, s) => `μ${sub(s)}`],
  [/φ(F|ms|m|s|B)(?![a-z])/g, (m, s) => `φ${sub(s)}`],
  [/ε(ox|si|Si|s|r|0)(?![a-z])/g, (m, s) => `ε${sub(s)}`],
  [/θ(JA|JC|CS|SA|JB)(?![A-Za-z])/g, (m, s) => `θ${sub(s)}`],
  [/τ(n|p)(?![a-z])/g, (m, s) => `τ${sub(s)}`],
  [/(?<![A-Za-z])V(GS|DS|GD|SB|BS|BE|CE|CB|BC|EB|FB|DD|SS|CC|EE|TH|th|bi|ov|GS,th|DS,sat|CE,sat|BE,on|dsat)(?![A-Za-z])/g, (m, s) => `V${sub(s)}`],
  [/(?<![A-Za-z])g(m|ds|mb)(?![A-Za-z])/g, (m, s) => `g${sub(s)}`],
  [/(?<![A-Za-z])C(ox|gs|gd|gb|db|sb|j0)(?![A-Za-z])/g, (m, s) => `C${sub(s)}`],
  [/(?<![A-Za-z])t(ox)(?![A-Za-z])/g, (m, s) => `t${sub(s)}`],
  [/(?<![A-Za-z])Q(d|f|ox|it)(?![A-Za-z])/g, (m, s) => `Q${sub(s)}`],
  [/(?<![A-Za-z])h(FE|fe)(?![A-Za-z])/g, (m, s) => `h${sub(s)}`],
];
// 段落にデバイス・回路の記号があるか(ほかの意味もある語を変えてよいかの目安)
const DEVICE = /V(?:GS|DS|SB|BE|CE|FB|DD|th|bi)(?![A-Za-z])|(?<![A-Za-z])g[m](?![A-Za-z])|[µμ][np]|(?<![A-Za-z])Cox|φF|cm⁻³|hFE/;
const MOS = /V(?:GS|DS|th)(?![A-Za-z])|(?<![A-Za-z])gm(?![A-Za-z])/;
const BJT = /V(?:BE|CE)(?![A-Za-z])|hFE|β/;
const DOPING = /cm⁻³|Vbi|φF|VFB|εs|ドナー|アクセプタ|不純物濃度|[Aa]cceptor|[Dd]onor|[Dd]oping|受體|施體|摻雜|도너|억셉터|도핑/;
// 式の中にあるとき(すぐ前か後ろが演算子・カッコ)だけ変える記号
const OP_AFTER = `(?=[ ${NB}]*[=≈≒<>≤≥/·⋅×+−)∥,])`;
const OP_BEFORE = `(?<=[=≈≒<>≤≥/·⋅×+−(∥√β][ ${NB}]*|\\d)`;
const inFormula = (name, repl) => [new RegExp(`(?<![A-Za-z])(?:${OP_BEFORE}${name}(?![A-Za-z])|${name}(?![A-Za-z])${OP_AFTER})`, 'g'), repl];
// 記号どうしを「・」「–」でつないだ並び(IC–VCE 特性、ID・gm・ro)も式として扱う。相手が記号のときだけ
const SYM = `(?:g${SUB0}?m|ro|rπ|V${SUB0}?(?:GS|DS|CE|BE|th)|I[BCDE]|h${SUB0}?FE|β)`;
const JOIN_AFTER = `(?=[–‐\\-]V${SUB0}?(?:CE|BE|DS|GS)|・${SYM}(?![A-Za-z]))`;
const JOIN_BEFORE = `(?<=${SUB1}[・–‐\\-])`;
const joined = (name, repl) => [new RegExp(`(?<![A-Za-z])(?:${JOIN_BEFORE}${name}(?![A-Za-z])|${name}(?![A-Za-z])${JOIN_AFTER})`, 'g'), repl];
const MAYBE_DEVICE = [
  inFormula('I(D|C|B|E|S|G)', m => `I${sub(m.slice(1))}`),
  joined('I(D|C|B|E)', m => `I${sub(m.slice(1))}`),
  joined('r(o|π)', m => `r${sub(m.slice(1))}`),
  inFormula('V(A|T)', m => `V${sub(m.slice(1))}`),
  [/(?<![A-Za-z])E(g)(?=\()/g, (m, x) => `E${sub(x)}`],
  inFormula('r(o|π|e)', m => `r${sub(m.slice(1))}`),
  inFormula('R(L|C|E|B|D|S|G|on|th)', m => `R${sub(m.slice(1))}`),
  inFormula('E(g|F|c|v|i)', m => `E${sub(m.slice(1))}`),
  inFormula('n(i)', m => `n${sub(m.slice(1))}`),
];
// 不純物濃度 NA・ND は、積の形 NA(…) や、ほかの記号のすぐ後ろ(εsNA)にも出る
const MAYBE_DOPING = [[new RegExp(`(?<![A-Za-z])N(A|D)(?![A-Za-z])(?:(?=[ ${NB}]*[=≈≒<>≤≥/·⋅×+−)(∥,])|(?<=[=≈≒/·⋅×+−(√${SUB1}][ ${NB}]*N[AD]))`, 'g'), (m, x) => `N${sub(x)}`]];
// 抵抗・容量・コイルの番号(R1、C2)。式の中だけ
const NUMBERED = inFormula('[RCL]\\d', m => `${m[0]}${sub(m.slice(1))}`);

export function mathText(text, context = text) {
  if (!/[A-Za-zµμ\d]/.test(text)) return text;
  let s = text.replace(NUM_UNIT, `$1${NB}`).replace(NUM_PER, `$1${NB}`);
  // 2項の演算子の前後(スペースで囲まれたもの)は行を切らない
  s = s.replace(/ ([−×·⋅∥+]) (?=\S)/g, `${NB}$1${NB}`);
  // 「=」の後ろは切らない。前は、右辺が数値だけのとき(値の代入)は切らず、式が続くときは切れるようにする
  s = s.replace(/ ([=≈≒≤≥]) (?=(\S*))/g, (m, op, rhs) => `${/^[−-]?\d[\d.,]*(?:×10\S*)?(?:[、。,;:)）]|$)/.test(rhs) || /^[−-]?\d[\d.,]*(?:×10[⁰¹²³⁴-⁹⁻]+)?$/.test(rhs) ? NB : ' '}${op}${NB}`);
  for (const [re, fn] of SURE) s = s.replace(re, fn);
  if (DEVICE.test(context)) {
    for (const [re, fn] of MAYBE_DEVICE) s = s.replace(re, fn);
    // MOSFET の段落(VGS・VDS・Vth・gm がある)では、単独の ID・ro も記号として扱う(「ユーザーID」のようにカタカナに続く ID は除く)。バイポーラの段落では IB・IE
    if (MOS.test(context)) s = s.replace(/(?<![A-Za-zァ-ヶー])I(D)(?![A-Za-z])/g, (m, x) => `I${sub(x)}`).replace(/(?<![A-Za-z])r(o)(?![A-Za-z])/g, (m, x) => `r${sub(x)}`);
    if (BJT.test(context)) s = s.replace(/(?<![A-Za-z])I(B|E)(?![A-Za-z])/g, (m, x) => `I${sub(x)}`).replace(/(?<![A-Za-z])r(o|π)(?![A-Za-z])/g, (m, x) => `r${sub(x)}`);
    if (/[RCL]\d/.test(s)) s = s.replace(NUMBERED[0], NUMBERED[1]);
  }
  if (DOPING.test(context) && !/開口数|[Nn]umerical aperture|數值孔徑|개구수/.test(context)) for (const [re, fn] of MAYBE_DOPING) s = s.replace(re, fn);
  return s;
}

// ---- HTML(ビルド時): タグの外の文字だけを整える。script・style・pre・code・svg・入力欄などの中は触らない ----
const SKIP = /^(script|style|pre|code|svg|textarea|select|option|title|kbd|samp|math)$/;
const BLOCK = /^(p|li|dd|dt|td|th|h[1-6]|div|section|article|summary|figcaption|blockquote|ul|ol|dl|table|tr|label|details|nav|header|footer|aside|form|main)$/;
export function mathifyHtml(html) {
  const parts = html.split(/(<!--[\s\S]*?-->|<[^>]*>)/);
  // 段落(ブロックの区切りから区切りまで)ごとに、文字をまとめて文脈にする
  const blocks = []; let cur = [], skip = 0;
  const flags = parts.map((p, i) => {
    if (i % 2) {
      const m = p.match(/^<(\/?)([a-zA-Z][\w-]*)/);
      if (m) {
        const name = m[2].toLowerCase();
        if (SKIP.test(name) && !p.endsWith('/>')) skip = Math.max(0, skip + (m[1] ? -1 : 1));
        if (BLOCK.test(name)) { blocks.push(cur); cur = []; }
      }
      return null;
    }
    if (!skip && p) cur.push(i);
    return !skip;
  });
  blocks.push(cur);
  for (const ids of blocks) {
    if (!ids.length) continue;
    const ctx = ids.map(i => parts[i]).join(' ');
    for (const i of ids) parts[i] = mathText(parts[i], ctx).replaceAll(SUB0, '<sub>').replaceAll(SUB1, '</sub>');
  }
  return parts.join('');
}

// ---- DOM(クイズ画面): 要素の中の文字を同じように整える ----
export function mathifyDom(root) {
  const doc = root.ownerDocument;
  const walker = doc.createTreeWalker(root, 4 /* SHOW_TEXT */);
  const nodes = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) if (!n.parentElement.closest('pre, code, svg, script, style, textarea, select, sub, math')) nodes.push(n);
  for (const n of nodes) {
    const block = n.parentElement.closest('p, li, dd, dt, td, th, h1, h2, h3, summary, div') ?? root;
    const out = mathText(n.nodeValue, block.textContent);
    if (out === n.nodeValue) continue;
    const frag = doc.createDocumentFragment();
    out.split(new RegExp(`(${SUB0}[^${SUB1}]*${SUB1})`)).forEach(piece => {
      if (piece.startsWith(SUB0)) { const el = doc.createElement('sub'); el.textContent = piece.slice(1, -1); frag.append(el); } else if (piece) frag.append(piece);
    });
    n.replaceWith(frag);
  }
}
