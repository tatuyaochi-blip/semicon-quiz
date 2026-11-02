// 計算ツール T5(回路・実装: 配線の RC 遅延・PDN・接合温度・CMOS の電力・ボード線図)の検算。式の性質と各ページの「計算例」を照らし合わせる。
// 実行: node --test tools/tests/*.test.mjs(npm test に含まれる)
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.document = { getElementById: () => null, querySelector: () => null, documentElement: { lang: 'en' } };
const ic = await import('../../src/js/interconnect-rc.js');
const pd = await import('../../src/js/pdn.js');
const th = await import('../../src/js/thermal.js');
const cp = await import('../../src/js/cmos-power.js');
const bd = await import('../../src/js/bode.js');

const close = (a, b, rel = 1e-3, what = '') => assert.ok(Math.abs(a - b) <= Math.abs(b) * rel + 1e-15, `${what}: ${a} と ${b} が合わない`);

test('配線の RC 遅延: R = ρL/(WT)、平行平板の容量、Bakoglu の遅延とページの計算例', () => {
  const v = { metal: 'cu', rhox: 1, w: 50, t: 100, s: 50, h: 100, k: 2.7, len: 1000, rdrv: 1000, cl: 10 };
  const r = ic.wire(v);
  close(r['r-len'], 3.4, 1e-9, '3.4 Ω/µm'); close(r.r, 3400, 1e-9, '1 mm で 3.4 kΩ');
  close(r['c-len'], 0.1195, 1e-3, '約0.12 fF/µm'); close(r['cc-share'], 80, 1e-9, '横の容量が80%');
  close(r.wire, 154, 5e-3, '配線だけ 154 ps'); close(r.total, 267, 5e-3, '全体 267 ps');
  close(ic.wire({ ...v, rhox: 3 }).r, 10200, 1e-9); close(ic.wire({ ...v, rhox: 3 }).wire, 463, 5e-3, '倍率3で約463 ps');
  close(ic.wire({ ...v, k: 3.9 })['c-len'], 0.173, 3e-3, 'SiO2 で 0.173 fF/µm');
  const two = ic.wire({ ...v, len: 2000 });
  close(two.wire / r.wire, 4, 1e-9, '長さ2倍で配線の遅延は4倍'); close(two.wire, 618, 5e-3); close(two.total, 837, 5e-3, '2 mm で 837 ps');
  assert.ok(2 * r.total < two.total, 'リピータで2つに分けると短くなる'); close(2 * r.total, 535, 5e-3, '約535 ps');
});

test('PDN: 目標インピーダンス、自己共振、|Z| < Zt の範囲とページの計算例', () => {
  const v = { v: 1, ripple: 5, di: 10, c: 1, esr: 10, esl: 0.5, n: 10 };
  const r = pd.pdn(v);
  close(r.zt, 5, 1e-12, '5 mΩ'); close(r.srf, 7.12, 1e-3, '約7.12 MHz'); close(r.zsrf, 1, 1e-12, '1 mΩ');
  close(r.flo, 2.76, 3e-3, '下限 約2.76 MHz'); close(r.fhi, 18.4, 3e-3, '上限 約18.4 MHz'); assert.equal(r.nmin, 2, '最小2個');
  // 範囲の端では |Z| がちょうど Zt になる
  for (const f of [r.flo, r.fhi]) {
    const w = 2 * Math.PI * f * 1e6;
    close(Math.hypot(10e-3, w * 0.5e-9 - 1 / (w * 1e-6)) / 10, 5e-3, 1e-9, `${f} MHz で |Z| = Zt`);
  }
  close(pd.pdn({ ...v, v: 0.75, ripple: 3 }).zt, 2.25, 1e-12, '0.75 V・3% で 2.25 mΩ');
  const big = pd.pdn({ ...v, c: 10 }); close(big.fhi, 15.9, 3e-3, '10 µF で上限 約15.9 MHz'); close(big.flo, 0.318, 3e-3, '下限 約318 kHz');
  close(pd.pdn({ ...v, esl: 0.25 }).fhi, 34.2, 3e-3, 'ESL 半分で上限 約34.2 MHz');
  assert.ok(Number.isNaN(pd.pdn({ ...v, n: 1 }).flo), '1個では ESR 10 mΩ > 5 mΩ で範囲なし');
});

