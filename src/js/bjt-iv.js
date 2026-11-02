// バイポーラトランジスタの出力特性(IC–VCE)のページ。エバース・モルのモデルにアーリー効果の係数 (1 + VCE/VA) を加え、
// ベース電流を固定したときの曲線群と動作点を描く。延長線を表示すると、能動領域の直線が −VA の1点に集まる様子が分かる
import { initSweep } from './sweep.js';

const form = document.getElementById('bjt-form');
const svg = document.getElementById('bjt-chart');
const lang = document.documentElement.lang || 'en';
const fmt = (x, d = 2) => (Number.isFinite(x) ? x.toLocaleString(lang, { maximumFractionDigits: d }) : '–');
const out = k => document.querySelector(`[data-out="${k}"]`);
let labels = {};
try { labels = JSON.parse(svg?.dataset.labels ?? '{}'); } catch {}

// 固定の定数: 飽和電流 IS、逆方向の電流増幅率 βR、熱電圧 VT(300 K)
export const IS = 1e-14, BR = 1, VT = 0.02585;
// 能動領域とみなす下限: IC が能動領域の直線 βIB(1 + VCE/VA) の 95% 以上
export const ACTIVE = 0.95;

const read = () => Object.fromEntries(['beta', 'va', 'ib', 'vce', 'vmax'].map(k => {
  const el = form.elements[k];
  const v = Number(el.value);
  return [k, Number.isFinite(v) && v > 0 ? v : Number(el.defaultValue)];
}));

// ベース電流 ib (A) とコレクタ-エミッタ間電圧 vce (V) から VBE を二分法で求め、コレクタ電流 (A) を返す
// IB = (IS/βF)(e^(VBE/VT) − 1) + (IS/βR)(e^(VBC/VT) − 1)、IC = IS(e^(VBE/VT) − e^(VBC/VT))(1 + VCE/VA) − (IS/βR)(e^(VBC/VT) − 1)
export function solve(p, ib, vce) {
  if (!(ib > 0)) return { ic: 0, vbe: NaN };
  const base = v => (IS / p.beta) * Math.expm1(v / VT) + (IS / BR) * Math.expm1((v - vce) / VT);
  let lo = -1, hi = 1.5;
  for (let k = 0; k < 100; k++) { const m = (lo + hi) / 2; if (base(m) < ib) lo = m; else hi = m; }
  const vbe = (lo + hi) / 2, vbc = vbe - vce;
  const ic = IS * (Math.exp(vbe / VT) - Math.exp(vbc / VT)) * (1 + vce / p.va) - (IS / BR) * Math.expm1(vbc / VT);
  return { ic, vbe };
}
export const ic = (p, ib, vce) => solve(p, ib, vce).ic;
// 能動領域の直線(アーリー効果の直線)。VCE = −VA で 0 になる
export const line = (p, ib, vce) => p.beta * ib * (1 + vce / p.va);
// 飽和と能動の境目の VCE(IC が直線の 95% になるところ)
export function knee(p, ib) {
  let lo = 0, hi = 2;
  for (let k = 0; k < 60; k++) { const m = (lo + hi) / 2; if (ic(p, ib, m) < ACTIVE * line(p, ib, m)) lo = m; else hi = m; }
  return (lo + hi) / 2;
}

// 動作点の値。ib は µA で受け取る
export function point(p) {
  const ib = p.ib * 1e-6;
  const { ic: i, vbe } = solve(p, ib, p.vce);
  const region = !(ib > 0) ? 'cutoff' : i >= ACTIVE * line(p, ib, p.vce) ? 'active' : 'sat';
  const act = region === 'active';
  // 小信号: gm = IC/VT、ro = (VA + VCE)/IC(よく使う近似は VA/IC)、真性利得 gm·ro
  const gm = act ? i / VT : NaN, ro = act ? (p.va + p.vce) / i : NaN;
  return { region, ic: i, vbe, hfe: i / ib, gm, ro, gain: gm * ro };
}

function update() {
  const p = read();
  const r = point(p);
  out('region').textContent = labels[r.region] ?? r.region;
  out('ic').textContent = `${fmt(r.ic * 1e3, 3)} mA`;
  out('vbe').textContent = `${fmt(r.vbe, 3)} V`;
  out('hfe').textContent = fmt(r.hfe, 1);
  out('gm').textContent = Number.isFinite(r.gm) ? `${fmt(r.gm * 1e3, 1)} mS` : '–';
  out('ro').textContent = Number.isFinite(r.ro) ? `${fmt(r.ro / 1e3, 1)} kΩ` : '–';
  out('gain').textContent = Number.isFinite(r.gain) ? `${fmt(r.gain, 0)} (${fmt(20 * Math.log10(r.gain), 1)} dB)` : '–';
  draw(p, r);
}

