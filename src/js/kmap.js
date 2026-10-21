// カルノー図と論理式の簡単化。2〜4変数の真理値(0・1・X)から、クワイン・マクラスキー法で主項を求め、
// 項の数が最も少なく、次にリテラルの数が最も少ない積和形(SOP)を探す。和積形(POS)は 0 の側を同じ方法で簡単化して否定する。
// 項は { v, m }(m のビットが立っている変数は省略)。変数は A が最上位ビット
const form = document.getElementById('km-form');
let T = {};
try { T = JSON.parse(form.dataset.text); } catch {}
const NAMES = 'ABCD';
const COLORS = ['#1d64c8', '#d1495b', '#0b8f72', '#e8a317', '#7b4fd6', '#2a9fd6', '#c2185b', '#6d8b00'];
let n = 4;
let f = new Array(16).fill(0); // 0, 1, 2(X)

const popcount = x => { let c = 0; for (; x; x &= x - 1) c++; return c; };
// 主項: 1 と X の最小項から、1ビットだけ違う項を順にまとめていく
function primes(on, dc) {
  let cur = [...new Set([...on, ...dc])].map(v => ({ v, m: 0 }));
  const all = [];
  while (cur.length) {
    const used = new Set(), next = new Map();
    for (let i = 0; i < cur.length; i++) for (let j = i + 1; j < cur.length; j++) {
      const a = cur[i], b = cur[j];
      if (a.m !== b.m) continue;
      const d = a.v ^ b.v;
      if (popcount(d) !== 1) continue;
      used.add(i); used.add(j);
      const t = { v: a.v & ~d, m: a.m | d };
      next.set(`${t.v}/${t.m}`, t);
    }
    cur.forEach((t, i) => { if (!used.has(i)) all.push(t); });
    cur = [...next.values()];
  }
  return all;
}
const covers = (t, x) => (x & ~t.m) === t.v;
const lits = t => n - popcount(t.m);
// 最小の被覆: 被覆の少ない最小項から枝分かれし、(項の数, リテラルの数)が最小のものをすべて数える
function cover(ps, on) {
  let best = null, count = 0;
  const cost = s => [s.length, s.reduce((a, t) => a + lits(t), 0)];
  const better = (a, b) => a[0] < b[0] || a[0] === b[0] && a[1] < b[1];
  const same = (a, b) => a[0] === b[0] && a[1] === b[1];
  const seen = new Set();
  (function go(chosen, left) {
    if (best) { const c = cost(chosen); if (c[0] > best.c[0] || c[0] === best.c[0] && c[1] > best.c[1]) return; }
    if (!left.length) {
      const key = chosen.map(t => `${t.v}/${t.m}`).sort().join(',');
      if (seen.has(key)) return;
      seen.add(key);
      const c = cost(chosen);
      if (!best || better(c, best.c)) { best = { s: chosen, c }; count = 1; } else if (same(c, best.c)) count++;
      return;
    }
    // 覆う主項の最も少ない最小項を選ぶ
    let pick = null, opts = null;
    for (const x of left) { const o = ps.filter(t => covers(t, x)); if (!opts || o.length < opts.length) { pick = x; opts = o; } }
    for (const t of opts) go([...chosen, t], left.filter(x => !covers(t, x)));
  })([], on);
  return { terms: best?.s ?? [], alt: count > 1 };
}
function solve(on, dc) {
  if (!on.length) return { terms: [], primes: [], ess: new Set(), alt: false, zero: true };
  const ps = primes(on, dc);
  const ess = new Set(on.map(x => ps.filter(t => covers(t, x))).filter(o => o.length === 1).map(o => `${o[0].v}/${o[0].m}`));
  const { terms, alt } = cover(ps, on);
  // リテラルの少ない順、同じなら A, B, C, D の順(否定なしを先に)
  const key = t => [...Array(n)].map((_, j) => { const b = 1 << (n - 1 - j); return t.m & b ? '9' : t.v & b ? '0' : '1'; }).join('');
  terms.sort((a, b) => lits(a) - lits(b) || key(a).localeCompare(key(b)));
  return { terms, primes: ps.filter(t => on.some(x => covers(t, x))).sort((a, b) => lits(a) - lits(b) || key(a).localeCompare(key(b))), ess, alt };
}

// ---- 表記(否定は上線)----
const bar = s => `<span class="ov">${s}</span>`;
const lit = (j, pos) => (pos ? bar(NAMES[j]) : NAMES[j]);
function product(t) {
  const out = [];
  for (let j = 0; j < n; j++) { const b = 1 << (n - 1 - j); if (!(t.m & b)) out.push(lit(j, !(t.v & b))); }
  return out.join('') || '1';
}
function sum(t) { // 0 の側の項を否定して和にする(ド・モルガン)
  const out = [];
  for (let j = 0; j < n; j++) { const b = 1 << (n - 1 - j); if (!(t.m & b)) out.push(lit(j, !!(t.v & b))); }
  return out.length > 1 ? `(${out.join(' + ')})` : out[0] ?? '0';
}
const gateInputs = (terms, k) => terms.filter(t => k(t) > 1).reduce((a, t) => a + k(t), 0) + (terms.length > 1 ? terms.length : 0);

