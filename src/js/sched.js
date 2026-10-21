// CPUスケジューリングのツール。プロセスの表から、選んだ方式のガントチャートと各プロセスの待ち時間などを表示し、
// 全部の方式の平均を比べる(計算は sched-core.js)
import { schedule, ALGOS } from './sched-core.js';
const form = document.getElementById('sc-form');
const out = k => document.querySelector(`[data-out="${k}"]`);
let T = {};
try { T = JSON.parse(form.dataset.text); } catch {}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const ROWS = 8;
const fmt = v => String(Number(v.toFixed(2)));
const COLORS = ['#1d64c8', '#0b8f72', '#d1495b', '#e0a100', '#7b4fc9', '#00838f', '#c2185b', '#5d6d7e'];

function readProcs() {
  const ps = [];
  for (let i = 0; i < ROWS; i++) {
    const v = k => form.elements[`${k}${i}`].value.trim();
    if (v('b') === '') continue;
    const p = { name: v('n') || `P${i + 1}`, arrival: Number(v('a') || 0), burst: Number(v('b')), prio: Number(v('p') || 0), row: i };
    if (!(Number.isInteger(p.arrival) && p.arrival >= 0 && p.arrival <= 999 && Number.isInteger(p.burst) && p.burst >= 1 && p.burst <= 99 && Number.isInteger(p.prio))) return null;
    ps.push(p);
  }
  return ps.length ? ps : null;
}
function gantt(r, ps) {
  const svg = document.getElementById('sc-gantt');
  const end = r.makespan, W = 640, L = 6, H = 34, Y = 8, sx = t => L + (t / end) * (W - 2 * L);
  let g = '';
  for (const s of r.gantt) {
    const x0 = sx(s.t0), x1 = sx(s.t1);
    if (s.i === null) g += `<rect class="idle" x="${x0}" y="${Y}" width="${x1 - x0}" height="${H}"></rect><text class="idle-t" x="${(x0 + x1) / 2}" y="${Y + H / 2 + 5}">${x1 - x0 > 30 ? esc(T.idle) : ''}</text>`;
    else g += `<rect x="${x0}" y="${Y}" width="${x1 - x0}" height="${H}" style="fill:${COLORS[ps[s.i].row % COLORS.length]}"></rect><text x="${(x0 + x1) / 2}" y="${Y + H / 2 + 5}">${x1 - x0 > 16 ? esc(ps[s.i].name) : ''}</text>`;
  }
  // 目盛り: 区切りの時刻すべて(混み合うときは間引く)
  const ticks = [...new Set(r.gantt.flatMap(s => [s.t0, s.t1]))].sort((a, b) => a - b);
  let lastX = -99;
  for (const t of ticks) {
    const x = sx(t);
    if (x - lastX < 18 && t !== end) continue;
    g += `<line x1="${x}" y1="${Y}" x2="${x}" y2="${Y + H + 4}"></line><text class="tick" x="${x}" y="${Y + H + 17}">${t}</text>`;
    lastX = x;
  }
  svg.setAttribute('viewBox', `0 0 ${W} ${Y + H + 24}`);
  svg.innerHTML = g;
}
function update() {
  const algo = form.elements.algo.value;
  const q = Math.round(Number(form.elements.q.value));
  document.getElementById('sc-q').hidden = algo !== 'rr';
  const ps = readProcs();
  const ok = ps && q >= 1 && q <= 50;
  document.getElementById('sc-error').hidden = ok;
  const tbl = document.getElementById('sc-rows'), cmp = document.getElementById('sc-cmp');
  if (!ok) { for (const k of ['tat', 'wait', 'resp', 'end']) out(k).textContent = '–'; tbl.innerHTML = ''; cmp.innerHTML = ''; document.getElementById('sc-gantt').innerHTML = ''; return; }
  const r = schedule(ps, algo, q);
  gantt(r, ps);
  out('tat').textContent = fmt(r.avg.tat);
  out('wait').textContent = fmt(r.avg.wait);
  out('resp').textContent = fmt(r.avg.resp);
  out('end').textContent = String(r.makespan);
  tbl.innerHTML = `<table class="sp-pairs"><thead><tr><th>${esc(T.col_name)}</th><th>${esc(T.col_arrival)}</th><th>${esc(T.col_burst)}</th>${algo.startsWith('prio') ? `<th>${esc(T.col_prio)}</th>` : ''}<th>${esc(T.col_end)}</th><th>${esc(T.col_tat)}</th><th>${esc(T.col_wait)}</th><th>${esc(T.col_resp)}</th></tr></thead><tbody>${
    ps.map((p, i) => `<tr><td><span class="sc-dot" style="background:${COLORS[p.row % COLORS.length]}"></span>${esc(p.name)}</td><td>${p.arrival}</td><td>${p.burst}</td>${algo.startsWith('prio') ? `<td>${p.prio}</td>` : ''}<td>${r.rows[i].end}</td><td>${r.rows[i].tat}</td><td>${r.rows[i].wait}</td><td>${r.rows[i].resp}</td></tr>`).join('')}</tbody></table>`;
  cmp.innerHTML = `<table class="sp-pairs"><thead><tr><th>${esc(T.col_algo)}</th><th>${esc(T.avg_tat)}</th><th>${esc(T.avg_wait)}</th><th>${esc(T.avg_resp)}</th><th>${esc(T.col_switch)}</th></tr></thead><tbody>${
    ALGOS.map(a => { const x = schedule(ps, a, q); return `<tr${a === algo ? ' class="cur"' : ''}><td>${esc(T.algos[a])}${a === 'rr' ? ` (q = ${q})` : ''}</td><td>${fmt(x.avg.tat)}</td><td>${fmt(x.avg.wait)}</td><td>${fmt(x.avg.resp)}</td><td>${x.switches}</td></tr>`; }).join('')}</tbody></table>`;
}
function load(ex) {
  for (let i = 0; i < ROWS; i++) {
    const p = ex.procs[i];
    form.elements[`n${i}`].value = p ? p[0] : '';
    form.elements[`a${i}`].value = p ? String(p[1]) : '';
    form.elements[`b${i}`].value = p ? String(p[2]) : '';
    form.elements[`p${i}`].value = p ? String(p[3] ?? '') : '';
  }
  if (ex.algo) form.elements.algo.value = ex.algo;
  if (ex.q) form.elements.q.value = String(ex.q);
  update();
}
form.addEventListener('input', e => { if (e.target.name !== 'example') update(); });
form.elements.example.addEventListener('change', () => { const ex = T.examples[Number(form.elements.example.value)]; if (ex) load(ex); });
form.addEventListener('submit', e => e.preventDefault());
load(T.examples[0]);
form.elements.example.value = '0';
