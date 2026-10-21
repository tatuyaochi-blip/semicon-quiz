// ソートの動き。選んだアルゴリズムが配列を並べ替える様子を棒グラフで再生し、比較と書き込みの回数を数える。
// 同じ並びを全部のアルゴリズムで並べ替えたときの回数も表にする(手順の記録は sort-core.js)
import { ALGOS, STABLE, record, makeData } from './sort-core.js';
const form = document.getElementById('so-form');
const out = k => document.querySelector(`[data-out="${k}"]`);
let T = {};
try { T = JSON.parse(form.dataset.text); } catch {}
const svg = document.getElementById('so-bars');
const playBtn = document.getElementById('so-play');
const evLine = document.getElementById('so-ev');
// 計算量のオーダー [平均, 最悪]。シェルソートの平均は間隔の取り方による(1, 4, 13 … の場合の目安)
const ORDER = { bubble: ['n²', 'n²'], selection: ['n²', 'n²'], insertion: ['n²', 'n²'], shell: ['n^1.25', 'n^1.5'], merge: ['n log n', 'n log n'], quick: ['n log n', 'n²'], heap: ['n log n', 'n log n'] };
let seed = 1 + Math.floor(Math.random() * 1e6);
let data = [], rec = null, arr = [], pos = 0, cmps = 0, writes = 0, sorted = new Set(), timer = null;

function draw(hi = {}) {
  const n = arr.length, max = Math.max(...data, 1), w = 10, H = 100;
  const showNum = n <= 20;
  svg.setAttribute('viewBox', `0 0 ${n * w} ${H + (showNum ? 9 : 0)}`);
  svg.innerHTML = arr.map((v, i) => {
    const h = Math.max(2, v / max * (H - 4));
    const cls = hi.write?.includes(i) ? 'write' : hi.cmp?.includes(i) ? 'cmp' : sorted.has(i) ? 'done' : '';
    return `<rect class="${cls}" x="${i * w + 1}" y="${H - h}" width="${w - 2}" height="${h}" rx="1"></rect>${showNum ? `<text x="${i * w + w / 2}" y="${H + 7}">${v}</text>` : ''}`;
  }).join('');
}
function stats() {
  out('cmps').textContent = String(cmps);
  out('writes').textContent = String(writes);
  out('progress').textContent = `${pos} / ${rec.events.length}`;
}
// 出来事を1つ進める
function step() {
  const e = rec.events[pos];
  if (!e) return false;
  pos++;
  let hi = {}, msg = '';
  if (e.t === 'cmp') { cmps++; hi = { cmp: [e.i, e.j] }; msg = e.i === e.j ? T.ev.cmp_v.replace('{i}', e.i).replace('{a}', arr[e.i]) : T.ev.cmp.replace('{i}', e.i).replace('{a}', arr[e.i]).replace('{j}', e.j).replace('{b}', arr[e.j]); }
  else if (e.t === 'swap') { writes += 2; [arr[e.i], arr[e.j]] = [arr[e.j], arr[e.i]]; hi = { write: [e.i, e.j] }; msg = T.ev.swap.replace('{i}', e.i).replace('{j}', e.j); }
  else if (e.t === 'set') { writes++; arr[e.i] = e.v; hi = { write: [e.i] }; msg = T.ev.set.replace('{i}', e.i).replace('{v}', e.v); }
  else { e.is.forEach(i => sorted.add(i)); msg = T.ev.done.replace('{i}', e.is.length > 3 ? `${e.is[0]}–${e.is[e.is.length - 1]}` : e.is.join(', ')); }
  if (pos === rec.events.length) { msg = T.finished; hi = {}; }
  evLine.textContent = msg;
  draw(hi);
  stats();
  return pos < rec.events.length;
}
function stop() { clearTimeout(timer); timer = null; playBtn.textContent = T.play; }
function tick() {
  // 速さ 1〜10: 1回あたりの待ち時間を 600ms から 5ms へ。速いときは1回に複数の出来事を進める
  const sp = Number(form.elements.speed.value);
  const delay = Math.round(600 * 0.55 ** (sp - 1));
  const per = sp >= 9 ? Math.ceil(rec.events.length / 300) : 1;
  let more = true;
  for (let k = 0; k < per && more; k++) more = step();
  if (more) timer = setTimeout(tick, Math.max(5, delay)); else stop();
}
function restart() {
  stop();
  rec = record(form.elements.algo.value, data);
  arr = [...data]; pos = 0; cmps = 0; writes = 0; sorted = new Set();
  evLine.textContent = ' ';
  draw(); stats();
}
function table() {
  const algo = form.elements.algo.value;
  document.getElementById('so-all').innerHTML = ALGOS.map(a => {
    const r = record(a, data);
    return `<tr${a === algo ? ' class="cur"' : ''}><td>${T.algos[a]}</td><td>${r.cmps}</td><td>${r.writes}</td><td>${ORDER[a][0] === ORDER[a][1] ? `O(${ORDER[a][0]})` : `O(${ORDER[a][0]}) / O(${ORDER[a][1]})`}</td><td>${STABLE[a] ? T.stable_yes : T.stable_no}</td></tr>`;
  }).join('');
}
function regenerate() {
  const n = Math.round(Number(form.elements.n.value));
  out('nv').textContent = String(n);
  data = makeData(n, form.elements.kind.value, seed);
  restart(); table();
}

playBtn.addEventListener('click', () => {
  if (timer) { stop(); return; }
  if (pos >= rec.events.length) restart();
  playBtn.textContent = T.pause;
  tick();
});
document.getElementById('so-step').addEventListener('click', () => { stop(); if (pos >= rec.events.length) restart(); step(); });
document.getElementById('so-restart').addEventListener('click', restart);
document.getElementById('so-new').addEventListener('click', () => { seed = 1 + Math.floor(Math.random() * 1e6); regenerate(); });
form.addEventListener('input', e => {
  if (e.target.name === 'speed') return;
  if (e.target.name === 'algo') { restart(); table(); return; }
  regenerate();
});
form.addEventListener('submit', e => e.preventDefault());
regenerate();
