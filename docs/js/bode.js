// ボード線図。伝達関数 G(s) = 分子(s) / 分母(s) · e^(−Ls) の、角周波数 ω に対するゲイン |G(jω)| [dB] と位相 ∠G(jω) [°]。
// 分子・分母は s の多項式で書く(例: 10、s^2 + 3s + 2、(s+1)(s+2)、s(0.1s+1))。係数を空白で並べた「1 3 2」も使える
// 位相は、極と零点ごとの角度 arg(jω − z) − arg(jω − p) の和で求めるので、−180° をこえても連続につながる
// ゲイン交差周波数 ωgc(ゲイン 0 dB)での位相余裕 = 180° + ∠G(jωgc)、位相交差周波数 ωpc(位相 −180°)でのゲイン余裕 = −20·log10|G(jωpc)|
// 閉ループの安定(単位負帰還 G/(1+G))は、むだ時間がないとき、特性方程式 分母 + 分子 = 0 の根の実部がすべて負かで判定する
import { lineChart } from './chart.js';

// ---- 多項式(係数は次数の低い順: [a0, a1, a2, ...]) ----
const trim = p => { const q = [...p]; while (q.length > 1 && Math.abs(q.at(-1)) < 1e-14) q.pop(); return q; };
const add = (a, b) => trim(Array.from({ length: Math.max(a.length, b.length) }, (_, i) => (a[i] ?? 0) + (b[i] ?? 0)));
const mul = (a, b) => { const r = new Array(a.length + b.length - 1).fill(0); a.forEach((x, i) => b.forEach((y, j) => { r[i + j] += x * y; })); return trim(r); };
const neg = a => a.map(x => -x);

// s の式を多項式にする。+ − * ^ ( ) と、2s や (s+1)(s+2) のような掛け算の省略に対応。読めなければ null
export function parsePoly(text) {
  const src = String(text).trim();
  if (!src) return null;
  if (/^-?[\d.]+(?:[eE][-+]?\d+)?(?:[\s,]+-?[\d.]+(?:[eE][-+]?\d+)?)+$/.test(src)) {
    const c = src.split(/[\s,]+/).map(Number);
    return c.every(Number.isFinite) && c.some(x => x !== 0) ? trim(c.reverse()) : null;
  }
  const toks = src.replace(/\s+/g, '').replace(/[×·]/g, '*').match(/\d+\.?\d*(?:[eE][-+]?\d+)?|\.\d+|[s+\-*^()]|./g) ?? [];
  let i = 0;
  const peek = () => toks[i];
  const fail = () => { throw new Error('parse'); };
  const atom = () => {
    const t = peek();
    if (t === '(') { i++; const v = expr(); if (toks[i++] !== ')') fail(); return v; }
    if (t === 's') { i++; return [0, 1]; }
    if (t !== undefined && /^[\d.]/.test(t)) { i++; const n = Number(t); if (!Number.isFinite(n)) fail(); return [n]; }
    return fail();
  };
  const power = () => {
    let b = atom();
    if (peek() === '^') { i++; const t = toks[i++]; const n = Number(t); if (!Number.isInteger(n) || n < 0 || n > 12) fail(); let r = [1]; for (let k = 0; k < n; k++) r = mul(r, b); b = r; }
    return b;
  };
  const term = () => {
    let v = power();
    while (peek() === '*' || peek() === '(' || peek() === 's' || (peek() !== undefined && /^[\d.]/.test(peek()))) { if (peek() === '*') i++; v = mul(v, power()); }
    return v;
  };
  const unary = () => (peek() === '-' ? (i++, neg(term())) : (peek() === '+' ? (i++, term()) : term()));
  function expr() { let v = unary(); while (peek() === '+' || peek() === '-') { const op = toks[i++]; const t = term(); v = add(v, op === '+' ? t : neg(t)); } return v; }
  try {
    const v = expr();
    if (i !== toks.length || v.length > 13 || v.every(x => x === 0)) return null;
    return v;
  } catch { return null; }
}

