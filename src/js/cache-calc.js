// キャッシュのアドレス分割と平均メモリアクセス時間(AMAT)の計算ページ
const form = document.getElementById('cc-form');
const lang = document.documentElement.lang || 'en';
const fmt = (x, d = 2) => (Number.isFinite(x) ? x.toLocaleString(lang, { maximumFractionDigits: d }) : '–');
const out = k => document.querySelector(`[data-out="${k}"]`);
const pow2 = v => v > 0 && Number.isInteger(Math.log2(v));
const bar = document.getElementById('cc-bar');

function update() {
  const num = (k, min = 0) => { const v = Number(form.elements[k].value); return Number.isFinite(v) && v >= min ? v : Number(form.elements[k].defaultValue); };
  const abits = Math.round(num('abits', 8)), size = num('size', 1) * 1024, line = num('line', 1), ways = num('ways', 1);
  const lines = size / line, sets = lines / ways;
  const ok = pow2(size) && pow2(line) && pow2(ways) && Number.isInteger(sets) && sets >= 1;
  const off = Math.log2(line), idx = ok ? Math.log2(sets) : NaN, tag = abits - off - idx;
  out('lines').textContent = ok ? fmt(lines, 0) : '–';
  out('sets').textContent = ok ? fmt(sets, 0) : '–';
  out('offset').textContent = ok ? `${off} bit` : '–';
  out('index').textContent = ok ? `${idx} bit` : '–';
  out('tag').textContent = ok && tag >= 0 ? `${tag} bit` : '–';
  document.getElementById('cc-warn').hidden = ok && tag >= 0;
  if (ok && tag >= 0) {
    const seg = (cls, n, name) => (n > 0 ? `<span class="cc-seg ${cls}" style="flex:${n}">${name} ${n}</span>` : '');
    bar.innerHTML = seg('t', tag, bar.dataset.tag) + seg('i', idx, bar.dataset.index) + seg('o', off, bar.dataset.offset);
  } else bar.innerHTML = '';
  const amat = num('hit') + (num('miss') / 100) * num('penalty');
  out('amat').textContent = `${fmt(amat)} ${bar.dataset.cycles}`;
}
form.addEventListener('input', update);
form.addEventListener('submit', e => e.preventDefault());
update();

// グラフで見る: ミス率やミスペナルティを変えたときの平均メモリアクセス時間など
import { initSweep } from './sweep.js';
initSweep({
  form, inputs: ['miss', 'penalty', 'hit', 'size', 'line', 'ways'], outputs: ['amat', 'tag', 'index', 'sets'], defaults: { x: 'miss', y: 'amat' }, ranges: { miss: [0, 20] },
  calc: v => {
    const size = v.size * 1024, lines = size / v.line, sets = lines / v.ways;
    const ok = pow2(size) && pow2(v.line) && pow2(v.ways) && Number.isInteger(sets) && sets >= 1;
    const idx = ok ? Math.log2(sets) : NaN;
    return { amat: v.hit + (v.miss / 100) * v.penalty, sets: ok ? sets : NaN, index: idx, tag: ok ? v.abits - Math.log2(v.line) - idx : NaN };
  },
});
