// ページ置換のツール。参照列をページ枠に読み込む様子を、参照ごとの枠の中身とページフォルトの表で示し、
// アルゴリズムと枠の数ごとのページフォルトの回数を比べる(計算は paging-core.js)
import { simulate, parseRefs, ALGOS } from './paging-core.js';
const form = document.getElementById('pg-form');
const out = k => document.querySelector(`[data-out="${k}"]`);
let T = {};
try { T = JSON.parse(form.dataset.text); } catch {}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const MAXF = 8;

function update() {
  const refs = parseRefs(form.elements.refs.value);
  const n = Math.round(Number(form.elements.frames.value));
  const algo = form.elements.algo.value;
  const ok = refs && refs.length > 0 && refs.length <= 60 && n >= 1 && n <= MAXF;
  document.getElementById('pg-error').hidden = ok;
  const grid = document.getElementById('pg-grid'), cmp = document.getElementById('pg-cmp');
  if (!ok) { for (const k of ['faults', 'hits', 'rate']) out(k).textContent = '–'; grid.innerHTML = ''; cmp.innerHTML = ''; return; }
  const r = simulate(refs, n, algo);
  out('faults').textContent = String(r.faults);
  out('hits').textContent = String(r.hits);
  out('rate').textContent = `${Number((r.hits / refs.length * 100).toFixed(1))}%`;
  // 参照ごとの表: 列が時刻、行が枠。読み込んだ枠を強調し、最後の行にページフォルトの印
  const clock = algo === 'clock';
  const head = `<tr><th>${esc(T.row_ref)}</th>${r.steps.map(s => `<th>${esc(s.p)}</th>`).join('')}</tr>`;
  const rows = Array.from({ length: n }, (_, i) => `<tr><th>${esc(T.row_frame.replace('{i}', i + 1))}</th>${r.steps.map(s => {
    const v = s.frames[i];
    const cls = [!s.hit && s.slot === i ? 'in' : '', s.hit && s.slot === i ? 'hit' : ''].filter(Boolean).join(' ');
    return `<td${cls ? ` class="${cls}"` : ''}>${v === null ? '' : esc(v)}${clock && v !== null ? `<sup>${s.bits[i]}</sup>` : ''}</td>`;
  }).join('')}</tr>`).join('');
  const fault = `<tr class="pg-fault"><th>${esc(T.row_fault)}</th>${r.steps.map(s => `<td>${s.hit ? '' : '×'}</td>`).join('')}</tr>`;
  const victim = `<tr class="pg-victim"><th>${esc(T.row_victim)}</th>${r.steps.map(s => `<td>${s.victim === null ? '' : esc(s.victim)}</td>`).join('')}</tr>`;
  grid.innerHTML = `<table class="pg-table">${head}${rows}${fault}${victim}</table>`;
  // 比較: アルゴリズム × 枠の数
  const counts = ALGOS.map(a => Array.from({ length: MAXF }, (_, k) => simulate(refs, k + 1, a).faults));
  const belady = counts[0].some((f, k) => k > 0 && f > counts[0][k - 1]);
  cmp.innerHTML = `<table class="sp-pairs pg-cmp"><thead><tr><th>${esc(T.col_algo)}</th>${counts[0].map((_, k) => `<th>${k + 1}</th>`).join('')}</tr></thead><tbody>${
    ALGOS.map((a, j) => `<tr${a === algo ? ' class="cur"' : ''}><td>${esc(T.algos[a])}</td>${counts[j].map((f, k) => `<td${k + 1 === n ? ' class="sel"' : ''}${a === 'fifo' && k > 0 && f > counts[j][k - 1] ? ' data-up' : ''}>${f}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  document.getElementById('pg-belady').hidden = !belady;
}
form.addEventListener('input', e => { if (e.target.name !== 'example') update(); });
form.elements.example.addEventListener('change', () => {
  const [refs, frames] = form.elements.example.value.split('|');
  if (!refs) return;
  form.elements.refs.value = refs;
  form.elements.frames.value = frames;
  update();
});
form.addEventListener('submit', e => e.preventDefault());
update();
