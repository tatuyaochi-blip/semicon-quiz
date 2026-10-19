// MOSFETの電流-電圧特性のページ。長チャネルの2乗則にチャネル長変調を加えたモデルで、ID–VDS 特性の曲線群と動作点を描く
const form = document.getElementById('iv-form');
const svg = document.getElementById('iv-chart');
const lang = document.documentElement.lang || 'en';
const fmt = (x, d = 2) => (Number.isFinite(x) ? x.toLocaleString(lang, { maximumFractionDigits: d }) : '–');
const out = k => document.querySelector(`[data-out="${k}"]`);
let labels = {};
try { labels = JSON.parse(svg.dataset.labels); } catch {}

const read = () => Object.fromEntries(['vth', 'kp', 'wl', 'lambda', 'vgs', 'vds', 'vdd'].map(k => {
  const el = form.elements[k];
  const v = Number(el.value);
  return [k, Number.isFinite(v) && v >= 0 ? v : Number(el.defaultValue)];
}));

// ドレイン電流(A)。kp は µA/V²(µnCox)。VGS ≤ Vth では 0(サブスレッショルド電流は扱わない)
export function id(p, vgs, vds) {
  const vov = vgs - p.vth;
  if (vov <= 0) return 0;
  const beta = p.kp * 1e-6 * p.wl;
  const clm = 1 + p.lambda * vds;
  return vds < vov ? beta * (vov * vds - vds * vds / 2) * clm : (beta / 2) * vov * vov * clm;
}

function update() {
  const p = read();
  const vov = p.vgs - p.vth;
  const i = id(p, p.vgs, p.vds);
  const region = vov <= 0 ? 'cutoff' : p.vds < vov ? 'linear' : 'sat';
  out('region').textContent = labels[region] ?? region;
  out('id').textContent = `${fmt(i * 1e3, 3)} mA`;
  out('vdsat').textContent = vov > 0 ? `${fmt(vov)} V` : '–';
  // 小信号パラメータ: 飽和では gm = 2ID/Vov、ro ≈ 1/(λ·ID)。線形では gm = β·VDS
  const beta = p.kp * 1e-6 * p.wl;
  const gm = region === 'sat' ? (2 * i) / vov : region === 'linear' ? beta * p.vds * (1 + p.lambda * p.vds) : 0;
  out('gm').textContent = gm > 0 ? `${fmt(gm * 1e3, 3)} mS` : '–';
  out('ro').textContent = region === 'sat' && p.lambda > 0 && i > 0 ? `${fmt(1 / (p.lambda * i) / 1e3, 1)} kΩ` : '–';
  draw(p, i);
}

function draw(p, iOp) {
  const W = 600, H = 340, L = 64, R = 584, T = 16, B = 296;
  const vmax = Math.max(p.vdd, p.vds, 0.1);
  // 曲線は、指定した VGS と、その下に Vth から等間隔の4本
  const top = Math.max(p.vgs, p.vth + 0.1);
  const steps = [0.2, 0.4, 0.6, 0.8].map(f => p.vth + (top - p.vth) * f).concat(top);
  const imax = Math.max(id(p, top, vmax), iOp, 1e-9) * 1.1;
  const x = v => L + (v / vmax) * (R - L);
  const y = a => B - (a / imax) * (B - T);
  const path = vgs => Array.from({ length: 81 }, (_, k) => { const v = (vmax * k) / 80; return `${k ? 'L' : 'M'}${x(v).toFixed(1)},${y(id(p, vgs, v)).toFixed(1)}`; }).join('');
  // 線形と飽和の境界 VDS = VGS − Vth(放物線)
  const edge = Array.from({ length: 41 }, (_, k) => { const vov = ((top - p.vth) * k) / 40; return `${k ? 'L' : 'M'}${x(Math.min(vov, vmax)).toFixed(1)},${y(id(p, p.vth + vov, vov)).toFixed(1)}`; }).join('');
  const ticks = n => Array.from({ length: n + 1 }, (_, k) => k / n);
  const grid = ticks(5).map(f => `<line x1="${x(vmax * f)}" y1="${T}" x2="${x(vmax * f)}" y2="${B}" stroke="var(--border)"/>
    <text x="${x(vmax * f)}" y="${B + 16}" font-size="14" fill="var(--muted)" text-anchor="middle">${fmt(vmax * f, 1)}</text>`).join('')
    + ticks(4).map(f => `<line x1="${L}" y1="${y(imax * f)}" x2="${R}" y2="${y(imax * f)}" stroke="var(--border)"/>
    <text x="${L - 6}" y="${y(imax * f) + 4}" font-size="14" fill="var(--muted)" text-anchor="end">${fmt(imax * f * 1e3, 2)}</text>`).join('');
  svg.innerHTML = grid
    + `<text x="${(L + R) / 2}" y="${H - 6}" font-size="15" fill="var(--text)" text-anchor="middle">VDS (V)</text>`
    + `<text x="14" y="${(T + B) / 2}" font-size="15" fill="var(--text)" text-anchor="middle" transform="rotate(-90 14 ${(T + B) / 2})">ID (mA)</text>`
    + `<path d="${edge}" fill="none" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="5 4"/>`
    + steps.map((v, k) => `<path d="${path(v)}" fill="none" stroke="var(--accent)" stroke-width="${k === steps.length - 1 ? 3 : 1.5}" opacity="${k === steps.length - 1 ? 1 : 0.55}"/>
      <text x="${R - 4}" y="${y(id(p, v, vmax)) - 5}" font-size="14" fill="var(--muted)" text-anchor="end">VGS = ${fmt(v)} V</text>`).join('')
    + `<circle cx="${x(Math.min(p.vds, vmax))}" cy="${y(iOp)}" r="6" fill="var(--ng)" stroke="var(--surface)" stroke-width="2"/>`
    + `<text x="${x(Math.min(p.vds, vmax)) + 9}" y="${y(iOp) + 16}" font-size="14" fill="var(--ng)">${labels.op ?? 'operating point'}</text>`;
}

form.addEventListener('input', update);
form.addEventListener('submit', e => e.preventDefault());
update();
