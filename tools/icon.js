// アプリのアイコン(PNG)を作る。ロゴと同じグラデーションの上に、白いチップの図柄を描く。
// 外部ライブラリを使わず、zlib だけで PNG を組み立てる。
import zlib from 'node:zlib';

const C1 = [0x1d, 0x64, 0xc8]; // #1d64c8
const C2 = [0x0b, 0x8f, 0x72]; // #0b8f72
const PINS = [0.37, 0.457, 0.543, 0.63]; // ピンの中心(辺に沿った位置)

// 位置 (u, v)(0〜1)が白い図柄の上にあるか
function isWhite(u, v) {
  const inBox = (a, b) => u >= a && u <= b && v >= a && v <= b;
  if (inBox(0.3, 0.7)) return !inBox(0.4, 0.6); // チップの本体(中央はくり抜く)
  const pin = (along, across) => across >= 0.22 && across < 0.3 && PINS.some(p => Math.abs(along - p) <= 0.022);
  return pin(u, v) || pin(u, 1 - v) || pin(v, u) || pin(v, 1 - u);
}

export function iconPng(size) {
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 4); // 先頭の 0 はフィルタなし
    for (let x = 0; x < size; x++) {
      const t = (x + y) / (2 * size);
      const rgb = isWhite((x + 0.5) / size, (y + 0.5) / size) ? [255, 255, 255] : C1.map((c, i) => Math.round(c + (C2[i] - c) * t));
      row.set([...rgb, 255], 1 + x * 4);
    }
    rows.push(row);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr.set([8, 6, 0, 0, 0], 8); // 8bit RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function crc32(buf) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
