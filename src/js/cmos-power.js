import { initSweep } from './sweep.js';
// CMOSの消費電力の計算ページ。動的電力 P = α·C·V²·f、静的電力 P = Ileak·V
const form = document.getElementById('cp-form');
const lang = document.documentElement.lang || 'en';
const fmt = (x, d = 3) => (Number.isFinite(x) ? x.toLocaleString(lang, { maximumFractionDigits: d }) : '–');
const out = k => document.querySelector(`[data-out="${k}"]`);
// α・C(nF)・V・f(GHz)・Ileak(mA)・DVFS の倍率 s(0〜1)から、動的・静的・合計の電力(W)と、電圧と周波数を s 倍にしたときの電力
export function power({ alpha, c, v, f, ileak, s = 1 }) {
  const dyn = alpha * c * 1e-9 * v * v * f * 1e9, stat = ileak * 1e-3 * v;
  const dyn2 = alpha * c * 1e-9 * (v * s) ** 2 * (f * 1e9 * s), stat2 = ileak * 1e-3 * (v * s);
  return { dyn, stat, total: dyn + stat, share: dyn + stat > 0 ? (stat / (dyn + stat)) * 100 : NaN, dvfs: dyn2 + stat2, dvfsRatio: dyn + stat > 0 ? ((dyn2 + stat2) / (dyn + stat)) * 100 : NaN };
}
const w = p => (p >= 1 ? `${fmt(p)} W` : `${fmt(p * 1e3)} mW`);

if (form) {
function update() {
  const num = (k, min = 0) => { const v = Number(form.elements[k].value); return Number.isFinite(v) && v >= min ? v : Number(form.elements[k].defaultValue); };
  // 電圧と周波数を同じ割合で下げたとき(DVFS)。動的電力は約3乗で、静的電力はここでは電圧に比例するとして見積もる
  const r = power({ alpha: num('alpha'), c: num('c'), v: num('v'), f: num('f'), ileak: num('ileak'), s: num('scale', 1) / 100 });
  out('dyn').textContent = w(r.dyn);
  out('stat').textContent = w(r.stat);
  out('total').textContent = w(r.total);
  out('share').textContent = Number.isFinite(r.share) ? `${fmt(r.share, 1)}%` : '–';
  out('dvfs').textContent = w(r.dvfs);
  out('dvfs-ratio').textContent = Number.isFinite(r.dvfsRatio) ? `${fmt(r.dvfsRatio, 1)}%` : '–';
}
form.addEventListener('input', update);
form.addEventListener('submit', e => e.preventDefault());
update();

// グラフで見る: 電源電圧や周波数を変えたときの電力
initSweep({
  form, inputs: ['v', 'f', 'alpha', 'c', 'ileak'], outputs: ['total', 'dyn', 'stat', 'share'], defaults: { x: 'v', y: 'total' }, ranges: { v: [0.3, 1.5] }, units: { total: 'W', dyn: 'W', stat: 'W' },
  calc: v => {
    const dyn = v.alpha * v.c * 1e-9 * v.v * v.v * v.f * 1e9, stat = v.ileak * 1e-3 * v.v;
    return { total: dyn + stat, dyn, stat, share: dyn + stat > 0 ? (stat / (dyn + stat)) * 100 : NaN };
  },
});
}
