// 本文の1行書きの式(例: DPW ≈ πr²/S − πd/√(2S))を、教科書のような組み方の MathML にする。
// 分数は上下に重ね、根号は中身の上に伸ばし、添字は下付きにする。外部のライブラリは使わない(ブラウザの MathML で表示)。
// 読めない書き方に出会ったら null を返す(その式は1行書きのまま残る)。対象の式は data/math.json に挙げたものだけ
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const SUP = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '−', '⁺': '+' };
const SUBD = { '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4' };
const FUNCS = ['exp', 'ln', 'log', 'sin', 'cos', 'tan', 'max', 'min'];
// 大文字が続く添字(V_GS など)。ここにない大文字の並びは、別々の記号の積(LC → L·C)として読む
const CAP_SUB = /^(?:V(?:GS|DS|GD|SB|BS|BE|CE|CB|BC|EB|FB|DD|SS|CC|EE|TH|BR|A|T|R)|I(?:DS|D|C|B|E|S|G)|N(?:A|D)|θ(?:JA|JC|CS|SA|JB)|φ(?:F|B)|h(?:FE)|E(?:F)|Z(?:L)|X(?:L|C)|T(?:J|A))/;
const GREEK = 'αβγδεζηθικλμνξπρστυφχψωΓΔΘΛΞΠΣΦΨΩµ';
const isLetter = c => /[A-Za-z]/.test(c) || GREEK.includes(c);

