// 本文の1行書きの式(例: DPW ≈ πr²/S − πd/√(2S))を、教科書のような組み方の MathML にする。
// 分数は上下に重ね、根号は中身の上に伸ばし、添字は下付きにする。外部のライブラリは使わない(ブラウザの MathML で表示)。
// 読めない書き方に出会ったら null を返す(その式は1行書きのまま残る)。対象の式は data/math.json に挙げたものだけ
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const SUP = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '−', '⁺': '+', 'ⁿ': 'n', 'ᴺ': 'N', 'ᵏ': 'k' };
const SUP_RE = /^[⁰¹²³⁴-⁹⁻⁺ⁿᴺᵏ]+/;
// 上付きの中身: 数字は数、文字は記号として出す(2ⁿ⁻¹ → n−1)
const supMl = v => { const a = [...v.matchAll(/\d+|[−+]|[A-Za-z]/g)].map(m => (/\d/.test(m[0]) ? `<mn>${m[0]}</mn>` : /[−+]/.test(m[0]) ? `<mo>${m[0]}</mo>` : `<mi>${m[0]}</mi>`)); return a.length === 1 ? a[0] : `<mrow>${a.join('')}</mrow>`; };
const SUBD = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4' };
const FUNCS = ['exp', 'ln', 'log', 'sin', 'cos', 'tan', 'max', 'min'];
// 数値の後ろの単位(0.5 V、500 kHz、10¹⁷ cm⁻³)。記号ではなく立体の文字として出す
const UATOM = '(?:[µμmkKMGTnpfac]?(?:Ω|Hz|eV|bps|bit|V|A|W|F|H|J|K|N|Pa|S|s|m|g|B|b|C)|%|℃|°C|°|Å|dB[a-zµ]{0,2}|ppm|ppb|FIT|LSB|RH|MT|GT|lm|rad|min|h|decade|dec|atoms|個|枚|倍|件|秒|分|時間|年|回|台|本|ビット|バイト)(?:[²³]|⁻[¹²³])?';
const UNIT_SRC = `${UATOM}(?:[/·⋅]${UATOM})*`;
const UNIT_RE = new RegExp(`^${UNIT_SRC}(?![A-Za-z0-9(])`);
// 記号の後ろに添える単位の書き方: λ (nm)、s [min⁻¹]。前にスペースがあるときだけ単位として読む(G(s) の s は変数)
const UNIT_NOTE = new RegExp(`^(?:\\(${UNIT_SRC}\\)|\\[${UNIT_SRC}\\])`);
const KANA = '\\u3041-\\u309f\\u30a0-\\u30ff\\u4e00-\\u9fff\\u3005';
const CJK = new RegExp(`^[${KANA}]+`);
const TAIL_NOTE = new RegExp(`[ \\u00a0](\\[${UNIT_SRC}\\])$`);
// 大文字が続く添字(V_GS など)。ここにない大文字の並びは、別々の記号の積(LC → L·C)として読む
const CAP_SUB = /^(?:V(?:GS|DS|GD|SB|BS|BE|CE|CB|BC|EB|FB|DD|SS|CC|EE|TH|BR|A|T|R)|I(?:DS|D|C|B|E|S|G)|N(?:A|D)|θ(?:JA|JC|CS|SA|JB)|φ(?:F|B)|h(?:FE)|E(?:F)|Z(?:L)|X(?:L|C)|T(?:J|A))/;
const GREEK = 'αβγδεζηθικλμνξπρστυφχψωΓΔΘΛΞΠΣΦΨΩµ';
const isLetter = c => /[A-Za-z]/.test(c) || GREEK.includes(c);

