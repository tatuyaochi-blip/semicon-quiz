// ハフマン符号。記号と確率(または出現回数)から、出現しやすい記号ほど短い符号を割り当てる。
// 確率の最も小さい2つをまとめて1つの節にすることを、節が1つになるまでくり返す。まとめるときは小さい方に 0、もう一方に 1 を付ける
// 同じ確率の節が複数あるときは、先に作られた(入力で先の)ものを先に取り出す。この選び方で符号の形は変わるが、平均符号長は変わらない
// エントロピー H = −Σ p log2 p、平均符号長 L = Σ p × 符号長、効率 = H ÷ L、固定長で表すビット数 = ⌈log2 記号の数⌉
export function parseSymbols(text) {
  const rows = [];
  const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);
  for (const [k, l] of lines.entries()) {
    const m = l.match(/^(\S{1,12})[\s,:]+(\d+(?:\.\d+)?)$/);
    if (!m || !(Number(m[2]) > 0)) return { error: k + 1 };
    if (rows.some(r => r.sym === m[1])) return { error: k + 1, dup: m[1] };
    rows.push({ sym: m[1], w: Number(m[2]) });
  }
  return rows.length >= 2 ? { rows } : { error: 'few' };
}
// 文章の文字の出現回数を数える(空白も1つの記号「␣」として数える)
export function countText(text) {
  const cnt = new Map();
  for (const ch of [...text.replace(/\r?\n/g, '')]) {
    const s = ch === ' ' ? '␣' : ch;
    cnt.set(s, (cnt.get(s) || 0) + 1);
  }
  return [...cnt].map(([sym, w]) => ({ sym, w })).sort((a, b) => b.w - a.w);
}

export function huffman(rows) {
  const total = rows.reduce((s, r) => s + r.w, 0);
  let seq = 0;
  let nodes = rows.map((r, i) => ({ w: r.w, sym: r.sym, i, seq: seq++ }));
  const pick = () => {
    nodes.sort((a, b) => a.w - b.w || a.seq - b.seq);
    return nodes.shift();
  };
  const merges = [];
  while (nodes.length > 1) {
    const a = pick(), b = pick();
    const n = { w: a.w + b.w, l: a, r: b, seq: seq++ };
    merges.push([a.w / total, b.w / total, n.w / total]);
    nodes.push(n);
  }
  const code = new Array(rows.length);
  (function walk(n, c) {
    if (n.sym !== undefined) { code[n.i] = c || '0'; return; }
    walk(n.l, c + '0'); walk(n.r, c + '1');
  })(nodes[0], '');
  const out = rows.map((r, i) => ({ ...r, p: r.w / total, code: code[i], len: code[i].length }));
  const H = -out.reduce((s, r) => s + r.p * Math.log2(r.p), 0);
  const L = out.reduce((s, r) => s + r.p * r.len, 0);
  const fixed = Math.ceil(Math.log2(rows.length));
  const kraft = out.reduce((s, r) => s + 2 ** -r.len, 0);
  return { rows: out, H, L, eff: L > 0 ? H / L : NaN, fixed, kraft, merges, total };
}

const form = globalThis.document?.getElementById('hf-form');
if (form) {
  let T = {};
  try { T = JSON.parse(form.dataset.text); } catch {}
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const out = k => document.querySelector(`[data-out="${k}"]`);
  const f = (v, d = 3) => String(Number(v.toFixed(d)));
  const err = document.getElementById('hf-error');
  function render(rows, isCount) {
    const r = huffman(rows);
    out('H').textContent = `${f(r.H)} ${T.bits}`;
    out('L').textContent = `${f(r.L)} ${T.bits}`;
    out('eff').textContent = `${f(r.eff * 100, 1)}%`;
    out('fixed').textContent = `${r.fixed} ${T.bits}`;
    out('ratio').textContent = `${f((r.L / r.fixed) * 100, 1)}%`;
    out('total').textContent = isCount ? `${f(r.L * r.total, 0)} ${T.bits}${T.vs_fixed.replace('{n}', r.fixed * r.total)}` : '–';
    document.getElementById('hf-table').innerHTML = `<table class="data-table hf-table"><thead><tr><th>${esc(T.col_sym)}</th><th>${esc(isCount ? T.col_count : T.col_p)}</th><th>${esc(T.col_code)}</th><th>${esc(T.col_len)}</th></tr></thead><tbody>`
      + r.rows.map(x => `<tr><td>${esc(x.sym)}</td><td>${isCount ? x.w : f(x.p, 4)}</td><td><code>${x.code}</code></td><td>${x.len}</td></tr>`).join('') + '</tbody></table>';
    document.getElementById('hf-steps').innerHTML = r.merges.map((m, i) => `<li>${esc(T.step.replace('{i}', i + 1).replace('{a}', f(m[0], 4)).replace('{b}', f(m[1], 4)).replace('{c}', f(m[2], 4)))}</li>`).join('');
  }
  function update() {
    const mode = form.elements.mode.value;
    form.classList.toggle('hf-text-mode', mode === 'text');
    if (mode === 'text') {
      const rows = countText(form.elements.text.value);
      if (rows.length < 2) { err.textContent = T.few; err.hidden = false; return; }
      err.hidden = true; render(rows, true); return;
    }
    const p = parseSymbols(form.elements.symbols.value);
    if (p.error) { err.textContent = p.error === 'few' ? T.few : p.dup ? T.dup.replace('{s}', p.dup) : T.bad_line.replace('{n}', p.error); err.hidden = false; return; }
    err.hidden = true; render(p.rows, false);
  }
  form.addEventListener('input', e => { if (e.target.name !== 'example') update(); });
  form.elements.example.addEventListener('change', () => {
    const ex = T.examples[Number(form.elements.example.value)];
    if (!ex) return;
    form.elements.mode.value = ex.text !== undefined ? 'text' : 'symbols';
    if (ex.text !== undefined) form.elements.text.value = ex.text; else form.elements.symbols.value = ex.symbols;
    update();
  });
  form.addEventListener('submit', e => e.preventDefault());
  form.elements.example.value = '0';
  form.elements.example.dispatchEvent(new Event('change'));
}
