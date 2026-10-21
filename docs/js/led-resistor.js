// LED の電流制限抵抗。R = (Vs − n·Vf) / If(n 個を直列)。E24 系列で計算値以上の抵抗を選び、そのときの電流と抵抗の消費電力を出す。
// 抵抗の定格は、消費電力の2倍以上ある一般的な値(1/8・1/4・1/2・1・2 W)を目安として示す
import { si, eUp, reader } from './eng.js';
const form = document.getElementById('led-form');
const out = k => document.querySelector(`[data-out="${k}"]`);
const val = reader(form);
const RATINGS = [0.125, 0.25, 0.5, 1, 2];

function update() {
  const vs = val('vs'), vf = val('vf', 0), ia = val('ma', 1e-6) / 1000, n = Math.max(1, Math.round(val('n', 1)));
  const drop = vs - n * vf;
  const ok = drop > 0;
  document.getElementById('led-warn').hidden = ok;
  const r = ok ? drop / ia : NaN;
  const re = eUp(r);
  const ie = drop / re;
  const pr = ie * ie * re;
  const rating = RATINGS.find(w => w >= 2 * pr);
  out('r').textContent = si(r, 'Ω');
  out('re').textContent = si(re, 'Ω');
  out('ie').textContent = si(ie, 'A');
  out('pr').textContent = si(pr, 'W');
  out('rating').textContent = Number.isFinite(pr) ? (rating ? `${rating >= 1 ? rating : `1/${1 / rating}`} W` : `> 2 W`) : '–';
  out('pled').textContent = ok ? si(vf * ie, 'W') : '–';
}
form.addEventListener('input', update);
form.addEventListener('submit', e => e.preventDefault());
update();
