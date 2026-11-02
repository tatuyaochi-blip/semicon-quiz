// バイポーラトランジスタの出力特性(IC–VCE)のページ。エバース・モルのモデルにアーリー効果の係数 (1 + VCE/VA) を加え、
// ベース電流を固定したときの曲線群と動作点を描く。延長線を表示すると、能動領域の直線が −VA の1点に集まる様子が分かる
import { initSweep } from './sweep.js';

const form = document.getElementById('bjt-form');
const svg = document.getElementById('bjt-chart');
const lang = document.documentElement.lang || 'en';
const fmt = (x, d = 2) => (Number.isFinite(x) ? x.toLocaleString(lang, { maximumFractionDigits: d }).replace('-', '−') : '–');
// 有効数字3桁で、大きさに合う接頭辞(n・µ・m・k・M)を付ける
const PRE = [[1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'], [1e-12, 'p']];
const si = (x, unit) => {
  if (!Number.isFinite(x)) return '–';
  const [f, pre] = PRE.find(([f]) => Math.abs(x) >= f * 0.9995) ?? PRE[PRE.length - 1];
  return `${Number((x / f).toPrecision(3)).toLocaleString(lang, { maximumFractionDigits: 3 }).replace('-', '−')} ${pre}${unit}`;
};
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
  // VCE だけは 0 も受け付ける(ほかは正の値)
  return [k, Number.isFinite(v) && (k === 'vce' ? v >= 0 : v > 0) ? v : Number(el.defaultValue)];
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
  // 小信号: gm = IC/VT。ro は IC–VCE 曲線の傾きの逆数を数値微分で求める(能動領域の奥では (VA + VCE)/IC に一致し、
  // 飽和の境目のすぐ上では曲線がまだ曲がっているので、それより小さくなる)。真性利得は gm·ro
  const h = 1e-4, v0 = Math.max(p.vce - h, 0);
  const gm = act ? i / VT : NaN, ro = act ? (p.vce + h - v0) / (ic(p, ib, p.vce + h) - ic(p, ib, v0)) : NaN;
  return { region, ic: i, vbe, hfe: i / ib, gm, ro, gain: gm * ro };
}

function update() {
  const p = read();
  const r = point(p);
  out('region').textContent = labels[r.region] ?? r.region;
  out('ic').textContent = si(r.ic, 'A');
  out('vbe').textContent = `${fmt(r.vbe, 3)} V`;
  out('hfe').textContent = fmt(r.hfe, 1);
  out('gm').textContent = si(r.gm, 'S');
  out('ro').textContent = si(r.ro, 'Ω');
  out('gain').textContent = Number.isFinite(r.gain) ? `${fmt(r.gain, 0)} (${fmt(20 * Math.log10(r.gain), 1)} dB)` : '–';
  // 結果の読み方の一文(能動: VCE を 1 V 上げたときの IC の増え方。飽和: 能動領域の値との比較)
  const note = out('note');
  if (note) {
    let tpl = {};
    try { tpl = JSON.parse(note.dataset.tpl); } catch {}
    note.textContent = (r.region === 'active' ? tpl.active ?? '' : tpl.sat ?? '')
      .replace('{d}', `${si(1 / r.ro, 'A')}/V`).replace('{line}', si(line(p, p.ib * 1e-6, p.vce), 'A'));
  }
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
  // 横軸の目盛り。延長線の表示中は、右端から順に、前の目盛りと 32px 以上離れたものだけ数字を出す
  const xt = ext ? [vmax, vmax / 2, 0, -p.va / 2, -p.va] : ticks(5).map(f => vmax * f);
  let last = Infinity;
  const xl = xt.map(v => { const ok = !ext || last - x(v) >= 32; if (ok) last = x(v); return ok; });
  // 縦軸の単位は電流の大きさに合わせる(mA・µA・nA)
  const [iu, iname] = imax >= 1e-3 ? [1e3, 'mA'] : imax >= 1e-6 ? [1e6, 'µA'] : [1e9, 'nA'];
  const grid = xt.map((v, k) => `<line x1="${x(v)}" y1="${T}" x2="${x(v)}" y2="${B}" stroke="var(--border)"/>`
    + (xl[k] ? `<text x="${x(v)}" y="${B + 16}" font-size="14" fill="var(--muted)" text-anchor="middle">${fmt(v, 1)}</text>` : '')).join('')
    + ticks(4).map(f => `<line x1="${L}" y1="${y(imax * f)}" x2="${R}" y2="${y(imax * f)}" stroke="var(--border)"/>
    <text x="${L - 6}" y="${y(imax * f) + 4}" font-size="14" fill="var(--muted)" text-anchor="end">${fmt(imax * f * iu, 2)}</text>`).join('');
  // 延長線: 能動領域の直線を −VA まで伸ばす(飽和の境目の破線と区別するため、色付きの点線)
  const lines = ext ? ibs.map(ib => `<line x1="${x(-p.va)}" y1="${y(0)}" x2="${x(vmax)}" y2="${y(line(p, ib, vmax))}" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="1 4" stroke-linecap="round" opacity="0.7"/>`).join('')
    + `<line x1="${x(0)}" y1="${T}" x2="${x(0)}" y2="${B}" stroke="var(--text)" stroke-width="1"/>`
    + `<circle cx="${x(-p.va)}" cy="${y(0)}" r="5" fill="var(--accent)"/>`
    + `<text x="${x(-p.va) + 8}" y="${y(0) - 10}" font-size="14" fill="var(--accent)"${halo}>−VA = −${fmt(p.va, 1)} V</text>` : '';
  const vop = Math.min(p.vce, vmax);
  // 動作点の文字は、右端に近いときは点の左に、下端に近いときは点の上に置く
  const opLeft = x(vop) > R - 130, opUp = y(r.ic) > B - 30;
  svg.innerHTML = grid + lines
    + `<text x="${(L + R) / 2}" y="${H - 6}" font-size="15" fill="var(--text)" text-anchor="middle">VCE (V)</text>`
    + `<text x="14" y="${(T + B) / 2}" font-size="15" fill="var(--text)" text-anchor="middle" transform="rotate(-90 14 ${(T + B) / 2})">IC (${iname})</text>`
    + `<path d="${edge}" fill="none" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="5 4"/>`
    + ibs.map((ib, k) => `<path d="${path(ib)}" fill="none" stroke="var(--accent)" stroke-width="${k === 4 ? 3 : 1.5}" opacity="${k === 4 ? 1 : 0.55}"/>
      <text x="${R - 4}" y="${y(ic(p, ib, vmax)) - 5}" font-size="14" fill="var(--muted)" text-anchor="end"${halo}>IB = ${si(ib, 'A')}</text>`).join('')
    + `<circle cx="${x(vop)}" cy="${y(r.ic)}" r="6" fill="var(--ng)" stroke="var(--surface)" stroke-width="2"/>`
    // 延長線の表示中は横軸が縮むので、文字は出さず点だけにする
    + (ext ? '' : `<text x="${x(vop) + (opLeft ? -9 : 9)}" y="${y(r.ic) + (opUp ? -10 : 18)}" font-size="14" fill="var(--ng)" text-anchor="${opLeft ? 'end' : 'start'}"${halo}>${labels.op ?? 'operating point'}</text>`);
}

if (form) {
  form.addEventListener('input', update);
  form.addEventListener('submit', e => e.preventDefault());
  update();

  // グラフで見る: IB や VA を変えたときのコレクタ電流・出力抵抗・真性利得
  initSweep({
    form, inputs: ['ib', 'vce', 'beta', 'va'], outputs: ['ic', 'ro', 'gain'], defaults: { x: 'vce', y: 'ic' }, ranges: { vce: [0, 10] },
    units: { ic: 'mA', ro: 'kΩ' },
    calc: v => { const r = point(v); return { ic: r.ic * 1e3, ro: r.ro / 1e3, gain: r.gain }; },
  });
}
