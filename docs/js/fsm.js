// 状態遷移図のツール。状態遷移表(入力は 0 と 1)から状態遷移図を描き、入力の列を与えて状態と出力の移り変わりをたどる。
// 同じ働きをする状態をまとめる最小化も行う(計算は fsm-core.js)
import { simulate, minimize, reduced, EXAMPLES } from './fsm-core.js';
const form = document.getElementById('fsm-form');
let T = {};
try { T = JSON.parse(form.dataset.text); } catch {}
const MAX = 8;
const tableBox = document.getElementById('fsm-table');
const svg = document.getElementById('fsm-svg');
const timeInput = document.getElementById('fsm-time');
let m = null, steps = [];

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const DEFAULT_NAMES = ['S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7'];

// 表の入力欄を、状態の数と型に合わせて作り直す(今の値はできるだけ残す)
function buildTable(model) {
  const n = model.states.length, mealy = model.type === 'mealy';
  const opts = sel => model.states.map((_, i) => `<option value="${i}"${i === sel ? ' selected' : ''}>${esc(model.states[i].name)}</option>`).join('');
  const outIn = (name, v, label) => `<input name="${name}" value="${esc(v)}" maxlength="3" aria-label="${esc(label)}" class="fsm-out">`;
  tableBox.innerHTML = `<table class="sp-pairs fsm-edit"><thead><tr><th>${esc(T.col_state)}</th><th>${esc(T.col_next0)}</th><th>${esc(T.col_next1)}</th>${mealy ? `<th>${esc(T.col_out0)}</th><th>${esc(T.col_out1)}</th>` : `<th>${esc(T.col_out)}</th>`}</tr></thead><tbody>${
    model.states.map((s, i) => `<tr><td><input name="name${i}" value="${esc(s.name)}" maxlength="6" aria-label="${esc(T.col_state)} ${i + 1}" class="fsm-name"></td><td><select name="n0_${i}" aria-label="${esc(T.col_next0)}">${opts(s.next[0])}</select></td><td><select name="n1_${i}" aria-label="${esc(T.col_next1)}">${opts(s.next[1])}</select></td>${
      mealy ? `<td>${outIn(`o0_${i}`, s.out[0], T.col_out0)}</td><td>${outIn(`o1_${i}`, s.out[1], T.col_out1)}</td>` : `<td>${outIn(`o_${i}`, s.out, T.col_out)}</td>`}</tr>`).join('')}</tbody></table>`;
  form.elements.count.value = String(n);
  form.elements.type.value = model.type;
}
// 入力欄から表を読む
function readTable() {
  const n = Math.min(MAX, Math.max(1, Math.round(Number(form.elements.count.value)) || 1));
  const mealy = form.elements.type.value === 'mealy';
  const v = k => form.elements[k]?.value;
  const states = [];
  for (let i = 0; i < n; i++) {
    const nx = [Number(v(`n0_${i}`) ?? 0), Number(v(`n1_${i}`) ?? 0)].map(t => (t < n ? t : 0));
    const out = mealy ? [v(`o0_${i}`) ?? v(`o_${i}`) ?? '0', v(`o1_${i}`) ?? v(`o_${i}`) ?? '0'] : v(`o_${i}`) ?? v(`o0_${i}`) ?? '0';
    states.push({ name: (v(`name${i}`) ?? '').trim() || DEFAULT_NAMES[i], next: nx, out });
  }
  return { type: mealy ? 'mealy' : 'moore', states };
}

