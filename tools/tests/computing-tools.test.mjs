// 計算ツール T7(計算機の基礎: 基数変換・ビット演算・IEEE 754・ハミング符号・CRC)の検算。各ページの「計算例」と照らし合わせる。
// 実行: node --test tools/tests/*.test.mjs(npm test に含まれる)
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.document = { getElementById: () => null, querySelector: () => null, documentElement: { lang: 'en' } };
const bc = await import('../../src/js/base-convert.js');
const bo = await import('../../src/js/bitops.js');
const fp = await import('../../src/js/ieee754.js');
const hm = await import('../../src/js/hamming.js');
const cr = await import('../../src/js/crc.js');

test('基数変換と2の補数: ページの計算例', () => {
  const a = bc.convert(bc.parse('-5', 10), 8);
  assert.equal(a.bin, '11111011'); assert.equal(a.hex, 'FB'); assert.equal(a.oct, '373'); assert.equal(a.u, 251n); assert.equal(a.s, -5n);
  assert.equal(a.inv, '00000100'); assert.equal(a.neg, '00000101'); assert.equal(a.negValue, 5n, '反転して1を足すと +5');
  const m = bc.convert(-128n, 8); assert.equal(m.negValue, -128n, '最小の負の数は符号を反転できない');
  assert.equal(bc.convert(-5n, 16).hex, 'FFFB', '符号拡張'); assert.equal(bc.convert(-5n, 32).hex, 'FFFFFFFB');
  assert.equal(bc.convert(bc.parse('FB', 16), 16).hex, '00FB', 'ゼロ拡張'); assert.equal(bc.convert(0xFBn, 16).s, 251n);
  assert.equal(bc.convert(128n, 8).s, -128n, '127 + 1 は符号つきで −128'); assert.equal(bc.convert(-1n, 32).u, 4294967295n);
  assert.equal(bc.convert(300n, 8).fits, false, '範囲外は警告'); assert.equal(bc.convert(300n, 8).u, 44n, '下位8ビットだけ残す');
  for (const [w, lo, hi] of [[8, -128n, 127n], [16, -32768n, 32767n], [32, -2147483648n, 2147483647n]]) { const r = bc.convert(0n, w); assert.equal(r.min, lo); assert.equal(r.max, hi); }
  assert.equal(bc.parse('0b1011_0110', 2), 0b10110110n); assert.equal(bc.parse('12', 2), null);
});

test('ビット演算: AND・シフト・2の補数の読み', () => {
  const a = bo.parseVal('0b10110100', 8);
  const r = bo.ops(a, bo.parseVal('0x0F', 8), 2, 8);
  assert.ok(r, 'ops が結果を返す');
  const s = JSON.stringify(r, (k, v) => (typeof v === 'bigint' ? v.toString() : v));
  assert.ok(s.includes('"4"') || s.includes(':4'), `AND 0x0F で 0100(4)を取り出す: ${s.slice(0, 200)}`);
  assert.equal(bo.parseVal('180', 8), bo.parseVal('-76', 8), '8ビットの 180 と −76 は同じビット列');
});