function tokenize(s, words = [], subs = [], prods = []) {
  const t = []; let i = 0;
  const push = (type, v) => t.push({ type, v, space: false });
  while (i < s.length) {
    const c = s[i];
    if (c === ' ' || c === ' ') { if (t.length) t[t.length - 1].space = true; i++; continue; }
    let m;
    if ((m = s.slice(i).match(/^\d+(?:[.,]\d+)*/))) {
      push('num', m[0]); i += m[0].length;
      // 指数表記(3×10⁸、1.6×10⁻¹⁹)は、スペースなしで書かれていれば1つの数として読む
      const sci = s.slice(i).match(/^×10([⁰¹²³⁴-⁹⁻⁺]+)/);
      if (sci) { t[t.length - 1].exp = [...sci[1]].map(x => SUP[x]).join(''); i += sci[0].length; }
      // 上付きの指数(10¹⁷)は数値の一部として先に読む。その後ろの単位を、数値に付く立体の文字にする
      const sup = s.slice(i).match(SUP_RE);
      if (sup) { push('sup', [...sup[0]].map(x => SUP[x]).join('')); i += sup[0].length; }
      const u = s.slice(i).match(/^([ \u00a0]?)(.*)$/s);
      const unit = u[2].match(UNIT_RE);
      // スペースなしで続く1文字(2A、6.02N、0.9V)は単位ではなく変数として読む。%・℃・° と2文字以上の単位(kΩ、Hz、dB)はスペースなしでも単位
      if (unit && !(u[1] === '' && /^[A-Za-zΩ](?:[²³]|⁻[¹²³])?$/.test(unit[0]))) { push('unit', unit[0]); i += u[1].length + unit[0].length; }
      continue;
    }
    if ((m = s.slice(i).match(SUP_RE))) { push('sup', [...m[0]].map(x => SUP[x]).join('')); i += m[0].length; continue; }
    if ((m = s.slice(i).match(/^[₀-₄]+/))) { push('subd', [...m[0]].map(x => SUBD[x]).join('')); i += m[0].length; continue; }
    if ('+−·⋅×÷/=≈≒≠∝≤≥<>,∥±'.includes(c)) { push('op', c === '⋅' ? '·' : c === '≒' ? '≈' : c); i++; continue; }
    if (c === '…') { push('dots', c); i++; continue; }
    if ((c === '(' || c === '[') && t.length && ['id', 'text', 'word', 'num'].includes(t[t.length - 1].type) && (m = s.slice(i).match(UNIT_NOTE)) && (t[t.length - 1].space || /[A-Za-zµμ]{2}/.test(m[0]) || (c === '[' && !/^\[[a-z]\]$/.test(m[0])) || (t[t.length - 1].type === 'num' && !t[t.length - 1].space && /^\([A-ZΩ]\)$/.test(m[0])))) { push('unit', m[0]); i += m[0].length; continue; }
    // 日本語の言葉の式(容量 ÷ ラインサイズ)。漢字とカタカナの並びを、ひとまとまりの語として読む
    if ((m = s.slice(i).match(CJK))) { push('text', m[0]); i += m[0].length; continue; }
    if (c === '-') { push('op', '−'); i++; continue; }
    if ('()[]|√^'.includes(c)) { push(c, c); i++; continue; }
    if (isLetter(c)) {
      const rest = s.slice(i);
      const w = words.find(x => rest.startsWith(x)) ?? ['BW', 'FF'].find(x => rest.startsWith(x) && !/[A-Za-z]/.test(rest[2] ?? ''));
      if (w) { push('word', w); i += w.length; continue; }
      // prods: 添字にせず、別々の記号の積として読む並び(拡散の Dt、むだ時間の Ls)
      if (prods.some(x => rest.startsWith(x))) { push('id', c === 'µ' ? 'μ' : c); t[t.length - 1].sub = ''; i++; continue; }
      const hint = subs.find(x => rest.startsWith(x));
      if (hint) { t.push({ type: 'id', v: hint[0] === 'µ' ? 'μ' : hint[0], sub: hint.slice(1), space: false }); i += hint.length; continue; }
      const f = FUNCS.find(x => rest.startsWith(x) && !/[A-Za-z]/.test(rest[x.length] ?? ''));
      if (f) { let sub = null; const d = rest.slice(f.length).match(/^(10|2|e)(?=\()/); push('func', f); if (d) { t[t.length - 1].sub = d[1]; i += d[1].length; } i += f.length; continue; }
      if ((m = rest.match(/^[A-Z]{3,}(?![a-z])/)) && !CAP_SUB.test(rest)) { push('word', m[0]); i += m[0].length; continue; }
      if ((m = rest.match(/^dB[a-zµ]{0,2}(?![A-Za-z])/))) { push('word', m[0]); i += m[0].length; continue; }
      // 微分 dV/dt、dI/dt、dEFn/dx: d を立体にして、変数とひとまとまりにする
      if ((m = rest.match(/^d([A-Za-zα-ω][A-Za-z]{0,2})\/d([A-Za-zα-ω])(?![A-Za-z])/))) {
        const numTok = tokenize(m[1], words, subs, prods)?.[0];
        if (numTok?.type === 'id') { t.push({ type: 'deriv', num: numTok, den: m[2], space: false }); i += m[0].length; continue; }
      }
      // 1文字の記号 + 添字。大文字の添字は表にあるものだけ。小文字と数字はそのまま添字(Vth、Cox、ni、R1、IC1)
      let base = c === 'µ' ? 'μ' : c, sub = '';
      i++;
      const cap = rest.match(CAP_SUB);
      if (cap) { sub = cap[0].slice(1); i += sub.length; }
      // ギリシャ文字の添字は決まったものだけ(μn、φF、εox、ωgc など)。それ以外(πr、πd、λf)は積として読む
      const GSUB = { μ: /^(?:eff|n|p|0)(?![a-z])/, φ: /^(?:ms|m|s)(?![a-z])/, ε: /^(?:ox|si|Si|s|r|0)(?![a-z])/, θ: /^(?:c|i|r|t|B)(?![a-z])/, τ: /^(?:n|p)(?![a-z])/, ω: /^(?:gc|pc|c|n|d|0)(?![a-z])/, ρ: /^(?:n|p)(?![a-z])/, σ: /^(?:n|p)(?![a-z])/ };
      let low = GREEK.includes(c) ? ((GSUB[base] ? s.slice(i).match(GSUB[base]) : null) ?? ('πΔΣ'.includes(c) ? null : s.slice(i).match(/^\d(?![.\d])/))) : s.slice(i).match(/^(?:[a-z]+|\d+(?![.\d]))+/);
      // 虚数単位 j の後ろの数字(j10、j2π)と、指数の付いた e(Ae^(−t))は、添字ではなく積
      if (low && c === 'j' && /^\d/.test(low[0])) low = null;
      if (low && low[0].endsWith('e') && s[i + low[0].length] === '^') low = low[0].length > 1 ? [low[0].slice(0, -1)] : null;
      // 小文字1字の後に小文字が続く積(hc、kT の類)は添字にしない
      if (low && !(/[a-z]/.test(c) && ['hc', 'qn', 'qp', 'kn', 'nk', 'nq', 'pq', 'np', 'pn'].some(x => (c + low[0]).startsWith(x)))) { sub += low[0]; i += low[0].length; }
      if (s[i] === '_' && (m = s.slice(i).match(/^_([A-Za-z0-9]+)/))) { sub += m[1]; i += m[0].length; }
      if (s[i] === ',' && /^,(?:sat|th|on|max|min)/.test(s.slice(i))) { const x = s.slice(i).match(/^,[a-z]+/)[0]; sub += x; i += x.length; }
      t.push({ type: 'id', v: base, sub, space: false });
      continue;
    }
    return null;
  }
  return t;
}

const mi = (v, upright) => `<mi${upright || v.length > 1 ? ' mathvariant="normal"' : ''}>${esc(v)}</mi>`;
const row = a => (a.length === 1 ? a[0] : `<mrow>${a.join('')}</mrow>`);

// words: 添字に分けず、ひとまとまりの名前として立体で出す語(開口数の NA、スルーレートの SR)。subs: 1文字目を記号、残りを添字として読む語(fT、rπ、コレクタ抵抗の RC)
// mode: 'block' は段落から独立した式(分数を上下に重ねる)。'compact' は同じ組み方を文の流れの中に置く(選択肢の中など)。
// 'text' は文中の短い式で、行の高さを乱さないよう割り算は「/」のまま、根号と指数だけを組む
export function linearToMathML(src, { mode = 'block', words = [], subs = [], prods = [] } = {}) {
  const stack = mode !== 'text';
  // 式の最後に添えた単位(s = 120f/p [min⁻¹])は、式全体の後ろに置く
  const full = src; let tail = '';
  const note = src.match(TAIL_NOTE);
  if (note) { tail = `<mtext>&#x2009;${esc(note[1])}</mtext>`; src = src.slice(0, note.index); }
  const t = tokenize(src, words, subs, prods);
  if (!t || !t.length) return null;
  let p = 0, fail = false, fancy = false, inSup = 0;
  // 分数。指数の中と、文中の短い式では「/」のまま(教科書でも e^(−t/RC) の指数は斜線で書く)
  const frac = (n, d) => {
    if (!stack || inSup) return { ml: `<mrow>${n.ml}<mo>/</mo>${d.ml}</mrow>` };
    fancy = true;
    if (d.counter && d.bare && !/<mtext>/.test(n.ml)) return { ml: `<mrow><mfrac>${unparen(n)}${d.bare.ml}</mfrac>${d.counter}</mrow>` };
    return { ml: `<mfrac>${unparen(n)}${unparen(d)}</mfrac>` };
  };
  const peek = () => t[p], next = () => t[p++];
  const isOp = (x, v) => x && x.type === 'op' && v.includes(x.v);
  const unparen = n => (n.paren ? n.inner : n.ml);

  function atom() {
    const x = next();
    if (!x) { fail = true; return { ml: '' }; }
    let node;
    if (x.type === 'num') node = { ml: x.exp ? `<mrow><mn>${esc(x.v)}</mn><mo>×</mo><msup><mn>10</mn>${supMl(x.exp)}</msup></mrow>` : `<mn>${esc(x.v)}</mn>` };
    else if (x.type === 'word') node = { ml: mi(x.v, true) };
    else if (x.type === 'unit') node = { ml: `<mtext>&#x2009;${esc(x.v)}</mtext>`, counter: /^(?:倍|%|個|回|台|本|件)$/.test(x.v) };
    else if (x.type === 'text') node = { ml: `<mtext class="mw">${esc(x.v)}</mtext>` };
    else if (x.type === 'dots') node = { ml: '<mo>…</mo>' };
    else if (x.type === 'deriv') {
      const num = `<mrow><mi mathvariant="normal">d</mi>${x.num.sub ? `<msub>${mi(x.num.v)}<mi mathvariant="normal">${esc(x.num.sub)}</mi></msub>` : mi(x.num.v)}</mrow>`, den = `<mrow><mi mathvariant="normal">d</mi>${mi(x.den)}</mrow>`;
      node = stack && !inSup ? (fancy = true, { ml: `<mfrac>${num}${den}</mfrac>` }) : { ml: `<mrow>${num}<mo>/</mo>${den}</mrow>` };
    }
    else if (x.type === 'id' && x.v === 'Σ' && !x.sub) node = { ml: '<mo>&#x2211;</mo>' };
    else if (x.type === 'id') node = { ml: x.sub ? `<msub>${mi(x.v)}<mi mathvariant="normal">${esc(x.sub)}</mi></msub>` : mi(x.v) };
    else if (x.type === 'func') {
      const name = x.sub ? `<msub>${mi(x.v, true)}<mn>${x.sub}</mn></msub>` : mi(x.v, true);
      if (peek()?.type === '(') { const g = atom(); node = { ml: `<mrow>${name}<mo>&#x2061;</mo>${g.ml}</mrow>` }; }
      else if (peek()?.type === '[') { const g = atom(); node = { ml: `<mrow>${name}<mo>&#x2061;</mo>${g.ml}</mrow>` }; }
      else { const g = factor(); node = { ml: `<mrow>${name}<mo>&#x2061;</mo>${g.ml}</mrow>` }; }
    } else if (x.type === '(' || x.type === '[') {
      const close = x.type === '(' ? ')' : ']';
      const inner = expr();
      if (next()?.type !== close) fail = true;
      node = { ml: `<mrow><mo>${x.type}</mo>${inner}<mo>${close}</mo></mrow>`, paren: true, inner, hasFrac: inner.includes('<mfrac>') };
    } else if (x.type === '|') {
      const inner = expr('|');
      if (next()?.type !== '|') fail = true;
      node = { ml: `<mrow><mo>|</mo>${inner}<mo>|</mo></mrow>` };
    } else if (x.type === '√') {
      const g = atom();
      fancy = true;
      node = { ml: `<msqrt>${unparen(g)}</msqrt>` };
    } else { fail = true; return { ml: '' }; }
    return node;
  }
  function factor() {
    let n = atom();
    for (;;) {
      const x = peek();
      if (x?.type === 'subd') { next(); n = { ml: `<msub>${n.ml}<mn>${x.v}</mn></msub>` }; continue; }
      if (x?.type === 'sup') { next(); n = { ml: `<msup>${n.ml}${supMl(x.v)}</msup>` }; continue; }
      if (x?.type === '^') {
        next(); inSup++;
        const neg = isOp(peek(), '−') ? `<mo>${next().v}</mo>` : ''; // 2^−p
        const e = atom(); inSup--; fancy = true;
        n = { ml: `<msup>${n.ml}${neg ? `<mrow>${neg}${e.ml}</mrow>` : unparen(e)}</msup>` }; continue;
      }
      return n;
    }
  }
  // 並べて書いた積(2qεsNA、(W/L)(VGS − Vth))。スペースで区切られたら終わり。割り算より強く結びつく(Eg/2kT = Eg/(2kT))
  function juxt(stop) {
    const parts = [factor()];
    for (;;) {
      const prev = t[p - 1], x = peek();
      if (!x || fail) break;
      if (x.type === 'unit') { parts.push(factor()); continue; }
      if (prev.space && x.type !== 'deriv' && x.type !== 'func') break; // L di/dt、IS exp(…) のように、微分と関数の前のスペースは積として読む
      if (x.type === 'text' || prev.type === 'text') { if (x.type !== 'op' && x.type !== ')' && x.type !== ']') fail = true; break; } // 日本語の語は、演算子でつないだときだけ式の一部
      if (x.type === 'op' || x.type === ')' || x.type === ']' || x.type === 'sup' || x.type === '^' || x.type === 'subd') break;
      if (x.type === '|' && stop === '|') break;
      parts.push(factor());
    }
    if (parts.length === 2 && parts[1].counter && /^<mn>/.test(parts[0].ml)) return { ml: `<mrow>${parts[0].ml}${parts[1].ml}</mrow>`, parts, bare: parts[0], counter: parts[1].ml };
    return parts.length === 1 ? parts[0] : { ml: `<mrow>${parts.map(x => x.ml).join('')}</mrow>`, parts };
  }
  // 「·」と「/」は左から順に(Vin·R2/(R1 + R2) は分子が Vin·R2)。スペースで囲んだ「×」はそれより弱く、分数どうしの積になる
  function group(stop) {
    let n = juxt(stop);
    while (isOp(peek(), '·/∥')) {
      const op = next().v, r = juxt(stop);
      if (op === '/' && n.parts?.length > 1 && n.parts[0].hasFrac && stack && !inSup) { const rest = n.parts.slice(1); n = { ml: `<mrow>${n.parts[0].ml}${frac(rest.length === 1 ? rest[0] : { ml: `<mrow>${rest.map(x => x.ml).join('')}</mrow>` }, r).ml}</mrow>` }; }
      else if (op === '/') n = frac(n, r);
      else n = { ml: `<mrow>${n.ml}<mo>${op === '∥' ? '∥' : '&#x22C5;'}</mo>${r.ml}</mrow>` };
    }
    return n;
  }
  function term(stop) {
    let n = group(stop);
    // 「÷」は「×」と同じ強さで左から順に: a × b ÷ c は分子が a × b
    while (isOp(peek(), '×÷')) {
      const op = next().v, r = group(stop);
      if (op === '÷' && stack && !inSup) n = frac(n, r);
      else n = { ml: `<mrow>${n.ml}<mo>${op}</mo>${r.ml}</mrow>` };
    }
    return n;
  }
  function sum(stop) {
    const out = [];
    if (isOp(peek(), '−+±')) out.push(`<mo>${next().v}</mo>`);
    out.push(term(stop).ml);
    while (isOp(peek(), '+−±')) { out.push(`<mo>${next().v}</mo>`); out.push(term(stop).ml); }
    return row(out);
  }
  function expr(stop) {
    const out = [sum(stop)];
    while (isOp(peek(), '=≈≠∝≤≥<>,')) { const o = next().v; out.push(`<mo>${esc(o)}</mo>`); out.push(sum(stop)); }
    return row(out);
  }
  const body = expr();
  if (fail || p < t.length) return null;
  // 元の1行書きを annotation に残す(コピーや読み上げの手がかり)
  const all = tail ? `<mrow>${body}${tail}</mrow>` : body;
  const inner = mode === 'compact' ? `<mstyle displaystyle="true">${all}</mstyle>` : all;
  return { fancy, ml: `<math xmlns="http://www.w3.org/1998/Math/MathML"${mode === 'block' ? ' display="block"' : ''}><semantics>${inner}<annotation encoding="text/plain">${esc(full)}</annotation></semantics></math>` };
}

// 式の出し方: 等号などの関係があれば段落から独立させる。関係がなく「÷」を含む式は文の中で分数にし、根号や指数だけの短い式は文の中にそのまま置く
export const modeOf = r => (/[=≈≒≠∝≤≥<>]/.test(r) ? 'block' : /÷/.test(r) ? 'compact' : 'text');

// 表(data/math.json の formulas)に載っている式を本文から探す関数を作る。mark(text, wrap) は、見つけた式を wrap(式) の結果に置き換えた文字列を返す。
// 式の途中や、もっと長い式の一部には印を付けない(前後が記号・演算子で続いているとき)
export function makeMarker(table) {
  const byFirst = new Map();
  for (const k of Object.keys(table)) { const c = k[0]; if (!byFirst.has(c)) byFirst.set(c, []); byFirst.get(c).push(k); }
  for (const list of byFirst.values()) list.sort((a, b) => b.length - a.length);
  const SYM = /[A-Za-z0-9µμα-ωΑ-Ω]/, WORD = /[゠-ヿ一-鿿]/;
  const before = (text, at, key) => {
    const p = text[at - 1] ?? '';
    if (/[A-Za-z0-9µμα-ωΑ-Ω·×÷/^√|_]/.test(p)) return false;
    if (/[=≈+−×÷·/] ?$/.test(text.slice(Math.max(0, at - 2), at))) return false;
    if (p === ' ' && /[\d⁰¹²³⁴-⁹]/.test(text[at - 2] ?? '') && /^[A-Za-zµμ]/.test(key)) return false; // 10 GB/s = … のように、数値の単位から始まる断片
    return !(WORD.test(key[0]) && WORD.test(p));
  };
  const after = (text, end, key) => {
    const rest = text.slice(end, end + 2), n = rest[0] ?? '';
    if (SYM.test(n) || /[²³⁰¹⁴-⁹⁻⁺ⁿᴺᵏ^·×÷/_]/.test(n) || /^ ?[=≈≒+−×÷·/]/.test(rest)) return false;
    if (WORD.test(key[key.length - 1]) && WORD.test(n)) return false;
    // すぐ後ろのカッコが式の続き(掛け算)なら印を付けない。説明や条件のカッコ(日本語・単語・不等号・等号を含む)ならよい
    if (n === '(' || n === '[') { const tail = text.slice(end), close = tail.indexOf(n === '(' ? ')' : ']'); if (close < 0 || !/[　-鿿가-힯]|[a-zà-ÿ]{4,}|[<>≤≥=≈]/.test(tail.slice(1, close))) return false; }
    return true;
  };
  return (text, wrap) => {
    if (!/[/√^÷]/.test(text)) return text;
    let out = '', last = 0;
    for (let i = 0; i < text.length; i++) {
      const list = byFirst.get(text[i]);
      if (!list) continue;
      const key = list.find(k => text.startsWith(k, i) && after(text, i + k.length, k));
      if (!key || !before(text, i, key)) continue;
      // カッコでちょうど囲まれているときは、カッコの外も見る: 1/(2π√(LC)) の中の 2π√(LC) には印を付けない
      const end = i + key.length;
      if (text[i - 1] === '(' && text[end] === ')' && (!before(text, i - 1, key) || !after(text, end + 1, key))) continue;
      out += text.slice(last, i) + wrap(key); last = i + key.length; i = last - 1;
    }
    return last ? out + text.slice(last) : text;
  };
}

// 表の式を、ページに入れる HTML にする。読めない式は null
export function formulaHtml(linear, hints = {}) {
  const mode = hints.mode ?? modeOf(linear);
  const r = linearToMathML(linear, { ...hints, mode });
  if (!r) return null;
  return mode === 'block' ? `<span class="math-block">${r.ml}</span>` : `<span class="math-inline${mode === 'compact' ? ' math-frac' : ''}">${r.ml}</span>`;
}

// ── ここから下はブラウザ用(クイズ画面) ──
const A = '', B = '';
// 文を「式でない部分(文字列)」と「式(要素)」に分ける。inline のときは、独立させる式も文の流れの中に置く(選択肢や問題文)
export function splitFormulas(text, table, mark, inline = false) {
  const marked = mark(text, k => `${A}${k}${B}`);
  if (marked === text) return [text];
  const parts = marked.split(new RegExp(`(${A}[^${B}]*${B})`)).filter(Boolean).map(part => {
    if (!part.startsWith(A)) return part;
    const key = part.slice(1, -1), mode = table[key].mode ?? modeOf(key);
    const html = formulaHtml(key, { ...table[key], mode: inline && mode === 'block' ? 'compact' : mode });
    if (!html) return key;
    const box = document.createElement('span'); box.innerHTML = html;
    return box.firstChild;
  });
  // 独立させた式の前後のスペースは落とし、すぐ後ろの句読点は式の行の末尾に付ける
  parts.forEach((el, i) => {
    if (typeof el === 'string' || !el.classList.contains('math-block')) return;
    if (typeof parts[i - 1] === 'string') parts[i - 1] = parts[i - 1].replace(/[ \u00a0]+$/, '');
    if (typeof parts[i + 1] !== 'string') return;
    const m = parts[i + 1].match(/^(?:[、。]|[,.;](?=\s|$))/);
    if (m) { const p = document.createElement('span'); p.className = 'math-punct'; p.textContent = m[0]; el.append(p); parts[i + 1] = parts[i + 1].slice(m[0].length); }
    parts[i + 1] = parts[i + 1].replace(/^[ \u00a0]+/, '');
  });
  return parts.filter(x => x !== '');
}

// 画面に出ている文(問題文・選択肢・ふり返りの一覧)の中の式を組み直す。mathify.js が添字を付ける前に呼ぶ
export function mathBlocksDom(root, table, mark) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => (n.parentElement.closest('math, pre, code, script, style, svg, textarea, .quiz-head') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
  const nodes = []; for (let n = walker.nextNode(); n; n = walker.nextNode()) if (/[/√^÷]/.test(n.nodeValue)) nodes.push(n);
  for (const n of nodes) {
    const parts = splitFormulas(n.nodeValue, table, mark, true);
    if (parts.length > 1 || typeof parts[0] !== 'string') n.replaceWith(...parts);
  }
}
