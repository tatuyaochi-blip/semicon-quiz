// 計算ツール T9(待ち行列・アムダールの法則・データ量・稼働率)の検算。教科書の定番の例と、手で計算できる値で確かめる
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.document = { getElementById: () => null, querySelector: () => null, documentElement: { lang: 'en' } };
const { erlangC, mmc } = await import('../../src/js/queue.js');
const { amdahl, gustafson } = await import('../../src/js/amdahl.js');
const { media } = await import('../../src/js/media.js');
const { kOfN, fromMtbf } = await import('../../src/js/availability.js');
const near = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${a} ≠ ${b}`);

test('待ち行列: M/M/1 と M/M/c(アーランC)', () => {
  // M/M/1: λ = 4、μ = 5 → ρ = 0.8、Lq = ρ²/(1−ρ) = 3.2、L = 4、Wq = 0.8、W = 1
  const a = mmc(4, 5, 1);
  near(a.rho, 0.8); near(a.pw, 0.8); near(a.lq, 3.2); near(a.l, 4); near(a.wq, 0.8); near(a.w, 1);
  // M/M/2: λ = 3、μ = 2 → a = 1.5、ρ = 0.75、待つ確率 = 4.5/7、Lq = 27/14
  const b = mmc(3, 2, 2);
  near(b.rho, 0.75); near(b.pw, 4.5 / 7); near(b.lq, 27 / 14); near(b.wq, 9 / 14); near(b.w, 9 / 14 + 0.5);
  near(erlangC(1, 0.6), 0.6); // 窓口1つでは待つ確率 = ρ
  // リトルの法則 L = λW、Lq = λWq が、どの条件でも成り立つ
  for (const [l, m, c] of [[1, 2, 1], [7, 2, 4], [9.5, 1, 10], [0.2, 1, 3]]) { const r = mmc(l, m, c); near(r.l, l * r.w, 1e-9); near(r.lq, l * r.wq, 1e-9); assert.ok(r.pw > 0 && r.pw < 1); }
  // 窓口を増やすと待ち時間は減る
  assert.ok(mmc(3, 2, 3).wq < mmc(3, 2, 2).wq);
  // ρ ≥ 1 では結果を出さない
  assert.equal(mmc(5, 5, 1).stable, false); assert.equal(mmc(6, 2, 3).stable, false);
});

test('アムダールの法則とグスタフソンの法則', () => {
  near(amdahl(0.9, 10), 1 / 0.19); // 5.263…
  near(amdahl(0.5, 2), 4 / 3);
  near(amdahl(0.95, 1e12), 20, 1e-6); // 上限 1/(1−p)
  near(amdahl(0.7, 1), 1); near(amdahl(0, 64), 1); near(amdahl(1, 8), 8);
  near(gustafson(0.9, 10), 9.1); near(gustafson(0.5, 2), 1.5); near(gustafson(0.7, 1), 1);
  // アムダールの値はコア数を超えず、グスタフソンの値以下
  for (const p of [0.1, 0.5, 0.9, 0.99]) for (const n of [2, 8, 64]) { assert.ok(amdahl(p, n) <= n + 1e-12); assert.ok(amdahl(p, n) <= gustafson(p, n) + 1e-12); }
});

test('データ量: 画像・音声・動画', () => {
  const base = { w: 1920, h: 1080, bpp: 24, fs: 44100, qbits: 16, ch: 2, sec: 60, fps: 30, ratio: 1, audio: false };
  const img = media({ ...base, kind: 'image' });
  assert.equal(img.bits, 49766400); assert.equal(img.bytes, 6220800); assert.equal(img.rate, null);
  const cd = media({ ...base, kind: 'audio' });
  assert.equal(cd.rate, 1411200); assert.equal(cd.bytes, 10584000); // CD: 1,411.2 kbps、1分で約10.6 MB
  const v = media({ ...base, kind: 'video' });
  assert.equal(v.rate, 1492992000); assert.equal(v.bits, 1492992000 * 60);
  const va = media({ ...base, kind: 'video', audio: true });
  assert.equal(va.rate, 1492992000 + 1411200);
  // 圧縮率 100 分の1
  const c = media({ ...base, kind: 'video', ratio: 100 });
  near(c.comp, v.bits / 100); near(c.compRate, v.rate / 100); near(c.compBytes, v.bytes / 100);
});

test('稼働率: MTBF・MTTR、直列・並列・n台中k台', () => {
  near(fromMtbf(480, 20), 0.96); near(fromMtbf(999, 1), 0.999);
  near(kOfN(0.9, 1, 2), 0.99); // 並列 1 − 0.1²
  near(kOfN(0.9, 2, 2), 0.81); // 直列 0.9²
  near(kOfN(0.9, 2, 3), 3 * 0.81 * 0.1 + 0.729); // 3台中2台 = 0.972
  near(kOfN(0.95, 1, 1), 0.95);
  near(kOfN(0.9, 1, 2) * kOfN(0.95, 1, 1), 0.9405); // ページの既定値: 94.05%
  for (const a of [0.5, 0.9, 0.999]) for (const n of [1, 3, 5]) { near(kOfN(a, n, n), a ** n); near(kOfN(a, 1, n), 1 - (1 - a) ** n, 1e-9); }
  // 必要な台数が増えるほど稼働率は下がる
  assert.ok(kOfN(0.9, 3, 5) > kOfN(0.9, 4, 5));
});