test('IEEE 754: ビット列・記憶される値・丸めとページの計算例', () => {
  const hex = (x, f) => fp.bitsOf(x, f).toString(16).toUpperCase();
  assert.equal(hex(0.1, 'single'), '3DCCCCCD'); assert.equal(hex(0.1, 'double'), '3FB999999999999A'); assert.equal(hex(0.1, 'half'), '2E66');
  assert.equal(fp.exactOf(fp.bitsOf(0.1, 'single'), 'single').exact, '0.100000001490116119384765625');
  assert.equal(fp.exactOf(fp.bitsOf(1.0000001, 'single'), 'single').exact, '1.00000011920928955078125');
  assert.equal(fp.exactOf(fp.bitsOf(100000001, 'single'), 'single').exact, '100000000', '1億に1を足しても変わらない');
  assert.equal(fp.exactOf(fp.bitsOf(16777217, 'single'), 'single').exact, '16777216', '最近接偶数丸め');
  assert.equal(hex(0.1 + 0.2, 'double'), '3FD3333333333334'); assert.equal(hex(0.3, 'double'), '3FD3333333333333');
  assert.equal(fp.exactOf(BigInt(fp.toHalf(65519)), 'half').exact, '65504', '65519 は 65504 に'); assert.equal(fp.exactOf(BigInt(fp.toHalf(65520)), 'half').kind, 'inf', '65520 以上は無限大');
  assert.equal(fp.toHalf(2 ** -24), 1, '半精度の最小の非正規化数'); assert.equal(fp.exactOf(BigInt(fp.toHalf(2 ** -14)), 'half').kind, 'normal');
  assert.equal(fp.exactOf(fp.bitsOf(1e-40, 'single'), 'single').kind, 'sub', '1e-40 は非正規化数'); assert.equal(fp.exactOf(fp.bitsOf(1e39, 'single'), 'single').kind, 'inf');
  for (const [h, v] of [['3F800000', '1'], ['C0C80000', '−6.25']]) assert.equal(fp.exactOf(BigInt('0x' + h), 'single').exact, v);
  assert.equal(fp.exactOf(0x7F800000n, 'single').kind, 'inf'); assert.equal(fp.exactOf(0x7FC00000n, 'single').kind, 'nan');
  // 半精度の丸めを、すべての半精度の値の中点で確かめる(中点は最下位ビットが偶数のほうへ)
  for (let b = 0; b < 0x7BFF; b += 37) {
    const lo = Number(fp.exactOf(BigInt(b), 'half').exact), hi = Number(fp.exactOf(BigInt(b + 1), 'half').exact);
    assert.equal(fp.toHalf(lo), b); assert.equal(fp.toHalf((lo + hi) / 2), b % 2 ? b + 1 : b, `中点 ${b}`);
  }
  // bfloat16: 単精度の上位16ビットを最近接偶数で丸める。0.1 → 0x3DCD(0.10009765625)
  const s = Number(fp.bitsOf(0.1, 'single')), up = (s >>> 16) + ((s & 0xFFFF) > 0x8000 ? 1 : 0);
  assert.equal(up.toString(16).toUpperCase(), '3DCD'); assert.equal(fp.exactOf(BigInt(up << 16 >>> 0), 'single').exact, '0.10009765625');
});

test('ハミング符号: 符号化・訂正・SECDED とページの計算例', () => {
  const e = hm.encode([1, 0, 1, 1], false);
  assert.equal(e.code.slice(1).join(''), '0110011', 'データ 1011 → 0110011'); assert.equal(e.r, 3);
  for (let pos = 1; pos <= 7; pos++) {
    const c = e.code.slice(); c[pos] ^= 1;
    const d = hm.decode(c, e.n, false); assert.equal(d.syn, pos, `位置 ${pos} の誤り`); assert.deepEqual(d.data, [1, 0, 1, 1]);
  }
  for (const [k, r] of [[4, 3], [8, 4], [64, 7]]) assert.equal(hm.encode(new Array(k).fill(0), false).r, r, `${k}ビットのデータに ${r}ビットのパリティ`);
  const s = hm.encode([1, 0, 1, 1], true);
  const two = s.code.slice(); two[3] ^= 1; two[6] ^= 1; assert.equal(hm.decode(two, s.n, true).status, 'double', 'SECDED は2ビットの誤りを検出だけ');
  const one = s.code.slice(); one[0] ^= 1; const d0 = hm.decode(one, s.n, true); assert.equal(d0.status, 'corrected'); assert.deepEqual(d0.data, [1, 0, 1, 1], 'P0 自身の誤り');
  const plain = e.code.slice(); plain[3] ^= 1; plain[6] ^= 1; assert.notDeepEqual(hm.decode(plain, e.n, false).data, [1, 0, 1, 1], 'SECDED なしでは2ビットの誤りを誤訂正');
});

test('CRC: カタログの確認値("123456789")とページの計算例', () => {
  const bytes = [...new TextEncoder().encode('123456789')];
  for (const [name, p] of Object.entries(cr.PRESETS)) assert.equal(cr.crc(bytes, p), p.check, name);
  assert.equal(cr.crc(bytes, cr.PRESETS['crc-32']), 0xCBF43926n); assert.equal(cr.crc(bytes, cr.PRESETS['crc-16-modbus']), 0x4B37n);
  // 幅 w の CRC は、長さ w 以下のバースト誤りをすべて検出する(CRC-8 で 8 ビット以下のバーストを全部試す)
  const p = cr.PRESETS['crc-8'], data = [0x41, 0x42, 0x43, 0x44], base = cr.crc(data, p);
  for (let start = 0; start + 8 <= 32; start += 3) for (let pat = 1; pat < 256; pat += 2) {
    if (!(pat & 0x80)) continue; // 先頭と末尾が 1 の長さ8のバースト
    const d = data.slice(); for (let i = 0; i < 8; i++) if (pat >> i & 1) { const bit = start + i; d[bit >> 3] ^= 0x80 >> (bit & 7); }
    assert.notEqual(cr.crc(d, p), base, `バースト ${start}`);
  }
});