function draw(p, r) {
  const W = 600, H = 340, L = 64, R = 584, T = 16, B = 296;
  const ext = form.elements.ext?.checked;
  const vmax = Math.max(p.vmax, p.vce, 0.5);
  const vmin = ext ? -p.va * 1.08 : 0;
  // 曲線は、指定した IB と、その 0.2・0.4・0.6・0.8 倍の4本
  const ibs = [0.2, 0.4, 0.6, 0.8, 1].map(f => p.ib * 1e-6 * f);
  const top = ibs[4];
  const imax = Math.max(line(p, top, vmax), r.ic, 1e-9) * 1.1;
  const x = v => L + ((v - vmin) / (vmax - vmin)) * (R - L);
  const y = a => B - (Math.max(a, 0) / imax) * (B - T);
  const path = ib => Array.from({ length: 121 }, (_, k) => { const v = (vmax * k) / 120; return `${k ? 'L' : 'M'}${x(v).toFixed(1)},${y(ic(p, ib, v)).toFixed(1)}`; }).join('');
  // 飽和と能動の境目を結ぶ破線
  const edge = ibs.map((ib, k) => { const v = knee(p, ib); return `${k ? 'L' : 'M'}${x(v).toFixed(1)},${y(ic(p, ib, v)).toFixed(1)}`; }).join('');
  const ticks = n => Array.from({ length: n + 1 }, (_, k) => k / n);
  // 線と重なる文字は、背景色の縁取りで読みやすくする
  const halo = ' paint-order="stroke" stroke="var(--bg)" stroke-width="4" stroke-linejoin="round"';
  const xt = ext ? [-p.va, -p.va / 2, 0, vmax / 2, vmax] : ticks(5).map(f => vmax * f);
  const grid = xt.map(v => `<line x1="${x(v)}" y1="${T}" x2="${x(v)}" y2="${B}" stroke="var(--border)"/>
    <text x="${x(v)}" y="${B + 16}" font-size="14" fill="var(--muted)" text-anchor="middle">${fmt(v, 1)}</text>`).join('')
    + ticks(4).map(f => `<line x1="${L}" y1="${y(imax * f)}" x2="${R}" y2="${y(imax * f)}" stroke="var(--border)"/>
    <text x="${L - 6}" y="${y(imax * f) + 4}" font-size="14" fill="var(--muted)" text-anchor="end">${fmt(imax * f * 1e3, 2)}</text>`).join('');
  // 延長線: 能動領域の直線を −VA まで伸ばす
  const lines = ext ? ibs.map(ib => `<line x1="${x(-p.va)}" y1="${y(0)}" x2="${x(vmax)}" y2="${y(line(p, ib, vmax))}" stroke="var(--muted)" stroke-width="1.2" stroke-dasharray="4 4"/>`).join('')
    + `<line x1="${x(0)}" y1="${T}" x2="${x(0)}" y2="${B}" stroke="var(--text)" stroke-width="1"/>`
    + `<circle cx="${x(-p.va)}" cy="${y(0)}" r="5" fill="var(--accent)"/>`
    + `<text x="${x(-p.va) + 8}" y="${y(0) - 10}" font-size="14" fill="var(--accent)"${halo}>−VA = −${fmt(p.va, 1)} V</text>` : '';
  const vop = Math.min(p.vce, vmax);
  // 動作点の文字は、右端に近いときは点の左に置く
  const opLeft = x(vop) > R - 130;
  svg.innerHTML = grid + lines
    + `<text x="${(L + R) / 2}" y="${H - 6}" font-size="15" fill="var(--text)" text-anchor="middle">VCE (V)</text>`
    + `<text x="14" y="${(T + B) / 2}" font-size="15" fill="var(--text)" text-anchor="middle" transform="rotate(-90 14 ${(T + B) / 2})">IC (mA)</text>`
    + `<path d="${edge}" fill="none" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="5 4"/>`
    + ibs.map((ib, k) => `<path d="${path(ib)}" fill="none" stroke="var(--accent)" stroke-width="${k === 4 ? 3 : 1.5}" opacity="${k === 4 ? 1 : 0.55}"/>
      <text x="${R - 4}" y="${y(ic(p, ib, vmax)) - 5}" font-size="14" fill="var(--muted)" text-anchor="end"${halo}>IB = ${fmt(ib * 1e6, 1)} µA</text>`).join('')
    + `<circle cx="${x(vop)}" cy="${y(r.ic)}" r="6" fill="var(--ng)" stroke="var(--surface)" stroke-width="2"/>`
    // 延長線の表示中は横軸が縮むので、文字は出さず点だけにする
    + (ext ? '' : `<text x="${x(vop) + (opLeft ? -9 : 9)}" y="${y(r.ic) + 18}" font-size="14" fill="var(--ng)" text-anchor="${opLeft ? 'end' : 'start'}"${halo}>${labels.op ?? 'operating point'}</text>`);
}

if (form) {
  form.addEventListener('input', update);
  form.addEventListener('submit', e => e.preventDefault());
  update();

  // グラフで見る: IB や VA を変えたときのコレクタ電流・出力抵抗・真性利得
  initSweep({
    form, inputs: ['ib', 'vce', 'beta', 'va'], outputs: ['ic', 'ro', 'gain'], defaults: { x: 'vce', y: 'ic' }, ranges: { vce: [0, 10] },
    calc: v => { const r = point(v); return { ic: r.ic * 1e3, ro: r.ro / 1e3, gain: r.gain }; },
  });
}
