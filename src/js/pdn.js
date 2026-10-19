// 電源供給網(PDN)の目標インピーダンスとデカップリングコンデンサの計算ページ。
// 目標インピーダンス Zt = V × 許容リップル / ΔI。コンデンサは C・ESR・ESL の直列とし、同じものを N 個並列にすると
// Z = (ESR + jωESL + 1/(jωC)) / N。|Z| < Zt となる範囲は、2次方程式を解いて端の周波数を求める
import { lineChart } from './chart.js';
const form = document.getElementById('pdn-form');
const svg = document.getElementById('pdn-chart');
const lang = document.documentElement.lang || 'en';
const fmt = (x, d = 3) => (Number.isFinite(x) ? x.toLocaleString(lang, { maximumSignificantDigits: d }) : '–');
const out = k => document.querySelector(`[data-out="${k}"]`);
let labels = {};
try { labels = JSON.parse(svg.dataset.labels); } catch {}

// v: V (V)、ripple (%)、di (A)、c (µF)、esr (mΩ)、esl (nH)、n (個)。結果は mΩ、MHz、個
export function pdn(v) {
  const C = v.c * 1e-6, R = v.esr * 1e-3, L = v.esl * 1e-9, n = Math.max(1, Math.round(v.n));
  const zt = (v.v * v.ripple) / 100 / v.di;
  const srf = 1 / (2 * Math.PI * Math.sqrt(L * C));
  // 1個あたりで |Z1| < n·Zt となる範囲: リアクタンス ωL − 1/(ωC) の大きさが X0 より小さい所
  const z1 = n * zt, r = { zt: zt * 1e3, srf: srf / 1e6, zsrf: v.esr / n, nmin: Math.max(1, Math.ceil(R / zt - 1e-9)), flo: NaN, fhi: NaN };
  if (z1 > R) {
    const x0 = Math.sqrt(z1 * z1 - R * R), d = Math.sqrt(x0 * x0 + (4 * L) / C);
    r.flo = (-x0 + d) / (2 * L) / (2 * Math.PI) / 1e6;
    r.fhi = (x0 + d) / (2 * L) / (2 * Math.PI) / 1e6;
  }
  return r;
}
// N 個並列のインピーダンスの大きさ (Ω)
const zmag = (v, f) => { const w = 2 * Math.PI * f; return Math.hypot(v.esr * 1e-3, w * v.esl * 1e-9 - 1 / (w * v.c * 1e-6)) / Math.max(1, Math.round(v.n)); };
const hz = mhz => (mhz >= 1e3 ? `${fmt(mhz / 1e3)} GHz` : mhz >= 1 ? `${fmt(mhz)} MHz` : `${fmt(mhz * 1e3)} kHz`);
const mohm = x => (x >= 1e3 ? `${fmt(x / 1e3)} Ω` : `${fmt(x)} mΩ`);

function read() {
  const num = k => { const v = Number(form.elements[k].value); return Number.isFinite(v) && v > 0 ? v : Number(form.elements[k].defaultValue); };
  return Object.fromEntries(['v', 'ripple', 'di', 'c', 'esr', 'esl', 'n'].map(k => [k, num(k)]));
}

function update() {
  const v = read(), r = pdn(v);
  const band = Number.isFinite(r.flo);
  out('zt').textContent = mohm(r.zt);
  out('srf').textContent = hz(r.srf);
  out('zsrf').textContent = mohm(r.zsrf);
  out('flo').textContent = band ? hz(r.flo) : '–';
  out('fhi').textContent = band ? hz(r.fhi) : '–';
  out('nmin').textContent = `${r.nmin}`;
  document.getElementById('pdn-warn').hidden = band;
  // |Z(f)| を自己共振周波数の 1/1000 から 100 倍まで描き、目標インピーダンスを破線で重ねる
  const f0 = r.srf * 1e6, pts = [];
  for (let k = 0; k <= 100; k++) { const f = f0 * 10 ** (-3 + (5 * k) / 100); pts.push([f / 1e6, zmag(v, f) * 1e3]); }
  lineChart(svg, {
    xlog: true, ylog: true, xlabel: labels.x ?? 'f (MHz)', ylabel: labels.y ?? '|Z| (mΩ)',
    series: [{ points: [[pts[0][0], r.zt], [pts.at(-1)[0], r.zt]], cls: 'dash' }, { points: pts, cls: 'ac' }],
    marks: [[r.srf, r.zsrf, hz(r.srf)]],
  });
}
form.addEventListener('input', update);
form.addEventListener('submit', e => e.preventDefault());
update();

// グラフで見る: コンデンサの数や容量、ESL を変えたときの範囲など
import { initSweep } from './sweep.js';
initSweep({
  form, inputs: ['n', 'c', 'esl', 'esr', 'di', 'ripple', 'v'], outputs: ['flo', 'fhi', 'zsrf', 'srf', 'zt', 'nmin'], defaults: { x: 'n', y: 'fhi' }, ranges: { n: [1, 50] },
  calc: v => (['v', 'ripple', 'di', 'c', 'esr', 'esl', 'n'].every(k => v[k] > 0) ? pdn(v) : {}),
});