// 根(デュラン・カーナー法)。複素数は [実部, 虚部]
export function roots(p) {
  let q = trim(p);
  const out = [];
  while (q.length > 1 && Math.abs(q[0]) < 1e-14) { out.push([0, 0]); q = q.slice(1); }
  const n = q.length - 1;
  if (n < 1) return out;
  const a = q.map(x => x / q[n]);
  const cm = (x, y) => [x[0] * y[0] - x[1] * y[1], x[0] * y[1] + x[1] * y[0]];
  const cd = (x, y) => { const d = y[0] * y[0] + y[1] * y[1]; return [(x[0] * y[0] + x[1] * y[1]) / d, (x[1] * y[0] - x[0] * y[1]) / d]; };
  const ev = z => { let r = [1, 0]; for (let k = n - 1; k >= 0; k--) r = [cm(r, z)[0] + a[k], cm(r, z)[1]]; return r; };
  const R = 1 + Math.max(...a.slice(0, n).map(Math.abs));
  let z = Array.from({ length: n }, (_, k) => [R * 0.9 * Math.cos(2 * Math.PI * k / n + 0.4), R * 0.9 * Math.sin(2 * Math.PI * k / n + 0.4)]);
  for (let it = 0; it < 500; it++) {
    let moved = 0;
    z = z.map((zi, i2) => {
      let den = [1, 0];
      z.forEach((zj, j) => { if (j !== i2) den = cm(den, [zi[0] - zj[0], zi[1] - zj[1]]); });
      const d = cd(ev(zi), den);
      moved = Math.max(moved, Math.hypot(...d));
      return [zi[0] - d[0], zi[1] - d[1]];
    });
    if (moved < 1e-13) break;
  }
  return [...out, ...z.map(([re, im]) => [Math.abs(re) < 1e-9 ? 0 : re, Math.abs(im) < 1e-9 ? 0 : im])];
}

export function analyze(num, den, L = 0) {
  const zs = roots(num), ps = roots(den);
  const lead = num.at(-1) / den.at(-1);
  // 周波数の範囲: 0 でない極・零点の大きさ(とむだ時間)の前後 2 けた
  const mags = [...zs, ...ps].map(([re, im]) => Math.hypot(re, im)).filter(m => m > 1e-9);
  if (L > 0) mags.push(1 / L);
  const lo = mags.length ? Math.floor(Math.log10(Math.min(...mags))) - 2 : -2;
  const hi = mags.length ? Math.ceil(Math.log10(Math.max(...mags))) + 2 : 2;
  const N = 1200;
  const w = Array.from({ length: N }, (_, k) => 10 ** (lo + (hi - lo) * k / (N - 1)));
  const at = om => {
    let m = Math.abs(lead), ph = lead < 0 ? -180 : 0;
    for (const [re, im] of zs) { m *= Math.hypot(-re, om - im); ph += Math.atan2(om - im, -re) * 180 / Math.PI; }
    for (const [re, im] of ps) { m /= Math.hypot(-re, om - im); ph -= Math.atan2(om - im, -re) * 180 / Math.PI; }
    return { db: 20 * Math.log10(m), ph: ph - om * L * 180 / Math.PI };
  };
  const pts = w.map(at);
  // 交差を探して、あいだを二分法で詰める
  const crossing = (g, target) => {
    for (let k = 1; k < N; k++) {
      const a = g(w[k - 1]) - target, b = g(w[k]) - target;
      if (a === 0) return w[k - 1];
      if (a * b < 0) {
        let x0 = Math.log10(w[k - 1]), x1 = Math.log10(w[k]);
        for (let it = 0; it < 60; it++) { const xm = (x0 + x1) / 2; if ((g(10 ** xm) - target) * a > 0) x0 = xm; else x1 = xm; }
        return 10 ** ((x0 + x1) / 2);
      }
    }
    return NaN;
  };
  const wgc = crossing(om => at(om).db, 0);
  const wpc = crossing(om => at(om).ph, -180);
  const pm = Number.isFinite(wgc) ? 180 + at(wgc).ph : NaN;
  const gm = Number.isFinite(wpc) ? -at(wpc).db : NaN;
  const type = ps.filter(([re, im]) => re === 0 && im === 0).length - zs.filter(([re, im]) => re === 0 && im === 0).length;
  // 直流ゲイン(積分がなければ G(0))
  const dc = type === 0 && Math.abs(den[0]) > 1e-14 ? num[0] / den[0] : NaN;
  let clStable = null;
  if (!L) {
    const cl = roots(add(num, den));
    clStable = cl.length ? cl.every(([re]) => re < -1e-9) : null;
  }
  return { zeros: zs, poles: ps, w, db: pts.map(p => p.db), ph: pts.map(p => p.ph), wgc, wpc, pm, gm, type, dc, clStable };
}

