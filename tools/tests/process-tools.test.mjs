// 計算ツール T2(物性・プロセス)の検算。手計算・式の性質・各ページの「計算例」とツールの計算を照らし合わせる。
// 実行: node --test tools/tests/*.test.mjs(npm test に含まれる)
import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.document = { getElementById: () => null, querySelector: () => null, documentElement: { lang: 'en' } };
const rs = await import('../../src/js/resistivity.js');
const bg = await import('../../src/js/bandgap-wavelength.js');
const ox = await import('../../src/js/oxidation.js');
const li = await import('../../src/js/litho.js');
const dy = await import('../../src/js/die-yield-calc.js');

const close = (a, b, rel = 1e-3, what = '') => assert.ok(Math.abs(a - b) <= Math.abs(b) * rel + 1e-15, `${what}: ${a} と ${b} が合わない`);

test('抵抗率と不純物濃度: ρ = 1/(qNμ)、逆算、ページの計算例', () => {
  close(rs.rho('p', 1e15), 1 / (1.602e-19 * 1e15 * rs.mobility('p', 1e15)), 1e-12, 'ρ = 1/(qNμ)');
  close(rs.mobility('p', 1e15), 462, 3e-3, 'p型 1e15 の移動度'); close(rs.rho('p', 1e15), 13.5, 3e-3, 'p型 1e15 → 13.5 Ω·cm');
  close(rs.mobility('n', 1e15), 1362, 3e-3, 'n型 1e15 の移動度'); close(rs.rho('n', 1e15), 4.58, 3e-3, 'n型 1e15 → 4.58 Ω·cm');
  close(rs.conc('p', 10), 1.36e15, 5e-3, 'p型 10 Ω·cm → 1.36e15'); close(rs.conc('n', 1), 4.9e15, 1e-2, 'n型 1 Ω·cm → 4.9e15');
  close(rs.rho('p', 1e17), 0.197, 5e-3, 'p型 1e17 → 0.197 Ω·cm'); close(rs.mobility('p', 1e17), 317, 5e-3, 'p型 1e17 の移動度');
  for (const N of [1e12, 3e14, 1e17, 5e19]) close(rs.conc('n', rs.rho('n', N)), N, 1e-6, '濃度 → 抵抗率 → 濃度で元に戻る');
  // 低濃度では電子の移動度が正孔の約3倍、高濃度では移動度が下がる
  assert.ok(rs.mobility('n', 1e14) / rs.mobility('p', 1e14) > 2.8);
  assert.ok(rs.mobility('n', 1e19) < 150);
});

test('バンドギャップと波長: λ = 1239.84/Eg とページの計算例', () => {
  const nm = eg => bg.HC / eg;
  close(nm(1.42), 873, 1e-3, 'GaAs'); close(nm(1.12), 1107, 1e-3, 'Si'); close(nm(3.4), 365, 2e-3, 'GaN');
  close(nm(2.7), 460, 2e-3, 'InGaN の青'); close(bg.HC / 1550, 0.80, 2e-3, '1550 nm に対応する Eg');
});

test('熱酸化(Deal-Grove): 式を満たし、直線則・放物線則の極限とページの計算例に合う', () => {
  const c = ox.coeff('dry', 1000, '100');
  close(c.B, 0.0104, 1e-2, 'ドライ 1000 ℃ の B'); close(c.BA, 0.0449, 1e-2, 'B/A((100) 面)');
  const x = ox.thick(c, 1, 0);
  close(x * x + c.A * x, c.B * 1, 1e-9, 'x² + Ax = B(t + τ)');
  close(x * 1000, 38.5, 3e-3, 'ドライ・(100)・1000 ℃・1 時間 → 約38.5 nm');
  // 短時間では x ≈ (B/A)t、長時間では x ≈ √(Bt)
  close(ox.thick(c, 1e-4, 0), c.BA * 1e-4, 1e-3, '直線則');
  close(ox.thick(c, 1e5, 0), Math.sqrt(c.B * 1e5), 2e-2, '放物線則');
  // (111) 面は (100) 面より B/A が 1.68 倍
  close(ox.coeff('dry', 1000, '111').BA / c.BA, 1.68, 1e-9, '(111)/(100)');
  const w = ox.coeff('wet', 1000, '100');
  close(ox.thick(w, 1, 0) * 1000, 388, 5e-3, 'ウェット 1 時間 → 約388 nm'); close(ox.thick(w, 2, 0) * 1000, 610, 5e-3, 'ウェット 2 時間 → 約610 nm');
  // 初期膜厚 xi があるとき、τ = (xi² + A·xi)/B を使うと t = 0 で xi に戻る
  const xi = 0.02, tau = (xi * xi + c.A * xi) / c.B;
  close(ox.thick(c, 0, tau), xi, 1e-9, 't = 0 で初期膜厚');
});

