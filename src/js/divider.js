// 分圧回路。無負荷の出力 Vout = Vin·R2/(R1+R2)、負荷 RL をつないだときは R2 と RL の並列で計算する。
// 出力側から見た抵抗(テブナン等価抵抗)は R1 と R2 の並列。抵抗の入力は kΩ
import { si, num, reader } from './eng.js';
const form = document.getElementById('dv-form');
const out = k => document.querySelector(`[data-out="${k}"]`);
const val = reader(form);
const par = (a, b) => (a * b) / (a + b);

function update() {
  const vin = val('vin'), r1 = val('r1', 1e-9) * 1e3, r2 = val('r2', 1e-9) * 1e3, rl = val('rl', 0) * 1e3;
  const vout = (vin * r2) / (r1 + r2);
  const i = vin / (r1 + r2);
  out('vout').textContent = si(vout, 'V', 4);
  out('ratio').textContent = num(r2 / (r1 + r2), 4);
  out('i').textContent = si(i, 'A');
  out('p1').textContent = si(i * i * r1, 'W');
  out('p2').textContent = si(i * i * r2, 'W');
  out('rth').textContent = si(par(r1, r2), 'Ω');
  out('vload').textContent = rl > 0 ? si((vin * par(r2, rl)) / (r1 + par(r2, rl)), 'V', 4) : '–';
}
form.addEventListener('input', update);
form.addEventListener('submit', e => e.preventDefault());
update();
