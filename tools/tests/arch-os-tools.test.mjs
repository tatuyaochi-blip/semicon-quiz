// 計算ツール T8(アーキテクチャ・OS)の検算: キャッシュ、メモリ帯域、ページ置換、CPUスケジューリング、RAID。
// 教科書の定番の例と、手で数えられる値で確かめる
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.document = { getElementById: () => null, querySelector: () => null, documentElement: { lang: 'en' } };
const { split, amat } = await import('../../src/js/cache-calc.js');
const { PRESETS, gbs } = await import('../../src/js/mem-bw.js');
const { simulate, parseRefs } = await import('../../src/js/paging-core.js');
const { schedule } = await import('../../src/js/sched-core.js');
const { raid } = await import('../../src/js/raid.js');
const near = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${a} ≠ ${b}`);

test('キャッシュ: アドレスの分割と AMAT', () => {
  // 32ビット、32 KiB、64 B ライン、8ウェイ: 512ライン、64セット、オフセット6・インデックス6・タグ20
  assert.deepEqual(split(32, 32, 64, 8), { lines: 512, sets: 64, off: 6, idx: 6, tag: 20 });
  // ダイレクトマップ(1ウェイ)とフルアソシアティブ(全ライン1セット)
  assert.equal(split(32, 32, 64, 1).idx, 9);
  assert.deepEqual(split(32, 32, 64, 512), { lines: 512, sets: 1, off: 6, idx: 0, tag: 26 });
  assert.equal(split(32, 24, 64, 8), null); // 2のべき乗でない容量
  assert.equal(split(32, 1, 64, 32), null); // ウェイ数がライン数より多い
  near(amat(1, 5, 100), 6); // 1 + 0.05 × 100
  near(amat(4, 2, 200), 8);
});

test('メモリ帯域: 代表的な規格のピーク帯域', () => {
  const want = { 'DDR4-3200': 25.6, 'DDR5-6400': 51.2, 'LPDDR5X-8533': 68.264, 'GDDR6': 64, 'HBM3': 819.2 };
  for (const [name, r, w] of PRESETS) {
    const k = Object.keys(want).find(x => name.startsWith(x));
    near(gbs(r, w, 1), want[k], 1e-6);
  }
  near(gbs(3200, 64, 2), 51.2); // 2チャネル
});

test('ページ置換: 教科書の参照列(フォルトの数とベラディの異常)', () => {
  const refs = parseRefs('7 0 1 2 0 3 0 4 2 3 0 3 2 1 2 0 1 7 0 1');
  assert.equal(simulate(refs, 3, 'fifo').faults, 15);
  assert.equal(simulate(refs, 3, 'lru').faults, 12);
  assert.equal(simulate(refs, 3, 'opt').faults, 9);
  // FIFO は枠を増やすとフォルトが増えることがある(ベラディの異常)
  const b = parseRefs('1,2,3,4,1,2,5,1,2,3,4,5');
  assert.equal(simulate(b, 3, 'fifo').faults, 9);
  assert.equal(simulate(b, 4, 'fifo').faults, 10);
  // LRU と OPT は異常を起こさない(スタックアルゴリズム)
  for (const a of ['lru', 'opt']) assert.ok(simulate(b, 4, a).faults <= simulate(b, 3, a).faults);
  // OPT はどの方式よりフォルトが少ないか等しい
  for (const a of ['fifo', 'lru', 'clock']) for (const n of [2, 3, 4]) assert.ok(simulate(refs, n, 'opt').faults <= simulate(refs, n, a).faults);
  assert.deepEqual(parseRefs('70120304'), ['7', '0', '1', '2', '0', '3', '0', '4']);
  assert.equal(parseRefs('1 2 x!'), null);
});

test('ページ置換: Clock(二度目の機会)を手で追う', () => {
  // 3枠、参照列 1 2 3 2 4 : 4 のとき全ビット1 → 一周してすべて0にし、針の位置(枠0の1)を追い出す
  const r = simulate(parseRefs('1 2 3 2 4'), 3, 'clock');
  const last = r.steps.at(-1);
  assert.equal(last.victim, '1');
  assert.deepEqual(last.frames, ['4', '2', '3']);
  assert.deepEqual(last.bits, [1, 0, 0]);
  assert.equal(r.faults, 4);
});

const P = rows => rows.map(([name, arrival, burst, prio = 0]) => ({ name, arrival, burst, prio }));
test('CPUスケジューリング: 教科書の例の平均待ち時間', () => {
  const a = P([['P1', 0, 24], ['P2', 0, 3], ['P3', 0, 3]]);
  near(schedule(a, 'fcfs').avg.wait, 17);
  near(schedule(a, 'rr', 4).avg.wait, 17 / 3);
  near(schedule(a, 'sjf').avg.wait, 3);
  const b = P([['P1', 0, 8], ['P2', 1, 4], ['P3', 2, 9], ['P4', 3, 5]]);
  near(schedule(b, 'srt').avg.wait, 6.5);
  near(schedule(b, 'sjf').avg.wait, 7.75);
  const c = P([['P1', 0, 10, 3], ['P2', 0, 1, 1], ['P3', 0, 2, 4], ['P4', 0, 1, 5], ['P5', 0, 5, 2]]);
  near(schedule(c, 'prio').avg.wait, 8.2);
  // 時間の保存: ガントチャートの長さ = 実行時間の合計(空き時間なし)、待ち = ターンアラウンド − 実行時間
  for (const algo of ['fcfs', 'sjf', 'srt', 'rr', 'prio', 'prio-p']) {
    const r = schedule(b, algo, 2);
    assert.equal(r.makespan, 26);
    const busy = r.gantt.filter(g => g.i !== null).reduce((s, g) => s + g.t1 - g.t0, 0);
    assert.equal(busy, 26);
    r.rows.forEach((x, i) => assert.equal(x.wait, x.tat - b[i].burst));
    assert.ok(r.rows.every(x => x.wait >= 0 && x.resp >= 0 && x.resp <= x.wait));
  }
});

test('CPUスケジューリング: 空き時間と横取りの優先度', () => {
  const r = schedule(P([['A', 2, 3], ['B', 10, 1]]), 'fcfs');
  assert.deepEqual(r.gantt.map(g => [g.i, g.t0, g.t1]), [[null, 0, 2], [0, 2, 5], [null, 5, 10], [1, 10, 11]]);
  // 横取りあり: 優先度の高い(数が小さい)B が到着したら A を止める
  const p = schedule(P([['A', 0, 5, 2], ['B', 1, 2, 1]]), 'prio-p');
  assert.deepEqual(p.gantt.map(g => [g.i, g.t0, g.t1]), [[0, 0, 1], [1, 1, 3], [0, 3, 7]]);
});

test('RAID: 容量・故障に耐える台数・データを失う確率', () => {
  const r5 = raid('5', 4, 2, 0.05);
  assert.equal(r5.usable, 6); near(r5.eff, 0.75); assert.equal(r5.tol, 1);
  // 2台以上壊れる確率 = 1 − (0台) − (1台)
  near(r5.lose, 1 - 0.95 ** 4 - 4 * 0.05 * 0.95 ** 3);
  const r6 = raid('6', 6, 1, 0.1);
  assert.equal(r6.usable, 4); assert.equal(r6.tol, 2);
  near(r6.lose, 1 - 0.9 ** 6 - 6 * 0.1 * 0.9 ** 5 - 15 * 0.01 * 0.9 ** 4);
  near(raid('0', 3, 1, 0.1).lose, 1 - 0.9 ** 3);
  near(raid('1', 3, 4, 0.1).lose, 0.001); assert.equal(raid('1', 3, 4, 0.1).usable, 4);
  const r10 = raid('10', 4, 1, 0.1);
  assert.equal(r10.usable, 2); assert.equal(r10.tol, 1); assert.equal(r10.tolBest, 2);
  near(r10.lose, 1 - (1 - 0.01) ** 2);
  assert.equal(raid('5', 2, 1, 0.1), null);
  assert.equal(raid('10', 5, 1, 0.1), null);
});
