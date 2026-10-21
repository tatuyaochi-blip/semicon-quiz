// SQL の練習。ブラウザの中で SQLite(sql.js)を動かし、練習用の表に SQL を実行して結果を表で見る。
// 練習問題は、模範解答の SQL を同じデータベースで実行した結果と、入力した SQL の結果を比べて答え合わせする
// (ORDER BY のない問題は行の順番を問わない)。データベースはこのページの中だけにあり、どこにも送らない
const root = document.getElementById('sql');
let T = {};
try { T = JSON.parse(root.dataset.text); } catch {}
const vendor = root.dataset.vendor;
const editor = document.getElementById('sql-input');
const status = document.getElementById('sql-status');
const result = document.getElementById('sql-result');
let SQL = null, db = null;

const esc = s => String(s ?? 'NULL').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const table = r => `<div class="table-wrap"><table class="sp-pairs sql-table"><thead><tr>${r.columns.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${
  r.values.map(row => `<tr>${row.map(v => `<td${v === null ? ' class="null"' : ''}>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;

function load() {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = `${vendor}sql-wasm.js`;
    s.onload = () => window.initSqlJs({ locateFile: f => `${vendor}${f}` }).then(resolve, reject);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}
function reset() {
  db?.close();
  db = new SQL.Database();
  db.exec(T.schema);
  showSchema();
}
function showSchema() {
  const box = document.getElementById('sql-schema');
  const tables = db.exec("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY rowid")[0]?.values.map(v => v[0]) ?? [];
  box.innerHTML = tables.map(t => {
    const r = db.exec(`SELECT * FROM "${t.replace(/"/g, '""')}"`)[0];
    return `<details${tables.indexOf(t) < 2 ? ' open' : ''}><summary>${esc(t)}${r ? ` (${r.values.length} ${T.rows})` : ''}</summary>${r ? table(r) : `<p class="muted">${esc(T.empty)}</p>`}</details>`;
  }).join('');
}
// 実行: 複数の文を書いたときは最後の結果を表示する
function run(sql) {
  try {
    const res = db.exec(sql);
    const changed = db.getRowsModified();
    showSchema();
    if (res.length) { result.innerHTML = table(res[res.length - 1]); status.textContent = T.ok_rows.replace('{n}', res[res.length - 1].values.length); }
    else { result.innerHTML = ''; status.textContent = T.ok_done.replace('{n}', changed); }
    status.className = 'sql-status ok';
    return res[res.length - 1] ?? null;
  } catch (e) {
    result.innerHTML = '';
    status.textContent = `${T.error}: ${e.message}`;
    status.className = 'sql-status err';
    return undefined;
  }
}
// 答え合わせ: 別のデータベースで模範解答と入力を実行して比べる(入力が表を書き換えても練習用のデータを壊さないように)
function check() {
  const ex = T.exercises[Number(document.getElementById('sql-ex').value)];
  if (!ex) return;
  const fresh = () => { const d = new SQL.Database(); d.exec(T.schema); return d; };
  const a = fresh(), b = fresh();
  let mine, want;
  try { want = b.exec(ex.answer).pop(); } catch { want = null; }
  try { mine = a.exec(editor.value).pop(); } catch (e) { setJudge(false, `${T.error}: ${e.message}`); a.close(); b.close(); return; }
  a.close(); b.close();
  const rows = r => (r?.values ?? []).map(v => JSON.stringify(v));
  const ordered = /\border\s+by\b/i.test(ex.answer);
  const x = rows(mine), y = rows(want);
  const same = x.length === y.length && (ordered ? x.every((v, i) => v === y[i]) : [...x].sort().join('\n') === [...y].sort().join('\n'))
    && (mine?.columns.length ?? 0) === (want?.columns.length ?? 0);
  setJudge(same, same ? T.correct : T.wrong.replace('{n}', y.length));
  run(editor.value);
}
function setJudge(ok, msg) {
  const el = document.getElementById('sql-judge');
  el.textContent = msg;
  el.className = `sql-judge ${ok ? 'ok' : 'ng'}`;
  el.hidden = false;
}
function showExercise() {
  const ex = T.exercises[Number(document.getElementById('sql-ex').value)];
  document.getElementById('sql-ex-q').textContent = ex ? ex.q : '';
  document.getElementById('sql-judge').hidden = true;
  document.getElementById('sql-answer').hidden = true;
}

document.getElementById('sql-run').addEventListener('click', () => run(editor.value));
document.getElementById('sql-check').addEventListener('click', check);
document.getElementById('sql-show').addEventListener('click', () => {
  const ex = T.exercises[Number(document.getElementById('sql-ex').value)];
  const el = document.getElementById('sql-answer');
  el.textContent = ex?.answer ?? '';
  el.hidden = false;
});
document.getElementById('sql-reset').addEventListener('click', () => { reset(); result.innerHTML = ''; status.textContent = T.reset_done; status.className = 'sql-status'; });
document.getElementById('sql-ex').addEventListener('change', showExercise);
editor.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run(editor.value); } });

status.textContent = T.loading;
load().then(S => {
  SQL = S;
  reset();
  root.classList.add('ready');
  status.textContent = T.ready;
  showExercise();
  run(editor.value);
}).catch(() => { status.textContent = T.load_error; status.className = 'sql-status err'; });
