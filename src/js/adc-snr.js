// ADコンバータのSN比と有効ビット数の計算ページ
// 量子化で決まるSN比 6.02N + 1.76 dB(+ オーバーサンプリングの利得 10·log10 OSR)と、
// サンプリングクロックのジッタで決まるSN比 −20·log10(2π·fin·σ) を合成する
import { initSweep } from './sweep.js';
const form = document.getElementById('adc-form');
const lang = document.documentElement.lang || 'en';
const fmt = (x, d = 1) => (Number.isFinite(x) ? x.toLocaleString(lang, { maximumFractionDigits: d }) : '–');
const out = k => document.querySelector(`[data-out="${k}"]`);
export const enob = snr => (snr - 1.76) / 6.02;

// bits(ビット)・fs(フルスケール V)・fin(MHz)・jitter(ps)・osr から、量子化・ジッタ・合計のSN比(dB)、有効ビット数、1 LSB(mV)
export function snr({ bits, fs = 1, fin = 0, jitter = 0, osr = 1 }) {
  const q = 6.02 * bits + 1.76 + 10 * Math.log10(Math.max(osr, 1));
  const j = fin > 0 && jitter > 0 ? -20 * Math.log10(2 * Math.PI * fin * 1e6 * jitter * 1e-12) : Infinity;
  const total = -10 * Math.log10(10 ** (-q / 10) + (Number.isFinite(j) ? 10 ** (-j / 10) : 0));
  return { q, j, total, enob: enob(total), lsb: (fs / 2 ** bits) * 1e3 };
}

if (form) {

function update() {
  const num = (k, min = 0) => { const n = Number(form.elements[k].value); return Number.isFinite(n) && n >= min ? n : Number(form.elements[k].defaultValue); };
  const n = num('bits', 1), fs = num('fs', 0.001), fin = num('fin'), jit = num('jitter'), osr = num('osr', 1), sinad = num('sinad');
  const { q, j, total, lsb } = snr({ bits: n, fs, fin, jitter: jit, osr });
  out('lsb').textContent = `${fmt(lsb, 4)} mV`;
  out('snr-q').textContent = `${fmt(q)} dB`;
  out('snr-j').textContent = Number.isFinite(j) ? `${fmt(j)} dB` : '–';
  out('snr').textContent = `${fmt(total)} dB`;
  out('enob').textContent = `${fmt(enob(total), 2)} bit`;
  out('enob-in').textContent = `${fmt(enob(sinad), 2)} bit`;
}
form.addEventListener('input', update);
form.addEventListener('submit', e => e.preventDefault());
update();

// グラフで見る: 入力周波数やジッタを変えたときのSN比・有効ビット数
initSweep({
  form, inputs: ['fin', 'jitter', 'bits', 'osr', 'fs'], outputs: ['enob', 'snr', 'snr-j', 'snr-q', 'lsb'], defaults: { x: 'fin', y: 'enob' },
  calc: v => {
    const r = snr(v);
    return { enob: r.enob, snr: r.total, 'snr-j': r.j, 'snr-q': r.q, lsb: r.lsb };
  },
});
}
