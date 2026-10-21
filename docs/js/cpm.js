// クリティカルパスのツール。作業の一覧から、最早・最遅の開始と終了、余裕、クリティカルパスを求め、ガントチャートに描く(計算は cpm-core.js)
import { parseTasks, cpm } from './cpm-core.js';
const form = document.getElementById('cp-form');
const out = k => document.querySelector(`[data-out="${k}"]`);
let T = {};
try { T = JSON.parse(form.dataset.text); } catch {}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const fmt = v => String(Number(v.toFixed(2)));

function gantt(r) {
  const svg = document.getElementById('cp-gantt');
  // 左の余白は作業名の長さに合わせる(全角は約13px、半角は約8px)
  const nameW = Math.max(...r.rows.map(x => [...x.id].reduce((w, c) => w + (c.charCodeAt(0) > 255 ? 13 : 8), 0)));
  const rowH = 26, L = Math.max(40, nameW + 14), W = 640, R = 12, top = 6, n = r.rows.length, total = r.total || 1;
  const sx = t => L + t / total * (W - L - R);
  let g = '';
  // 目盛り
  const step = total <= 12 ? 1 : total <= 30 ? 2 : total <= 60 ? 5 : Math.ceil(total / 12);
  for (let t = 0; t <= total + 1e-9; t += step) g += `<line class="grid" x1="${sx(t)}" x2="${sx(t)}" y1="${top}" y2="${top + n * rowH}"></line><text class="tick" x="${sx(t)}" y="${top + n * rowH + 14}">${fmt(t)}</text>`;
  r.rows.forEach((x, i) => {
    const y = top + i * rowH + 4, h = rowH - 8;
    g += `<text class="name" x="${L - 8}" y="${y + h / 2 + 4}">${esc(x.id)}</text>`;
    if (x.slack > 1e-9) g += `<rect class="slack" x="${sx(x.ef)}" y="${y + h / 2 - 3}" width="${sx(x.lf) - sx(x.ef)}" height="6"></rect>`;
    g += `<rect class="${x.critical ? 'crit' : 'task'}" x="${sx(x.es)}" y="${y}" width="${Math.max(sx(x.ef) - sx(x.es), 1)}" height="${h}" rx="3"></rect>`;
    if (sx(x.ef) - sx(x.es) > 22) g += `<text class="d" x="${(sx(x.es) + sx(x.ef)) / 2}" y="${y + h / 2 + 4}">${fmt(x.d)}</text>`;
  });
  svg.setAttribute('viewBox', `0 0 ${W} ${top + n * rowH + 20}`);
  svg.innerHTML = g;
}
function update() {
  const p = parseTasks(form.elements.tasks.value);
  const err = document.getElementById('cp-error');
  let r = null;
  if (!p.error && p.tasks.length) r = cpm(p.tasks);
  const msg = p.error ? T.err[p.error].replace('{n}', p.line).replace('{id}', p.id).replace('{of}', p.of) : !p.tasks.length ? T.err.empty : r.error ? T.err.cycle : p.tasks.length > 26 ? T.err.many : '';
  err.textContent = msg; err.hidden = !msg;
  if (msg) { out('total').textContent = out('path').textContent = '–'; document.getElementById('cp-table').innerHTML = ''; document.getElementById('cp-gantt').innerHTML = ''; return; }
  out('total').textContent = `${fmt(r.total)} ${T.unit}`;
  out('path').textContent = r.paths.length ? r.paths.map(x => x.join(' → ')).join(T.or) : '–';
  gantt(r);
  document.getElementById('cp-table').innerHTML = `<table class="sp-pairs cp-table"><thead><tr><th>${esc(T.col_task)}</th><th>${esc(T.col_d)}</th><th>${esc(T.col_pre)}</th><th>${esc(T.col_es)}</th><th>${esc(T.col_ef)}</th><th>${esc(T.col_ls)}</th><th>${esc(T.col_lf)}</th><th>${esc(T.col_tf)}</th><th>${esc(T.col_ff)}</th></tr></thead><tbody>${
    r.rows.map(x => `<tr${x.critical ? ' class="crit"' : ''}><td>${esc(x.id)}</td><td>${fmt(x.d)}</td><td>${esc(x.pre.join(', ') || '–')}</td><td>${fmt(x.es)}</td><td>${fmt(x.ef)}</td><td>${fmt(x.ls)}</td><td>${fmt(x.lf)}</td><td>${fmt(x.slack)}</td><td>${fmt(x.free)}</td></tr>`).join('')}</tbody></table>`;
}
form.addEventListener('input', e => { if (e.target.name !== 'example') update(); });
form.elements.example.addEventListener('change', () => {
  const ex = T.examples[Number(form.elements.example.value)];
  if (ex) { form.elements.tasks.value = ex.tasks; update(); }
});
form.addEventListener('submit', e => e.preventDefault());
form.elements.example.value = '0';
form.elements.example.dispatchEvent(new Event('change'));
