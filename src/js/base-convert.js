// 基数変換と2の補数。入力した数を、指定したビット幅の2進数・8進数・10進数・16進数で表し、
// 符号なしと2の補数(符号つき)のどちらで読んだときの値も示す。負の10進数は2の補数で表す。BigInt で64ビットまで正確に扱う
const form = document.getElementById('bc-form');
const out = k => document.querySelector(`[data-out="${k}"]`);
let T = {};
try { T = JSON.parse(form.dataset.text); } catch {}
const DIGITS = { 2: /^[01]+$/, 8: /^[0-7]+$/, 10: /^\d+$/, 16: /^[0-9a-f]+$/i };
const PREFIX = { 2: /^0b/i, 8: /^0o/i, 16: /^0x/i };

// 4桁ごとに区切る(2進数・16進数を読みやすくする)
const group = (s, n) => s.replace(new RegExp(`\\B(?=(.{${n}})+$)`, 'g'), ' ');

export function parse(text, base) {
  let s = text.trim().replace(/[\s_]/g, '');
  let neg = false;
  if (s.startsWith('-')) { neg = true; s = s.slice(1); }
  if (PREFIX[base]) s = s.replace(PREFIX[base], '');
  if (!s || !DIGITS[base].test(s)) return null;
  const v = [...s.toLowerCase()].reduce((a, c) => a * BigInt(base) + BigInt(parseInt(c, 16)), 0n);
  return neg ? -v : v;
}

// 値 v(BigInt)を bits ビットで表す: 2進・8進・16進・符号なし・2の補数で読んだ値、全ビット反転、符号の反転(反転して1を足す)
export function convert(v, bitsN) {
  const bits = BigInt(bitsN), mod = 1n << bits;
  const min = -(mod >> 1n), max = (mod >> 1n) - 1n;
  const u = ((v % mod) + mod) % mod, s = u > max ? u - mod : u;
  const inv = (mod - 1n) ^ u, neg = (inv + 1n) % mod;
  return { fits: v >= min && v < mod, min, max, u, s, bin: u.toString(2).padStart(bitsN, '0'), oct: u.toString(8), hex: u.toString(16).toUpperCase().padStart(bitsN / 4, '0'),
    inv: inv.toString(2).padStart(bitsN, '0'), neg: neg.toString(2).padStart(bitsN, '0'), negValue: neg > max ? neg - mod : neg };
}

function update() {
  const base = Number(form.elements.base.value);
  const w = Number(form.elements.bits.value);
  const v = parse(form.elements.value.value, base);
  const err = document.getElementById('bc-error');
  const r0 = convert(0n, w);
  out('range_u').textContent = `0 〜 ${(1n << BigInt(w)) - 1n}`;
  out('range_s').textContent = `${r0.min} 〜 ${r0.max}`;
  if (v == null) { err.textContent = T.invalid; err.hidden = false; for (const k of ['bin', 'oct', 'dec_u', 'dec_s', 'hex', 'inv', 'neg']) out(k).textContent = '–'; return; }
  // 範囲外の値は下位のビットだけを残す(実際のレジスタと同じ)
  const r = convert(v, w);
  err.textContent = T.overflow;
  err.hidden = r.fits;
  out('bin').textContent = group(r.bin, 4);
  out('oct').textContent = r.oct;
  out('hex').textContent = group(r.hex, 4);
  out('dec_u').textContent = r.u.toString();
  out('dec_s').textContent = r.s.toString();
  // 符号を反転する手順: 全ビットを反転して1を足す
  out('inv').textContent = group(r.inv, 4);
  out('neg').textContent = `${group(r.neg, 4)}  (${r.negValue.toString()})`;
}
if (form) {
form.addEventListener('input', update);
form.addEventListener('submit', e => e.preventDefault());
update();
}
