// 計算ツール T3(回路の基本)の検算。手計算・式の性質・各ページの「計算例」とツールの計算を照らし合わせる。
// 実行: node --test tools/tests/*.test.mjs(npm test に含まれる)
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.document = { getElementById: () => null, querySelector: () => null, documentElement: { lang: 'en' } };
const dv = await import('../../src/js/divider.js');
const rc = await import('../../src/js/rc.js');
const led = await import('../../src/js/led-resistor.js');
const cc = await import('../../src/js/resistor-color.js');
const sp = await import('../../src/js/series-parallel.js');

const close = (a, b, rel = 1e-3, what = '') => assert.ok(Math.abs(a - b) <= Math.abs(b) * rel + 1e-15, `${what}: ${a} と ${b} が合わない`);

test('分圧回路: Vout = Vin·R2/(R1+R2)、負荷とテブナン等価、ページの計算例', () => {
  const c = dv.calc({ vin: 5, r1: 10e3, r2: 10e3, rl: 10e3 });
  close(c.vout, 2.5, 1e-12, '既定値 2.5 V'); close(c.ratio, 0.5, 1e-12); close(c.i, 250e-6, 1e-12, '250 µA');
  close(c.p1, 625e-6, 1e-12, '625 µW'); close(c.rth, 5e3, 1e-12, 'R1∥R2 = 5 kΩ'); close(c.vload, 5 / 3, 1e-9, 'RL 10 kΩ → 約1.67 V');
  close(dv.calc({ vin: 5, r1: 10e3, r2: 10e3, rl: 100e3 }).vload, 2.381, 1e-3, 'RL 100 kΩ → 約2.38 V');
  // 負荷つきの出力は、テブナン等価(Vth と Rth)に RL をつないだ値と一致する
  const x = dv.calc({ vin: 9, r1: 20e3, r2: 10e3, rl: 47e3 });
  close(x.vload, x.vout * 47e3 / (47e3 + x.rth), 1e-12, 'テブナン等価');
  close(x.vout, 3, 1e-12, '20 kΩ・10 kΩ で 9 V → 3 V');
  // RL = 99·Rth で低下がちょうど1%
  close(dv.calc({ vin: 5, r1: 10e3, r2: 10e3, rl: 99 * 5e3 }).vload / 2.5, 0.99, 1e-12, '99倍で1%');
  assert.ok(Number.isNaN(dv.calc({ vin: 5, r1: 1, r2: 1, rl: 0 }).vload), 'RL = 0 は負荷なし');
});

test('RC 回路: τ = RC、fc = 1/(2πRC)、充電・放電の割合とページの計算例', () => {
  const c = rc.calc({ r: 10e3, c: 100e-9, t: 1e-3 });
  close(c.tau, 1e-3, 1e-12, '10 kΩ × 100 nF = 1 ms'); close(c.fc, 159.15, 1e-4, '約159 Hz'); close(c.t5, 5e-3, 1e-12);
  close(c.charge, 0.6321, 1e-4, 't = τ で 63.21%'); close(c.discharge, 0.3679, 1e-4, '36.79%');
  for (const [k, p] of [[2, 0.865], [3, 0.950], [4, 0.982], [5, 0.993], [7, 0.999]]) close(rc.calc({ r: 1, c: 1, t: k }).charge, p, 1e-3, `${k}τ`);
  close(Math.log(2), 0.69, 1e-2, '50% は 0.69τ'); close(Math.log(9), 2.2, 1e-2, '10–90% は 2.2τ');
  close(rc.calc({ r: 1, c: 1, t: 0.4 }).charge + rc.calc({ r: 1, c: 1, t: 0.4 }).discharge, 1, 1e-12, '充電 + 放電 = 1');
});

test('LED の電流制限抵抗: R = (Vs − n·Vf)/If、E24 で計算値以上、ページの計算例', () => {
  const a = led.calc({ vs: 5, vf: 2, ia: 0.01, n: 1 });
  close(a.r, 300, 1e-12, '300 Ω'); assert.equal(a.re, 300, '300 Ω は E24 にある'); close(a.pr, 0.03, 1e-12, '抵抗 30 mW');
  close(a.pled, 0.02, 1e-12, 'LED 20 mW'); assert.equal(a.rating, 0.125, '1/8 W');
  const b = led.calc({ vs: 5, vf: 1.8, ia: 0.01 });
  close(b.r, 320, 1e-12); assert.equal(b.re, 330, '320 Ω → 330 Ω'); close(b.ie, 0.0097, 1e-3, '約9.7 mA');
  assert.ok(b.ie <= 0.01, '大きいほうに丸めるので電流は目標を超えない');
  close(led.calc({ vs: 5, vf: 2, ia: 0.01, n: 2 }).r, 100, 1e-12, '2個直列で100 Ω'); close((5 - 2 * 2.2) / 100, 0.006, 1e-12, 'Vf 2.2 V なら6 mA');
  assert.equal(led.calc({ vs: 5, vf: 2, ia: 0.01, n: 3 }).ok, false, '3個ではVfの合計6 Vで点灯しない');
  close(led.calc({ vs: 5, vf: 3, ia: 0.01 }).r, 200, 1e-12, '青・白 Vf 3 V → 200 Ω');
  assert.equal(led.calc({ vs: 12, vf: 2, ia: 0.03 }).rating, 1, '0.3 W → 2倍以上の 1 W');
});

