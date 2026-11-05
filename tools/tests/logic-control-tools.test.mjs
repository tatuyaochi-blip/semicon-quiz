// 計算ツール T6(論理・制御: タイミング・カルノー図・状態遷移・PID)の検算。式の性質と各ページの「計算例」を照らし合わせる。
// 論理回路シミュレーターは画面と一体なので、ブラウザで例の真理値表を確かめる(quality/progress.md に記録)
// 実行: node --test tools/tests/*.test.mjs(npm test に含まれる)
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.document = { getElementById: () => null, querySelector: () => null, documentElement: { lang: 'en' } };
const sta = await import('../../src/js/sta.js');
const km = await import('../../src/js/kmap.js');
const fsm = await import('../../src/js/fsm-core.js');
const pid = await import('../../src/js/pid.js');

const close = (a, b, rel = 1e-3, what = '') => assert.ok(Math.abs(a - b) <= Math.abs(b) * rel + 1e-12, `${what}: ${a} と ${b} が合わない`);

test('セットアップ・ホールド: スラックの式と最大周波数', () => {
  const p = { period: 2, tcqmax: 0.15, tcqmin: 0.08, combmax: 1.5, combmin: 0.05, setup: 0.06, hold: 0.04, skew: 0, unc: 0.05 };
  const r = sta.slacks(p);
  close(r.setup, 2 - 0.06 - 0.05 - 1.65, 1e-12, 'セットアップのスラック 0.24 ns'); close(r.hold, 0.13 - 0.04, 1e-12, 'ホールドのスラック 0.09 ns');
  close(r.fmax, 1000 / 1.76, 1e-12, 'fmax = 1/(tcq + 組み合わせ + セットアップ + 不確かさ − スキュー)');
  // スラックが 0 になる周期の逆数が fmax
  close(sta.slacks({ ...p, period: 1000 / r.fmax }).setup, 0, 1e-9, '最小周期でスラック0');
  // 正のスキューはセットアップを楽にし、ホールドを厳しくする
  const s = sta.slacks({ ...p, skew: 0.1 }); close(s.setup - r.setup, 0.1, 1e-9); close(r.hold - s.hold, 0.1, 1e-9);
});

// 積和形の項が、1 の最小項をすべて覆い、0 の最小項を1つも覆わないか
const check = (n, on, dc, terms) => {
  for (let x = 0; x < 1 << n; x++) {
    const v = terms.some(t => km.covers(t, x));
    if (on.includes(x)) assert.ok(v, `最小項 ${x} が覆われていない`);
    else if (!dc.includes(x)) assert.ok(!v, `0 の ${x} を覆っている`);
  }
};

test('カルノー図: 最小の積和形とページの計算例', () => {
  const maj = km.simplify(3, [3, 5, 6, 7]); assert.equal(maj.plain.split(' + ').sort().join(' + '), 'AB + AC + BC'); check(3, [3, 5, 6, 7], [], maj.terms);
  const seg = km.simplify(4, [0, 2, 3, 5, 6, 7, 8, 9], [10, 11, 12, 13, 14, 15]);
  assert.equal(seg.plain, "A + C + BD + B'D'"); assert.equal(seg.terms.length, 4); assert.equal(seg.lits, 6); assert.equal(seg.ess.size, 4, '4項とも必須主項');
  const segNoX = km.simplify(4, [0, 2, 3, 5, 6, 7, 8, 9]); assert.equal(segNoX.terms.length, 4); assert.equal(segNoX.lits, 11, 'X を0にすると11リテラル'); assert.equal(segNoX.alt, true, '同じ大きさの解がもう1つ');
  check(4, [0, 2, 3, 5, 6, 7, 8, 9], [], segNoX.terms);
  // 7セグメントの a の和積形: 0 の側(1, 4)を X と一緒にまとめると2項
  assert.equal(km.simplify(4, [1, 4], [10, 11, 12, 13, 14, 15]).terms.length, 2, '和積形は2項');
  assert.equal(km.simplify(4, [0, 2, 8, 10]).plain, "B'D'", '4隅は1項');
  const par = km.simplify(3, [1, 2, 4, 7]); assert.equal(par.terms.length, 4, 'パリティは簡単にならない');
  const two = km.simplify(3, [0, 1, 2, 5, 6, 7]); assert.equal(two.terms.length, 3); assert.equal(two.lits, 6); assert.equal(two.ess.size, 0, '必須主項なし'); assert.equal(two.alt, true, '解が2通り');
  const set = r => r.plain.split(' + ').sort().join(' + ');
  const hz = km.simplify(3, [1, 3, 6, 7]); assert.equal(set(hz), "A'C + AB", '最小の積和形 A\'C + AB(順不同)');
  assert.equal(set(segNoX), "A'B'D' + A'BD + A'C + AB'C'", 'X を0にした場合の4項(順不同)');
  assert.equal(set(km.simplify(4, [1, 4], [10, 11, 12, 13, 14, 15])), "A'B'C'D + BC'D'", '和積形 (A + B + C + D\')(B\' + C + D) の否定');
  assert.ok(hz.primes.some(t => t.v === 0b011 && t.m === 0b100), 'コンセンサス項 BC は主項(必須ではない)'); assert.ok(!hz.ess.has(`${0b011}/${0b100}`));
  // 3変数のすべての関数(256通り)で、得た式が関数と一致する
  for (let f = 0; f < 256; f++) { const on = [...Array(8).keys()].filter(x => f >> x & 1); check(3, on, [], km.simplify(3, on).terms); }
});