function tokenize(s, words = [], subs = []) {
  const t = []; let i = 0;
  const push = (type, v) => t.push({ type, v, space: false });
  while (i < s.length) {
    const c = s[i];
    if (c === ' ' || c === ' ') { if (t.length) t[t.length - 1].space = true; i++; continue; }
    let m;
    if ((m = s.slice(i).match(/^\d+(?:[.,]\d+)*/))) { push('num', m[0]); i += m[0].length; continue; }
    if ((m = s.slice(i).match(/^[⁰¹²³⁴-⁹⁻⁺]+/))) { push('sup', [...m[0]].map(x => SUP[x]).join('')); i += m[0].length; continue; }
    if ((m = s.slice(i).match(/^[₀-₄]+/))) { push('subd', [...m[0]].map(x => SUBD[x]).join('')); i += m[0].length; continue; }
    if ('+−·⋅×/=≈≤≥<>,'.includes(c)) { push('op', c === '⋅' ? '·' : c); i++; continue; }
    if (c === '-') { push('op', '−'); i++; continue; }
    if ('()[]|√^'.includes(c)) { push(c, c); i++; continue; }
    if (isLetter(c)) {
      const rest = s.slice(i);
      const w = words.find(x => rest.startsWith(x));
      if (w) { push('word', w); i += w.length; continue; }
      const hint = subs.find(x => rest.startsWith(x));
      if (hint) { t.push({ type: 'id', v: hint[0] === 'µ' ? 'μ' : hint[0], sub: hint.slice(1), space: false }); i += hint.length; continue; }
      const f = FUNCS.find(x => rest.startsWith(x) && !/[A-Za-z]/.test(rest[x.length] ?? ''));
      if (f) { let sub = null; const d = rest.slice(f.length).match(/^(10|2|e)(?=\()/); push('func', f); if (d) { t[t.length - 1].sub = d[1]; i += d[1].length; } i += f.length; continue; }
      if ((m = rest.match(/^[A-Z]{3,}(?![a-z])/)) && !CAP_SUB.test(rest)) { push('word', m[0]); i += m[0].length; continue; }
      if ((m = rest.match(/^d[A-Z]\b/)) ) { push('word', m[0]); i += 2; continue; } // dB
      // 1文字の記号 + 添字。大文字の添字は表にあるものだけ。小文字と数字はそのまま添字(Vth、Cox、ni、R1、IC1)
      let base = c === 'µ' ? 'μ' : c, sub = '';
      i++;
      const cap = rest.match(CAP_SUB);
      if (cap) { sub = cap[0].slice(1); i += sub.length; }
      // ギリシャ文字の添字は決まったものだけ(μn、φF、εox、ωgc など)。それ以外(πr、πd、λf)は積として読む
      const GSUB = { μ: /^(?:eff|n|p)(?![a-z])/, φ: /^(?:ms|m|s)(?![a-z])/, ε: /^(?:ox|si|Si|s|r|0)(?![a-z])/, θ: /^(?:c|i|r|t|B)(?![a-z])/, τ: /^(?:n|p)(?![a-z])/, ω: /^(?:gc|pc|c|n|0)(?![a-z])/, ρ: /^(?:n|p)(?![a-z])/, σ: /^(?:n|p)(?![a-z])/ };
      const low = GREEK.includes(c) ? (GSUB[base] ? s.slice(i).match(GSUB[base]) : null) : s.slice(i).match(/^(?:[a-z]+|\d+(?![.\d]))+/);
      // 小文字1字の後に小文字が続く積(hc、kT の類)は添字にしない
      if (low && !(/[a-z]/.test(c) && ['hc', 'qn', 'qp', 'kn', 'nk', 'nq', 'pq', 'np', 'pn'].some(x => (c + low[0]).startsWith(x)))) { sub += low[0]; i += low[0].length; }
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
export function linearToMathML(src, { display = true, words = [], subs = [] } = {}) {
  const t = tokenize(src, words, subs);
  if (!t || !t.length) return null;
  let p = 0, fail = false, fancy = false;
  const peek = () => t[p], next = () => t[p++];
  const isOp = (x, v) => x && x.type === 'op' && v.includes(x.v);
  const unparen = n => (n.paren ? n.inner : n.ml);

  function atom() {
    const x = next();
    if (!x) { fail = true; return { ml: '' }; }
    let node;
    if (x.type === 'num') node = { ml: `<mn>${esc(x.v)}</mn>` };
    else if (x.type === 'word') node = { ml: mi(x.v, true) };
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
      node = { ml: `<mrow><mo>${x.type}</mo>${inner}<mo>${close}</mo></mrow>`, paren: true, inner };
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
      if (x?.type === 'sup') { next(); n = { ml: `<msup>${n.ml}<mn>${esc(x.v)}</mn></msup>` }; continue; }
      if (x?.type === '^') { next(); const e = atom(); if (e.paren) fancy = true; n = { ml: `<msup>${n.ml}${unparen(e)}</msup>` }; continue; }
      return n;
    }
  }
  // 並べて書いた積(2qεsNA、(W/L)(VGS − Vth))。スペースで区切られたら終わり。割り算より強く結びつく(Eg/2kT = Eg/(2kT))
  function juxt(stop) {
    const parts = [factor()];
    for (;;) {
      const prev = t[p - 1], x = peek();
      if (!x || prev.space || fail) break;
      if (x.type === 'op' || x.type === ')' || x.type === ']' || x.type === 'sup' || x.type === '^' || x.type === 'subd') break;
      if (x.type === '|' && stop === '|') break;
      parts.push(factor());
    }
    return parts.length === 1 ? parts[0] : { ml: `<mrow>${parts.map(x => x.ml).join('')}</mrow>` };
  }
  // 「·」と「/」は左から順に(Vin·R2/(R1 + R2) は分子が Vin·R2)。スペースで囲んだ「×」はそれより弱く、分数どうしの積になる
  function group(stop) {
    let n = juxt(stop);
    while (isOp(peek(), '·/')) {
      const op = next().v, r = juxt(stop);
      if (op === '/') { fancy = true; n = { ml: `<mfrac>${unparen(n)}${unparen(r)}</mfrac>` }; }
      else n = { ml: `<mrow>${n.ml}<mo>&#x22C5;</mo>${r.ml}</mrow>` };
    }
    return n;
  }
  function term(stop) {
    let n = group(stop);
    while (isOp(peek(), '×')) { next(); const r = group(stop); n = { ml: `<mrow>${n.ml}<mo>×</mo>${r.ml}</mrow>` }; }
    return n;
  }
  function sum(stop) {
    const out = [];
    if (isOp(peek(), '−+')) out.push(`<mo>${next().v}</mo>`);
    out.push(term(stop).ml);
    while (isOp(peek(), '+−')) { out.push(`<mo>${next().v}</mo>`); out.push(term(stop).ml); }
    return row(out);
  }
  function expr(stop) {
    const out = [sum(stop)];
    while (isOp(peek(), '=≈≤≥<>,')) { const o = next().v; out.push(`<mo>${esc(o)}</mo>`); out.push(sum(stop)); }
    return row(out);
  }
  const body = expr();
  if (fail || p < t.length) return null;
  // 元の1行書きを annotation に残す(コピーや読み上げの手がかり)
  return { fancy, ml: `<math xmlns="http://www.w3.org/1998/Math/MathML"${display ? ' display="block"' : ''}><semantics>${body}<annotation encoding="text/plain">${esc(src)}</annotation></semantics></math>` };
}
