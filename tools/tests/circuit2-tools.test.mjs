// 計算ツール T4(回路(2): オペアンプ・dBm・ジッタ・ADC・DC-DC)の検算。式の性質と各ページの「計算例」を照らし合わせる。
// 実行: node --test tools/tests/*.test.mjs(npm test に含まれる)
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.document = { getElementById: () => null, querySelector: () => null, documentElement: { lang: 'en' } };
const oa = await import('../../src/js/opamp.js');
const db = await import('../../src/js/dbm.js');
const jt = await import('../../src/js/jitter.js');
const adc = await import('../../src/js/adc-snr.js');
const dc = await import('../../src/js/dcdc.js');

const close = (a, b, rel = 1e-3, what = '') => assert.ok(Math.abs(a - b) <= Math.abs(b) * rel + 1e-15, `${what}: ${a} と ${b} が合わない`);

test('オペアンプ: 反転・非反転・差動のゲイン、飽和、入力抵抗、抵抗の組とページの計算例', () => {
  const inv = oa.amp({ c: 'inv', rf: 100e3, rin: 10e3, vin: 0.5 });
  assert.equal(inv.g, -10); close(inv.db, 20, 1e-12); close(inv.vout, -5, 1e-12, '0.5 V → −5 V'); assert.equal(inv.zin, 10e3);
  const non = oa.amp({ c: 'noninv', rf: 100e3, rin: 10e3, vin: 1 });
  assert.equal(non.g, 11); close(non.db, 20.83, 1e-3, '約20.8 dB'); assert.equal(non.zin, Infinity);
  const diff = oa.amp({ c: 'diff', rf: 100e3, rin: 10e3, v1: 1.0, v2: 1.2 });
  close(diff.vout, 2.0, 1e-9, '差動 (1.2 − 1.0) × 10 = 2 V'); assert.equal(diff.zin, 20e3, '差動入力は 2·R1');
  const sat = oa.amp({ c: 'inv', rf: 100e3, rin: 10e3, vin: 2, vp: 15, vn: -15 });
  assert.equal(sat.vout, -15); assert.equal(sat.sat, true, '−20 V は ±15 V で頭打ち');
  assert.equal(oa.amp({ c: 'follower', rf: 0, rin: 1, vin: 3 }).vout, 3);
  // 目標ゲインの組: 誤差の小さい順で、Rf・Rin は E24
  const p = oa.pairs('noninv', 11);
  assert.equal(p[0].err, 0, 'ゲイン11はちょうど作れる'); assert.equal(p[0].r, 10e3, '同じ誤差なら Rin 10 kΩ を先に');
  for (const x of oa.pairs('inv', -4.7)) assert.ok(Math.abs(x.err) < 0.02 && x.g < 0);
  assert.deepEqual(oa.pairs('follower', 1), []);
  // 解説の目安: CMRR ≈ (1 + G)/(4·許容差)、GBW ÷ ノイズゲイン、スルーレート
  close(20 * Math.log10(2 / (4 * 0.01)), 34, 1e-2, 'CMRR 1% → 約34 dB'); close(20 * Math.log10(2 / (4 * 0.001)), 54, 1e-2, '0.1% → 約54 dB');
  close(1e6 / 11, 91e3, 1e-2, 'GBW 1 MHz・ノイズゲイン11 → 約91 kHz'); close(0.5e6 / (2 * Math.PI * 10), 8e3, 1e-2, '0.5 V/µs・振幅10 V → 約8 kHz');
});

test('dBm: 電力・電圧・dBµV への換算とページの計算例', () => {
  const a = db.fromDbm(0, 50);
  close(a.p, 1e-3, 1e-12); assert.equal(a.dbw, -30); close(a.vrms, 0.2236, 1e-4, '223.6 mV'); close(a.vpp, 0.6325, 1e-4, '632.5 mV');
  close(a.dbuv, 106.99, 1e-4, '106.99 dBµV');
  close(db.fromDbm(0, 75).vrms, 0.2739, 1e-3, '75 Ω で 273.9 mV'); close(db.fromDbm(0, 600).vrms, 0.775, 1e-3, '600 Ω で 0.775 V');
  for (const [d, w] of [[-30, 1e-6], [10, 0.01], [20, 0.1], [30, 1], [40, 10]]) close(db.fromDbm(d).p, w, 1e-12, `${d} dBm`);
  // 50 Ω では dBµV ≈ dBm + 107
  for (const d of [-60, -10, 13]) close(db.fromDbm(d, 50).dbuv - d, 107, 1e-3);
  close(db.ratios(3).pr, 1.995, 1e-3); close(db.ratios(3).vr, 1.413, 1e-3); close(db.ratios(20).pr, 100, 1e-12);
  close(10 * Math.log10(2), 3.01, 1e-3, '0 dBm を2つ合わせて約3 dBm');
});