// 状態遷移図: 状態を円周上に並べ、行き先が同じ矢印はラベルをまとめる
function draw(model, cur, edge) {
  const n = model.states.length, W = 420, H = 340, cx = W / 2, cy = H / 2, R = n <= 2 ? 120 : 140, r = 26;
  const pos = model.states.map((_, i) => {
    const a = n === 1 ? 0 : -Math.PI / 2 + (2 * Math.PI * i) / n + (n === 2 ? Math.PI / 2 : 0);
    return n === 1 ? [cx, cy] : [cx + R * Math.cos(a), cy + R * Math.sin(a)];
  });
  const mealy = model.type === 'mealy';
  const edges = new Map();
  model.states.forEach((s, i) => s.next.forEach((t, x) => {
    const k = `${i}>${t}`;
    if (!edges.has(k)) edges.set(k, { from: i, to: t, labels: [], xs: [] });
    edges.get(k).labels.push(mealy ? `${x}/${s.out[x]}` : String(x));
    edges.get(k).xs.push(x);
  }));
  let g = '';
  for (const e of edges.values()) {
    const on = edge && edge.from === e.from && e.xs.includes(edge.x);
    const cls = `fsm-edge${on ? ' on' : ''}`;
    const label = e.labels.join(mealy ? ', ' : ',');
    const [x1, y1] = pos[e.from], [x2, y2] = pos[e.to];
    if (e.from === e.to) {
      // 自己ループ: 図の中心から外向きに小さな輪を描く
      const ang = Math.atan2(y1 - cy, x1 - cx) || -Math.PI / 2;
      const ux = Math.cos(ang), uy = Math.sin(ang);
      const px = -uy, py = ux;
      const sx = x1 + r * (ux * 0.7 + px * 0.7), sy = y1 + r * (uy * 0.7 + py * 0.7);
      const ex = x1 + r * (ux * 0.7 - px * 0.7), ey = y1 + r * (uy * 0.7 - py * 0.7);
      const c1x = x1 + ux * 70 + px * 34, c1y = y1 + uy * 70 + py * 34, c2x = x1 + ux * 70 - px * 34, c2y = y1 + uy * 70 - py * 34;
      g += `<path class="${cls}" d="M${sx.toFixed(1)},${sy.toFixed(1)} C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)}" marker-end="url(#fsm-arrow${on ? '-on' : ''})"></path>`;
      g += `<text class="fsm-label${on ? ' on' : ''}" x="${(x1 + ux * 66).toFixed(1)}" y="${(y1 + uy * 66 + 4).toFixed(1)}">${esc(label)}</text>`;
    } else {
      // 2つの状態の間は少し曲げる(行きと帰りが重ならないように、進む向きの右側へ)
      const dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy), ux = dx / d, uy = dy / d;
      const bend = edges.has(`${e.to}>${e.from}`) ? 28 : 10;
      const mx = (x1 + x2) / 2 - uy * bend, my = (y1 + y2) / 2 + ux * bend;
      const a1 = Math.atan2(my - y1, mx - x1), a2 = Math.atan2(my - y2, mx - x2);
      const sx = x1 + r * Math.cos(a1), sy = y1 + r * Math.sin(a1), ex = x2 + (r + 2) * Math.cos(a2), ey = y2 + (r + 2) * Math.sin(a2);
      g += `<path class="${cls}" d="M${sx.toFixed(1)},${sy.toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)}" marker-end="url(#fsm-arrow${on ? '-on' : ''})"></path>`;
      const lx = (sx + 2 * mx + ex) / 4 - uy * 9, ly = (sy + 2 * my + ey) / 4 + ux * 9;
      g += `<text class="fsm-label${on ? ' on' : ''}" x="${lx.toFixed(1)}" y="${(ly + 4).toFixed(1)}">${esc(label)}</text>`;
    }
  }
  model.states.forEach((s, i) => {
    const [x, y] = pos[i];
    g += `<g class="fsm-state${i === cur ? ' on' : ''}"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}"></circle>${
      mealy ? `<text x="${x.toFixed(1)}" y="${(y + 5).toFixed(1)}">${esc(s.name)}</text>` : `<text x="${x.toFixed(1)}" y="${(y - 1).toFixed(1)}">${esc(s.name)}</text><text class="fsm-sub" x="${x.toFixed(1)}" y="${(y + 14).toFixed(1)}">${esc(s.out)}</text>`}</g>`;
  });
  // 開始の矢印
  const [x0, y0] = pos[0];
  const a = n === 1 ? Math.PI : Math.atan2(y0 - cy, x0 - cx) - Math.PI / 2.4;
  g += `<path class="fsm-edge start" d="M${(x0 + 60 * Math.cos(a)).toFixed(1)},${(y0 + 60 * Math.sin(a)).toFixed(1)} L${(x0 + (r + 2) * Math.cos(a)).toFixed(1)},${(y0 + (r + 2) * Math.sin(a)).toFixed(1)}" marker-end="url(#fsm-arrow)"></path>`;
  // 外向きの自己ループと開始の矢印が切れないように、周りに余白をとる
  const xs = pos.map(q => q[0]), ys = pos.map(q => q[1]), pad = 100;
  const x0b = Math.min(...xs) - pad, y0b = Math.min(...ys) - pad;
  svg.setAttribute('viewBox', `${x0b.toFixed(0)} ${y0b.toFixed(0)} ${(Math.max(...xs) + pad - x0b).toFixed(0)} ${(Math.max(...ys) + pad - y0b).toFixed(0)}`);
  svg.innerHTML = `<defs>${['', '-on'].map(s => `<marker id="fsm-arrow${s}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="fsm-head${s ? ' on' : ''}"></path></marker>`).join('')}</defs>${g}`;
}

