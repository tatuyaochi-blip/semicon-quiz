// キャッシュのアドレス分割と平均メモリアクセス時間(AMAT)の計算ページ
import { initSweep } from './sweep.js';
const pow2 = v => v > 0 && Number.isInteger(Math.log2(v));
// アドレス abits ビット、容量 sizeKB KiB、ラインのバイト数、ウェイ数から、ライン数・セット数とタグ・インデックス・オフセットのビット数
export function split(abits, sizeKB, line, ways) {
  const size = sizeKB * 1024, lines = size / line, sets = lines / ways;
  const ok = pow2(size) && pow2(line) && pow2(ways) && Number.isInteger(sets) && sets >= 1;
  if (!ok) return null;
  const off = Math.log2(line), idx = Math.log2(sets);
  return { lines, sets, off, idx, tag: abits - off - idx };
}
// 平均メモリアクセス時間 = ヒット時間 + ミス率(%) × ミスペナルティ
export const amat = (hit, missPct, penalty) => hit + (missPct / 100) * penalty;
const form = globalThis.document?.getElementById('cc-form');
if (form) {
const lang = document.documentElement.lang || 'en';
const fmt = (x, d = 2) => (Number.isFinite(x) ? x.toLocaleString(lang, { maximumFractionDigits: d }) : '–');
const out = k => document.querySelector(`[data-out="${k}"]`);
const bar = document.getElementById('cc-bar');

function update() {
  const num = (k, min = 0) => { const v = Number(form.elements[k].value); return Number.isFinite(v) && v >= min ? v : Number(form.elements[k].defaultValue); };
  const abits = Math.round(num('abits', 8)), size = num('size', 1) * 1024, line = num('line', 1), ways = num('ways', 1);
  const r = split(abits, size / 1024, line, ways), ok = !!r;
  const { lines, sets, off, idx, tag } = r ?? { tag: NaN };
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
  out('amat').textContent = `${fmt(amat(num('hit'), num('miss'), num('penalty')))} ${bar.dataset.cycles}`;
}
form.addEventListener('input', update);
form.addEventListener('submit', e => e.preventDefault());
update();

// グラフで見る: ミス率やミスペナルティを変えたときの平均メモリアクセス時間など
initSweep({
  form, inputs: ['miss', 'penalty', 'hit', 'size', 'line', 'ways'], outputs: ['amat', 'tag', 'index', 'sets'], defaults: { x: 'miss', y: 'amat' }, ranges: { miss: [0, 20] },
  calc: v => {
    const r = split(v.abits, v.size, v.line, v.ways);
    return { amat: amat(v.hit, v.miss, v.penalty), sets: r ? r.sets : NaN, index: r ? r.idx : NaN, tag: r && r.tag >= 0 ? r.tag : NaN };
  },
});
}
