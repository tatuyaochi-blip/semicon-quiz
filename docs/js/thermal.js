// 接合温度の計算ページ。Tj = Ta + P × θ(ヒートシンクなしは θJA、ありは θJC + θCS + θSA)
const form = document.getElementById('th-form');
const lang = document.documentElement.lang || 'en';
const fmt = (x, d = 1) => (Number.isFinite(x) ? x.toLocaleString(lang, { maximumFractionDigits: d }) : '–');
const out = k => document.querySelector(`[data-out="${k}"]`);

function update() {
  const v = Object.fromEntries(['p', 'ta', 'tjmax', 'tja', 'tjc', 'tcs', 'tsa'].map(k => {
    const n = Number(form.elements[k].value);
    return [k, Number.isFinite(n) ? n : Number(form.elements[k].defaultValue)];
  }));
  const sink = v.tjc + v.tcs + v.tsa;
  for (const [key, theta] of [['ja', v.tja], ['hs', sink]]) {
    const tj = v.ta + v.p * theta;
    const el = out(`${key}-tj`);
    el.textContent = `${fmt(tj)} ℃`;
    el.dataset.ok = tj <= v.tjmax;
    out(`${key}-margin`).textContent = `${fmt(v.tjmax - tj)} ℃`;
    out(`${key}-pmax`).textContent = theta > 0 ? `${fmt(Math.max(0, (v.tjmax - v.ta) / theta), 2)} W` : '–';
  }
  out('hs-theta').textContent = `${fmt(sink, 2)} ℃/W`;
}
form.addEventListener('input', update);
form.addEventListener('submit', e => e.preventDefault());
update();

// グラフで見る: 入力を1つ変えたときの接合温度など
import { initSweep } from './sweep.js';
initSweep({
  form, inputs: ['p', 'ta', 'tja', 'tjc', 'tcs', 'tsa'], outputs: ['ja-tj', 'hs-tj', 'ja-pmax', 'hs-pmax'], defaults: { x: 'p', y: 'ja-tj' },
  calc: v => {
    const sink = v.tjc + v.tcs + v.tsa;
    return { 'ja-tj': v.ta + v.p * v.tja, 'hs-tj': v.ta + v.p * sink, 'ja-pmax': (v.tjmax - v.ta) / v.tja, 'hs-pmax': (v.tjmax - v.ta) / sink };
  },
});
