// ADコンバータのSN比と有効ビット数の計算ページ
// 量子化で決まるSN比 6.02N + 1.76 dB(+ オーバーサンプリングの利得 10·log10 OSR)と、
// サンプリングクロックのジッタで決まるSN比 −20·log10(2π·fin·σ) を合成する
const form = document.getElementById('adc-form');
const lang = document.documentElement.lang || 'en';
const fmt = (x, d = 1) => (Number.isFinite(x) ? x.toLocaleString(lang, { maximumFractionDigits: d }) : '–');
const out = k => document.querySelector(`[data-out="${k}"]`);
const enob = snr => (snr - 1.76) / 6.02;

function update() {
  const num = (k, min = 0) => { const n = Number(form.elements[k].value); return Number.isFinite(n) && n >= min ? n : Number(form.elements[k].defaultValue); };
  const n = num('bits', 1), fs = num('fs', 0.001), fin = num('fin'), jit = num('jitter'), osr = num('osr', 1), sinad = num('sinad');
  const q = 6.02 * n + 1.76 + 10 * Math.log10(osr);
  const j = fin > 0 && jit > 0 ? -20 * Math.log10(2 * Math.PI * fin * 1e6 * jit * 1e-12) : Infinity;
  const total = -10 * Math.log10(10 ** (-q / 10) + (Number.isFinite(j) ? 10 ** (-j / 10) : 0));
  out('lsb').textContent = `${fmt((fs / 2 ** n) * 1e3, 4)} mV`;
  out('snr-q').textContent = `${fmt(q)} dB`;
  out('snr-j').textContent = Number.isFinite(j) ? `${fmt(j)} dB` : '–';
  out('snr').textContent = `${fmt(total)} dB`;
  out('enob').textContent = `${fmt(enob(total), 2)} bit`;
  out('enob-in').textContent = `${fmt(enob(sinad), 2)} bit`;
}
form.addEventListener('input', update);
form.addEventListener('submit', e => e.preventDefault());
update();
