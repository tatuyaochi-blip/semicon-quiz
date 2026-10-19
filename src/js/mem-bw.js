// メモリ帯域の計算ページ。ピーク帯域 = 転送レート(MT/s) × バス幅(ビット) ÷ 8 × 数
const form = document.getElementById('bw-form');
const lang = document.documentElement.lang || 'en';
const fmt = (x, d = 1) => (Number.isFinite(x) ? x.toLocaleString(lang, { maximumFractionDigits: d }) : '–');
const out = k => document.querySelector(`[data-out="${k}"]`);
// 代表的な規格: [名前, 転送レート MT/s, 幅 ビット] (DIMM・パッケージ・チップ・スタックあたり)
const PRESETS = [['DDR4-3200 (64-bit DIMM)', 3200, 64], ['DDR5-6400 (2 × 32-bit DIMM)', 6400, 64], ['LPDDR5X-8533 (64-bit)', 8533, 64], ['GDDR6 16 Gb/s (32-bit chip)', 16000, 32], ['HBM3 6.4 Gb/s (1024-bit stack)', 6400, 1024]];
const gbs = (rate, width, n) => (rate * 1e6 * width / 8 * n) / 1e9;

const sel = form.elements.preset;
sel.addEventListener('change', () => {
  const p = PRESETS[Number(sel.value)];
  if (sel.value !== '' && p) { form.elements.rate.value = p[1]; form.elements.width.value = p[2]; }
  update();
});

function update() {
  const num = k => { const n = Number(form.elements[k].value); return Number.isFinite(n) && n >= 0 ? n : Number(form.elements[k].defaultValue); };
  const peak = gbs(num('rate'), num('width'), num('count'));
  out('peak').textContent = `${fmt(peak)} GB/s`;
  out('eff').textContent = `${fmt(peak * num('eff') / 100)} GB/s`;
  out('pin').textContent = `${fmt(num('rate') / 1000, 2)} Gb/s`;
  out('per-ns').textContent = `${fmt(peak, 1)} B/ns`;
  document.querySelector('#bw-table tbody').innerHTML = PRESETS.map(([name, r, w]) =>
    `<tr><th scope="row">${name}</th><td>${fmt(r, 0)}</td><td>${w}</td><td>${fmt(gbs(r, w, 1))} GB/s</td></tr>`).join('');
}
form.addEventListener('input', e => { if (e.target !== sel) update(); });
form.addEventListener('submit', e => e.preventDefault());
update();
