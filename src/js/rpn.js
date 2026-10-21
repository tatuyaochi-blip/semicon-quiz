// 逆ポーランド記法の変換ツール。中置記法 ⇄ 後置記法を変換し、操車場アルゴリズムのスタックの動き、構文木、
// スタックを使った計算の途中を表示する(計算は rpn-core.js)
import { tokenize, toPostfix, treeFromPostfix, postfixOf, prefixOf, infixOf, evaluate } from './rpn-core.js';
const form = document.getElementById('rpn-form');
const out = k => document.querySelector(`[data-out="${k}"]`);
let T = {};
try { T = JSON.parse(form.dataset.text); } catch {}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const show = v => String(v).replace(/\*/g, '×').replace(/\//g, '÷').replace(/-/g, '−');
const num = v => (Number.isFinite(v) ? String(Number(v.toPrecision(10))).replace('-', '−') : String(v));
const varBox = document.getElementById('rpn-vars');
const values = {};

// 構文木の図: 葉を左から順に並べ、節は子の真ん中に置く
function drawTree(tree) {
  const svg = document.getElementById('rpn-tree');
  let leaf = 0, depth = 0;
  const place = (n, d) => {
    depth = Math.max(depth, d);
    if (!n.op) return { ...n, x: leaf++, d };
    const l = place(n.l, d + 1), r = place(n.r, d + 1);
    return { ...n, l, r, x: (l.x + r.x) / 2, d };
  };
  const root = place(tree, 0);
  const W = 46, H = 56, R = 16;
  let g = '';
  const walk = n => {
    const cx = n.x * W + W / 2, cy = n.d * H + R + 6;
    if (n.op) for (const c of [n.l, n.r]) { g += `<line x1="${cx}" y1="${cy}" x2="${c.x * W + W / 2}" y2="${c.d * H + R + 6}"></line>`; walk(c); }
    g += `<g class="${n.op ? 'op' : 'leaf'}"><circle cx="${cx}" cy="${cy}" r="${R}"></circle><text x="${cx}" y="${cy + 5}">${esc(show(n.op ?? n.v))}</text></g>`;
  };
  walk(root);
  svg.setAttribute('viewBox', `0 0 ${Math.max(leaf * W, W)} ${(depth + 1) * H + 4}`);
  svg.style.maxWidth = `${Math.max(leaf * W, W) * 1.3}px`;
  svg.innerHTML = g;
}
// 変数の値の入力欄(式に出てくる変数の分だけ)
function syncVars(names) {
  const have = [...varBox.querySelectorAll('input')].map(i => i.name.slice(4));
  if (have.join() === names.join()) return;
  for (const i of varBox.querySelectorAll('input')) values[i.name.slice(4)] = i.value;
  varBox.innerHTML = names.map(n => `<label class="dy-field rpn-var"><span>${esc(n)}</span><input name="var_${esc(n)}" type="number" inputmode="decimal" step="any" value="${esc(values[n] ?? '')}"></label>`).join('');
  varBox.hidden = !names.length;
  document.getElementById('rpn-vars-hint').hidden = !names.length;
}
function fail(msg) {
  const el = document.getElementById('rpn-error');
  el.textContent = msg; el.hidden = false;
  for (const k of ['postfix', 'prefix', 'infix', 'value']) out(k).textContent = '–';
  document.getElementById('rpn-steps').innerHTML = '';
  document.getElementById('rpn-eval').innerHTML = '';
  document.getElementById('rpn-tree').innerHTML = '';
}
function update() {
  const mode = form.elements.mode.value;
  const tk = tokenize(form.elements.expr.value);
  document.getElementById('rpn-error').hidden = true;
  if (tk.error) return fail(T.err.char);
  const names = [...new Set(tk.tokens.filter(t => t.t === 'var').map(t => t.v))].slice(0, 12);
  syncVars(names);
  let postfix, steps = null;
  if (mode === 'infix') {
    const r = toPostfix(tk.tokens);
    if (r.error) return fail(T.err[r.error].replace('{t}', show(r.tok ?? '')));
    postfix = r.postfix; steps = r.steps;
  } else postfix = tk.tokens;
  const tr = treeFromPostfix(postfix);
  if (tr.error) return fail(T.err[tr.error].replace('{t}', show(tr.tok ?? '')));
  out('postfix').textContent = show(postfixOf(tr.tree).join(' '));
  out('prefix').textContent = show(prefixOf(tr.tree).join(' '));
  out('infix').textContent = show(infixOf(tr.tree));
  drawTree(tr.tree);
  // 操車場アルゴリズムの途中(中置記法から変換するときだけ)
  const box = document.getElementById('rpn-steps');
  document.getElementById('rpn-steps-h').hidden = !steps;
  box.innerHTML = steps ? `<table class="sp-pairs rpn-table"><thead><tr><th>${esc(T.col_token)}</th><th>${esc(T.col_action)}</th><th>${esc(T.col_stack)}</th><th>${esc(T.col_output)}</th></tr></thead><tbody>${
    steps.map(s => {
      const a = s.action;
      const act = a === 'output' ? T.act_output : a === 'push' ? T.act_push : a.end ? T.act_end.replace('{p}', show(a.pop.join(' '))) : a.paren ? (a.pop.length ? T.act_paren_pop.replace('{p}', show(a.pop.join(' '))) : T.act_paren) : T.act_pop_push.replace('{p}', show(a.pop.join(' ')));
      return `<tr><td>${esc(show(s.tok))}</td><td>${esc(act)}</td><td class="mono">${esc(show(s.stack.join(' ')))}</td><td class="mono">${esc(show(s.out.join(' ')))}</td></tr>`;
    }).join('')}</tbody></table>` : '';
  // 計算
  const vars = {};
  for (const n of names) { const v = form.elements[`var_${n}`]?.value; if (v !== '' && v != null) vars[n] = Number(v); }
  const ev = evaluate(postfixOf(tr.tree).map(v => ({ t: /^[A-Za-z_]/.test(v) ? 'var' : /^[\d.]+$/.test(v) ? 'num' : 'op', v })), vars);
  const ebox = document.getElementById('rpn-eval');
  if (ev.missing) { out('value').textContent = '–'; ebox.innerHTML = `<p class="muted">${esc(T.need_values)}</p>`; return; }
  out('value').textContent = num(ev.value);
  ebox.innerHTML = `<table class="sp-pairs rpn-table"><thead><tr><th>${esc(T.col_token)}</th><th>${esc(T.col_calc)}</th><th>${esc(T.col_stack_after)}</th></tr></thead><tbody>${
    ev.steps.map(s => `<tr><td>${esc(show(s.tok))}</td><td>${s.v === undefined ? esc(T.act_pushval) : `${esc(num(s.a))} ${esc(show(s.tok))} ${esc(num(s.b))} = ${esc(num(s.v))}`}</td><td class="mono">${esc(s.stack.map(num).join(' '))}</td></tr>`).join('')}</tbody></table>`;
}
form.addEventListener('input', e => {
  if (e.target.name === 'example') return;
  update();
});
form.elements.example.addEventListener('change', () => {
  const [mode, expr] = form.elements.example.value.split('|');
  if (!expr) return;
  form.elements.mode.value = mode;
  form.elements.expr.value = expr;
  update();
});
form.addEventListener('submit', e => e.preventDefault());
update();
