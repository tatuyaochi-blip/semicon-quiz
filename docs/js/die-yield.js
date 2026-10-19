// ダイ数・歩留まり計算ページ。入力が変わるたびに計算し直し、結果の表とウエハマップを更新する
import { compute } from './die-yield-calc.js';

const form = document.getElementById('dy-form');
const lang = document.documentElement.lang || 'en';
const fmt = (x, d = 0) => (Number.isFinite(x) ? x.toLocaleString(lang, { minimumFractionDigits: d, maximumFractionDigits: d }) : '–');
const pct = x => fmt(x * 100, 1) + '%';
const out = k => document.querySelector(`[data-out="${k}"]`);
const canvas = document.getElementById('dy-map');
const ctx = canvas.getContext('2d');
let last;

// 入力値を読む(空欄や負の値は既定値に戻す)
function read() {
  const num = (id, min) => {
    const el = form.elements[id];
    const v = Number(el.value);
    return Number.isFinite(v) && v >= min ? v : Number(el.defaultValue);
  };
  return {
    d: num('d', 1), w: num('w', 0.1), h: num('h', 0.1), scribe: num('scribe', 0), edge: num('edge', 0),
    d0: num('d0', 0), alpha: num('alpha', 0.01), cost: num('cost', 0),
  };
}

function update() {
  const p = read();
  const c = compute(p);
  last = { p, c };
  out('area').textContent = `${fmt(c.area, 1)} mm²`;
  out('gross').textContent = fmt(c.grid.n);
  out('formula').textContent = fmt(c.formula);
  for (const m of ['poisson', 'murphy', 'negbin']) {
    out(`${m}-y`).textContent = pct(c[m].y);
    out(`${m}-good`).textContent = fmt(c[m].good);
    out(`${m}-cost`).textContent = fmt(c[m].cost, 2);
  }
  draw();
}

// ウエハマップ: 使える範囲のダイを並べ、欠陥をランダムに置いて、欠陥の乗ったダイを不良として塗る
function draw() {
  const { p, c } = last;
  const css = getComputedStyle(document.documentElement);
  const color = name => css.getPropertyValue(name).trim();
  const size = canvas.clientWidth || 320;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);
  const R = p.d / 2;
  const k = (size / 2 - 2) / R; // mm → px
  const cx = size / 2;
  ctx.fillStyle = color('--surface');
  ctx.strokeStyle = color('--border');
  ctx.beginPath(); ctx.arc(cx, cx, R * k, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();

  // ダイの一覧(左下の角の座標)
  const { r, px, py, grid } = c;
  const dies = [];
  const i0 = Math.floor((-r - grid.ox) / px) - 1, i1 = Math.ceil((r - grid.ox) / px) + 1;
  const j0 = Math.floor((-r - grid.oy) / py) - 1, j1 = Math.ceil((r - grid.oy) / py) + 1;
  const inside = (x, y) => x * x + y * y <= r * r;
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
    const x0 = grid.ox + i * px, y0 = grid.oy + j * py;
    if (inside(x0, y0) && inside(x0 + p.w, y0) && inside(x0, y0 + p.h) && inside(x0 + p.w, y0 + p.h)) dies.push([i, j]);
  }
  // 欠陥: 使える円の中に、平均 D0 × 面積 個を一様に置く
  const bad = new Set();
  const n = Math.round(p.d0 * Math.PI * (r / 10) ** 2);
  for (let m = 0; m < Math.min(n, 200000); m++) {
    const rr = r * Math.sqrt(Math.random()), th = 2 * Math.PI * Math.random();
    const x = rr * Math.cos(th), y = rr * Math.sin(th);
    const i = Math.floor((x - grid.ox) / px), j = Math.floor((y - grid.oy) / py);
    if (x - grid.ox - i * px <= p.w && y - grid.oy - j * py <= p.h) bad.add(`${i},${j}`);
  }
  const gap = px * k > 3 ? 0.5 : 0; // 小さいダイは隙間を描かない
  let good = 0;
  for (const [i, j] of dies) {
    const isBad = bad.has(`${i},${j}`);
    if (!isBad) good++;
    ctx.fillStyle = isBad ? color('--ng') : color('--ok');
    ctx.fillRect(cx + (grid.ox + i * px) * k + gap, cx - (grid.oy + j * py + p.h) * k + gap, Math.max(p.w * k - 2 * gap, 0.5), Math.max(p.h * k - 2 * gap, 0.5));
  }
  out('sim').textContent = `${fmt(good)} / ${fmt(dies.length)}`;
}

form.addEventListener('input', update);
form.addEventListener('submit', e => e.preventDefault());
document.getElementById('dy-rerun').addEventListener('click', draw);
window.addEventListener('resize', () => last && draw());
update();
