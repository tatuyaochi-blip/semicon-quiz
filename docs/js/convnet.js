// 畳み込みニューラルネットワーク(CNN)の層ごとの出力サイズ・パラメータ数・積和演算の回数。
// 出力の縦横 = ⌊(入力 + 2 × パディング − カーネル) ÷ ストライド⌋ + 1。
// 畳み込み層のパラメータ = カーネル × カーネル × 入力チャネル × 出力チャネル(+ バイアス 出力チャネル)、積和 = 出力の縦 × 横 × カーネル × カーネル × 入力チャネル × 出力チャネル。
// 全結合層のパラメータ = 入力 × 出力(+ バイアス 出力)。プーリング層にパラメータはない
// 層の書き方(1行に1層): 「conv K S P C」(カーネル K、ストライド S、パディング P、出力チャネル C)、「pool K S」、「fc N」(全結合、出力 N)、「flatten」
export function parseLayers(text) {
  const layers = [];
  const lines = text.split(/\n/).map(l => l.replace(/#.*/, '').trim()).filter(Boolean);
  for (const [k, l] of lines.entries()) {
    const [op, ...a] = l.toLowerCase().split(/[\s,]+/);
    const n = a.map(Number);
    const int = (x, min) => Number.isInteger(x) && x >= min;
    if (op === 'conv' && n.length === 4 && int(n[0], 1) && int(n[1], 1) && int(n[2], 0) && int(n[3], 1)) layers.push({ op, k: n[0], s: n[1], p: n[2], c: n[3] });
    else if (op === 'pool' && n.length === 2 && int(n[0], 1) && int(n[1], 1)) layers.push({ op, k: n[0], s: n[1] });
    else if (op === 'fc' && n.length === 1 && int(n[0], 1)) layers.push({ op, n: n[0] });
    else if (op === 'flatten' && !n.length) layers.push({ op });
    else return { error: k + 1 };
  }
  return { layers };
}

export function run(input, layers, bias = true) {
  let [h, w, c] = input, flat = null;
  const rows = [];
  for (const L of layers) {
    let params = 0, macs = 0;
    if (L.op === 'conv' || L.op === 'pool') {
      if (flat !== null) return { rows, error: 'after-fc' };
      const p = L.op === 'conv' ? L.p : 0;
      const oh = Math.floor((h + 2 * p - L.k) / L.s) + 1, ow = Math.floor((w + 2 * p - L.k) / L.s) + 1;
      if (oh < 1 || ow < 1) return { rows, error: 'too-small', layer: rows.length };
      if (L.op === 'conv') {
        params = L.k * L.k * c * L.c + (bias ? L.c : 0);
        macs = oh * ow * L.k * L.k * c * L.c;
        c = L.c;
      }
      h = oh; w = ow;
      rows.push({ ...L, shape: [h, w, c], params, macs });
    } else if (L.op === 'flatten') {
      flat = flat ?? h * w * c;
      rows.push({ ...L, shape: [flat], params, macs });
    } else {
      const inN = flat ?? h * w * c;
      params = inN * L.n + (bias ? L.n : 0);
      macs = inN * L.n;
      flat = L.n;
      rows.push({ ...L, inN, shape: [flat], params, macs });
    }
  }
  return { rows, params: rows.reduce((s, r) => s + r.params, 0), macs: rows.reduce((s, r) => s + r.macs, 0) };
}

const form = globalThis.document?.getElementById('cn-form');
if (form) {
  let T = {};
  try { T = JSON.parse(form.dataset.text); } catch {}
  const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const big = n => (n >= 1e9 ? `${Number((n / 1e9).toPrecision(3))} G` : n >= 1e6 ? `${Number((n / 1e6).toPrecision(3))} M` : n >= 1e3 ? `${Number((n / 1e3).toPrecision(3))} k` : String(n));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const out = k => document.querySelector(`[data-out="${k}"]`);
  const err = document.getElementById('cn-error');
  function update() {
    const input = ['h', 'w', 'c'].map(k => Number(form.elements[k].value));
    const parsed = parseLayers(form.elements.layers.value);
    const bad = msg => { err.textContent = msg; err.hidden = false; document.getElementById('cn-table').innerHTML = ''; ['params', 'macs', 'out'].forEach(k => { out(k).textContent = '–'; }); };
    if (!input.every(x => Number.isInteger(x) && x >= 1)) return bad(T.bad_input);
    if (parsed.error) return bad(T.bad_line.replace('{n}', parsed.error));
    if (!parsed.layers.length) return bad(T.empty);
    const r = run(input, parsed.layers, form.elements.bias.checked);
    if (r.error) return bad(r.error === 'after-fc' ? T.after_fc : T.too_small.replace('{n}', r.layer + 1));
    err.hidden = true;
    const name = L => (L.op === 'conv' ? `${T.op_conv} ${L.k}×${L.k}, s${L.s}, p${L.p}, ${L.c}ch` : L.op === 'pool' ? `${T.op_pool} ${L.k}×${L.k}, s${L.s}` : L.op === 'fc' ? `${T.op_fc} ${L.inN} → ${L.n}` : T.op_flatten);
    const shape = s => s.join(' × ');
    document.getElementById('cn-table').innerHTML = `<table class="data-table cn-table"><thead><tr><th>#</th><th>${esc(T.col_layer)}</th><th>${esc(T.col_shape)}</th><th>${esc(T.col_params)}</th><th>${esc(T.col_macs)}</th></tr></thead><tbody>`
      + `<tr><td>0</td><td>${esc(T.input)}</td><td>${shape(input)}</td><td>–</td><td>–</td></tr>`
      + r.rows.map((x, i) => `<tr><td>${i + 1}</td><td>${esc(name(x))}</td><td>${shape(x.shape)}</td><td>${fmt(x.params)}</td><td>${fmt(x.macs)}</td></tr>`).join('')
      + '</tbody></table>';
    out('out').textContent = shape(r.rows.at(-1).shape);
    out('params').innerHTML = `${fmt(r.params)}<small class="cn-short">${big(r.params)}</small>`;
    out('macs').innerHTML = `${fmt(r.macs)}<small class="cn-short">${big(r.macs)}</small>`;
  }
  form.addEventListener('input', e => { if (e.target.name !== 'example') update(); });
  form.elements.example.addEventListener('change', () => {
    const ex = T.examples[Number(form.elements.example.value)];
    if (!ex) return;
    [form.elements.h.value, form.elements.w.value, form.elements.c.value] = ex.input.map(String);
    form.elements.layers.value = ex.layers;
    update();
  });
  form.addEventListener('submit', e => e.preventDefault());
  form.elements.example.value = '0';
  form.elements.example.dispatchEvent(new Event('change'));
}
