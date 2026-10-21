// 合成抵抗・合成容量・合成インダクタンス。抵抗とコイルは直列で足し算、並列で逆数の和の逆数。コンデンサはその逆。
// 目標値には、E24 系列の2本を直列か並列にした組み合わせから近いものを5つ探す
import { si, num, E24 } from './eng.js';
const form = document.getElementById('sp-form');
const out = k => document.querySelector(`[data-out="${k}"]`);
let T = {};
try { T = JSON.parse(form.dataset.text); } catch {}
const UNIT = { r: 'Ω', c: 'F', l: 'H' };
const UNITS = { r: ['1', '1e3', '1e6'], c: ['1e-12', '1e-9', '1e-6', '1e-3'], l: ['1e-9', '1e-6', '1e-3', '1'] };
const PRE = { '1e-12': 'p', '1e-9': 'n', '1e-6': 'µ', '1e-3': 'm', 1: '', '1e3': 'k', '1e6': 'M' };
// E24 の範囲(抵抗 1 Ω〜10 MΩ、コンデンサ 1 pF〜10 µF、コイル 1 nH〜10 mH)
const RANGE = { r: [0, 6], c: [-12, -6], l: [-9, -3] };
const eList = kind => { const [a, b] = RANGE[kind]; const v = []; for (let e = a; e <= b; e++) for (const m of E24) v.push(Number((m * 10 ** e).toPrecision(3))); v.push(10 ** (b + 1)); return v; };
const ser = (kind, xs) => (kind === 'c' ? 1 / xs.reduce((s, x) => s + 1 / x, 0) : xs.reduce((s, x) => s + x, 0));
const par = (kind, xs) => (kind === 'c' ? xs.reduce((s, x) => s + x, 0) : 1 / xs.reduce((s, x) => s + 1 / x, 0));

// 種類に合わない単位の選択肢は隠し、表示を「kΩ」「nF」などにする
function units() {
  const kind = form.elements.kind.value;
  for (const sel of form.querySelectorAll('select[data-unit]')) {
    for (const o of sel.options) { o.hidden = !UNITS[kind].includes(o.value); o.textContent = PRE[o.value] + UNIT[kind]; }
    if (!UNITS[kind].includes(sel.value)) sel.value = UNITS[kind][kind === 'r' ? 1 : 1];
  }
}
function update() {
  const kind = form.elements.kind.value;
  const xs = [];
  for (let i = 0; i < 8; i++) {
    const v = Number(form.elements[`v${i}`].value);
    if (form.elements[`v${i}`].value !== '' && v > 0) xs.push(v * Number(form.elements[`u${i}`].value));
  }
  out('count').textContent = String(xs.length);
  out('series').textContent = xs.length ? si(ser(kind, xs), UNIT[kind], 4) : T.none;
  out('parallel').textContent = xs.length ? si(par(kind, xs), UNIT[kind], 4) : T.none;
  // 目標値に近い E24 の組み合わせ
  const target = Number(form.elements.t.value) * Number(form.elements.tu.value);
  const box = document.getElementById('sp-pairs');
  if (!(target > 0)) { out('single').textContent = '–'; box.innerHTML = ''; return; }
  const list = eList(kind);
  const err = x => x / target - 1;
  const single = list.reduce((a, b) => (Math.abs(Math.log(b / target)) < Math.abs(Math.log(a / target)) ? b : a));
  out('single').textContent = `${si(single, UNIT[kind])} (${fmtErr(err(single))})`;
  const cands = [];
  for (let i = 0; i < list.length; i++) for (let j = i; j < list.length; j++) {
    const a = list[i], b = list[j];
    cands.push({ how: 's', a, b, x: ser(kind, [a, b]) }, { how: 'p', a, b, x: par(kind, [a, b]) });
  }
  cands.sort((p, q) => Math.abs(err(p.x)) - Math.abs(err(q.x)) || (p.b - p.a) - (q.b - q.a));
  box.innerHTML = cands.slice(0, 5).map(c => `<tr><td>${c.how === 's' ? T.pair_series : T.pair_parallel}</td><td>${si(c.a, UNIT[kind])} + ${si(c.b, UNIT[kind])}</td><td>${si(c.x, UNIT[kind], 4)}</td><td>${fmtErr(err(c.x))}</td></tr>`).join('');
}
const fmtErr = e => `${e >= 0 ? '+' : '−'}${num(Math.abs(e) * 100, 2)}%`;
form.elements.kind.addEventListener('change', () => { units(); update(); });
form.addEventListener('input', update);
form.addEventListener('submit', e => e.preventDefault());
units();
update();
