// シリコンの熱酸化(Deal-Grove モデル)の計算ページ。x² + A·x = B·(t + τ)
// 係数はアレニウス式で温度から求める(Deal と Grove の (111) 面の値。(100) 面は B/A を 1.68 で割る)
import { lineChart } from './chart.js';
const form = document.getElementById('ox-form');
const svg = document.getElementById('ox-chart');
const lang = document.documentElement.lang || 'en';
const fmt = (x, d = 3) => (Number.isFinite(x) ? x.toLocaleString(lang, { maximumSignificantDigits: d }) : '–');
const out = k => document.querySelector(`[data-out="${k}"]`);
let labels = {};
try { labels = JSON.parse(svg.dataset.labels); } catch {}
// [B の前因子 µm²/h, 活性化エネルギー eV, B/A の前因子 µm/h, 活性化エネルギー eV]
const K = { dry: [772, 1.23, 6.23e6, 2.0], wet: [386, 0.78, 1.63e8, 2.05] };

export function coeff(kind, tempC, orient) {
  const [c1, e1, c2, e2] = K[kind];
  const kt = 8.617e-5 * (tempC + 273.15);
  const B = c1 * Math.exp(-e1 / kt);
  const BA = (c2 * Math.exp(-e2 / kt)) / (orient === '100' ? 1.68 : 1);
  return { B, BA, A: B / BA };
}
const thick = ({ A, B }, t, tau) => (A / 2) * (Math.sqrt(1 + (t + tau) / ((A * A) / (4 * B))) - 1);

function update() {
  const num = (k, min = 0) => { const v = Number(form.elements[k].value); return Number.isFinite(v) && v >= min ? v : Number(form.elements[k].defaultValue); };
  const c = coeff(form.elements.kind.value, num('temp', 600), form.elements.orient.value);
  const xi = num('xi') / 1000, t = num('time');
  const tau = (xi * xi + c.A * xi) / c.B;
  const x = thick(c, t, tau);
  out('x').textContent = `${fmt(x * 1000)} nm`;
  out('grown').textContent = `${fmt((x - xi) * 1000)} nm`;
  out('si').textContent = `${fmt((x - xi) * 1000 * 0.44)} nm`;
  out('b').textContent = `${fmt(c.B)} µm²/h`;
  out('ba').textContent = `${fmt(c.BA)} µm/h`;
  const tmax = Math.max(t * 2, 0.5), pts = [];
  for (let k = 0; k <= 60; k++) { const tt = (tmax * k) / 60; pts.push([tt, thick(c, tt, tau) * 1000]); }
  lineChart(svg, { xlabel: labels.x ?? 'time (h)', ylabel: labels.y ?? 'oxide (nm)', series: [{ points: pts, cls: 'ac' }], marks: [[t, x * 1000, `${fmt(x * 1000)} nm`]] });
}
form.addEventListener('input', update);
form.addEventListener('submit', e => e.preventDefault());
update();

// グラフで見る: 温度などを変えたときの酸化膜厚
import { initSweep } from './sweep.js';
initSweep({
  form, inputs: ['temp', 'time', 'xi'], outputs: ['x', 'grown', 'b', 'ba'], defaults: { x: 'temp', y: 'x' }, ranges: { temp: [800, 1200] },
  calc: v => {
    const c = coeff(v.kind, v.temp, v.orient), xi = v.xi / 1000;
    const x = thick(c, v.time, (xi * xi + c.A * xi) / c.B);
    return { x: x * 1000, grown: (x - xi) * 1000, b: c.B, ba: c.BA };
  },
});