function showTime() {
  const t = Number(timeInput.value);
  const st = steps[t - 1];
  const cur = t === 0 ? 0 : st.to;
  draw(m, cur, st ? { from: st.from, x: st.x } : null);
  document.getElementById('fsm-tlabel').textContent = T.time.replace('{t}', t).replace('{s}', m.states[cur].name);
  document.querySelectorAll('#fsm-trace tbody tr').forEach((tr, i) => tr.classList.toggle('cur', i === t - 1));
}
function update(keepTime) {
  m = readTable();
  const raw = form.elements.input.value.replace(/\s/g, '');
  const ok = /^[01]*$/.test(raw);
  document.getElementById('fsm-error').hidden = ok;
  steps = ok ? simulate(m, raw.slice(0, 64)) : [];
  const name = i => esc(m.states[i].name);
  document.getElementById('fsm-trace').innerHTML = steps.length ? `<table class="sp-pairs"><thead><tr><th>${esc(T.col_t)}</th><th>${esc(T.col_state)}</th><th>${esc(T.col_in)}</th><th>${esc(T.col_nextstate)}</th><th>${esc(T.col_output)}</th></tr></thead><tbody>${
    steps.map((s, i) => `<tr><td>${i + 1}</td><td>${name(s.from)}</td><td>${s.x}</td><td>${name(s.to)}</td><td>${esc(s.out)}</td></tr>`).join('')}</tbody></table>` : '';
  document.getElementById('fsm-outseq').textContent = steps.length ? `${T.outseq}: ${steps.map(s => s.out).join(' ')}` : '';
  timeInput.max = String(steps.length);
  if (!keepTime || Number(timeInput.value) > steps.length) timeInput.value = String(steps.length);
  showTime();
  // 最小化
  const mn = minimize(m);
  const box = document.getElementById('fsm-min');
  const merged = mn.groups.filter(g => g.length > 1);
  let html = `<p>${esc(T.min_result.replace('{a}', m.states.length).replace('{b}', mn.groups.length))}</p>`;
  if (mn.unreachable.length) html += `<p>${esc(T.min_unreachable)}: ${mn.unreachable.map(name).join(', ')}</p>`;
  if (merged.length) {
    html += `<p>${esc(T.min_groups)}: ${merged.map(g => `{${g.map(name).join(', ')}}`).join(' ')}</p>`;
    const r = reduced(m);
    html += `<div class="table-wrap"><table class="sp-pairs"><thead><tr><th>${esc(T.col_state)}</th><th>${esc(T.col_next0)}</th><th>${esc(T.col_next1)}</th>${m.type === 'mealy' ? `<th>${esc(T.col_out0)}</th><th>${esc(T.col_out1)}</th>` : `<th>${esc(T.col_out)}</th>`}</tr></thead><tbody>${
      r.states.map(s => `<tr><td>${esc(s.name)}</td><td>${esc(r.states[s.next[0]].name)}</td><td>${esc(r.states[s.next[1]].name)}</td>${m.type === 'mealy' ? `<td>${esc(s.out[0])}</td><td>${esc(s.out[1])}</td>` : `<td>${esc(s.out)}</td>`}</tr>`).join('')}</tbody></table></div>`;
  } else if (!mn.unreachable.length) html += `<p class="muted">${esc(T.min_none)}</p>`;
  box.innerHTML = html;
}
function loadExample(k) {
  const ex = EXAMPLES[k];
  if (!ex) return;
  buildTable(ex);
  form.elements.input.value = ex.input;
  document.getElementById('fsm-exdesc').textContent = T.examples_desc?.[k] ?? '';
  update();
}
// 状態の数や型を変えたら、今の表を引き継いで作り直す
function reshape() {
  const old = readTable();
  const n = Math.min(MAX, Math.max(1, Math.round(Number(form.elements.count.value)) || 1));
  const mealy = form.elements.type.value === 'mealy';
  const states = Array.from({ length: n }, (_, i) => {
    const s = old.states[i] ?? { name: DEFAULT_NAMES[i], next: [i, i], out: '0' };
    const out = mealy ? (Array.isArray(s.out) ? s.out : [s.out, s.out]) : (Array.isArray(s.out) ? s.out[0] : s.out);
    return { name: s.name, next: s.next.map(t => (t < n ? t : 0)), out };
  });
  buildTable({ type: mealy ? 'mealy' : 'moore', states });
  form.elements.example.value = '';
  document.getElementById('fsm-exdesc').textContent = '';
  update();
}

form.addEventListener('change', e => {
  if (e.target.name === 'example') loadExample(e.target.value);
  else if (e.target.name === 'count' || e.target.name === 'type') reshape();
});
form.addEventListener('input', e => {
  if (['example', 'count', 'type'].includes(e.target.name)) return;
  // 状態の名前を変えたら、行き先の選択肢の名前も直す
  if (/^name\d$/.test(e.target.name)) {
    const i = Number(e.target.name.slice(4));
    form.querySelectorAll(`#fsm-table select option[value="${i}"]`).forEach(o => { o.textContent = e.target.value.trim() || DEFAULT_NAMES[i]; });
  }
  // 入力の列を変えたら最後の時刻を、表を変えたら今の時刻を表示する
  update(e.target.name !== 'input');
});
form.addEventListener('submit', e => e.preventDefault());
timeInput.addEventListener('input', showTime);
document.getElementById('fsm-prev').addEventListener('click', () => { timeInput.value = String(Math.max(0, Number(timeInput.value) - 1)); showTime(); });
document.getElementById('fsm-next').addEventListener('click', () => { timeInput.value = String(Math.min(steps.length, Number(timeInput.value) + 1)); showTime(); });
loadExample('ones');
form.elements.example.value = 'ones';
