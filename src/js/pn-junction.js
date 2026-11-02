// pn接合(階段接合・空乏近似)の計算ページ。内蔵電位、空乏層幅、最大電界、接合容量。温度は 300 K
import { initSweep } from './sweep.js';
const form = document.getElementById('pn-form');
const lang = document.documentElement.lang || 'en';
const fmt = (x, d = 3) => (Number.isFinite(x) ? x.toLocaleString(lang, { maximumSignificantDigits: d }) : '–');
const out = k => document.querySelector(`[data-out="${k}"]`);
const q = 1.602e-19, kT = 0.02585, e0 = 8.854e-14; // C、eV(300 K)、F/cm
// 300 K の代表値: 真性キャリア密度 ni (cm⁻³) と比誘電率
const MAT = { si: [1.0e10, 11.7], ge: [2.0e13, 16.0], gaas: [2.1e6, 12.9] };

// 内蔵電位 vbi (V)、空乏層幅 w・n側の広がり xn・p側の広がり xp (µm)、最大電界 emax (kV/cm)、接合容量 cj (nF/cm²)。
// 逆バイアスを足した電圧が正でないとき(順バイアスが内蔵電位を超える)は vbi だけを返す
export function calc({ mat, na, nd, vr }) {
  const [ni, er] = MAT[mat] ?? MAT.si;
  const es = er * e0, vbi = kT * Math.log((na * nd) / (ni * ni)), vt = vbi + vr;
  if (!(vt > 0)) return { vbi };
  const wd = Math.sqrt(((2 * es * vt) / q) * (1 / na + 1 / nd)); // cm
  const xn = (wd * na) / (na + nd), xp = (wd * nd) / (na + nd);
  return { vbi, w: wd * 1e4, xn: xn * 1e4, xp: xp * 1e4, emax: (q * nd * xn) / es / 1e3, cj: (es / wd) * 1e9 };
}

function update() {
  const num = (k, min = 0) => { const v = Number(form.elements[k].value); return Number.isFinite(v) && v > min ? v : Number(form.elements[k].defaultValue); };
  const r = calc({ mat: form.elements.mat.value, na: num('na'), nd: num('nd'), vr: Number(form.elements.vr.value) || 0 });
  const valid = Number.isFinite(r.w);
  out('vbi').textContent = `${fmt(r.vbi)} V`;
  out('w').textContent = valid ? `${fmt(r.w)} µm` : '–';
  out('xn').textContent = valid ? `${fmt(r.xn)} µm` : '–';
  out('xp').textContent = valid ? `${fmt(r.xp)} µm` : '–';
  out('emax').textContent = valid ? `${fmt(r.emax)} kV/cm` : '–';
  out('cj').textContent = valid ? `${fmt(r.cj)} nF/cm²` : '–';
  document.getElementById('pn-warn').hidden = valid;
}
// 画面がないとき(テストで計算だけを読み込むとき)は、画面の処理をしない
if (form) {
  form.addEventListener('input', update);
  form.addEventListener('submit', e => e.preventDefault());
  update();

  // グラフで見る: 逆バイアスや不純物濃度を変えたときの空乏層幅など
  initSweep({
    form, inputs: ['vr', 'nd', 'na'], outputs: ['w', 'cj', 'emax', 'vbi'], defaults: { x: 'vr', y: 'w' }, ranges: { vr: [0, 10] },
    calc: v => calc(v),
  });
}
