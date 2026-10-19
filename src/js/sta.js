// 静的タイミング解析(セットアップ・ホールド)の計算ページ。値はすべて ns
const form = document.getElementById('sta-form');
const svg = document.getElementById('sta-chart');
const lang = document.documentElement.lang || 'en';
const fmt = (x, d = 3) => (Number.isFinite(x) ? x.toLocaleString(lang, { minimumFractionDigits: 0, maximumFractionDigits: d }) : '–');
const out = k => document.querySelector(`[data-out="${k}"]`);
let labels = {};
try { labels = JSON.parse(svg.dataset.labels); } catch {}

const read = () => Object.fromEntries(['period', 'tcqmax', 'tcqmin', 'combmax', 'combmin', 'setup', 'hold', 'skew', 'unc'].map(k => {
  const el = form.elements[k];
  const v = Number(el.value);
  return [k, Number.isFinite(v) && (k === 'skew' || v >= 0) && !(k === 'period' && v <= 0) ? v : Number(el.defaultValue)];
}));

// セットアップ: 次のクロックの到着(周期+スキュー)から、セットアップ時間と不確かさを引いた時刻までにデータが届けばよい
// ホールド: 同じクロックで次のデータが届くのが、キャプチャ側のクロック(スキュー)+ホールド時間より後ならよい
export function slacks(p) {
  const arrivalMax = p.tcqmax + p.combmax, arrivalMin = p.tcqmin + p.combmin;
  const required = p.period + p.skew - p.setup - p.unc;
  const holdReq = p.skew + p.hold;
  return { arrivalMax, arrivalMin, required, holdReq, setup: required - arrivalMax, hold: arrivalMin - holdReq, fmax: 1000 / (arrivalMax + p.setup + p.unc - p.skew) };
}

function update() {
  const p = read();
  const r = slacks(p);
  const mark = (k, v) => { const el = out(k); el.textContent = `${fmt(v)} ns`; el.dataset.ok = v >= 0; };
  mark('setup-slack', r.setup);
  mark('hold-slack', r.hold);
  out('fmax').textContent = r.fmax > 0 ? `${fmt(r.fmax, 0)} MHz` : '–';
  draw(p, r);
}

// 時間軸の図: 上段がセットアップ(最も遅いデータ)、下段がホールド(最も早いデータ)
function draw(p, r) {
  const W = 600, L = 10, R = 590;
  const tMax = Math.max(p.period + p.skew, r.arrivalMax, r.holdReq, 0.001) * 1.08;
  const tMin = Math.min(0, p.skew, r.required) ;
  const x = t => L + ((t - tMin) / (tMax - tMin)) * (R - L);
  const color = ok => (ok ? 'var(--ok)' : 'var(--ng)');
  const text = (tx, ty, s, anchor = 'start') => `<text x="${tx}" y="${ty}" font-size="14" fill="var(--muted)" text-anchor="${anchor}">${s}</text>`;
  const clamp = v => Math.min(Math.max(v, L + 2), W - 12);
  svg.innerHTML = [
    `<line x1="${x(0)}" y1="14" x2="${x(0)}" y2="160" stroke="var(--text)" stroke-width="1.5"/>`,
    text(clamp(x(0) + 4), 12, labels.launch ?? 'launch'),
    `<line x1="${x(p.period + p.skew)}" y1="14" x2="${x(p.period + p.skew)}" y2="160" stroke="var(--text)" stroke-width="1.5"/>`,
    text(clamp(x(p.period + p.skew) - 4), 12, labels.capture ?? 'capture', 'end'),
    // セットアップ: データ到着(最大)と、必要な時刻
    `<rect x="${x(0)}" y="34" width="${Math.max(x(r.arrivalMax) - x(0), 1)}" height="22" rx="4" fill="${color(r.setup >= 0)}" opacity=".85"/>`,
    text(clamp(x(0) + 6), 50, labels.max ?? 'max arrival'),
    `<line x1="${x(r.required)}" y1="28" x2="${x(r.required)}" y2="64" stroke="var(--ng)" stroke-width="2" stroke-dasharray="4 3"/>`,
    text(clamp(x(r.required) - 4), 78, labels.req ?? 'required', 'end'),
    // ホールド: データ到着(最小)と、保持が必要な時刻
    `<rect x="${x(0)}" y="104" width="${Math.max(x(r.arrivalMin) - x(0), 1)}" height="22" rx="4" fill="${color(r.hold >= 0)}" opacity=".85"/>`,
    text(clamp(x(0) + 6), 120, labels.min ?? 'min arrival'),
    `<line x1="${x(r.holdReq)}" y1="98" x2="${x(r.holdReq)}" y2="134" stroke="var(--ng)" stroke-width="2" stroke-dasharray="4 3"/>`,
    text(clamp(x(r.holdReq) + 4), 150, labels.hold ?? 'hold'),
  ].join('');
}

form.addEventListener('input', update);
form.addEventListener('submit', e => e.preventDefault());
update();
