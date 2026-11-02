// 計算ツール T1(デバイス)の検算。手計算した値・教科書の式・物理的に成り立つべき関係と、ツールの計算を照らし合わせる。
// 実行: node --test tools/tests/(npm test に含まれる)
import { test } from 'node:test';
import assert from 'node:assert/strict';

// ツールの JS は画面(document)がないときは計算だけを公開するので、最小限の document を用意して読み込む
globalThis.document = { getElementById: () => null, querySelector: () => null, documentElement: { lang: 'en' } };
const mosIv = await import('../../src/js/mosfet-iv.js');
const mosVth = await import('../../src/js/mosfet-vth.js');
const bjt = await import('../../src/js/bjt-iv.js');
const pn = await import('../../src/js/pn-junction.js');
const icd = await import('../../src/js/intrinsic-carrier.js');

const close = (a, b, rel = 1e-3, what = '') => assert.ok(Math.abs(a - b) <= Math.abs(b) * rel + 1e-15, `${what}: ${a} と ${b} が合わない`);
const q = 1.602e-19, kT = 0.02585, e0 = 8.854e-14, es = 11.7 * e0, eox = 3.9 * e0;

test('MOSFET の ID–VDS: 2乗則の手計算と一致する', () => {
  const p = { vth: 0.5, kp: 200, wl: 10, lambda: 0 }; // β = µnCox·W/L = 2 mA/V²
  close(mosIv.id(p, 1.5, 1.2), 1e-3, 1e-9, '飽和: ½·2 mA/V²·(1 V)²'); // VDS ≥ VGS − Vth
  close(mosIv.id(p, 1.5, 0.5), 2e-3 * (1 * 0.5 - 0.125), 1e-9, '線形: β[(VGS−Vth)VDS − VDS²/2]');
  assert.equal(mosIv.id(p, 0.4, 1), 0, 'VGS < Vth は 0');
  close(mosIv.id(p, 1.5, 1 - 1e-9), mosIv.id(p, 1.5, 1), 1e-6, '線形と飽和の境目で連続');
  close(mosIv.id({ ...p, lambda: 0.05 }, 1.5, 2), 1e-3 * (1 + 0.05 * 2), 1e-9, 'チャネル長変調 (1 + λVDS)');
});

test('MOSFET のしきい値電圧: 教科書の式の手計算と一致する', () => {
  // NA = 1e17 cm⁻³、tox = 10 nm、n+ ポリ Si、固定電荷 0、VSB = 0
  const r = mosVth.calc({ type: 'nmos', n: 1e17, tox: 10, nf: 0, vsb: 0, gate: 'npoly' });
  const cox = eox / 10e-7, phiF = kT * Math.log(1e17 / 1e10);
  const phims = 4.05 - (4.05 + 0.56 + phiF), qd = Math.sqrt(2 * q * es * 1e17 * 2 * phiF);
  close(r.phif, phiF, 1e-9, 'φF = kT/q·ln(NA/ni)');
  close(r.phims, phims, 1e-9, 'φms(n+ ポリ Si は伝導帯の端)');
  close(r.vth, phims + 2 * phiF + qd / cox, 1e-9, 'Vth = VFB + 2φF + |Qd|/Cox');
  assert.ok(r.vth > 0.3 && r.vth < 0.4, `Vth の値の目安(約0.34 V): ${r.vth}`);
  close(r.cox, 0.3453, 1e-3, 'Cox = 3.9ε0/tox ≈ 0.345 µF/cm²');
});

