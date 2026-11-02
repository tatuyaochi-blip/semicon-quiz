// リソグラフィの解像度・焦点深度の計算ページ。R = k1·λ/NA、DOF = k2·λ/NA²
import { initSweep } from './sweep.js';
const form = document.getElementById('litho-form');
const lang = document.documentElement.lang || 'en';
const fmt = (x, d = 1) => (Number.isFinite(x) ? x.toLocaleString(lang, { minimumFractionDigits: d, maximumFractionDigits: d }) : '–');
const out = k => document.querySelector(`[data-out="${k}"]`);
// 代表的な露光装置(波長と、その世代でよく使われる最大級のNA)
const PRESETS = [['g-line', 436, 0.54], ['i-line', 365, 0.65], ['KrF', 248, 0.93], ['ArF (dry)', 193, 0.93], ['ArF immersion', 193, 1.35], ['EUV', 13.5, 0.33], ['High-NA EUV', 13.5, 0.55]];

// ハーフピッチ hp・焦点深度 dof (nm) と、目標ピッチを描くのに必要な露光の回数 passes
export function calc({ lambda, na, k1, k2, pitch }) {
  const l = Number(lambda), hp = (k1 * l) / na;
  return { hp, dof: (k2 * l) / na ** 2, passes: Math.max(1, Math.ceil((2 * hp) / pitch - 1e-9)) };
}

function num(name, min) {
  const el = form.elements[name];
  const v = Number(el.value);
  return Number.isFinite(v) && v >= min ? v : Number(el.defaultValue);
}

function update() {
  const k1 = num('k1', 0.01), k2 = num('k2', 0.01);
  const r = calc({ lambda: form.elements.lambda.value, na: num('na', 0.01), k1, k2, pitch: num('pitch', 0.1) });
  out('hp').textContent = `${fmt(r.hp)} nm`;
  out('minpitch').textContent = `${fmt(2 * r.hp)} nm`;
  out('dof').textContent = `${fmt(r.dof, 0)} nm`;
  // 目標のピッチを1回の露光で描けなければ、何回に分けて描く必要があるか(ピッチ分割の数)
  out('passes').textContent = String(r.passes);
  document.querySelector('#litho-table tbody').innerHTML = PRESETS.map(([name, l, n]) =>
    `<tr><th scope="row">${name}</th><td>${l} nm</td><td>${n}</td><td>${fmt((k1 * l) / n)} nm</td><td>${fmt((k2 * l) / n ** 2, 0)} nm</td></tr>`).join('');
}

// 画面がないとき(テストで計算だけを読み込むとき)は、画面の処理をしない
if (form) {
  form.addEventListener('input', update);
  form.addEventListener('submit', e => e.preventDefault());
  update();

  // グラフで見る: NA や k1 を変えたときの解像度・焦点深度
  initSweep({
    form, inputs: ['na', 'k1', 'k2', 'pitch'], outputs: ['hp', 'dof', 'passes'], defaults: { x: 'na', y: 'hp' },
    calc: v => calc(v),
  });
}
