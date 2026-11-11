// 教科書のような組み方の式(tools/mathml.js と data/math.json)。表の式がすべて変換でき、分数・根号・添字が意図どおりに組まれること
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { linearToMathML } from '../mathml.js';

const table = JSON.parse(fs.readFileSync(new URL('../../data/math.json', import.meta.url), 'utf8')).formulas;
const ml = (s, o) => linearToMathML(s, o)?.ml.replace(/<annotation[\s\S]*<\/annotation>/, '') ?? null;
const count = (s, tag) => s.split(`<${tag}>`).length - 1;

test('表の式はすべて変換でき、分数・根号・指数のどれかを含む', () => {
  const keys = Object.keys(table);
  assert.ok(keys.length >= 150);
  for (const k of keys) { const r = linearToMathML(k, table[k]); assert.ok(r, `変換できない: ${k}`); assert.ok(r.fancy, `組み直す意味がない: ${k}`); assert.ok(r.ml.includes(`<annotation encoding="text/plain">`)); }
});

test('表の式は、今の本文(日本語)のどこかに書いてある', () => {
  const texts = [];
  for (const f of fs.readdirSync(new URL('../../data/tools/', import.meta.url))) { const d = JSON.parse(fs.readFileSync(new URL(`../../data/tools/${f}`, import.meta.url), 'utf8')); for (const s of d.text.ja?.sections ?? []) texts.push(s.p); for (const q of d.text.ja?.faq ?? []) texts.push(q.a); }
  for (const g of JSON.parse(fs.readFileSync(new URL('../../data/glossary.json', import.meta.url), 'utf8'))) { for (const a of g.about ?? []) texts.push(a.p); for (const q of g.faq ?? []) texts.push(q.a); }
  const all = texts.join('\n');
  const missing = Object.keys(table).filter(k => !all.includes(k));
  assert.deepEqual(missing, []);
});

test('分数と根号: 割り算の範囲と、積の読み方', () => {
  const dpw = ml('DPW ≈ πr²/S − πd/√(2S)');
  assert.equal(count(dpw, 'mfrac'), 2); assert.equal(count(dpw, 'msqrt'), 1);
  assert.ok(dpw.includes('<mfrac><mrow><mi>π</mi><msup><mi>r</mi><mn>2</mn></msup></mrow><mi>S</mi></mfrac>')); // πr² 全体が分子
  assert.ok(dpw.includes('<msqrt><mrow><mn>2</mn><mi>S</mi></mrow></msqrt>')); // 根号の中のカッコは外す
  // 並べて書いた積は割り算より強い: Eg/2kT = Eg/(2kT)
  assert.ok(ml('ni = √(Nc·Nv)·exp(−Eg/2kT)').includes('<mfrac><msub><mi>E</mi><mi mathvariant="normal">g</mi></msub><mrow><mn>2</mn><mi>k</mi><mi>T</mi></mrow></mfrac>'));
  // 「·」でつないだ積は分子に入る。スペースで囲んだ「×」は分数どうしの積
  assert.ok(ml('Vout = I·R2 = Vin·R2/(R1 + R2)').includes('<mfrac><mrow><msub><mi>V</mi><mi mathvariant="normal">in</mi></msub><mo>&#x22C5;</mo><msub><mi>R</mi><mi mathvariant="normal">2</mi></msub></mrow>'));
  assert.equal(count(ml('Wq = (1 + Cs²)/2 × ρ/(1 − ρ) × Ts'), 'mfrac'), 2);
});

test('記号の区切り: 添字にするもの、積として読むもの、名前として読むもの', () => {
  assert.ok(ml('fc = 1/(2πRC)').includes('<mi>R</mi><mi>C</mi>')); // RC は R と C の積
  assert.ok(ml('Av ≈ −gm·RC = −IC·RC/VT', { subs: ['RC'] }).includes('<msub><mi>R</mi><mi mathvariant="normal">C</mi></msub>')); // コレクタ抵抗
  assert.ok(ml('R = k1·λ/NA', { words: ['NA'] }).includes('<mi mathvariant="normal">NA</mi>')); // 開口数
  assert.ok(ml('ρ = 1/(q·NA·μp)').includes('<msub><mi>N</mi><mi mathvariant="normal">A</mi></msub>')); // アクセプタ濃度
  assert.ok(ml('np = ni²·exp((EFn − EFp)/kT)').startsWith('<math xmlns="http://www.w3.org/1998/Math/MathML" display="block"><semantics><mrow><mrow><mi>n</mi><mi>p</mi></mrow>')); // n と p の積
  assert.ok(ml('Cox = εox/tox').includes('<msub><mi>ε</mi><mi mathvariant="normal">ox</mi></msub>'));
  assert.ok(ml('sinθc = n2/n1').includes('<mi mathvariant="normal">sin</mi>'));
  assert.equal(linearToMathML('P[dBm] = 10·log10(P/1 mW)'), null); // 読めない書き方は変換しない
});
