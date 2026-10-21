// 擬似言語の実行ツール。プログラムを実行して出力を表示し、1行ずつ実行した行と変数の値をたどる(処理系は pseudo-core.js)
import { run, PseudoError } from './pseudo-core.js';
const form = document.getElementById('ps-form');
let T = {};
try { T = JSON.parse(form.dataset.text); } catch {}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const editor = form.elements.code;
const listing = document.getElementById('ps-listing');
const stepInput = document.getElementById('ps-step');
let R = null;

function message(e) {
  const [k, arg] = e.message.split(':');
  return (T.err[k] ?? T.err.syntax).replace('{x}', arg ?? '').replace('{n}', e.line);
}
function showStep() {
  const k = Number(stepInput.value);
  const st = R?.steps[k - 1];
  const lines = editor.value.split('\n');
  listing.innerHTML = lines.map((l, i) => `<div class="ps-line${st && st.ln === i + 1 ? ' cur' : ''}"><span class="ps-ln">${i + 1}</span><code>${esc(l) || ' '}</code></div>`).join('');
  const cur = listing.querySelector('.cur');
  if (cur) cur.scrollIntoView({ block: 'nearest' });
  document.getElementById('ps-pos').textContent = R ? T.pos.replace('{k}', k).replace('{n}', R.steps.length) : '';
  const vars = document.getElementById('ps-vars');
  // 前の行から値が変わった変数を強調する(同じ関数の中だけ比べる)
  const prev = R?.steps[k - 2];
  const before = prev && st && prev.depth === st.depth ? new Map(prev.vars) : null;
  const changed = (n, v) => before !== null && before.get(n) !== v;
  if (!st) { vars.innerHTML = ''; document.getElementById('ps-note').textContent = ''; return; }
  const note = st.note ?? '';
  const [nk, nv] = [note.split(':')[0], note.slice(note.indexOf(':') + 1)];
  document.getElementById('ps-note').textContent = `${T.line.replace('{n}', st.ln)}${st.fn ? ` ${T.in_fn.replace('{f}', st.fn).replace('{d}', st.depth)}` : ''}${nk === 'cond' ? ` ${T.cond.replace('{v}', nv)}` : nk === 'ret' ? ` ${T.ret.replace('{v}', nv)}` : nk === 'out' ? ` ${T.out.replace('{v}', nv)}` : nk === 'call' ? ` ${T.call.replace('{v}', nv)}` : ''}`;
  vars.innerHTML = st.vars.length ? `<table class="sp-pairs"><thead><tr><th>${esc(T.col_var)}</th><th>${esc(T.col_val)}</th></tr></thead><tbody>${st.vars.map(([n, v]) => `<tr${changed(n, v) ? ' class="chg"' : ''}><td>${esc(n)}</td><td class="mono">${esc(v)}</td></tr>`).join('')}</tbody></table>` : `<p class="muted">${esc(T.no_vars)}</p>`;
}
function execute() {
  const err = document.getElementById('ps-error');
  const outBox = document.getElementById('ps-output');
  try {
    R = run(editor.value);
    err.hidden = true;
    outBox.textContent = R.output.length ? R.output.join('\n') : T.no_output;
    document.getElementById('ps-calls').textContent = R.calls ? T.calls.replace('{n}', R.calls) : '';
  } catch (e) {
    R = null;
    err.textContent = e instanceof PseudoError ? message(e) : `${T.err.syntax.replace('{n}', '?')}`;
    err.hidden = false;
    outBox.textContent = '';
    document.getElementById('ps-calls').textContent = '';
  }
  stepInput.max = String(R ? R.steps.length : 0);
  stepInput.value = '0';
  showStep();
}
document.getElementById('ps-run').addEventListener('click', execute);
document.getElementById('ps-prev').addEventListener('click', () => { stepInput.value = String(Math.max(0, Number(stepInput.value) - 1)); showStep(); });
document.getElementById('ps-next').addEventListener('click', () => { stepInput.value = String(Math.min(Number(stepInput.max), Number(stepInput.value) + 1)); showStep(); });
document.getElementById('ps-end').addEventListener('click', () => { stepInput.value = stepInput.max; showStep(); });
stepInput.addEventListener('input', showStep);
editor.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); execute(); }
  // Tab で字下げ(2文字)
  if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); const p = editor.selectionStart; editor.setRangeText('  ', p, editor.selectionEnd, 'end'); }
});
editor.addEventListener('input', () => { R = null; stepInput.max = '0'; stepInput.value = '0'; showStep(); });
form.elements.example.addEventListener('change', () => {
  const ex = T.examples[Number(form.elements.example.value)];
  if (!ex) return;
  editor.value = ex.code;
  execute();
});
form.addEventListener('submit', e => e.preventDefault());
form.elements.example.value = '0';
form.elements.example.dispatchEvent(new Event('change'));