test('露光の解像度と焦点深度: R = k1·λ/NA、DOF = k2·λ/NA² とページの計算例', () => {
  const imm = li.calc({ lambda: 193, na: 1.35, k1: 0.28, k2: 0.5, pitch: 81 });
  close(imm.hp, 193 * 0.28 / 1.35, 1e-12, 'R = k1λ/NA'); close(imm.hp, 40, 1e-2, 'ArF 液浸 k1 0.28 → 約40 nm');
  close(imm.dof, 0.5 * 193 / 1.35 ** 2, 1e-12, 'DOF = k2λ/NA²');
  assert.equal(imm.passes, 1, 'ピッチ 81 nm は最小ピッチ 80.06 nm より広いので1回で描ける');
  assert.equal(li.calc({ lambda: 193, na: 1.35, k1: 0.28, k2: 0.5, pitch: 80 }).passes, 2, 'ピッチ 80 nm は最小ピッチ 80.06 nm にわずかに届かず2回');
  assert.equal(li.calc({ lambda: 193, na: 1.35, k1: 0.28, k2: 0.5, pitch: 41 }).passes, 2, 'ピッチ 41 nm には2回(80.06/41 < 2)');
  assert.equal(li.calc({ lambda: 193, na: 1.35, k1: 0.28, k2: 0.5, pitch: 40 }).passes, 3, 'ピッチ 40 nm には3回(80.06/40 > 2)');
  close(li.calc({ lambda: 13.5, na: 0.33, k1: 0.4, k2: 0.5, pitch: 40 }).hp, 16, 3e-2, 'EUV NA 0.33 → 約16 nm(16.4)');
  close(li.calc({ lambda: 13.5, na: 0.55, k1: 0.4, k2: 0.5, pitch: 40 }).hp, 10, 2e-2, 'High-NA EUV → 約10 nm');
  const a = li.calc({ lambda: 13.5, na: 0.33, k1: 0.4, k2: 0.5, pitch: 40 }), b = li.calc({ lambda: 13.5, na: 0.55, k1: 0.4, k2: 0.5, pitch: 40 });
  close(a.hp / b.hp, 1.67, 1e-2, 'NA 0.33→0.55 で解像度約1.7倍'); close(a.dof / b.dof, 2.78, 1e-2, '焦点深度は約2.8分の1');
});

test('ダイ数・歩留まり: 歩留まりモデルの式とページの計算例', () => {
  const y = dy.yields(1, 3);
  close(y.poisson, Math.exp(-1), 1e-12, 'ポアソン Y = e^(−AD)');
  close(y.murphy, ((1 - Math.exp(-1)) / 1) ** 2, 1e-12, 'マーフィー');
  close(y.negbin, (1 + 1 / 3) ** -3, 1e-12, '負の二項');
  assert.ok(dy.yields(1, 1e6).negbin - Math.exp(-1) < 1e-5, 'α → ∞ で負の二項はポアソンに近づく');
  const base = { d: 300, w: 10, h: 10, scribe: 100, edge: 3, d0: 0.1, alpha: 3, cost: 10000 };
  const c = dy.compute(base);
  assert.equal(c.grid.n, 612, '10×10 mm は612個');
  close(c.poisson.y, Math.exp(-0.1), 1e-12, 'ポアソン歩留まり約90%');
  close(c.poisson.good, 554, 2e-3, '良品約554個'); close(c.poisson.cost, 18.06, 2e-3, '良品1個約18ドル');
  close(c.formula, Math.PI * 147 ** 2 / (10.1 ** 2) - Math.PI * 294 / Math.sqrt(2 * 10.1 ** 2), 1e-9, '経験式 πr²/S − πd/√(2S)');
  const big = dy.compute({ ...base, w: 20, h: 20 });
  assert.equal(big.grid.n, 148, '20×20 mm は148個'); close(big.poisson.y, Math.exp(-0.4), 1e-12, '歩留まり約67%');
  close(big.poisson.good, 99, 1e-2, '良品約99個'); close(big.poisson.cost, 101, 1e-2, '良品1個約101ドル');
  close(big.poisson.cost / c.poisson.cost, 5.6, 1e-2, '面積4倍でコスト約5.6倍');
});
