// 数式と単位の整形(src/js/mathify.js)。添字にする記号・しない語、行を切らないスペース、HTML のタグの中を触らないこと
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mathText, mathifyHtml } from '../../src/js/mathify.js';

const NB = ' ';
const show = s => s.replaceAll('', '_{').replaceAll('', '}').replaceAll(NB, '~');
const T = (s, ctx) => show(mathText(s, ctx));

test('添字: デバイスの式(運営者の指摘の文)', () => {
  assert.equal(T('gm は、gm = μnCox(W/L)(VGS − Vth) = 2ID/(VGS − Vth) です。'),
    'g_{m} は、g_{m} =~μ_{n}C_{ox}(W/L)(V_{GS}~−~V_{th}) =~2I_{D}/(V_{GS}~−~V_{th}) です。');
  assert.equal(T('Vth = 0.5 V、μnCox = 200 µA/V²、W/L = 10、λ = 0.05 /V、VGS = 1.5 V、VDS = 1.2 V では、ID ≈ 1.06 mA、gm ≈ 2.1 mS、ro ≈ 19 kΩ で、gm·ro は約40です。'),
    'V_{th}~=~0.5~V、μ_{n}C_{ox}~=~200~µA/V²、W/L~=~10、λ~=~0.05~/V、V_{GS}~=~1.5~V、V_{DS}~=~1.2~V では、I_{D}~≈~1.06~mA、g_{m}~≈~2.1~mS、r_{o}~≈~19~kΩ で、g_{m}·r_{o} は約40です。');
  assert.equal(T('Vth = VFB + 2φF + √(2qεsNA(2φF + VSB))/Cox'), 'V_{th} =~V_{FB}~+~2φ_{F}~+~√(2qε_{s}N_{A}(2φ_{F}~+~V_{SB}))/C_{ox}');
  assert.equal(T('IC = βIB、VBE ≈ 0.7 V'), 'I_{C} =~βI_{B}、V_{BE}~≈~0.7~V');
  assert.equal(T('Vth = VFB + 2φF + |Qd|/Cox、固定電荷 Qf/q'), 'V_{th} =~V_{FB}~+~2φ_{F}~+~|Q_{d}|/C_{ox}、固定電荷 Q_{f}/q');
  // 同じ文の中の記号は、式の外でもそろえて添字にする
  assert.equal(T('境界線はVDSとIDの絶対最大定格'), '境界線はV_{DS}とI_{D}の絶対最大定格');
  assert.equal(T('IC–VCE特性と動作点(IC・gm・ro・真性利得)'), 'I_{C}–V_{CE}特性と動作点(I_{C}・g_{m}・r_{o}・真性利得)');
  assert.equal(T('ro = VA/IC, VT ≈ 25.9 mV, Eg(T) = Eg(0) − αT²', 'gm cm⁻³'), 'r_{o} =~V_{A}/I_{C}, V_{T}~≈~25.9~mV, E_{g}(T) =~E_{g}(0)~−~αT²');
  assert.equal(T('Vout = Vin·R2/(R1 + R2)', 'VDD から Vout = Vin·R2/(R1 + R2)'), 'Vout =~Vin·R_{2}/(R_{1}~+~R_{2})');
});

test('添字にしない: ほかの意味の語', () => {
  // IC(集積回路)、ID(識別子)、NA(開口数)は、式の中でも文脈が違えば変えない
  assert.equal(T('このICのVthは0.5 Vです。'), 'このICのV_{th}は0.5~Vです。');
  assert.equal(T('プロセスID = 1234 のとき'), 'プロセスID~=~1234 のとき');
  assert.equal(T('開口数 NA = 0.33 の EUV 露光では、解像度は k1·λ/NA です。'), '開口数 NA~=~0.33 の EUV 露光では、解像度は k1·λ/NA です。');
  assert.equal(T('NA = 1.35 (numerical aperture) and cm⁻³'), 'NA~=~1.35 (numerical aperture) and cm⁻³');
  assert.equal(T('RC回路の時定数は τ = RC です。'), 'RC回路の時定数は τ~=~RC です。'.replace('τ~=~RC', 'τ =~RC'));
  assert.equal(T('CPU and GPU, Vintage, Input, gmail, Coxswain'), 'CPU and GPU, Vintage, Input, gmail, Coxswain');
  assert.equal(T('E.g. the IC is small.'), 'E.g. the IC is small.');
  assert.equal(T('バイポーラIC・LSIではVBEを使う'), 'バイポーラIC・LSIではV_{BE}を使う');
  assert.equal(T('ユーザーIDとVGS'), 'ユーザーIDとV_{GS}');
});

test('単位: 数値との間で行を切らない', () => {
  assert.equal(T('幅は 5 nm、電圧は 1.2 V、温度は 125 ℃、抵抗は 4.7 kΩ です。'), '幅は 5~nm、電圧は 1.2~V、温度は 125~℃、抵抗は 4.7~kΩ です。');
  assert.equal(T('about 100 mV per 60 mV/decade, 10 to 20 times, in 2012 Sony'), 'about 100~mV per 60~mV/decade, 10 to 20 times, in 2012 Sony');
  assert.equal(T('1.0×10¹⁰ cm⁻³ と 0.05 /V'), '1.0×10¹⁰~cm⁻³ と 0.05~/V');
});

test('HTML: タグ・属性・script・pre・入力欄の中は変えない', () => {
  const html = '<p class="x" title="VGS = 1 V">VGS = 1 V <a href="/term/vgs/">Vth</a></p><script>var VGS = 1 V;</script><pre>VGS = 1 V</pre><select><option>VGS (V)</option></select><p>IC は部品です。</p>';
  const out = mathifyHtml(html);
  assert.equal(out, `<p class="x" title="VGS = 1 V">V<sub>GS</sub>${NB}=${NB}1${NB}V <a href="/term/vgs/">V<sub>th</sub></a></p><script>var VGS = 1 V;</script><pre>VGS = 1 V</pre><select><option>VGS (V)</option></select><p>IC は部品です。</p>`);
  // 文脈は段落ごと: 別の段落にデバイスの記号があっても、この段落の ID は変えない
  assert.equal(mathifyHtml('<p>VGS = 1 V</p><p>ユーザーID = 5</p>'), `<p>V<sub>GS</sub>${NB}=${NB}1${NB}V</p><p>ユーザーID${NB}=${NB}5</p>`);
  assert.equal(mathifyHtml('<p>変更なし</p>'), '<p>変更なし</p>');
});
