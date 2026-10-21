// CRC の計算。幅・生成多項式・初期値・入力と出力のビット反転・最後の XOR を選び、文字列(UTF-8)か16進数のバイト列の CRC を求める。
// 初期値 0・反転なしの短い入力では、多項式の割り算(XOR)の途中を1段ずつ示す。BigInt で64ビットまで扱う
const form = document.getElementById('crc-form');
const out = k => document.querySelector(`[data-out="${k}"]`);
let T = {};
try { T = JSON.parse(form.dataset.text); } catch {}
// よく使う CRC(パラメータは CRC カタログの定義。check は "123456789" の CRC)
export const PRESETS = {
  'crc-8': { w: 8, poly: 0x07n, init: 0n, refin: false, refout: false, xorout: 0n, check: 0xF4n },
  'crc-8-maxim': { w: 8, poly: 0x31n, init: 0n, refin: true, refout: true, xorout: 0n, check: 0xA1n },
  'crc-16-ccitt-false': { w: 16, poly: 0x1021n, init: 0xFFFFn, refin: false, refout: false, xorout: 0n, check: 0x29B1n },
  'crc-16-xmodem': { w: 16, poly: 0x1021n, init: 0n, refin: false, refout: false, xorout: 0n, check: 0x31C3n },
  'crc-16-kermit': { w: 16, poly: 0x1021n, init: 0n, refin: true, refout: true, xorout: 0n, check: 0x2189n },
  'crc-16-modbus': { w: 16, poly: 0x8005n, init: 0xFFFFn, refin: true, refout: true, xorout: 0n, check: 0x4B37n },
  'crc-16-arc': { w: 16, poly: 0x8005n, init: 0n, refin: true, refout: true, xorout: 0n, check: 0xBB3Dn },
  'crc-32': { w: 32, poly: 0x04C11DB7n, init: 0xFFFFFFFFn, refin: true, refout: true, xorout: 0xFFFFFFFFn, check: 0xCBF43926n },
  'crc-32c': { w: 32, poly: 0x1EDC6F41n, init: 0xFFFFFFFFn, refin: true, refout: true, xorout: 0xFFFFFFFFn, check: 0xE3069283n },
  'crc-32-mpeg2': { w: 32, poly: 0x04C11DB7n, init: 0xFFFFFFFFn, refin: false, refout: false, xorout: 0n, check: 0x0376E6E7n },
};

