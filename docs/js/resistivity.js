// シリコンの抵抗率と不純物濃度の換算。ρ = 1 / (q·N·μ(N))。移動度は Caughey–Thomas 型の式(300 K の代表的なフィット値)。
// 不純物はすべてイオン化し、少数キャリアの寄与は無視する。どちらの欄を書き換えても、もう一方を計算し直す
import { lineChart } from './chart.js';
const form = document.getElementById('rs-form');
const svg = document.getElementById('rs-chart');
const lang = document.documentElement.lang || 'en';
const fmt = (x, d = 3) => (Number.isFinite(x) ? x.toLocaleString(lang, { maximumSignificantDigits: d }) : '–');
const sci = x => (Number.isFinite(x) ? x.toExponential(2).replace('e+', 'e') : '');
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
const q = 1.602e-19;
// [μmax, μmin, Nref, α] (cm²/V·s, cm⁻³)。n型は電子(リン・ヒ素)、p型は正孔(ホウ素)
const MOB = { n: [1414, 68.5, 9.2e16, 0.711], p: [470.5, 44.9, 2.23e17, 0.719] };
export const mobility = (type, N) => { const [mx, mn, nr, a] = MOB[type] ?? MOB.n; return mn + (mx - mn) / (1 + (N / nr) ** a); };
export const rho = (type, N) => 1 / (q * N * mobility(type, N));
// 抵抗率から濃度: ρ は濃度について単調に減るので、log N の二分法で解く(1e10〜1e21 cm⁻³)
export function conc(type, r) {
  let lo = 10, hi = 21;
  if (!(r > 0) || r > rho(type, 10 ** lo) || r < rho(type, 10 ** hi)) return NaN;
  for (let k = 0; k < 60; k++) { const m = (lo + hi) / 2; if (rho(type, 10 ** m) > r) lo = m; else hi = m; }
  return 10 ** ((lo + hi) / 2);
}

function update(e) {
  const type = form.elements.type.value;
  const nEl = form.elements.n, rEl = form.elements.rho;
  let N;
  if (e?.target === rEl) {
    N = conc(type, Number(rEl.value));
    if (Number.isFinite(N)) nEl.value = sci(N);
  } else {
    N = Number(nEl.value);
    if (!(N > 0)) N = NaN;
    if (Number.isFinite(N) && e) rEl.value = Number(rho(type, N).toPrecision(3));
  }
  const ok = Number.isFinite(N) && N >= 1e10 && N <= 1e21;
  document.getElementById('rs-warn').hidden = ok;
  const r = ok ? rho(type, N) : NaN, mu = ok ? mobility(type, N) : NaN;
  out('n').textContent = ok ? `${big(N)} cm⁻³` : '–';
  out('rho').textContent = ok ? `${fmt(r)} Ω·cm` : '–';
  out('mu').textContent = ok ? `${fmt(mu)} cm²/V·s` : '–';
  out('sigma').textContent = ok ? `${fmt(1 / r)} S/cm` : '–';
  const curve = t => Array.from({ length: 61 }, (_, k) => 10 ** (13 + k * 0.1)).map(x => [x, rho(t, x)]);
  lineChart(svg, { xlabel: labels.x ?? 'N (cm⁻³)', ylabel: labels.y ?? 'ρ (Ω·cm)', xlog: true, ylog: true,
    series: [{ points: curve('n'), cls: type === 'n' ? 'ac' : 'dash' }, { points: curve('p'), cls: type === 'p' ? 'ac' : 'dash' }],
    marks: ok && N >= 1e13 && N <= 1e19 ? [[N, r, `${fmt(r)} Ω·cm`]] : [] });
}
form.addEventListener('input', update);
form.addEventListener('submit', e => e.preventDefault());
update();
