// ダイクストラ法のツール。辺の一覧からグラフを描き、確定の手順を表と図で1回ずつたどり、最短経路を示す(計算は dijkstra-core.js)
import { parseEdges, dijkstra, pathTo } from './dijkstra-core.js';
const form = document.getElementById('dj-form');
const out = k => document.querySelector(`[data-out="${k}"]`);
let T = {};
try { T = JSON.parse(form.dataset.text); } catch {}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const COLON = document.documentElement.lang.startsWith('zh') ? '：' : ': ';
const svg = document.getElementById('dj-svg');
const stepInput = document.getElementById('dj-step');
const MAXN = 12;
let G = null, R = null;
const fmt = d => (d === Infinity ? '∞' : String(Number(d.toFixed(3))));

function setOptions(sel, nodes, want) {
  const cur = sel.value;
  sel.innerHTML = nodes.map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join('');
  sel.value = nodes.includes(want) ? want : nodes.includes(cur) ? cur : nodes[0];
}
// 頂点を円周上に並べる(例には座標がある)
function layout(nodes, pos) {
  const n = nodes.length, cx = 200, cy = 150, r = n <= 2 ? 110 : 125;
  return new Map(nodes.map((v, i) => [v, pos?.[v] ?? [cx + r * Math.cos(-Math.PI / 2 + 2 * Math.PI * i / n), cy + r * Math.sin(-Math.PI / 2 + 2 * Math.PI * i / n)]]));
}
function draw(k) {
  const st = R.steps[k - 1];
  const directed = form.elements.directed.checked;
  const P = layout(G.nodes, G.pos);
  const target = form.elements.target.value;
  const finished = k === R.steps.length;
  // 最短経路木の辺(確定した頂点とその直前の頂点)と、目的地までの経路
  const prev = st ? st.prev : new Map();
  const doneSet = st ? st.done : new Set();
  const treeEdge = (a, b) => doneSet.has(b) && prev.get(b) === a;
  const path = finished && R.dist.get(target) < Infinity ? pathTo(R.prev, target) : [];
  const onPath = (a, b) => path.some((v, i) => i > 0 && path[i - 1] === a && v === b);
  let g = '';
  const r = 18;
  for (const e of G.edges) {
    const [x1, y1] = P.get(e.u), [x2, y2] = P.get(e.v);
    const dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy) || 1;
    const sx = x1 + dx / d * r, sy = y1 + dy / d * r, ex = x2 - dx / d * (r + (directed ? 3 : 0)), ey = y2 - dy / d * (r + (directed ? 3 : 0));
    const fwd = onPath(e.u, e.v) || (!directed && onPath(e.v, e.u));
    const tree = treeEdge(e.u, e.v) || (!directed && treeEdge(e.v, e.u));
    const relax = st && ((st.u === e.u && st.updated.includes(e.v)) || (!directed && st.u === e.v && st.updated.includes(e.u)));
    const cls = fwd ? 'path' : relax && !finished ? 'relax' : tree ? 'tree' : '';
    g += `<line class="${cls}" x1="${sx.toFixed(1)}" y1="${sy.toFixed(1)}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}"${directed ? ` marker-end="url(#dj-arrow${cls ? `-${cls}` : ''})"` : ''}></line>`;
    const mx = (x1 + x2) / 2 - dy / d * 10, my = (y1 + y2) / 2 + dx / d * 10;
    g += `<text class="w${cls ? ` ${cls}` : ''}" x="${mx.toFixed(1)}" y="${(my + 4).toFixed(1)}">${esc(fmt(e.w))}</text>`;
  }
  for (const v of G.nodes) {
    const [x, y] = P.get(v);
    const dist = st ? st.dist.get(v) : (v === form.elements.source.value ? 0 : Infinity);
    const cls = st && st.u === v && !finished ? 'cur' : doneSet.has(v) ? 'done' : '';
    g += `<g class="node ${cls}"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}"></circle><text x="${x.toFixed(1)}" y="${(y + 5).toFixed(1)}">${esc(v)}</text><text class="d" x="${x.toFixed(1)}" y="${(y - r - 6).toFixed(1)}">${esc(fmt(dist))}</text></g>`;
  }
  const xs = [...P.values()].map(p => p[0]), ys = [...P.values()].map(p => p[1]);
  const x0 = Math.min(...xs) - 40, y0 = Math.min(...ys) - 48;
  svg.setAttribute('viewBox', `${x0.toFixed(0)} ${y0.toFixed(0)} ${(Math.max(...xs) + 40 - x0).toFixed(0)} ${(Math.max(...ys) + 34 - y0).toFixed(0)}`);
  const marker = (id, cls) => `<marker id="dj-arrow${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" class="head ${cls}"></path></marker>`;
  svg.innerHTML = `<defs>${marker('', '')}${marker('-path', 'path')}${marker('-relax', 'relax')}${marker('-tree', 'tree')}</defs>${g}`;
  // 説明
  const msg = !st ? T.step0.replace('{s}', form.elements.source.value) : finished && !st.u ? '' : T.stepmsg.replace('{k}', k).replace('{u}', st.u).replace('{d}', fmt(st.dist.get(st.u))).replace('{up}', st.updated.length ? T.updated.replace('{list}', st.updated.map(v => `${v} = ${fmt(st.dist.get(v))}`).join(', ')) : T.no_update);
  document.getElementById('dj-msg').textContent = msg;
  document.querySelectorAll('#dj-table tbody tr').forEach((tr, i) => tr.classList.toggle('cur', i === k - 1));
}
function update() {
  const p = parseEdges(form.elements.edges.value);
  const err = document.getElementById('dj-error');
  const bad = p.error || !p.nodes.length || p.nodes.length > MAXN;
  err.hidden = !bad;
  if (bad) {
    err.textContent = p.error ? T.err_line.replace('{n}', p.error) : p.nodes.length > MAXN ? T.err_many : T.err_empty;
    svg.innerHTML = ''; document.getElementById('dj-table').innerHTML = ''; out('dist').textContent = '–'; out('path').textContent = '–'; return;
  }
  G = { ...p, pos: G?.exPos && G.exText === form.elements.edges.value ? G.exPos : null, exPos: G?.exPos, exText: G?.exText };
  setOptions(form.elements.source, p.nodes, form.elements.source.value);
  setOptions(form.elements.target, p.nodes, form.elements.target.value);
  const s = form.elements.source.value, t = form.elements.target.value;
  R = dijkstra(p.nodes, p.edges, s, form.elements.directed.checked);
  const d = R.dist.get(t);
  out('dist').textContent = d === Infinity ? T.unreachable : fmt(d);
  out('path').textContent = d === Infinity ? '–' : pathTo(R.prev, t).join(' → ');
  // 表: 行が回、列が頂点。確定した頂点の距離は太字、確定済みは灰色
  document.getElementById('dj-table').innerHTML = `<table class="sp-pairs dj-table"><thead><tr><th>${esc(T.col_round)}</th><th>${esc(T.col_fix)}</th>${p.nodes.map(v => `<th>${esc(v)}</th>`).join('')}</tr></thead><tbody>${
    R.steps.map((st, i) => `<tr><td>${i + 1}</td><td>${esc(st.u)}</td>${p.nodes.map(v => {
      const fixedBefore = i > 0 && R.steps[i - 1].done.has(v);
      const cls = v === st.u ? 'fix' : fixedBefore ? 'old' : st.updated.includes(v) ? 'up' : '';
      return `<td${cls ? ` class="${cls}"` : ''}>${fixedBefore ? '' : esc(fmt(st.dist.get(v)))}${!fixedBefore && st.prev.get(v) && st.dist.get(v) < Infinity ? `<small>(${esc(st.prev.get(v))})</small>` : ''}</td>`;
    }).join('')}</tr>`).join('')}</tbody></table>`;
  // 全頂点への最短距離
  document.getElementById('dj-all').textContent = p.nodes.map(v => `${v}${COLON}${fmt(R.dist.get(v))}`).join(' / ');
  stepInput.max = String(R.steps.length);
  stepInput.value = String(R.steps.length);
  draw(R.steps.length);
}
form.addEventListener('input', e => { if (e.target.name !== 'example') update(); });
form.elements.example.addEventListener('change', () => {
  const ex = T.examples[Number(form.elements.example.value)];
  if (!ex) return;
  form.elements.edges.value = ex.edges;
  form.elements.directed.checked = !!ex.directed;
  G = { exPos: ex.pos, exText: ex.edges };
  form.elements.source.innerHTML = ''; form.elements.target.innerHTML = '';
  update();
  form.elements.source.value = ex.source; form.elements.target.value = ex.target;
  update();
});
form.addEventListener('submit', e => e.preventDefault());
stepInput.addEventListener('input', () => draw(Number(stepInput.value)));
document.getElementById('dj-prev').addEventListener('click', () => { stepInput.value = String(Math.max(0, Number(stepInput.value) - 1)); draw(Number(stepInput.value)); });
document.getElementById('dj-next').addEventListener('click', () => { stepInput.value = String(Math.min(R.steps.length, Number(stepInput.value) + 1)); draw(Number(stepInput.value)); });
form.elements.example.value = '0';
form.elements.example.dispatchEvent(new Event('change'));