test('抵抗のカラーコード: IEC 60062 の読み方・逆引きとページの計算例', () => {
  assert.deepEqual(cc.decode(['brown', 'black'], 'red', 'gold'), { r: 1000, tol: 5 }, '茶黒赤金 = 1 kΩ ±5%');
  assert.deepEqual(cc.decode(['brown', 'black', 'black'], 'brown', 'brown'), { r: 1000, tol: 1 }, '茶黒黒茶茶 = 1 kΩ ±1%');
  close(cc.decode(['yellow', 'violet'], 'gold', 'gold').r, 4.7, 1e-12, '黄紫金金 = 4.7 Ω');
  assert.deepEqual(cc.code(4700, 2).colors, ['yellow', 'violet', 'red'], '4.7 kΩ の4本帯');
  assert.deepEqual(cc.code(4700, 3).colors, ['yellow', 'violet', 'black', 'brown'], '4.7 kΩ の5本帯');
  assert.deepEqual(cc.code(1, 3).colors, ['brown', 'black', 'black', 'silver'], '1 Ω の5本帯は乗数が銀');
  // 逆引き → 読み取りで元の値に戻る(E24 の値すべて、0.1 Ω〜100 MΩ)
  for (let e = -1; e <= 7; e++) for (const m of [1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.2, 2.4, 2.7, 3.0, 3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1]) {
    const r = Number((m * 10 ** e).toPrecision(2)), c = cc.code(r, 2);
    close(cc.decode(c.colors.slice(0, 2), c.colors[2], 'gold').r, r, 1e-9, `${r} Ω`);
  }
  const c = cc.code(9990, 2); assert.equal(c.value, 10000, '9.99 kΩ は2桁で 10 kΩ に丸める');
});

test('合成抵抗・合成容量: 直列・並列の式、E24 の組み合わせとページの計算例', () => {
  close(sp.ser('r', [100, 200, 300]), 600, 1e-12); close(sp.par('r', [100, 200, 300]), 54.545, 1e-4, '約54.5 Ω');
  close(sp.par('c', [10e-6, 22e-6]), 32e-6, 1e-12, '並列 32 µF'); close(sp.ser('c', [10e-6, 22e-6]), 6.875e-6, 1e-4, '直列 約6.88 µF');
  close(sp.par('r', [6, 3]), 2, 1e-12, '積÷和'); close(sp.par('r', [10e3, 10e3, 10e3, 10e3]), 2.5e3, 1e-12, 'R/n');
  close(sp.par('r', [100, 10e3]), 99.0, 1e-3, '約99.0 Ω'); close(sp.ser('c', [100e-9, 100e-9]), 50e-9, 1e-12, '100 nF 2個直列');
  close(sp.ser('l', [1e-6, 2e-6]), 3e-6, 1e-12, 'コイルは抵抗と同じ');
  assert.equal(sp.eList('r').length, 7 * 24 + 1, '1 Ω〜10 MΩ');
  const a = sp.nearest('r', 1400);
  close(Math.abs(a.singleErr), 0.0714, 1e-2, '1本では約7%'); assert.equal(a.pairs[0].err, 0, '2本でちょうど 1.4 kΩ');
  const b = sp.nearest('r', 7070);
  close(b.singleErr, -0.038, 2e-2, '6.8 kΩ で約3.8%低い'); assert.ok(Math.abs(b.pairs[0].err) < 1e-12, '6.8 kΩ + 270 Ω');
  // 目標値の誤差: 100 Ω〜100 kΩ の対数で等間隔の40点で、最悪でも約0.3%以内
  let worst = 0;
  for (let k = 0; k <= 40; k++) worst = Math.max(worst, Math.abs(sp.nearest('r', 100 * 10 ** (3 * k / 40), 1).pairs[0].err));
  assert.ok(worst <= 0.0031, `最悪の誤差 ${worst}`);
});
