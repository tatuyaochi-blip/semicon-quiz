// ハッシュ表のツール。キーを順に入れたときの表の中身、衝突と探査の列、負荷率と平均の探査回数を表示し、衝突の処理方法を比べる(計算は hash-core.js)
import { insertAll, search, METHODS, keyNum, secondPrime, parseKeys } from './hash-core.js';
const form = document.getElementById('hs-form');
const out = k => document.querySelector(`[data-out="${k}"]`);
let T = {};
try { T = JSON.parse(form.dataset.text); } catch {}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
// 中国語は全角のかっことコロン
const ZH = document.documentElement.lang.startsWith('zh');
const fmt = v => String(Number(v.toFixed(2)));

function update() {
  const keys = parseKeys(form.elements.keys.value);
  const m = Math.round(Number(form.elements.m.value));
  const method = form.elements.method.value;
  const ok = keys && keys.length > 0 && m >= 2 && m <= 64;
  document.getElementById('hs-error').hidden = ok;
  const tbl = document.getElementById('hs-table'), recs = document.getElementById('hs-recs'), cmp = document.getElementById('hs-cmp');
  if (!ok) { for (const k of ['load', 'coll', 'avg', 'search']) out(k).textContent = '–'; tbl.innerHTML = recs.innerHTML = cmp.innerHTML = ''; return; }
  const uniq = [...new Set(keys)];
  const r = insertAll(uniq, m, method);
  const placed = r.rec.filter(x => x.pos >= 0);
  out('load').textContent = `${placed.length} / ${m} = ${fmt(placed.length / m)}`;
  out('coll').textContent = String(r.rec.filter(x => x.collide).length);
  out('avg').textContent = placed.length ? fmt(placed.reduce((s, x) => s + x.probes, 0) / placed.length) : '–';
  // 探す値
  const fk = form.elements.find.value.trim();
  const sk = fk === '' ? null : /^\d+$/.test(fk) && typeof uniq[0] === 'number' ? Number(fk) : fk;
  const s = sk === null ? null : search(r.table, sk, m, method);
  out('search').textContent = s ? `${(s.found ? T.found : T.not_found).replace('{n}', s.probes)}${ZH ? '（' : ' ('}${T.pos}${ZH ? '：' : ': '}${s.seq.join(' → ')}${ZH ? '）' : ')'}` : '–';
  const hit = new Set(s ? s.seq : []);
  // 表の中身
  tbl.innerHTML = `<table class="hs-tbl"><tbody>${(method === 'chain' ? r.table : r.table.map(x => (x === null ? [] : [x]))).map((cell, i) =>
    `<tr${hit.has(i) ? ' class="probe"' : ''}><th>${i}</th><td>${cell.length ? cell.map(k => `<span class="hs-key${k === sk ? ' found' : ''}">${esc(k)}</span>`).join(method === 'chain' ? '<span class="hs-arrow">→</span>' : '') : `<span class="hs-empty">${esc(T.empty)}</span>`}</td></tr>`).join('')}</tbody></table>`;
  // キーごとの記録
  const strKeys = typeof uniq[0] !== 'number';
  recs.innerHTML = `<table class="sp-pairs"><thead><tr><th>${esc(T.col_key)}</th>${strKeys ? `<th>${esc(T.col_code)}</th>` : ''}<th>h(k)</th>${method === 'double' ? '<th>h₂(k)</th>' : ''}<th>${esc(T.col_seq)}</th><th>${esc(T.col_pos)}</th><th>${esc(T.col_probes)}</th></tr></thead><tbody>${
    r.rec.map(x => `<tr${x.collide ? ' class="coll"' : ''}><td>${esc(x.k)}</td>${strKeys ? `<td>${keyNum(x.k)}</td>` : ''}<td>${x.h}</td>${method === 'double' ? `<td>${x.step}</td>` : ''}<td>${x.seq.join(' → ')}</td><td>${x.pos >= 0 ? x.pos : esc(T.full)}</td><td>${x.probes}</td></tr>`).join('')}</tbody></table>`;
  if (keys.length !== uniq.length) recs.insertAdjacentHTML('beforeend', `<p class="muted">${esc(T.dup)}</p>`);
  // 方式の比較
  cmp.innerHTML = `<table class="sp-pairs"><thead><tr><th>${esc(T.col_method)}</th><th>${esc(T.col_coll)}</th><th>${esc(T.col_avg)}</th><th>${esc(T.col_max)}</th><th>${esc(T.col_fail)}</th></tr></thead><tbody>${
    METHODS.map(me => {
      const x = insertAll(uniq, m, me), pl = x.rec.filter(y => y.pos >= 0);
      return `<tr${me === method ? ' class="cur"' : ''}><td>${esc(T.methods[me])}</td><td>${x.rec.filter(y => y.collide).length}</td><td>${pl.length ? fmt(pl.reduce((a, y) => a + y.probes, 0) / pl.length) : '–'}</td><td>${Math.max(0, ...pl.map(y => y.probes))}</td><td>${x.failed.length}</td></tr>`;
    }).join('')}</tbody></table>`;
  document.getElementById('hs-h2').textContent = method === 'double' ? T.h2_note.replaceAll('{r}', secondPrime(m)) : '';
}
form.addEventListener('input', e => { if (e.target.name !== 'example') update(); });
form.elements.example.addEventListener('change', () => {
  const ex = T.examples[Number(form.elements.example.value)];
  if (!ex) return;
  form.elements.keys.value = ex.keys; form.elements.m.value = String(ex.m); form.elements.method.value = ex.method; form.elements.find.value = ex.find ?? '';
  update();
});
form.addEventListener('submit', e => e.preventDefault());
form.elements.example.value = '0';
form.elements.example.dispatchEvent(new Event('change'));
