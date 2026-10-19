// 位相雑音からRMSジッタを求める計算ページ。オフセット周波数ごとの L(f) (dBc/Hz) の点を、
// 対数の横軸の上で直線(dB の値が log f に比例して変わる)とみなしてつなぎ、各区間をべき乗の式として解析的に積分する。
// A = ∫ 10^(L/10) df、RMS位相 φ = √(2A) rad、RMSジッタ = φ / (2π f0)
import { lineChart } from './chart.js';
const form = document.getElementById('jt-form');
const svg = document.getElementById('jt-chart');
const lang = document.documentElement.lang || 'en';
const fmt = (x, d = 3) => (Number.isFinite(x) ? x.toLocaleString(lang, { maximumSignificantDigits: d }) : '–');
const out = k => document.querySelector(`[data-out="${k}"]`);
let labels = {};
try { labels = JSON.parse(svg.dataset.labels); } catch {}
// 位相雑音を入れるオフセット周波数 (Hz)
const F = [1e3, 1e4, 1e5, 1e6, 1e7, 2e7];

// f1〜f2 の区間で L が l1→l2 と直線的に(log f に対して)変わるとき、a〜b の部分の ∫10^(L/10) df
function segment(f1, l1, f2, l2, a, b) {
  if (!(b > a)) return 0;
  const m = (l2 - l1) / 10 / Math.log10(f2 / f1); // 10^(L/10) ∝ f^m
  const p1 = 10 ** (l1 / 10);
  // 傾きが −10 dB/dec(m = −1)のときは対数になる
  if (Math.abs(m + 1) < 1e-9) return p1 * f1 * Math.log(b / a);
  return ((p1 * f1) / (m + 1)) * ((b / f1) ** (m + 1) - (a / f1) ** (m + 1));
}

// L: 各点の位相雑音 (dBc/Hz)、lo・hi: 積分範囲 (Hz)。区間ごとの値と合計を返す。
// 点の範囲の外は、端の点の値のまま平らに続くとみなす(最後の要素がその外側の分)
export function integrate(L, lo, hi) {
  const parts = [];
  for (let i = 0; i < F.length - 1; i++) parts.push(segment(F[i], L[i], F[i + 1], L[i + 1], Math.max(lo, F[i]), Math.min(hi, F[i + 1])));
  const n = F.length - 1;
  const below = 10 ** (L[0] / 10) * Math.max(0, Math.min(hi, F[0]) - lo);
  const above = 10 ** (L[n] / 10) * Math.max(0, hi - Math.max(lo, F[n]));
  parts.push(below + above);
  return { parts, total: parts.reduce((s, x) => s + x, 0) };
}

export function jitter(v) {
  const L = F.map((_, i) => v[`p${i}`]), lo = v.lo * 1e3, hi = v.hi * 1e6, f0 = v.f0 * 1e6;
  if (!(hi > lo) || !(f0 > 0) || L.some(x => !Number.isFinite(x))) return {};
  const { parts, total } = integrate(L, lo, hi);
  const phi = Math.sqrt(2 * total);
  const r = { integ: 10 * Math.log10(total), mrad: phi * 1e3, deg: (phi * 180) / Math.PI, jitter: (phi / (2 * Math.PI * f0)) * 1e15 };
  parts.forEach((p, i) => { r[`seg${i}`] = (p / total) * 100; });
  return r;
}

function read() {
  const v = Object.fromEntries([...form.elements].filter(el => el.name).map(el => [el.name, Number(el.value)]));
  for (const k of ['f0', 'lo', 'hi']) if (!(v[k] > 0)) v[k] = Number(form.elements[k].defaultValue);
  F.forEach((_, i) => { if (!Number.isFinite(v[`p${i}`]) || form.elements[`p${i}`].value === '') v[`p${i}`] = Number(form.elements[`p${i}`].defaultValue); });
  return v;
}
const jit = fs => (fs >= 1e3 ? `${fmt(fs / 1e3)} ps` : `${fmt(fs)} fs`);

function update() {
  const v = read(), r = jitter(v);
  const ok = Number.isFinite(r.jitter);
  document.getElementById('jt-warn').hidden = ok;
  out('integ').textContent = ok ? `${fmt(r.integ)} dBc` : '–';
  out('mrad').textContent = ok ? `${fmt(r.mrad)} mrad` : '–';
  out('deg').textContent = ok ? `${fmt(r.deg)}°` : '–';
  out('jitter').textContent = ok ? jit(r.jitter) : '–';
  F.forEach((_, i) => { out(`seg${i}`).textContent = ok ? `${fmt(r[`seg${i}`], 3)}%` : '–'; });
  // 位相雑音のグラフ。積分範囲の中を太い線、範囲の端を破線の縦線で示す
  const L = F.map((_, i) => v[`p${i}`]), lo = v.lo * 1e3, hi = v.hi * 1e6;
  const x0 = Math.min(F[0], lo), x1 = Math.max(F.at(-1), hi);
  const at = f => (f <= F[0] ? L[0] : f >= F.at(-1) ? L.at(-1) : (() => { let i = 0; while (F[i + 1] < f) i++; return L[i] + ((L[i + 1] - L[i]) * Math.log10(f / F[i])) / Math.log10(F[i + 1] / F[i]); })());
  const xs = [x0, ...F.filter(f => f > x0 && f < x1), x1];
  const inBand = [lo, ...F.filter(f => f > lo && f < hi), hi].filter(f => f >= lo && f <= hi);
  const ymin = Math.min(...L) - 10, ymax = Math.max(...L) + 5;
  lineChart(svg, {
    xlog: true, ymin, xlabel: labels.x ?? 'offset (Hz)', ylabel: labels.y ?? 'L(f) (dBc/Hz)',
    series: [
      { points: xs.map(f => [f, at(f)]), cls: 'dash' },
      ...(hi > lo ? [{ points: inBand.map(f => [f, at(f)]), cls: 'ac' }] : []),
      { points: [[lo, ymin], [lo, ymax]], cls: 'dash' }, { points: [[hi, ymin], [hi, ymax]], cls: 'dash' },
    ],
  });
}
form.addEventListener('input', update);
form.addEventListener('submit', e => e.preventDefault());
update();

// グラフで見る: 搬送波の周波数や積分範囲を変えたときのジッタ
import { initSweep } from './sweep.js';
initSweep({
  form, inputs: ['f0', 'lo', 'hi', 'p0', 'p1', 'p2', 'p3', 'p4', 'p5'], outputs: ['jitter', 'mrad', 'integ'], defaults: { x: 'f0', y: 'jitter' },
  // 位相雑音の点は、それぞれ既定値のまわり(およそ ±30 dB)で変える
  ranges: { p0: [-140, -80], p1: [-150, -90], p2: [-160, -100], p3: [-175, -115], p4: [-180, -130], p5: [-180, -130] },
  calc: jitter,
});