test('位相雑音からジッタ: 区間の積分、既定値の計算例、範囲と f0 の効果', () => {
  const v = { f0: 100, lo: 12, hi: 20, p0: -110, p1: -120, p2: -130, p3: -145, p4: -155, p5: -155 };
  const r = jt.jitter(v);
  close(r.jitter, 479, 3e-3, '約479 fs'); close(r.integ, -73.4, 2e-3, '−73.4 dBc'); close(r.mrad, 0.301, 3e-3, '0.301 mrad');
  close(r.seg1, 46.8, 3e-3, '12 kHz〜100 kHz が約46.8%'); close(r.seg2, 30.2, 3e-3, '100 kHz〜1 MHz が約30.2%');
  close(jt.jitter({ ...v, lo: 1 }).jitter, 596, 3e-3, '下限 1 kHz で約596 fs');
  close(jt.jitter({ ...v, f0: 200 }).jitter, r.jitter / 2, 1e-12, 'f0 を2倍でジッタ半分');
  // 全点を10 dB下げるとジッタは 1/√10
  const w = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k.startsWith('p') ? x - 10 : x]));
  close(jt.jitter(w).jitter / r.jitter, 1 / Math.sqrt(10), 1e-9, '10 dB で 0.316倍');
  // 区間の積分は数値積分と一致する(−10 dB/dec の対数になる場合を含む)
  const L = [-100, -110, -125, -140, -150, -150];
  for (const [lo, hi] of [[1e3, 2e7], [3e3, 5e5], [500, 3e7]]) {
    const F = [1e3, 1e4, 1e5, 1e6, 1e7, 2e7];
    const at = f => (f <= F[0] ? L[0] : f >= F[5] ? L[5] : (() => { let i = 0; while (F[i + 1] < f) i++; return L[i] + ((L[i + 1] - L[i]) * Math.log10(f / F[i])) / Math.log10(F[i + 1] / F[i]); })());
    let s = 0; const n = 200000, a = Math.log(lo), b = Math.log(hi);
    for (let k = 0; k < n; k++) { const f = Math.exp(a + (b - a) * (k + 0.5) / n); s += 10 ** (at(f) / 10) * f * (b - a) / n; }
    close(jt.integrate(L, lo, hi).total, s, 1e-4, `数値積分 ${lo}〜${hi}`);
  }
  close(-20 * Math.log10(2 * Math.PI * 100e6 * r.jitter * 1e-15), 70.4, 2e-3, '100 MHz 入力の SNR 上限 約70.4 dB');
});

test('ADC: 6.02N + 1.76 dB、ジッタの SNR、合成と ENOB、ページの計算例', () => {
  const a = adc.snr({ bits: 12, fs: 2, fin: 10, jitter: 1, osr: 1 });
  close(a.lsb, 0.488, 1e-3, '1 LSB 約0.488 mV'); close(a.q, 74.0, 1e-3, '74.0 dB'); close(a.j, 84.0, 1e-3, 'ジッタで約84.0 dB');
  close(a.total, 73.6, 1e-3, '合成 約73.6 dB'); close(a.enob, 11.93, 1e-3, 'ENOB 約11.93');
  close(adc.snr({ bits: 12, fin: 100, jitter: 1 }).j, 64.0, 1e-3, '100 MHz で約64.0 dB');
  close(adc.snr({ bits: 12, osr: 4 }).q - adc.snr({ bits: 12 }).q, 6.02, 1e-3, 'OSR 4倍で約6 dB');
  close(adc.snr({ bits: 12, osr: 256 }).enob - 12, 4, 1e-3, 'OSR 256 で4ビット');
  close(adc.enob(70), 11.34, 1e-3); close(adc.enob(74), 12.0, 1e-2);
  // ジッタなしの ENOB は N に一致する
  for (const n of [8, 12, 16]) close(adc.snr({ bits: n }).enob, n, 1e-9);
});

test('DC-DC: デューティ比・リプル・不連続モードとページの計算例', () => {
  const ex = { topo: 'buck', vin: 12, vout: 3.3, iout: 2, f: 500e3, L: 4.7e-6, C: 22e-6, esr: 0 };
  const a = dc.dcdc(ex);
  assert.equal(a.mode, 'ccm'); close(a.D, 0.275, 1e-12, 'D = 27.5%'); close(a.di, 1.02, 3e-3, 'ΔI 約1.02 A');
  close(a.di / a.iavg, 0.51, 1e-2, '平均の約51%'); close(a.icrit, 0.51, 1e-2, '境目 約0.51 A'); close(a.dv, 11.6e-3, 3e-3, 'ΔV 約11.6 mV');
  close(a.L30 * 0.3 * a.iavg, a.di * 4.7e-6, 1e-9, 'L30 でリプルが30%');
  const b = dc.dcdc({ ...ex, iout: 0.2 });
  assert.equal(b.mode, 'dcm'); close(b.D, 0.17, 3e-2, '0.2 A で D 約17%'); assert.ok(b.D < 0.275, '不連続では D が小さい');
  // 不連続モードの D は、境目では連続モードの D に一致する
  for (const topo of ['buck', 'boost', 'buckboost']) {
    const p = { topo, vin: 12, vout: topo === 'buck' ? 5 : 20, iout: 1, f: 300e3, L: 10e-6, C: 22e-6 };
    const c = dc.dcdc(p), edge = dc.dcdc({ ...p, iout: c.icrit * (1 - 1e-9) });
    assert.equal(edge.mode, 'dcm', topo); close(edge.D, c.D, 1e-4, `${topo} の境目`);
  }
  // 昇圧・昇降圧の式
  const bo = dc.dcdc({ topo: 'boost', vin: 5, vout: 12, iout: 1, f: 1e6, L: 4.7e-6, C: 22e-6 });
  close(bo.D, 1 - 5 / 12, 1e-12); close(bo.iavg, 1 / (5 / 12), 1e-12); close(bo.dv, 1 * bo.D / (1e6 * 22e-6), 1e-12);
  const bb = dc.dcdc({ topo: 'buckboost', vin: 12, vout: 5, iout: 1, f: 200e3, L: 22e-6, C: 47e-6 });
  close(bb.D, 5 / 17, 1e-12); close(bb.D * 12 / (1 - bb.D), 5, 1e-12, '|Vout| = D·Vin/(1 − D)');
  assert.equal(dc.dcdc({ ...ex, vout: 13 }).error, 'buck_range');
});
