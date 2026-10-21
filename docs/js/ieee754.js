// IEEE 754 の浮動小数点数への変換。10進数を半精度(16ビット)・単精度(32ビット)・倍精度(64ビット)で表したときの
// 符号・指数部・仮数部のビットと16進数、実際に記憶される値(正確な10進数)と、入力との誤差を示す。
// 16進数のビット列から値に戻すこともできる。丸めは最近接偶数への丸め
const form = document.getElementById('fp-form');
const out = k => document.querySelector(`[data-out="${k}"]`);
let T = {};
try { T = JSON.parse(form.dataset.text); } catch {}
const FMT = { half: { e: 5, m: 10 }, single: { e: 8, m: 23 }, double: { e: 11, m: 52 } };

// ---- 倍精度の値 → 各形式のビット(BigInt) ----
function bitsOf(x, f) {
  const dv = new DataView(new ArrayBuffer(8));
  if (f === 'double') { dv.setFloat64(0, x); return dv.getBigUint64(0); }
  if (f === 'single') { dv.setFloat32(0, x); return BigInt(dv.getUint32(0)); }
  return BigInt(toHalf(x));
}
const roundEven = x => { const r = Math.round(x); return r - x === 0.5 && r % 2 ? r - 1 : r; };
function toHalf(x) {
  const s = x < 0 || Object.is(x, -0) ? 0x8000 : 0;
  const a = Math.abs(x);
  if (Number.isNaN(x)) return 0x7e00;
  if (a === 0) return s;
  if (a >= 65520) return s | 0x7c00; // 最大値 65504 を超えると無限大に丸まる
  if (a < 2 ** -14) return s | roundEven(a / 2 ** -24); // 非正規化数(1024 になれば最小の正規化数)
  let e = Math.floor(Math.log2(a));
  if (2 ** e > a) e--; else if (2 ** (e + 1) <= a) e++;
  let m = roundEven((a / 2 ** e - 1) * 1024);
  if (m === 1024) { m = 0; e++; }
  if (e > 15) return s | 0x7c00;
  return s | (e + 15) << 10 | m;
}

// ---- 10進数の文字列を分数 N / 10^k で表す(誤差を正確に求めるため) ----
function decimal(text) {
  const t = text.trim().replace(/[\s_]/g, '');
  const mt = t.match(/^([+-]?)(\d*)(?:\.(\d*))?(?:e([+-]?\d+))?$/i);
  if (!mt || !(mt[2] || mt[3])) return null;
  const digits = (mt[2] || '') + (mt[3] || '');
  let k = (mt[3] || '').length - Number(mt[4] || 0);
  let n = BigInt(digits || '0');
  if (k < 0) { n *= 10n ** BigInt(-k); k = 0; }
  return { n: mt[1] === '-' ? -n : n, k, neg: mt[1] === '-' };
}

// 符号つきの分数 num/den を有効数字3桁の指数表記に
function sci(num, den) {
  if (num === 0n) return '0';
  const neg = num < 0n; let a = neg ? -num : num;
  let p = a.toString().length - den.toString().length;
  // a / den が 10^p 未満なら p を1つ下げる(10^p を掛ける側を整数のまま比べる)
  if (p >= 0 ? a < den * 10n ** BigInt(p) : a * 10n ** BigInt(-p) < den) p--;
  const m = p >= 2 ? a / (den * 10n ** BigInt(p - 2)) : a * 10n ** BigInt(2 - p) / den;
  const s = m.toString().padEnd(3, '0');
  return `${neg ? '−' : ''}${s[0]}.${s.slice(1, 3)}×10^${p}`;
}

