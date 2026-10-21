// 二分木のツール。キーの列から二分探索木かヒープを作って図にし、なぞり順・高さ・探索の経路・ヒープの配列を表示する(計算は bintree-core.js)
import * as B from './bintree-core.js';
const form = document.getElementById('bt-form');
const out = k => document.querySelector(`[data-out="${k}"]`);
let T = {};
try { T = JSON.parse(form.dataset.text); } catch {}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const svg = document.getElementById('bt-svg');
// 中国語は全角のかっこ
const ZH = document.documentElement.lang.startsWith('zh');

// 木の図: 中間順で横の位置を、深さで縦の位置を決める。hl は強調する節のキー
function draw(root, hl = [], miss = null, idx = false) {
  if (!root) { svg.innerHTML = ''; svg.setAttribute('viewBox', '0 0 10 10'); return; }
  let x = 0, depth = 0;
  const place = (n, d) => {
    if (!n) return null;
    const l = place(n.l, d + 1);
    const me = { n, x: x++, d, l };
    me.r = place(n.r, d + 1);
    depth = Math.max(depth, d);
    return me;
  };
  const P = place(root, 0);
  const W = 44, H = 58, R = 17;
  let g = '';
  const walk = p => {
    const cx = p.x * W + W / 2, cy = p.d * H + R + 6;
    for (const c of [p.l, p.r]) if (c) { g += `<line class="${hl.includes(p.n.k) && hl.includes(c.n.k) ? 'on' : ''}" x1="${cx}" y1="${cy}" x2="${c.x * W + W / 2}" y2="${c.d * H + R + 6}"></line>`; walk(c); }
    const on = hl.includes(p.n.k);
    g += `<g class="${on ? 'on' : ''}${miss !== null && hl[hl.length - 1] === p.n.k ? ' last' : ''}"><circle cx="${cx}" cy="${cy}" r="${R}"></circle><text x="${cx}" y="${cy + 5}">${esc(p.n.k)}</text>${idx && p.n.i !== undefined ? `<text class="idx" x="${cx + R + 2}" y="${cy - R + 4}">${p.n.i}</text>` : ''}</g>`;
  };
  walk(P);
  const w = x * W + 16, h = (depth + 1) * H + 6;
  svg.setAttribute('viewBox', `-8 0 ${w} ${h}`);
  svg.style.maxWidth = `${w * 1.25}px`;
  svg.innerHTML = g;
}
function update() {
  const mode = form.elements.mode.value;
  const keys = B.parseKeys(form.elements.keys.value);
  const delKeys = B.parseKeys(form.elements.del.value ?? '');
  const find = form.elements.find.value.trim();
  const ok = keys && delKeys;
  document.getElementById('bt-error').hidden = !!ok;
  document.querySelectorAll('.bt-bst').forEach(e => { e.hidden = mode !== 'bst'; });
  document.querySelectorAll('.bt-heap').forEach(e => { e.hidden = mode === 'bst'; });
  if (!ok) { draw(null); for (const k of ['pre', 'in', 'post', 'level', 'height', 'size', 'search', 'array', 'popped']) out(k).textContent = '–'; return; }
  const numeric = keys.length ? typeof keys[0] === 'number' : delKeys.every(k => typeof k === 'number');
  const conv = v => (numeric && /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v);
  let root = null, notes = [];
  if (mode === 'bst') {
    const dup = [];
    for (const k of keys) { const before = B.size(root); root = B.bstInsert(root, k); if (B.size(root) === before) dup.push(k); }
    if (dup.length) notes.push(T.dup.replace('{k}', dup.join(', ')));
    for (const k of delKeys.map(v => conv(String(v)))) {
      const r = B.bstDelete(root, k);
      root = r.root;
      notes.push(!r.found ? T.del_missing.replace('{k}', k) : r.succ !== undefined ? T.del_two.replaceAll('{k}', k).replace('{s}', r.succ) : T.del_ok.replace('{k}', k));
    }
    let hl = [], miss = null;
    if (find) {
      const s = B.bstSearch(root, conv(find));
      hl = s.path; miss = s.found ? null : true;
      out('search').textContent = s.path.length || s.found ? `${s.path.join(' → ')}${ZH ? '（' : ' ('}${(s.found ? T.found : T.not_found).replace('{n}', s.path.length)}${ZH ? '）' : ')'}` : T.not_found.replace('{n}', 0);
    } else out('search').textContent = '–';
    draw(root, hl, miss);
  } else {
    const max = mode === 'maxheap';
    const h = B.heapBuild(keys, max);
    const a = [...h.a];
    const pops = Math.min(Math.max(0, Math.round(Number(form.elements.pops.value) || 0)), a.length);
    const popped = [];
    for (let i = 0; i < pops; i++) popped.push(B.heapPop(a, max));
    root = B.heapTree(a);
    out('array').textContent = a.length ? a.map((v, i) => `[${i}]${v}`).join(' ') : '–';
    out('popped').textContent = popped.length ? popped.join(', ') : '–';
    notes.push(T.swaps.replace('{n}', h.swaps.reduce((s, x) => s + x, 0)));
    draw(root, [], null, true);
  }
  out('pre').textContent = B.pre(root).join(' ') || '–';
  out('in').textContent = B.ino(root).join(' ') || '–';
  out('post').textContent = B.post(root).join(' ') || '–';
  out('level').textContent = B.level(root).join(' ') || '–';
  out('height').textContent = String(B.height(root));
  out('size').textContent = String(B.size(root));
  document.getElementById('bt-notes').innerHTML = notes.map(n => `<li>${esc(n)}</li>`).join('');
}
form.addEventListener('input', e => { if (e.target.name !== 'example') update(); });
form.elements.example.addEventListener('change', () => {
  const ex = T.examples[Number(form.elements.example.value)];
  if (!ex) return;
  form.elements.mode.value = ex.mode;
  form.elements.keys.value = ex.keys;
  form.elements.del.value = ex.del ?? '';
  form.elements.find.value = ex.find ?? '';
  form.elements.pops.value = String(ex.pops ?? 0);
  update();
});
form.addEventListener('submit', e => e.preventDefault());
form.elements.example.value = '0';
form.elements.example.dispatchEvent(new Event('change'));
