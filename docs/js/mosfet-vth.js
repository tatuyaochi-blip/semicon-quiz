// MOSFETのしきい値電圧(長チャネル・均一な基板濃度)。温度は 300 K、基板はシリコン。
// nMOS: Vth = VFB + 2φF + √(2qεsNA(2φF + VSB)) / Cox、pMOS: Vth = VFB + 2φF − √(2qεsND(2|φF| + |VSB|)) / Cox(φF < 0)
// VFB = φms − Qf/Cox、φms = φm − (χ + Eg/2 + φF)。φF は p型で正、n型で負
const form = document.getElementById('vt-form');
const lang = document.documentElement.lang || 'en';
const fmt = (x, d = 3) => (Number.isFinite(x) ? x.toLocaleString(lang, { maximumSignificantDigits: d }) : '–');
const out = k => document.querySelector(`[data-out="${k}"]`);
const q = 1.602e-19, kT = 0.02585, e0 = 8.854e-14, ni = 1.0e10, chi = 4.05, Eg = 1.12;
const es = 11.7 * e0, eox = 3.9 * e0;
// ゲート電極の仕事関数 (eV): n+ ポリSi は伝導帯の端、p+ ポリSi は価電子帯の端とみなす
const GATE = { npoly: chi, ppoly: chi + Eg };

export function calc(v) {
  const nmos = v.type !== 'pmos';
  const N = v.n, tox = v.tox * 1e-7; // cm
  if (!(N > 0) || !(tox > 0) || !(v.vsb >= 0)) return {};
  const cox = eox / tox; // F/cm²
  const phiF = (nmos ? 1 : -1) * kT * Math.log(N / ni);
  const phim = GATE[v.gate] ?? v.phim;
  const phims = phim - (chi + Eg / 2 + phiF);
  const vfb = phims - (q * v.nf) / cox;
  const surf = 2 * Math.abs(phiF) + v.vsb; // 強反転のときの表面電位(の大きさ)と基板バイアス
  const qd = Math.sqrt(2 * q * es * N * surf); // 空乏層の電荷 (C/cm²)
  const vth = vfb + 2 * phiF + (nmos ? 1 : -1) * qd / cox;
  return {
    cox: cox * 1e6, phif: phiF, phims, vfb, wd: Math.sqrt((2 * es * surf) / (q * N)) * 1e4,
    qd: (nmos ? 1 : -1) * qd / cox, gamma: Math.sqrt(2 * q * es * N) / cox, vth,
  };
}

const sel = form.elements.gate;
function update() {
  const v = Object.fromEntries(['n', 'tox', 'nf', 'vsb', 'phim'].map(k => [k, Number(form.elements[k].value)]));
  v.type = form.elements.type.value;
  v.gate = sel.value;
  form.elements.phim.closest('label').hidden = sel.value !== 'metal';
  const r = calc(v);
  const ok = Number.isFinite(r.vth);
  const V = x => (ok ? `${fmt(x)} V` : '–');
  out('cox').textContent = ok ? `${fmt(r.cox)} µF/cm² (${fmt(r.cox * 10)} fF/µm²)` : '–';
  out('phif').textContent = V(r.phif);
  out('phims').textContent = V(r.phims);
  out('vfb').textContent = V(r.vfb);
  out('qd').textContent = V(r.qd);
  out('wd').textContent = ok ? `${fmt(r.wd)} µm` : '–';
  out('gamma').textContent = ok ? `${fmt(r.gamma)} V^½` : '–';
  out('vth').textContent = V(r.vth);
}
form.addEventListener('input', update);
form.addEventListener('submit', e => e.preventDefault());
update();

// グラフで見る: 基板濃度・酸化膜厚・基板バイアスを変えたときのしきい値電圧など
import { initSweep } from './sweep.js';
initSweep({
  form, inputs: ['n', 'tox', 'vsb', 'nf'], outputs: ['vth', 'vfb', 'qd', 'wd'], defaults: { x: 'n', y: 'vth' }, ranges: { vsb: [0, 3] },
  calc: v => { const r = calc(v); return { ...r, wd: r.wd }; },
});