function show(bits, f, input) {
  const { e: eb, m: mb } = FMT[f];
  const total = 1 + eb + mb;
  const bin = bits.toString(2).padStart(total, '0');
  const sign = Number(bin[0]), ebits = bin.slice(1, 1 + eb), mbits = bin.slice(1 + eb);
  const ev = parseInt(ebits, 2), bias = 2 ** (eb - 1) - 1;
  const mv = BigInt('0b' + mbits);
  out('bits').innerHTML = `<span class="fp-s" title="${T.sign}">${bin[0]}</span><span class="fp-e" title="${T.exp}">${ebits}</span><span class="fp-m" title="${T.man}">${mbits.replace(/(.{4})(?=.)/g, '$1 ')}</span>`;
  out('hex').textContent = '0x' + bits.toString(16).toUpperCase().padStart(total / 4, '0');
  out('sign').textContent = `${sign} (${sign ? '−' : '+'})`;
  const kind = ev === 2 ** eb - 1 ? (mv ? 'nan' : 'inf') : ev === 0 ? (mv ? 'sub' : 'zero') : 'normal';
  out('kind').textContent = T.kinds[kind];
  out('exp').textContent = kind === 'normal' ? `${ev} − ${bias} = ${ev - bias}` : kind === 'sub' ? `${ev} → ${1 - bias} (${T.kinds.sub})` : String(ev);
  out('man').textContent = kind === 'normal' ? `1.${mbits.replace(/0+$/, '') || '0'} (2)` : `0.${mbits.replace(/0+$/, '') || '0'} (2)`;
  // 記憶される値を正確な10進数で: 値 = M × 2^E(M は整数)
  let exact = '–', err = '–';
  if (kind === 'normal' || kind === 'sub' || kind === 'zero') {
    const M = kind === 'normal' ? (1n << BigInt(mb)) + mv : mv;
    const E = (kind === 'normal' ? ev - bias : 1 - bias) - mb;
    let str;
    if (E >= 0) str = (M << BigInt(E)).toString();
    else {
      const d = (M * 5n ** BigInt(-E)).toString().padStart(-E + 1, '0');
      str = `${d.slice(0, d.length + E)}.${d.slice(d.length + E)}`.replace(/\.?0+$/, '');
    }
    exact = (sign ? '−' : '') + str;
    if (input) {
      // 誤差 = 記憶される値 − 入力(共通の分母 10^k × 2^a で引き算する)
      const a = BigInt(Math.max(0, -E));
      const den = 10n ** BigInt(input.k) * 2n ** a;
      const st = (E >= 0 ? M << BigInt(E) : M) * 10n ** BigInt(input.k) * (sign ? -1n : 1n);
      const inn = input.n * 2n ** a;
      err = st === inn ? T.exact : sci(st - inn, den);
    }
  } else exact = kind === 'inf' ? (sign ? '−∞' : '+∞') : 'NaN';
  out('exact').textContent = exact;
  out('err').textContent = err;
}

function fromValue() {
  const f = form.elements.fmt.value;
  const text = form.elements.value.value.trim();
  const err = document.getElementById('fp-error');
  let x, input = null;
  if (/^[+-]?(inf|infinity|∞)$/i.test(text)) x = text.startsWith('-') ? -Infinity : Infinity;
  else if (/^nan$/i.test(text)) x = NaN;
  else { input = decimal(text); x = input ? Number(text.replace(/[\s_]/g, '')) : null; }
  if (x == null || (input && Number.isNaN(x))) { err.hidden = false; return; }
  err.hidden = true;
  const bits = bitsOf(x, f);
  form.elements.hex.value = bits.toString(16).toUpperCase().padStart((1 + FMT[f].e + FMT[f].m) / 4, '0');
  show(bits, f, input);
  info(f);
}
function fromHex() {
  const f = form.elements.fmt.value;
  const total = 1 + FMT[f].e + FMT[f].m;
  const h = form.elements.hex.value.trim().replace(/^0x/i, '').replace(/[\s_]/g, '');
  const err = document.getElementById('fp-error');
  if (!/^[0-9a-f]+$/i.test(h) || h.length > total / 4) { err.hidden = false; return; }
  err.hidden = true;
  const bits = BigInt('0x' + h);
  show(bits, f, null);
  info(f);
}
// 形式ごとの性質: 精度(仮数のビット数+1)、マシンイプシロン、最大値、最小の正規化数、最小の非正規化数
function info(f) {
  const { e, m } = FMT[f];
  const bias = 2 ** (e - 1) - 1;
  out('prec').textContent = `${m + 1} bit (≈ ${((m + 1) * Math.log10(2)).toFixed(1)} ${T.digits})`;
  out('eps').textContent = `2^−${m} ≈ ${(2 ** -m).toPrecision(4)}`;
  out('max').textContent = ((2 - 2 ** -m) * 2 ** bias).toPrecision(6);
  out('minn').textContent = `2^${1 - bias} ≈ ${(2 ** (1 - bias)).toPrecision(4)}`;
  out('mins').textContent = `2^${1 - bias - m} ≈ ${(2 ** (1 - bias - m)).toPrecision(4)}`;
}
form.addEventListener('input', e => (e.target.name === 'hex' ? fromHex : fromValue)());
form.addEventListener('submit', e => e.preventDefault());
fromValue();
