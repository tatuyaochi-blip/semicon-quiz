// 並列化による速度向上の計算ページ。アムダールの法則 S = 1/((1−p) + p/N) と、グスタフソンの法則 S = (1−p) + p·N
import { lineChart } from './chart.js';
const form = document.getElementById('am-form');
const svg = document.getElementById('am-chart');
const lang = document.documentElement.lang || 'en';
const fmt = (x, d = 2) => (Number.isFinite(x) ? x.toLocaleString(lang, { maximumFractionDigits: d }) : '–');
const out = k => document.querySelector(`[data-out="${k}"]`);
let labels = {};
try { labels = JSON.parse(svg.dataset.labels); } catch {}
const amdahl = (p, n) => 1 / ((1 - p) + p / n);
const gustafson = (p, n) => (1 - p) + p * n;

function update() {
  const num = (k, min) => { const v = Number(form.elements[k].value); return Number.isFinite(v) && v >= min ? v : Number(form.elements[k].defaultValue); };
  const p = Math.min(num('p', 0), 100) / 100, n = Math.max(1, Math.round(num('n', 1)));
  const a = amdahl(p, n);
  out('amdahl').textContent = `${fmt(a)}×`;
  out('eff').textContent = `${fmt((a / n) * 100, 1)}%`;
  out('limit').textContent = p < 1 ? `${fmt(1 / (1 - p))}×` : '∞';
  out('gustafson').textContent = `${fmt(gustafson(p, n))}×`;
  const ns = []; for (let k = 1; k <= Math.max(n * 4, 64); k *= 2) ns.push(k);
  lineChart(svg, {
    xlog: true, ylog: true, xlabel: labels.x ?? 'N', ylabel: labels.y ?? 'speedup',
    series: [{ points: ns.map(k => [k, k]), cls: 'dash' }, { points: ns.map(k => [k, gustafson(p, k)]), cls: 'ac2' }, { points: ns.map(k => [k, amdahl(p, k)]), cls: 'ac' }],
    marks: [[n, a, `${fmt(a)}×`]],
  });
}
form.addEventListener('input', update);
form.addEventListener('submit', e => e.preventDefault());
update();
