// 真性キャリア密度の温度依存。ni(T) = ni(300 K) × (T/300)^1.5 × exp(−(Eg(T)/kT − Eg(300)/k·300)/2)。
// Nc・Nv は T^1.5 に比例するとし、Eg(T) は Varshni の式 Eg0 − αT²/(T + β)。300 K の ni は代表値に合わせる
import { lineChart } from './chart.js';
const form = document.getElementById('ni-form');
const svg = document.getElementById('ni-chart');
const lang = document.documentElement.lang || 'en';
const fmt = (x, d = 3) => (Number.isFinite(x) ? x.toLocaleString(lang, { maximumSignificantDigits: d }) : '–');
// 大きな数・小さな数は 1.36×10¹⁵ のように書く
const sup = n => String(n).replace(/[-\d]/g, c => '⁻⁰¹²³⁴⁵⁶⁷⁸⁹'['-0123456789'.indexOf(c)]);
const big = (x, d = 3) => {
  if (!Number.isFinite(x) || x === 0) return fmt(x, d);
  const e = Math.floor(Math.log10(Math.abs(x)));
  if (e < 5 && e > -3) return fmt(x, d);
  const m = Number((x / 10 ** e).toPrecision(d));
  return m === 1 ? `10${sup(e)}` : `${fmt(m, d)}×10${sup(e)}`;
};
const out = k => document.querySelector(`[data-out="${k}"]`);
let labels = {};
try { labels = JSON.parse(svg.dataset.labels); } catch {}
const k = 8.617e-5; // eV/K
// [ni(300 K) cm⁻³, Eg0 eV, α eV/K, β K]
const MAT = { si: [1.0e10, 1.17, 4.73e-4, 636], ge: [2.0e13, 0.7437, 4.774e-4, 235], gaas: [2.1e6, 1.519, 5.405e-4, 204] };
export const eg = (m, T) => { const [, e0, a, b] = MAT[m] ?? MAT.si; return e0 - (a * T * T) / (T + b); };
export function ni(m, T) {
  const [n300] = MAT[m] ?? MAT.si;
  return n300 * (T / 300) ** 1.5 * Math.exp(-(eg(m, T) / (k * T) - eg(m, 300) / (k * 300)) / 2);
}
// 不純物濃度 N と ni が等しくなる温度(真性領域に入る目安)。ni は温度について単調に増えるので二分法で解く
function tIntrinsic(m, N) {
  let lo = 100, hi = 2000;
  if (!(N > ni(m, lo)) || N > ni(m, hi)) return NaN;
  for (let i = 0; i < 60; i++) { const t = (lo + hi) / 2; if (ni(m, t) < N) lo = t; else hi = t; }
  return (lo + hi) / 2;
}
export function calc(v) {
  const T = v.t, N = v.dop;
  if (!(T >= 50 && T <= 1500)) return {};
  const n = ni(v.mat, T);
  const maj = N > 0 ? N / 2 + Math.sqrt((N / 2) ** 2 + n * n) : n;
  return { eg: eg(v.mat, T), kt: k * T * 1000, ni: n, ratio: n / ni(v.mat, 300), maj, min: (n * n) / maj, ti: N > 0 ? tIntrinsic(v.mat, N) : NaN };
}

function update() {
  const v = { mat: form.elements.mat.value, t: Number(form.elements.t.value), dop: Number(form.elements.dop.value) };
  const r = calc(v);
  const ok = Number.isFinite(r.ni);
  document.getElementById('ni-warn').hidden = ok;
  out('eg').textContent = ok ? `${fmt(r.eg, 4)} eV` : '–';
  out('kt').textContent = ok ? `${fmt(r.kt)} meV` : '–';
  out('ni').textContent = ok ? `${big(r.ni)} cm⁻³` : '–';
  out('ratio').textContent = ok ? `${big(r.ratio)} ×` : '–';
  out('maj').textContent = ok ? `${big(r.maj)} cm⁻³` : '–';
  out('min').textContent = ok ? `${big(r.min)} cm⁻³` : '–';
  out('ti').textContent = ok && Number.isFinite(r.ti) ? `${fmt(r.ti)} K (${fmt(r.ti - 273.15)} °C)` : '–';
  const curve = m => Array.from({ length: 66 }, (_, i) => 200 + i * 10).map(T => [T, ni(m, T)]);
  lineChart(svg, { xlabel: labels.x ?? 'T (K)', ylabel: labels.y ?? 'ni (cm⁻³)', ylog: true,
    series: ['ge', 'si', 'gaas'].map(m => ({ points: curve(m), cls: m === v.mat ? 'ac' : 'dash' })),
    marks: ok && v.t >= 200 && v.t <= 850 ? [[v.t, r.ni, `${big(r.ni)} cm⁻³`]] : [] });
}
form.addEventListener('input', update);
form.addEventListener('submit', e => e.preventDefault());
update();
