// 抵抗のカラーコード(IEC 60062 の色と数字の対応)。4本帯は数字2桁、5本帯は数字3桁で、そのあとに乗数と許容差。
// 逆引き: 抵抗値から、4本帯(数字2桁に丸める)と5本帯(数字3桁)の色を出す
import { si, num, reader } from './eng.js';
const form = document.getElementById('rcc-form');
const out = k => document.querySelector(`[data-out="${k}"]`);
const val = reader(form);
const svg = document.getElementById('rcc-body');
let names = {};
try { names = JSON.parse(form.dataset.colors); } catch {}

const DIGIT = { black: 0, brown: 1, red: 2, orange: 3, yellow: 4, green: 5, blue: 6, violet: 7, grey: 8, white: 9 };
const MULT = { ...Object.fromEntries(Object.entries(DIGIT).map(([c, d]) => [c, 10 ** d])), gold: 0.1, silver: 0.01 };
const TOL = { brown: 1, red: 2, orange: 0.05, yellow: 0.02, green: 0.5, blue: 0.25, violet: 0.1, grey: 0.01, gold: 5, silver: 10 };
const HEX = { black: '#1b1b1b', brown: '#7b4a2a', red: '#d32f2f', orange: '#f57c00', yellow: '#fdd835', green: '#388e3c', blue: '#1e63d6', violet: '#7e3fbf', grey: '#8d8d8d', white: '#f5f5f5', gold: '#c9a227', silver: '#b8bcc2' };
const byDigit = Object.fromEntries(Object.entries(DIGIT).map(([c, d]) => [d, c]));
const byExp = Object.fromEntries(Object.entries(MULT).map(([c, m]) => [Math.round(Math.log10(m)), c]));

// 抵抗の絵: 胴体に帯を描く(許容差の帯は少し離す)
function draw(bands) {
  const x0 = 60, step = 26;
  const rects = bands.map((c, k) => {
    const x = x0 + k * step + (k === bands.length - 1 ? 22 : 0);
    return `<rect x="${x}" y="22" width="14" height="56" fill="${HEX[c]}" stroke="#0003"/>`;
  }).join('');
  svg.innerHTML = `<line x1="0" y1="50" x2="300" y2="50" stroke="#999" stroke-width="4"/><rect x="40" y="22" width="220" height="56" rx="20" fill="#e8d3a8" stroke="#0003"/>${rects}`;
}

// 逆引き: 有効数字 n 桁の色(丸めた値も返す)
function code(r, n) {
  if (!(r >= 0.01)) return null;
  let e = Math.floor(Math.log10(r)) - (n - 1);
  let m = Math.round(r / 10 ** e);
  if (m >= 10 ** n) { m /= 10; e += 1; }
  if (!(e in byExp)) return null;
  const digits = String(m).padStart(n, '0').split('').map(d => byDigit[d]);
  return { colors: [...digits, byExp[e]], value: m * 10 ** e };
}

function update() {
  const five = form.elements.bands.value === '5';
  form.querySelector('[data-band3]').hidden = !five;
  const d = ['d1', 'd2', ...(five ? ['d3'] : [])].map(k => form.elements[k].value);
  const mul = form.elements.mul.value, tol = form.elements.tol.value;
  const r = Number(d.map(c => DIGIT[c]).join('')) * MULT[mul];
  out('value').textContent = si(r, 'Ω', 4);
  out('tol').textContent = `±${num(TOL[tol])}%`;
  out('range').textContent = `${si(r * (1 - TOL[tol] / 100), 'Ω', 4)} – ${si(r * (1 + TOL[tol] / 100), 'Ω', 4)}`;
  draw([...d, mul, tol]);
  const target = val('target', 0);
  for (const [k, n] of [['code4', 2], ['code5', 3]]) {
    const c = code(target, n);
    out(k).textContent = c ? `${c.colors.map(x => names[x] ?? x).join(' – ')}${Math.abs(c.value - target) > target * 1e-9 ? ` (${si(c.value, 'Ω', n + 1)})` : ''}` : '–';
  }
}
form.addEventListener('input', update);
form.addEventListener('submit', e => e.preventDefault());
update();
