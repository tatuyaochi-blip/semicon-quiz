// 教科書のような組み方の式(src/js/mathml.js と data/math.json)。表の式がすべて変換でき、分数・根号・添字が意図どおりに組まれること
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { linearToMathML, makeMarker, modeOf, formulaHtml } from '../../src/js/mathml.js';

const table = JSON.parse(fs.readFileSync(new URL('../../data/math.json', import.meta.url), 'utf8')).formulas;
const ml = (s, o) => linearToMathML(s, o)?.ml.replace(/<annotation[\s\S]*<\/annotation>/, '') ?? null;
const count = (s, tag) => s.split(`<${tag}>`).length - 1;

test('表の式はすべて変換でき、分数・根号・指数のどれかを含む', () => {
  const keys = Object.keys(table);
  assert.ok(keys.length >= 150);
  for (const k of keys) { const r = linearToMathML(k, { ...table[k], mode: table[k].mode ?? modeOf(k) }); assert.ok(r, `変換できない: ${k}`); assert.ok(r.fancy, `組み直す意味がない: ${k}`); assert.ok(r.ml.includes(`<annotation encoding="text/plain">`)); }
});

test('表の式は、今の本文(いずれかの言語)のどこかに書いてある', () => {
  const texts = [];
  const walk = o => { if (typeof o === 'string') texts.push(o); else if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') Object.values(o).forEach(walk); };
  const read = p => JSON.parse(fs.readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8'));
  for (const f of fs.readdirSync(new URL('../../data/tools/', import.meta.url))) walk(read(`data/tools/${f}`).text.ja);
  for (const f of fs.readdirSync(new URL('../../data/questions/', import.meta.url))) walk(read(`data/questions/${f}`));
  walk(read('data/glossary.json')); walk(read('data/compare.json'));
  for (const lang of fs.readdirSync(new URL('../../data/i18n/', import.meta.url)).filter(x => !x.includes('.'))) {
    for (const f of ['glossary.json', 'compare.json']) if (fs.existsSync(new URL(`../../data/i18n/${lang}/${f}`, import.meta.url))) walk(read(`data/i18n/${lang}/${f}`));
    if (fs.existsSync(new URL(`../../data/i18n/${lang}/questions/`, import.meta.url))) for (const f of fs.readdirSync(new URL(`../../data/i18n/${lang}/questions/`, import.meta.url))) walk(read(`data/i18n/${lang}/questions/${f}`));
    for (const f of fs.readdirSync(new URL('../../data/tools/', import.meta.url))) walk(read(`data/tools/${f}`).text[lang]);
    if (fs.existsSync(new URL(`../../src/learn/${lang}/`, import.meta.url))) for (const f of fs.readdirSync(new URL(`../../src/learn/${lang}/`, import.meta.url))) texts.push(fs.readFileSync(new URL(`../../src/learn/${lang}/${f}`, import.meta.url), 'utf8').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'));
  }
  for (const f of fs.readdirSync(new URL('../../src/learn/ja/', import.meta.url))) texts.push(fs.readFileSync(new URL(`../../src/learn/ja/${f}`, import.meta.url), 'utf8').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'));
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
  assert.equal(linearToMathML('port ^= (1 << 5)'), null); // 読めない書き方は変換しない
});

test('「÷」・単位・指数・微分: 計算例や言葉の式も分数に組む', () => {
  // 「÷」は「×」と同じ強さで左から順に。指数表記の数(3×10⁸)は1つの数
  assert.ok(ml('Cd ≈ 10 ns × 10 mA ÷ 26 mV ≈ 3.8 nF').includes('<mfrac><mrow><mrow><mn>10</mn><mtext>&#x2009;ns</mtext></mrow><mo>×</mo><mrow><mn>10</mn><mtext>&#x2009;mA</mtext></mrow></mrow><mrow><mn>26</mn><mtext>&#x2009;mV</mtext></mrow></mfrac>'));
  assert.ok(ml('1×10¹⁵ ÷ 1×10⁻⁵ = 1×10²⁰ cm⁻³').startsWith('<math xmlns="http://www.w3.org/1998/Math/MathML" display="block"><semantics><mrow><mfrac><mrow><mn>1</mn><mo>×</mo><msup><mn>10</mn><mn>15</mn></msup></mrow><mrow><mn>1</mn><mo>×</mo><msup><mn>10</mn><mrow><mo>−</mo><mn>5</mn></mrow></msup></mrow></mfrac>'));
  // 日本語の語は演算子でつないだときだけ式の一部。前に付いた見出しの語は読まない
  assert.ok(ml('ドーズ量 = 電流 × 時間 ÷ (電気素量 × 面積)').includes('<mfrac><mrow><mtext class="mw">電流</mtext><mo>×</mo><mtext class="mw">時間</mtext></mrow>'));
  assert.equal(linearToMathML('抵抗R = ρL/A'), null);
  // スペースなしの1文字は変数(6.02N、2A)。「倍」「%」は分数全体の後ろ
  assert.ok(ml('SNR = 6.02N + 1.76 dB').includes('<mn>6.02</mn><mi>N</mi>'));
  assert.ok(ml('1/2² = 1/4 倍').endsWith('<mrow><mfrac><mn>1</mn><mn>4</mn></mfrac><mtext>&#x2009;倍</mtext></mrow></mrow></semantics></math>'));
  // 指数の中の割り算は斜線のまま。e の前の文字は添字にしない。虚数単位 j の後ろの数字も添字にしない
  assert.ok(ml('i = Ae^(−t/τ)').includes('<mi>A</mi><msup><mi>e</mi><mrow><mo>−</mo><mrow><mi>t</mi><mo>/</mo><mi>τ</mi></mrow></mrow></msup>'));
  assert.ok(ml('Y = 1/(3 + j4)').includes('<mi>j</mi><mn>4</mn>'));
  // 微分: d は立体、L di/dt のスペースは積
  assert.ok(ml('v = L di/dt').includes('<mi>L</mi><mfrac><mrow><mi mathvariant="normal">d</mi><mi>i</mi></mrow><mrow><mi mathvariant="normal">d</mi><mi>t</mi></mrow></mfrac>'));
  // 先頭のカッコの分数は、後ろの分数の分子に入れない
  assert.equal(count(ml('s = (2/T)(z − 1)/(z + 1)'), 'mfrac'), 2);
  assert.ok(!ml('s = (2/T)(z − 1)/(z + 1)').includes('<mfrac><mrow><mrow><mo>(</mo><mfrac>'));
  // 積として読む並びの指定
  assert.ok(ml('√(Dt)', { prods: ['Dt'] }).includes('<msqrt><mrow><mi>D</mi><mi>t</mi></mrow></msqrt>'));
});

test('出し方: 関係のある式は独立、「÷」だけの式は文中の分数、根号・指数だけの式は文中にそのまま', () => {
  assert.equal(modeOf('V = L·di/dt'), 'block'); assert.equal(modeOf('容量 ÷ ラインサイズ'), 'compact'); assert.equal(modeOf('1/√2'), 'text');
  assert.ok(formulaHtml('V = Q/C').startsWith('<span class="math-block"><math'));
  assert.ok(formulaHtml('容量 ÷ ラインサイズ').startsWith('<span class="math-inline math-frac"><math xmlns="http://www.w3.org/1998/Math/MathML"><semantics><mstyle displaystyle="true"><mfrac>'));
  // 文中の短い式は、行の高さを乱さないよう割り算を斜線のままにする
  const t = formulaHtml('1/(2π√(LC))');
  assert.ok(t.startsWith('<span class="math-inline"><math') && !t.includes('<mfrac>') && t.includes('<msqrt>'));
});

test('本文から式を探す: 式の途中や、もっと長い式の一部には印を付けない', () => {
  const mark = makeMarker({ 'V = Q/C': {}, '2π√(LC)': {}, '容量 ÷ ラインサイズ': {}, '480 ÷ 500 = 0.96(96%)': {}, 'ω = 1/T': {} });
  const m = s => mark(s, k => `[${k}]`);
  assert.equal(m('電圧は V = Q/C です'), '電圧は [V = Q/C] です');
  assert.equal(m('V = Q/C1 + Q/C2'), 'V = Q/C1 + Q/C2'); // 後ろに続く
  assert.equal(m('ΔV = Q/C'), 'ΔV = Q/C'); // 前に続く
  assert.equal(m('f = 1/(2π√(LC)) × 2'), 'f = 1/(2π√(LC)) × 2'); // 長い式の中
  assert.equal(m('周期は 2π√(LC) です'), '周期は [2π√(LC)] です');
  assert.equal(m('総容量 ÷ ラインサイズ'), '総容量 ÷ ラインサイズ'); // 語の途中から始まる
  assert.equal(m('容量 ÷ ラインサイズ×ウェイ数'), '容量 ÷ ラインサイズ×ウェイ数');
  assert.equal(m('480 ÷ 500 = 0.96(96%)になる'), '[480 ÷ 500 = 0.96(96%)]になる');
  assert.equal(m('ω = 1/T(T は時定数)'), '[ω = 1/T](T は時定数)'); // 説明のカッコ
  assert.equal(m('ω = 1/T(s + 1)'), 'ω = 1/T(s + 1)'); // 掛け算のカッコ
});
