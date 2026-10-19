// チップ上の配線のRC遅延の計算ページ。抵抗 R = ρL/(W·T)、容量は平行平板の近似で
// 上下の面への 2ε·W/H と、左右の隣の配線への 2ε·T/S の和(フリンジ容量は含めない)。
// 遅延は分布RC線路の50%遅延 0.38·Rw·Cw に、駆動側の抵抗と負荷容量の項を足す(Bakoglu の近似)
import { lineChart } from './chart.js';
const form = document.getElementById('rc-form');
const svg = document.getElementById('rc-chart');
const lang = document.documentElement.lang || 'en';
const fmt = (x, d = 3) => (Number.isFinite(x) ? x.toLocaleString(lang, { maximumSignificantDigits: d }) : '–');
const out = k => document.querySelector(`[data-out="${k}"]`);
let labels = {};
try { labels = JSON.parse(svg.dataset.labels); } catch {}
const e0 = 8.854e-12; // F/m
// 室温のバルクの抵抗率 (µΩ·cm)
const RHO = { cu: 1.7, al: 2.7, w: 5.3, co: 6.2, ru: 7.1 };

// v: 入力の値(長さは nm と µm、Rdrv は Ω、CL は fF)。結果は Ω/µm、Ω、fF/µm、fF、ps
export function wire(v) {
  const rho = (RHO[v.metal] ?? RHO.cu) * 1e-8 * v.rhox; // Ω·m
  const rl = rho / (v.w * 1e-9 * v.t * 1e-9) * 1e-6; // Ω/µm
  const plate = (2 * v.w) / v.h, side = (2 * v.t) / v.s;
  const cl = v.k * e0 * (plate + side) * 1e-6 * 1e15; // fF/µm
  const r = rl * v.len, c = cl * v.len, load = v.cl;
  const ps = 1e-15 * 1e12; // Ω·fF → ps
  const wireD = 0.38 * r * c * ps;
  const total = (0.69 * v.rdrv * (c + load) + 0.38 * r * c + 0.69 * r * load) * ps;
  return { 'r-len': rl, r, 'c-len': cl, c, 'cc-share': (side / (plate + side)) * 100, wire: wireD, total };
}
const ohm = x => (x >= 1e3 ? `${fmt(x / 1e3)} kΩ` : `${fmt(x)} Ω`);
const ps = x => (x >= 1e3 ? `${fmt(x / 1e3)} ns` : `${fmt(x)} ps`);

function read() {
  const num = (k, min = 0) => { const v = Number(form.elements[k].value); return Number.isFinite(v) && v > min ? v : Number(form.elements[k].defaultValue); };
  const z = k => { const v = Number(form.elements[k].value); return Number.isFinite(v) && v >= 0 ? v : 0; };
  return { metal: form.elements.metal.value, rhox: Math.max(num('rhox'), 1), w: num('w'), t: num('t'), s: num('s'), h: num('h'), k: Math.max(num('k'), 1), len: num('len'), rdrv: z('rdrv'), cl: z('cl') };
}

function update() {
  const v = read(), r = wire(v);
  out('r-len').textContent = `${fmt(r['r-len'])} Ω/µm`;
  out('r').textContent = ohm(r.r);
  out('c-len').textContent = `${fmt(r['c-len'])} fF/µm`;
  out('c').textContent = `${fmt(r.c)} fF`;
  out('cc-share').textContent = `${fmt(r['cc-share'])}%`;
  out('wire').textContent = ps(r.wire);
  out('total').textContent = ps(r.total);
  // 長さを0から今の値の2倍まで変えたときの遅延(横軸は mm)。配線だけの遅延は長さの2乗で増える
  const pts = [], ptsW = [];
  for (let k = 0; k <= 60; k++) {
    const len = (v.len * 2 * k) / 60, y = wire({ ...v, len });
    pts.push([len / 1e3, y.total]); ptsW.push([len / 1e3, y.wire]);
  }
  lineChart(svg, { xlabel: labels.x ?? 'length (mm)', ylabel: labels.y ?? 'delay (ps)', series: [{ points: ptsW, cls: 'ac2' }, { points: pts, cls: 'ac' }], marks: [[v.len / 1e3, r.total, ps(r.total)]] });
}
form.addEventListener('input', update);
form.addEventListener('submit', e => e.preventDefault());
update();

// グラフで見る: 配線の長さや幅、間隔、比誘電率を変えたときの遅延など
import { initSweep } from './sweep.js';
initSweep({
  form, inputs: ['len', 'w', 's', 't', 'h', 'k', 'rhox', 'rdrv', 'cl'], outputs: ['total', 'wire', 'r', 'c', 'c-len', 'cc-share'], defaults: { x: 'len', y: 'total' },
  calc: v => (v.w > 0 && v.t > 0 && v.s > 0 && v.h > 0 && v.len >= 0 ? wire({ ...v, rhox: Math.max(v.rhox, 1), k: Math.max(v.k, 1), rdrv: Math.max(v.rdrv, 0), cl: Math.max(v.cl, 0) }) : {}),
});
