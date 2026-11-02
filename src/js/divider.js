// 分圧回路。無負荷の出力 Vout = Vin·R2/(R1+R2)、負荷 RL をつないだときは R2 と RL の並列で計算する。
// 出力側から見た抵抗(テブナン等価抵抗)は R1 と R2 の並列。抵抗の入力は kΩ
import { si, num, reader } from './eng.js';
const form = document.getElementById('dv-form');
const out = k => document.querySelector(`[data-out="${k}"]`);
const par = (a, b) => (a * b) / (a + b);

// 抵抗は Ω。rl = 0 は負荷なし(vload は NaN)
export function calc({ vin, r1, r2, rl = 0 }) {
  const i = vin / (r1 + r2);
  return {
    vout: (vin * r2) / (r1 + r2), ratio: r2 / (r1 + r2), i, p1: i * i * r1, p2: i * i * r2, rth: par(r1, r2),
    vload: rl > 0 ? (vin * par(r2, rl)) / (r1 + par(r2, rl)) : NaN,
  };
}

if (form) {
  const val = reader(form);
  const update = () => {
    const c = calc({ vin: val('vin'), r1: val('r1', 1e-9) * 1e3, r2: val('r2', 1e-9) * 1e3, rl: val('rl', 0) * 1e3 });
    out('vout').textContent = si(c.vout, 'V', 4);
    out('ratio').textContent = num(c.ratio, 4);
    out('i').textContent = si(c.i, 'A');
    out('p1').textContent = si(c.p1, 'W');
    out('p2').textContent = si(c.p2, 'W');
    out('rth').textContent = si(c.rth, 'Ω');
    out('vload').textContent = Number.isFinite(c.vload) ? si(c.vload, 'V', 4) : '–';
  };
  form.addEventListener('input', update);
  form.addEventListener('submit', e => e.preventDefault());
  update();
}