test('MOSFET のしきい値電圧: 基板バイアス効果と pMOS の対称性', () => {
  const n = v => mosVth.calc({ type: 'nmos', n: 1e16, tox: 5, nf: 0, gate: 'npoly', ...v });
  const r0 = n({ vsb: 0 }), r1 = n({ vsb: 1 });
  close(r1.vth - r0.vth, r0.gamma * (Math.sqrt(2 * r0.phif + 1) - Math.sqrt(2 * r0.phif)), 1e-9, 'ΔVth = γ(√(2φF+VSB) − √(2φF))');
  // 同じ濃度の n 型基板と p+ ポリ Si の pMOS は、nMOS と符号が逆で大きさが同じ
  const p0 = mosVth.calc({ type: 'pmos', n: 1e16, tox: 5, nf: 0, vsb: 0, gate: 'ppoly' });
  close(p0.vth, -r0.vth, 1e-9, 'pMOS の Vth = −(nMOS の Vth)');
  // 正の固定電荷は VFB を負へずらす: ΔVFB = −qNf/Cox
  const rf = n({ vsb: 0, nf: 1e11 });
  close(rf.vfb - r0.vfb, -(q * 1e11) / (eox / 5e-7), 1e-9, 'ΔVFB = −qNf/Cox');
});

test('BJT の出力特性: アーリー効果の直線・出力抵抗・飽和の境目', () => {
  const p = { beta: 100, va: 50, ib: 20, vce: 5, vmax: 10 };
  const r = bjt.point(p);
  assert.equal(r.region, 'active');
  close(r.ic, 100 * 20e-6 * (1 + 5 / 50), 1e-6, 'IC = βIB(1 + VCE/VA) = 2.2 mA');
  close(r.vbe, bjt.VT * Math.log(2.2e-3 / bjt.IS / (1 + 5 / 50)), 1e-4, 'VBE = VT·ln(βIB/IS)');
  close(r.gm, r.ic / bjt.VT, 1e-9, 'gm = IC/VT');
  close(r.ro, (50 + 5) / r.ic, 1e-4, 'ro = (VA + VCE)/IC');
  close((2.04e-3 * 5 - 2.2e-3 * 1) / (2.2e-3 - 2.04e-3), 50, 1e-9, 'FAQ の例: 2点からの VA = 50 V');
  close(bjt.ic(p, 20e-6, 1), 2.04e-3, 1e-4, 'FAQ の例: VCE = 1 V で 2.04 mA');
  const k = bjt.knee(p, 20e-6);
  assert.ok(k > 0.15 && k < 0.25, `飽和の境目は約0.2 V: ${k}`);
  assert.equal(bjt.point({ ...p, vce: 0.15 }).region, 'sat');
  assert.ok(bjt.point({ ...p, vce: 0 }).ic < 0, 'VCE = 0 では IC はわずかに負(エバース・モル)');
  // 境目のすぐ上では曲線がまだ曲がっているので、ro は (VA+VCE)/IC より小さい
  assert.ok(bjt.point({ ...p, vce: 0.3 }).ro < (50 + 0.3) / bjt.point({ ...p, vce: 0.3 }).ic);
});

test('pn 接合: 内蔵電位・空乏層幅・最大電界・容量の手計算と一致する', () => {
  const r = pn.calc({ mat: 'si', na: 1e17, nd: 1e15, vr: 0 });
  close(r.vbi, kT * Math.log((1e17 * 1e15) / 1e20), 1e-9, 'Vbi = kT/q·ln(NA·ND/ni²) ≈ 0.714 V');
  close(r.vbi, 0.714, 2e-3, 'Vbi の値');
  const w = Math.sqrt(((2 * es * r.vbi) / q) * (1 / 1e17 + 1 / 1e15));
  close(r.w, w * 1e4, 1e-9, 'W = √(2εs(Vbi+VR)/q·(1/NA + 1/ND))');
  close(r.xn + r.xp, r.w, 1e-9, 'xn + xp = W');
  close(r.xn * 1e15, r.xp * 1e17, 1e-9, '電荷の釣り合い ND·xn = NA·xp');
  close(r.emax * 1e3, (2 * r.vbi) / (r.w * 1e-4), 1e-9, '三角形の電界: Emax = 2(Vbi+VR)/W');
  close(r.cj * 1e-9, es / (r.w * 1e-4), 1e-9, 'Cj = εs/W');
  // 逆バイアスを (Vbi+VR) が4倍になるようにかけると、W は2倍、Cj は半分
  const r4 = pn.calc({ mat: 'si', na: 1e17, nd: 1e15, vr: 3 * r.vbi });
  close(r4.w, 2 * r.w, 1e-9, 'W ∝ √(Vbi+VR)');
  assert.equal(pn.calc({ mat: 'si', na: 1e17, nd: 1e15, vr: -1 }).w, undefined, '順バイアスが内蔵電位を超えると空乏近似は使えない');
});