const form = globalThis.document?.getElementById('bode-form');
if (form) {
  let T = {};
  try { T = JSON.parse(form.dataset.text); } catch {}
  const lang = document.documentElement.lang;
  const out = k => document.querySelector(`[data-out="${k}"]`);
  // 計算の誤差で −0 や 1e−13 のように出る値は 0 にする
  const f = (v, d = 3) => (Number.isFinite(v) ? Number((Math.abs(v) < 1e-9 ? 0 : v).toPrecision(d)).toLocaleString(lang, { maximumFractionDigits: 6 }) : '–');
  const byRe = list => [...list].sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  const cx = ([re, im]) => (im === 0 ? f(re, 4) : `${f(re, 4)} ${im < 0 ? '−' : '+'} ${f(Math.abs(im), 4)}j`);
  const err = document.getElementById('bode-error');
  function update() {
    const num = parsePoly(form.elements.num.value), den = parsePoly(form.elements.den.value);
    const L = Math.max(Number(form.elements.L.value) || 0, 0);
    if (!num || !den || den.length < 2 && den[0] === 0) { err.textContent = !num ? T.bad_num : T.bad_den; err.hidden = false; return; }
    if (num.length > den.length) { err.textContent = T.improper; err.hidden = false; return; }
    err.hidden = true;
    const r = analyze(num, den, L);
    out('poles').textContent = r.poles.length ? byRe(r.poles).map(cx).join(', ') : '–';
    out('zeros').textContent = r.zeros.length ? byRe(r.zeros).map(cx).join(', ') : '–';
    out('dc').textContent = r.type > 0 ? T.integrator.replace('{n}', r.type) : Number.isFinite(r.dc) ? `${f(r.dc, 4)} (${f(20 * Math.log10(Math.abs(r.dc)), 3)} dB)` : '–';
    out('wgc').textContent = Number.isFinite(r.wgc) ? `${f(r.wgc)} rad/s` : T.none;
    out('pm').textContent = Number.isFinite(r.pm) ? `${f(r.pm)}°` : T.none;
    out('wpc').textContent = Number.isFinite(r.wpc) ? `${f(r.wpc)} rad/s` : T.none;
    out('gm').textContent = Number.isFinite(r.gm) ? `${f(r.gm)} dB` : T.inf;
    out('cl').textContent = r.clStable === null ? T.cl_delay : r.clStable ? T.cl_stable : T.cl_unstable;
    const mk = (x, y, t) => (Number.isFinite(x) ? [[x, y, t]] : []);
    lineChart(document.getElementById('bode-mag'), { xlabel: T.x_label, ylabel: T.mag_label, xlog: true,
      series: [{ points: [[r.w[0], 0], [r.w.at(-1), 0]], cls: 'dash' }, { points: r.w.map((x, k) => [x, r.db[k]]), cls: 'ac' }],
      marks: mk(r.wgc, 0, 'ωgc') });
    lineChart(document.getElementById('bode-phase'), { xlabel: T.x_label, ylabel: T.phase_label, xlog: true,
      series: [{ points: [[r.w[0], -180], [r.w.at(-1), -180]], cls: 'dash' }, { points: r.w.map((x, k) => [x, r.ph[k]]), cls: 'ac2' }],
      marks: mk(r.wpc, -180, 'ωpc') });
  }
  form.addEventListener('input', e => { if (e.target.name !== 'example') update(); });
  form.elements.example.addEventListener('change', () => {
    const ex = T.examples[Number(form.elements.example.value)];
    if (!ex) return;
    form.elements.num.value = ex.num; form.elements.den.value = ex.den; form.elements.L.value = String(ex.L ?? 0);
    update();
  });
  form.addEventListener('submit', e => e.preventDefault());
  update();
}