test('接合温度: Tj = Ta + P·θ、最大電力とページの計算例', () => {
  assert.equal(th.tj(1, 25, 50), 75); assert.equal(th.pmax(125, 25, 50), 2); close(th.pmax(125, 85, 50), 0.8, 1e-12);
  close(th.tj(1, 25, 1 + 0.5 + 3), 29.5, 1e-12, 'ヒートシンクありで 29.5 ℃'); close(th.pmax(125, 25, 4.5), 22.2, 2e-3, '約22.2 W');
  assert.equal(th.pmax(125, 130, 50), 0, '周囲が Tjmax を超えたら 0 W');
});

test('CMOS の電力: αCV²f、静的電力、DVFS とページの計算例', () => {
  const r = cp.power({ alpha: 0.1, c: 1, v: 1, f: 2, ileak: 100, s: 0.8 });
  close(r.dyn, 0.2, 1e-12); close(r.stat, 0.1, 1e-12); close(r.share, 100 / 3, 1e-9, '静的が33.3%');
  close(r.dvfs, 0.1824, 1e-9, '80% で 0.1824 W'); close(r.dvfsRatio, 60.8, 1e-9, '元の60.8%');
  const a = cp.power({ alpha: 0.2, c: 3, v: 0.9, f: 1, ileak: 0 }), b = cp.power({ alpha: 0.2, c: 3, v: 1, f: 1, ileak: 0 });
  close(a.dyn / b.dyn, 0.81, 1e-12, '電圧0.9倍で0.81倍'); close(cp.power({ alpha: 1, c: 1, v: 1, f: 1, ileak: 0, s: 0.9 }).dvfsRatio / 100, 0.729, 1e-9, '0.9³');
});

test('ボード線図: 多項式の読み取り、根、位相余裕・ゲイン余裕とページの計算例', () => {
  assert.deepEqual(bd.parsePoly('s(s+1)'), [0, 1, 1]); assert.deepEqual(bd.parsePoly('(s+1)(s+2)(s+3)'), [6, 11, 6, 1]);
  assert.deepEqual(bd.parsePoly('1 3 2'), [2, 3, 1]); assert.equal(bd.parsePoly('s+'), null);
  const rs = bd.roots([6, 11, 6, 1]).map(([re]) => re).sort((x, y) => x - y);
  rs.forEach((x, i) => close(x, [-3, -2, -1][i], 1e-9, '根'));
  const a = bd.analyze([1], [0, 1, 1]);
  close(a.wgc, 0.786, 1e-3, 'ωgc 約0.786'); close(a.pm, 51.8, 2e-3, '位相余裕 約52°'); assert.equal(a.type, 1); assert.equal(a.clStable, true);
  const b = bd.analyze([10], [6, 11, 6, 1]);
  close(b.wpc, Math.sqrt(11), 1e-6, 'ωpc = √11'); close(b.gm, 20 * Math.log10(6), 1e-6, 'ゲイン余裕 約15.6 dB(6倍)');
  assert.equal(bd.analyze([60.5], [6, 11, 6, 1]).clStable, false, 'ゲイン60を超えると不安定'); assert.equal(bd.analyze([59.5], [6, 11, 6, 1]).clStable, true);
  const c = bd.analyze([2], [1, 1], 0.5);
  close(c.wgc, Math.sqrt(3), 1e-6, 'ωgc = √3'); close(c.pm, 180 - 60 - Math.sqrt(3) * 0.5 * 180 / Math.PI, 1e-6, '位相余裕 約70°');
  close(bd.analyze([2], [1, 1]).pm, 120, 1e-6, 'むだ時間なしで120°'); assert.equal(c.clStable, null, 'むだ時間ありは根で判定しない');
  // 一次遅れの折れ点で −3 dB・−45°
  const d = bd.analyze([1], [1, 1]); const k = d.w.findIndex(x => x >= 1);
  close(d.db[k], -3.01, 2e-2); close(d.ph[k], -45, 2e-2);
});