test('状態遷移: たどり方と最小化とページの例', () => {
  const ones = fsm.EXAMPLES.ones;
  assert.equal(fsm.simulate(ones, ones.input).map(s => s.out).join(''), '0010011', '1が2回続いたら1');
  const mod3 = fsm.EXAMPLES.mod3; // 1001(2) = 9 は3で割り切れる
  assert.equal(fsm.simulate(mod3, '1001').at(-1).out, '1'); assert.equal(fsm.simulate(mod3, '111').at(-1).out, '0', '7 は割り切れない');
  const s101 = fsm.EXAMPLES.seq101;
  assert.equal(fsm.simulate(s101, '1010110').map(s => s.out).join(''), '0010100', '101 を重なりも数えて見つける');
  assert.equal(fsm.reduced(fsm.EXAMPLES.redundant).states.length, 3, '6状態が3状態になる');
  assert.equal(fsm.reduced(fsm.EXAMPLES.parity).states.length, 2);
  assert.equal(Math.ceil(Math.log2(3)), 2, '3状態ならフリップフロップ2個');
});

const run = s => pid.simulate({ K: 1, T: 5, zeta: 0.5, wn: 1, L: 2, kp: 0, ki: 0, kd: 0, N: 10, umax: 0, antiWindup: false, tEnd: 30, ...s });

test('PID: ステップ応答とページの計算例', () => {
  const p = run({ plant: 'fo', kp: 4 }); close(p.final, 0.8, 2e-3, 'P だけでは最終値 0.8'); close(p.ess, 0.2, 1e-2, '定常偏差 0.2');
  close(run({ plant: 'fo', kp: 4, ki: 1 }).final, 1, 2e-3, 'I で定常偏差がなくなる');
  const so = run({ plant: 'so', zeta: 0.2, wn: 1, kp: 1, tEnd: 60 });
  const zcl = 0.2 / Math.sqrt(2); close(zcl, 0.1414, 1e-3, '閉ループの ζ 約0.14');
  close(so.overshoot, 100 * Math.exp(-Math.PI * zcl / Math.sqrt(1 - zcl * zcl)), 2e-2, 'オーバーシュート約64%'); close(so.overshoot, 64, 2e-2);
  const it = run({ plant: 'int', T: 1, kp: 1 }); close(it.overshoot, 16.3, 3e-2, '積分つきに P で約16%'); close(it.final, 1, 2e-3, '定常偏差なし');
  for (const [z, os] of [[0.5, 16.3], [0.7, 4.6]]) close(100 * Math.exp(-Math.PI * z / Math.sqrt(1 - z * z)), os, 1e-2);
  const wu = run({ plant: 'fo', kp: 2, ki: 2, umax: 1.5 }), aw = run({ plant: 'fo', kp: 2, ki: 2, umax: 1.5, antiWindup: true });
  close(wu.overshoot, 35, 0.1, '巻き上がりで約35%'); close(aw.overshoot, 7, 0.25, '対策ありで約7%'); assert.ok(aw.overshoot < wu.overshoot / 3);
  const big = run({ plant: 'fopdt', T: 10, L: 2, kp: 20, tEnd: 60 });
  assert.ok(big.unstable || !big.settled, 'Kp = 20 では発散する');
  const ok = run({ plant: 'fopdt', T: 10, L: 2, kp: 4, ki: 0.4, kd: 4, tEnd: 60 }); assert.ok(!ok.unstable && ok.settled, 'PID の例は落ち着く'); close(ok.final, 1, 1e-2);
});
