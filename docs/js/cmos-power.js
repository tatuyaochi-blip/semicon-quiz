// CMOSの消費電力の計算ページ。動的電力 P = α·C·V²·f、静的電力 P = Ileak·V
const form = document.getElementById('cp-form');
const lang = document.documentElement.lang || 'en';
const fmt = (x, d = 3) => (Number.isFinite(x) ? x.toLocaleString(lang, { maximumFractionDigits: d }) : '–');
const out = k => document.querySelector(`[data-out="${k}"]`);
const w = p => (p >= 1 ? `${fmt(p)} W` : `${fmt(p * 1e3)} mW`);

function update() {
  const num = (k, min = 0) => { const v = Number(form.elements[k].value); return Number.isFinite(v) && v >= min ? v : Number(form.elements[k].defaultValue); };
  const a = num('alpha'), c = num('c') * 1e-9, v = num('v'), f = num('f') * 1e9, il = num('ileak') * 1e-3, s = num('scale', 1) / 100;
  const dyn = a * c * v * v * f, stat = il * v;
  out('dyn').textContent = w(dyn);
  out('stat').textContent = w(stat);
  out('total').textContent = w(dyn + stat);
  out('share').textContent = dyn + stat > 0 ? `${fmt((stat / (dyn + stat)) * 100, 1)}%` : '–';
  // 電圧と周波数を同じ割合で下げたとき(DVFS)。動的電力は約3乗で、静的電力はここでは電圧に比例するとして見積もる
  const dyn2 = a * c * (v * s) ** 2 * (f * s), stat2 = il * (v * s);
  out('dvfs').textContent = w(dyn2 + stat2);
  out('dvfs-ratio').textContent = dyn + stat > 0 ? `${fmt(((dyn2 + stat2) / (dyn + stat)) * 100, 1)}%` : '–';
}
form.addEventListener('input', update);
form.addEventListener('submit', e => e.preventDefault());
update();

// グラフで見る: 電源電圧や周波数を変えたときの電力
import { initSweep } from './sweep.js';
initSweep({
  form, inputs: ['v', 'f', 'alpha', 'c', 'ileak'], outputs: ['total', 'dyn', 'stat', 'share'], defaults: { x: 'v', y: 'total' }, ranges: { v: [0.3, 1.5] },
  calc: v => {
    const dyn = v.alpha * v.c * 1e-9 * v.v * v.v * v.f * 1e9, stat = v.ileak * 1e-3 * v.v;
    return { total: dyn + stat, dyn, stat, share: dyn + stat > 0 ? (stat / (dyn + stat)) * 100 : NaN };
  },
});