// ---- 表示 ----
const gray = b => (b === 1 ? [0, 1] : [0, 1, 3, 2]);
const bits = (x, w) => x.toString(2).padStart(w, '0');
const SYM = ['0', '1', 'X'];
function render() {
  const size = 1 << n;
  const on = [], dc = [], off = [];
  for (let i = 0; i < size; i++) (f[i] === 1 ? on : f[i] === 2 ? dc : off).push(i);
  const r = solve(on, dc);
  const rp = solve(off, dc);
  const group = new Map(); // 最小項 → 含む項の色
  r.terms.forEach((t, k) => { for (let i = 0; i < size; i++) if (covers(t, i)) (group.get(i) ?? group.set(i, []).get(i)).push(COLORS[k % COLORS.length]); });
  // カルノー図
  const rb = n === 4 ? 2 : 1, cb = n - rb;
  const rv = NAMES.slice(0, rb), cv = NAMES.slice(rb, n);
  const cell = i => {
    const gs = group.get(i) ?? [];
    const shadow = gs.map((c, k) => `inset 0 0 0 ${3 * (k + 1)}px ${c}`).join(',');
    return `<td><button type="button" class="km-cell v${f[i]}" data-i="${i}" style="${shadow ? `box-shadow:${shadow}` : ''}" aria-label="m${i} = ${SYM[f[i]]}">${SYM[f[i]]}<small>${i}</small></button></td>`;
  };
  document.getElementById('km-map').innerHTML = `<table class="km-map"><thead><tr><th class="km-corner">${rv}\\${cv}</th>${gray(cb).map(c => `<th>${bits(c, cb)}</th>`).join('')}</tr></thead><tbody>${
    gray(rb).map(rw => `<tr><th>${bits(rw, rb)}</th>${gray(cb).map(c => cell(rw << cb | c)).join('')}</tr>`).join('')}</tbody></table>`;
  // 真理値表
  document.getElementById('km-tt').innerHTML = `<table class="km-tt"><thead><tr><th>#</th>${[...NAMES.slice(0, n)].map(v => `<th>${v}</th>`).join('')}<th>F</th></tr></thead><tbody>${
    Array.from({ length: size }, (_, i) => `<tr><td class="muted">${i}</td>${[...bits(i, n)].map(b => `<td>${b}</td>`).join('')}<td><button type="button" class="km-cell v${f[i]}" data-i="${i}">${SYM[f[i]]}</button></td></tr>`).join('')}</tbody></table>`;
  // 式
  const sop = r.zero ? '0' : r.terms.some(t => t.m === size - 1) ? '1'
    : r.terms.map((t, k) => `<span class="km-term" style="border-color:${COLORS[k % COLORS.length]}">${product(t)}</span>`).join(' + ');
  const pos = rp.zero ? '1' : rp.terms.some(t => t.m === size - 1) ? '0' : rp.terms.map(sum).join('');
  document.getElementById('km-sop').innerHTML = `F = ${sop}`;
  document.getElementById('km-pos').innerHTML = `F = ${pos}`;
  document.getElementById('km-alt').hidden = !r.alt;
  document.getElementById('km-alt-pos').hidden = !rp.alt;
  document.getElementById('km-primes').innerHTML = r.primes.length
    ? r.primes.map(t => `<li>${product(t)}${r.ess.has(`${t.v}/${t.m}`) ? ` <span class="km-badge">${T.essential}</span>` : ''}</li>`).join('') : '<li>–</li>';
  document.getElementById('km-gates').textContent = `SOP ${gateInputs(r.terms, lits)} / POS ${gateInputs(rp.terms, lits)}`;
  form.elements.m.value = on.join(',');
  form.elements.d.value = dc.join(',');
  history.replaceState(history.state, '', `${location.pathname}#n=${n}&m=${on.join('.')}&d=${dc.join('.')}`);
}

// ---- 操作 ----
function parseList(s) {
  const out = new Set();
  for (const part of s.split(/[,\s.、]+/)) {
    const r = part.match(/^(\d+)(?:-(\d+))?$/);
    if (!r) continue;
    const a = Number(r[1]), b = Number(r[2] ?? r[1]);
    for (let x = Math.min(a, b); x <= Math.max(a, b); x++) if (x < 1 << n) out.add(x);
  }
  return [...out];
}
function set(nv, m, d) {
  n = nv;
  form.elements.n.value = String(n);
  f = new Array(1 << n).fill(0);
  for (const x of d) f[x] = 2;
  for (const x of m) f[x] = 1;
  render();
}
const EX = {
  majority: [3, [3, 5, 6, 7], []],
  seg_a: [4, [0, 2, 3, 5, 6, 7, 8, 9], [10, 11, 12, 13, 14, 15]],
  parity: [3, [1, 2, 4, 7], []],
  corners: [4, [0, 2, 8, 10], []],
};
form.addEventListener('click', e => {
  const b = e.target.closest('.km-cell');
  if (!b) return;
  const i = Number(b.dataset.i);
  f[i] = (f[i] + 1) % 3;
  render();
});
form.elements.n.addEventListener('change', () => {
  const m = parseList(form.elements.m.value), d = parseList(form.elements.d.value);
  set(Number(form.elements.n.value), m.filter(x => x < 1 << Number(form.elements.n.value)), d.filter(x => x < 1 << Number(form.elements.n.value)));
});
document.getElementById('km-apply').addEventListener('click', () => set(n, parseList(form.elements.m.value), parseList(form.elements.d.value)));
document.getElementById('km-clear').addEventListener('click', () => set(n, [], []));
document.getElementById('km-example').addEventListener('change', e => { const x = EX[e.target.value]; if (x) set(...x); e.target.value = ''; });
form.addEventListener('submit', e => e.preventDefault());

// 最初: URL の #n=…&m=…&d=…、なければ7セグメントの a の例
(function init() {
  const h = new URLSearchParams(location.hash.slice(1));
  const nv = Number(h.get('n'));
  if ([2, 3, 4].includes(nv)) {
    const list = k => (h.get(k) ?? '').split('.').filter(Boolean).map(Number).filter(x => Number.isInteger(x) && x >= 0 && x < 1 << nv);
    set(nv, list('m'), list('d'));
  } else set(...EX.seg_a);
})();