const reflect = (x, w) => { let r = 0n; for (let i = 0; i < w; i++) if ((x >> BigInt(i)) & 1n) r |= 1n << BigInt(w - 1 - i); return r; };
// 1ビットずつの素直な計算(表を使わない)
export function crc(bytes, p) {
  const W = BigInt(p.w), mask = (1n << W) - 1n;
  let r = p.init & mask;
  for (const b of bytes) {
    const x = p.refin ? reflect(BigInt(b), 8) : BigInt(b);
    // 上位ビットから1ビットずつ: レジスタの最上位と入力のビットの XOR が 1 なら、ずらしてから多項式で XOR する
    for (let i = 7; i >= 0; i--) {
      const bit = ((r >> (W - 1n)) & 1n) ^ ((x >> BigInt(i)) & 1n);
      r = (r << 1n) & mask;
      if (bit) r ^= p.poly;
    }
  }
  if (p.refout) r = reflect(r, p.w);
  return (r ^ p.xorout) & mask;
}
const hex = (x, w) => '0x' + x.toString(16).toUpperCase().padStart(Math.ceil(w / 4), '0');
const bin = (x, w) => x.toString(2).padStart(w, '0');
// 生成多項式を x の式で(最上位の x^w は省略されているので足す)
function polyText(poly, w) {
  const t = [`x^${w}`];
  for (let i = w - 1; i >= 0; i--) if ((poly >> BigInt(i)) & 1n) t.push(i === 0 ? '1' : i === 1 ? 'x' : `x^${i}`);
  return t.join(' + ').replace(/\^(\d+)/g, '<sup>$1</sup>');
}
function bytesOf() {
  const v = form.elements.data.value;
  if (form.elements.mode.value === 'text') return [...new TextEncoder().encode(v)];
  const h = v.replace(/0x/gi, '').replace(/[\s,_:-]/g, '');
  if (!/^[0-9a-f]*$/i.test(h) || h.length % 2) return null;
  return h.match(/../g)?.map(x => parseInt(x, 16)) ?? [];
}
function params() {
  const big = k => { const s = form.elements[k].value.trim(); return /^(0x)?[0-9a-f]+$/i.test(s) ? BigInt(s.startsWith('0x') || s.startsWith('0X') ? s : '0x' + s) : null; };
  const w = Number(form.elements.w.value);
  return { w, poly: big('poly'), init: big('init'), xorout: big('xorout'), refin: form.elements.refin.checked, refout: form.elements.refout.checked };
}
function setPreset(id) {
  const p = PRESETS[id];
  if (!p) return;
  form.elements.w.value = String(p.w);
  form.elements.poly.value = hex(p.poly, p.w);
  form.elements.init.value = hex(p.init, p.w);
  form.elements.xorout.value = hex(p.xorout, p.w);
  form.elements.refin.checked = p.refin;
  form.elements.refout.checked = p.refout;
}
// 多項式の割り算の途中(初期値 0、反転なし、XOR なしのときの「余り」の求め方)
function division(bytes, p) {
  const w = p.w;
  let bits = bytes.map(b => bin(BigInt(b), 8)).join('') + '0'.repeat(w);
  const g = '1' + bin(p.poly, w);
  const lines = [`<span class="crc-msg">${bits.slice(0, -w)}</span><span class="crc-pad">${bits.slice(-w)}</span>`];
  const a = bits.split('');
  for (let i = 0; i + w < a.length; i++) {
    if (a[i] !== '1') continue;
    lines.push(`${' '.repeat(i)}<span class="crc-g">${g}</span>`);
    for (let j = 0; j <= w; j++) a[i + j] = a[i + j] === g[j] ? '0' : '1';
    const rest = a.join('').slice(i + 1).replace(/^0*/, m => ' '.repeat(m.length));
    lines.push(`${' '.repeat(i + 1)}${rest}`);
  }
  return { html: lines.join('\n'), rem: a.join('').slice(-w) };
}
function update() {
  const err = document.getElementById('crc-error');
  const bytes = bytesOf();
  const p = params();
  const ok = bytes && p.poly != null && p.init != null && p.xorout != null && p.w >= 3 && p.w <= 64;
  err.hidden = !!ok;
  // プリセットと同じ値なら名前を表示
  const same = Object.entries(PRESETS).find(([, q]) => q.w === p.w && q.poly === p.poly && q.init === p.init && q.xorout === p.xorout && q.refin === p.refin && q.refout === p.refout);
  form.elements.preset.value = same ? same[0] : '';
  if (!ok) { for (const k of ['hex', 'bin', 'dec', 'check', 'bytes', 'poly']) out(k).textContent = '–'; document.getElementById('crc-div').hidden = true; return; }
  const mask = (1n << BigInt(p.w)) - 1n;
  p.poly &= mask; p.init &= mask; p.xorout &= mask;
  const r = crc(bytes, p);
  out('hex').textContent = hex(r, p.w);
  out('bin').textContent = bin(r, p.w).replace(/(.{4})(?=.)/g, '$1 ');
  out('dec').textContent = r.toString();
  out('bytes').textContent = `${bytes.length} byte`;
  out('check').textContent = hex(crc([...new TextEncoder().encode('123456789')], p), p.w);
  out('poly').innerHTML = polyText(p.poly, p.w);
  // 割り算の途中は、初期値 0・反転なし・XOR なしで、短い入力のときだけ
  const box = document.getElementById('crc-div');
  const show = p.init === 0n && !p.refin && !p.refout && p.xorout === 0n && bytes.length >= 1 && bytes.length <= 3 && p.w <= 16;
  box.hidden = false;
  if (show) {
    const d = division(bytes, p);
    box.querySelector('pre').innerHTML = d.html;
    box.querySelector('[data-rem]').textContent = `${T.remainder}: ${d.rem} = ${hex(BigInt('0b' + d.rem), p.w)}`;
    box.querySelector('pre').hidden = false;
  } else {
    box.querySelector('pre').hidden = true;
    box.querySelector('[data-rem]').textContent = T.div_none;
  }
}
form.elements.preset.addEventListener('change', e => { setPreset(e.target.value); update(); });
form.addEventListener('input', e => { if (e.target.name !== 'preset') update(); });
form.addEventListener('submit', e => e.preventDefault());
setPreset(form.elements.preset.value || 'crc-32');
update();