test('真性キャリア密度: 300 K の代表値・Varshni の式・質量作用の法則', () => {
  close(icd.ni('si', 300), 1e10, 1e-12, 'Si の ni(300 K) は代表値 1.0×10¹⁰');
  close(icd.ni('ge', 300), 2.0e13, 1e-12, 'Ge');
  close(icd.ni('gaas', 300), 2.1e6, 1e-12, 'GaAs');
  close(icd.eg('si', 300), 1.17 - (4.73e-4 * 300 * 300) / (300 + 636), 1e-12, 'Varshni: Eg(300 K) ≈ 1.1245 eV');
  close(icd.eg('si', 0), 1.17, 1e-12, 'Eg(0 K) = 1.17 eV');
  // 温度が上がると増え、室温付近では約9 K ごとに2倍になる
  assert.ok(icd.ni('si', 350) > icd.ni('si', 300));
  const t2 = [...Array(400).keys()].map(i => 300 + i * 0.05).find(T => icd.ni('si', T) >= 2e10);
  assert.ok(t2 > 307 && t2 < 312, `ni が2倍になる温度: ${t2}`);
  const r = icd.calc({ mat: 'si', t: 300, dop: 1e16 });
  close(r.maj * r.min, 1e20, 1e-9, 'n·p = ni²');
  close(r.maj, 1e16, 1e-9, '多数キャリア ≈ ドナー濃度');
});

// ページの「計算例」に書いた数値が、ツールの計算と食い違っていないか(本文を直したら、ここも合わせて直す)
test('ページの計算例の数値がツールの計算と合う', () => {
  const vth = v => mosVth.calc({ type: 'nmos', n: 5e17, tox: 5, nf: 1e10, vsb: 0, gate: 'npoly', ...v });
  const d = vth({});
  close(d.cox, 0.691, 2e-3, 'しきい値電圧: Cox'); close(d.phif, 0.458, 2e-3, 'φF'); close(d.phims, -1.018, 2e-3, 'φms');
  close(d.vfb, -1.021, 2e-3, 'VFB'); close(d.qd, 0.565, 2e-3, '空乏層の項'); close(d.vth, 0.461, 3e-3, 'Vth');
  close(vth({ tox: 10 }).vth, 1.02, 5e-3, 'tox 10 nm'); close(vth({ n: 1e18 }).vth, 0.728, 3e-3, 'NA 1e18');
  close(vth({ vsb: 1 }).vth, 0.713, 3e-3, 'VSB 1 V'); close(vth({ gate: 'ppoly' }).vth, 1.58, 5e-3, 'p+ ポリ');
  close(icd.ni('si', 373), 1.3e12, 0.05, '真性キャリア密度: 373 K'); close(icd.ni('si', 400), 5.3e12, 0.02, '400 K');
  close(icd.calc({ mat: 'si', t: 300, dop: 1e15 }).ti, 547, 3e-3, 'Si で ni = ND になる温度');
  close(icd.calc({ mat: 'ge', t: 300, dop: 1e15 }).ti, 391, 3e-3, 'Ge'); close(icd.calc({ mat: 'gaas', t: 300, dop: 1e15 }).ti, 771, 3e-3, 'GaAs');
  const j = pn.calc({ mat: 'si', na: 1e17, nd: 1e16, vr: 0 });
  close(j.vbi, 0.774, 2e-3, 'pn 接合: Vbi'); close(j.w, 0.332, 3e-3, 'W');
  const p = { vth: 0.5, kp: 200, wl: 10, lambda: 0.05 }, i = mosIv.id(p, 1.5, 1.2);
  close(i, 1.06e-3, 3e-3, 'MOSFET: ID'); close(2 * i / 1, 2.1e-3, 0.02, 'gm'); close(1 / (0.05 * i) / 1e3, 19, 0.02, 'ro (kΩ)');
});
