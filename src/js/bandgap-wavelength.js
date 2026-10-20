// バンドギャップと発光波長の換算。λ [nm] = hc/q / Eg [eV] ≈ 1239.84 / Eg。どちらの欄を書き換えても、もう一方を計算し直す。
// 材料を選ぶと、その代表的なバンドギャップ(300 K)を入れる
const form = document.getElementById('bg-form');
const lang = document.documentElement.lang || 'en';
const fmt = (x, d = 4) => (Number.isFinite(x) ? x.toLocaleString(lang, { maximumSignificantDigits: d }) : '–');
const out = k => document.querySelector(`[data-out="${k}"]`);
const HC = 1239.84; // eV·nm
const band = document.getElementById('bg-band');
let names = {};
try { names = JSON.parse(band.dataset.labels); } catch {}
// 材料のプリセット: 選択肢の value がバンドギャップ (eV)
const sel = form.elements.preset;
sel.addEventListener('change', () => {
  if (sel.value === '') return;
  form.elements.eg.value = sel.value;
  form.elements.lambda.value = Number((HC / Number(sel.value)).toPrecision(4));
  update();
});

// 波長の範囲の呼び名(おおよその境界)
function region(nm) {
  if (nm < 380) return names.uv;
  if (nm <= 750) return [[450, names.violet], [495, names.blue], [570, names.green], [590, names.yellow], [620, names.orange], [751, names.red]].find(([b]) => nm < b)[1];
  if (nm < 1400) return names.nir;
  return names.ir;
}
// 可視光の波長からおおよその色(表示用)
function rgb(nm) {
  const seg = [[380, 440, [-(nm - 440) / 60, 0, 1]], [440, 490, [0, (nm - 440) / 50, 1]], [490, 510, [0, 1, -(nm - 510) / 20]], [510, 580, [(nm - 510) / 70, 1, 0]], [580, 645, [1, -(nm - 645) / 65, 0]], [645, 751, [1, 0, 0]]].find(([a, b]) => nm >= a && nm < b);
  if (!seg) return null;
  return `rgb(${seg[2].map(c => Math.round(255 * Math.max(0, Math.min(1, c)))).join(',')})`;
}

function update(e) {
  const egEl = form.elements.eg, lEl = form.elements.lambda;
  let eg;
  if (e?.target === lEl) {
    const l = Number(lEl.value);
    eg = l > 0 ? HC / l : NaN;
    if (Number.isFinite(eg)) egEl.value = Number(eg.toPrecision(4));
  } else {
    eg = Number(egEl.value);
    if (!(eg > 0)) eg = NaN;
    if (Number.isFinite(eg) && e) lEl.value = Number((HC / eg).toPrecision(4));
  }
  if (e && e.target !== sel) sel.value = [...sel.options].some(o => o.value !== '' && Math.abs(Number(o.value) - eg) < 1e-9) ? String(eg) : '';
  const nm = HC / eg, ok = Number.isFinite(nm);
  out('lambda').textContent = ok ? `${fmt(nm)} nm` : '–';
  out('eg').textContent = ok ? `${fmt(eg)} eV` : '–';
  out('um').textContent = ok ? `${fmt(nm / 1000)} µm` : '–';
  out('freq').textContent = ok ? `${fmt(299792.458 / nm)} THz` : '–';
  out('wn').textContent = ok ? `${fmt(1e7 / nm)} cm⁻¹` : '–';
  out('region').textContent = ok ? region(nm) : '–';
  // 200〜2000 nm の帯に、いまの波長の位置を示す(対数の目盛り)
  const X = v => 20 + (Math.log10(v / 200) / Math.log10(10)) * 560;
  const stops = Array.from({ length: 19 }, (_, k) => 380 + k * 20).map(v => `<stop offset="${((X(v) - X(380)) / (X(750) - X(380))).toFixed(3)}" stop-color="${rgb(Math.min(v, 750))}"/>`).join('');
  const mark = ok && nm >= 200 && nm <= 2000 ? `<line x1="${X(nm)}" y1="14" x2="${X(nm)}" y2="66" stroke="var(--text)" stroke-width="3"/><text x="${Math.min(Math.max(X(nm), 50), 550)}" y="12" font-size="15" text-anchor="middle" fill="var(--text)">${fmt(nm)} nm</text>` : '';
  band.innerHTML = `<defs><linearGradient id="bg-grad">${stops}</linearGradient></defs>`
    + `<rect x="20" y="20" width="560" height="40" fill="var(--fig-band)" stroke="var(--border)"/>`
    + `<rect x="${X(380)}" y="20" width="${X(750) - X(380)}" height="40" fill="url(#bg-grad)"/>`
    + [200, 380, 750, 1000, 1310, 1550, 2000].map(v => `<line x1="${X(v)}" y1="60" x2="${X(v)}" y2="66" stroke="var(--muted)"/><text x="${X(v)}" y="84" font-size="15" text-anchor="middle" fill="var(--muted)">${v}</text>`).join('')
    + `<text x="${(X(200) + X(380)) / 2}" y="45" font-size="15" text-anchor="middle" fill="var(--muted)">${names.uv ?? 'UV'}</text>`
    + `<text x="${(X(1000) + X(2000)) / 2}" y="45" font-size="15" text-anchor="middle" fill="var(--muted)">${names.ir_band ?? 'IR'}</text>`
    + mark;
  const sw = document.getElementById('bg-swatch');
  const c = ok ? rgb(nm) : null;
  sw.hidden = !c;
  if (c) sw.style.background = c;
}
form.addEventListener('input', e => { if (e.target !== sel) update(e); });
form.addEventListener('submit', e => e.preventDefault());
update();
