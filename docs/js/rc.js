// RC 回路の時定数。τ = R·C、1次ローパス(ハイパス)のカットオフ周波数 fc = 1/(2πRC)。
// 時刻 t での充電は 1 − e^(−t/τ)、放電は e^(−t/τ)(電源電圧・初期電圧に対する割合)
import { lineChart } from './chart.js';
import { si, num, reader } from './eng.js';
const form = document.getElementById('rc-form');
const svg = document.getElementById('rc-chart');
const out = k => document.querySelector(`[data-out="${k}"]`);
const val = reader(form);
let labels = {};
try { labels = JSON.parse(svg.dataset.labels); } catch {}

function update() {
  const r = val('r', 1e-12) * Number(form.elements.ru.value);
  const c = val('c', 1e-18) * Number(form.elements.cu.value);
  const t = val('t', 0) * Number(form.elements.tu.value);
  const tau = r * c;
  out('tau').textContent = si(tau, 's');
  out('fc').textContent = si(1 / (2 * Math.PI * tau), 'Hz');
  out('t5').textContent = si(5 * tau, 's');
  out('charge').textContent = `${num((1 - Math.exp(-t / tau)) * 100, 4)}%`;
  out('discharge').textContent = `${num(Math.exp(-t / tau) * 100, 4)}%`;
  // 横軸は τ を単位にした時間(0〜5τ)
  const xs = Array.from({ length: 101 }, (_, k) => (k / 100) * 5);
  const k = t / tau;
  lineChart(svg, {
    xlabel: labels.x ?? 't/τ', ylabel: labels.y ?? '%',
    series: [{ points: xs.map(x => [x, (1 - Math.exp(-x)) * 100]), cls: 'ac' }, { points: xs.map(x => [x, Math.exp(-x) * 100]), cls: 'ac2' }],
    marks: k <= 5 ? [[k, (1 - Math.exp(-k)) * 100, `${num((1 - Math.exp(-k)) * 100, 3)}%`]] : [],
  });
}
form.addEventListener('input', update);
form.addEventListener('submit', e => e.preventDefault());
update();
