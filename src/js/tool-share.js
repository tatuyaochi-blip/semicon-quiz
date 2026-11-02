// 計算ツールの共通の機能: 入力をURLのクエリに残す(共有・ブックマーク用)、結果のコピー、お気に入りと最近使ったツール。
// 各ツールの {id}.js より先に読み込み、URLの値を入力欄に入れてから計算させる
import { isToolFav, toggleToolFav, useTool } from './store.js';

const bar = document.querySelector('[data-tool-id]');
const id = bar?.dataset.toolId;
const form = document.querySelector('.dy form');
// URLに残すのは数値の入力欄と選択肢、それに data-share を付けたチェックボックス(テキストは使わない)
const isBox = el => el.type === 'checkbox';
const fields = bar?.dataset.share != null && form ? [...form.elements].filter(el => el.name && (el.tagName === 'SELECT' || el.type === 'number' || (isBox(el) && el.dataset.share != null))) : [];
const initial = el => (el.tagName === 'SELECT' ? ([...el.options].find(o => o.defaultSelected) ?? el.options[0])?.value : isBox(el) ? (el.defaultChecked ? '1' : '0') : el.defaultValue);
const valueOf = el => (isBox(el) ? (el.checked ? '1' : '0') : el.value);

// URLの値を入力欄へ(選べない値や数値でない値は無視する)
const params = new URLSearchParams(location.search);
for (const el of fields) {
  if (!params.has(el.name)) continue;
  const v = params.get(el.name).trim();
  if (isBox(el)) { if (v === '1' || v === '0') el.checked = v === '1'; continue; }
  if (el.tagName === 'SELECT' ? [...el.options].some(o => o.value === v) : v !== '' && Number.isFinite(Number(v))) el.value = v;
}

// 入力が変わるたびにURLを書き換える。既定値のままならクエリなし、1つでも変えたら全部の値を入れる(既定値が変わっても同じ結果になるように)
function sync() {
  const changed = fields.some(el => valueOf(el) !== initial(el));
  const query = changed ? `?${fields.map(el => `${el.name}=${encodeURIComponent(valueOf(el))}`).join('&')}` : '';
  history.replaceState(history.state, '', location.pathname + query + location.hash);
  // 言語の切り替え先にも同じ条件を渡す
  document.querySelectorAll('.lang-switch a').forEach(a => { a.search = query; });
}
if (fields.length) {
  // 各ツールが入力に合わせてほかの欄を書き換えることがあるので、それが済んでから書き換える
  form.addEventListener('input', () => setTimeout(sync));
  form.addEventListener('change', () => setTimeout(sync));
  sync();
}

// 例の条件のボタン: 値を入力欄に入れて計算し直す。押した例は手で値を変えるまで選択中の表示にする
const presetBtns = form ? [...form.querySelectorAll('[data-preset]')] : [];
const presetOf = btn => { try { return JSON.parse(btn.dataset.preset); } catch { return {}; } };
const matches = v => Object.entries(v).every(([k, val]) => {
  const el = form.elements[k];
  return !el || (el.type === 'checkbox' ? el.checked === !!val : Number(el.value) === Number(val) || el.value === String(val));
});
const markPresets = () => presetBtns.forEach(b => b.setAttribute('aria-pressed', String(matches(presetOf(b)))));
for (const btn of presetBtns) {
  btn.addEventListener('click', () => {
    for (const [k, val] of Object.entries(presetOf(btn))) {
      const el = form.elements[k];
      if (!el) continue;
      if (el.type === 'checkbox') el.checked = !!val; else el.value = String(val);
    }
    form.dispatchEvent(new Event('input', { bubbles: true }));
    form.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
if (presetBtns.length) {
  form.addEventListener('input', () => setTimeout(markPresets));
  form.addEventListener('change', () => setTimeout(markPresets));
  markPresets();
}

// スマートフォンでは説明文を3行に縮めて表示し、押すと全文を開く(CSS の line-clamp と組み合わせる)。
// 縮めているときだけボタンとして扱い、キーボードでも開けるようにする。文字を選んでいるときは開閉しない
const lead = document.querySelector('.tool-hero .lead');
if (lead) {
  const clamped = () => lead.classList.contains('open') || lead.scrollHeight > lead.clientHeight + 2;
  const setup = () => {
    if (clamped()) { lead.setAttribute('role', 'button'); lead.tabIndex = 0; lead.setAttribute('aria-expanded', String(lead.classList.contains('open'))); }
    else { lead.removeAttribute('role'); lead.removeAttribute('tabindex'); lead.removeAttribute('aria-expanded'); }
  };
  const toggle = () => { if (!clamped()) return; lead.classList.toggle('open'); setup(); };
  lead.addEventListener('click', () => { if (!String(getSelection?.() ?? '')) toggle(); });
  lead.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && lead.getAttribute('role') === 'button') { e.preventDefault(); toggle(); } });
  setup();
  addEventListener('resize', setup);
}

async function copy(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch {}
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.append(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch {}
  ta.remove();
  return ok;
}
function flash(btn) {
  const old = btn.textContent;
  btn.textContent = btn.dataset.done;
  setTimeout(() => { btn.textContent = old; }, 1800);
}

// 結果のテキスト: ツール名、入力(ラベル: 値)、結果(見出し: 値。表は計算結果の入る表だけをタブ区切りで)、URL
const clean = el => el?.textContent.trim().replace(/\s+/g, ' ') ?? '';
function resultText() {
  const lines = [clean(document.querySelector('h1')), ''];
  const inHead = form?.querySelector('h2');
  if (inHead) lines.push(`[${clean(inHead)}]`);
  for (const el of fields) {
    if (isBox(el)) { if (el.checked) lines.push(clean(el.closest('label'))); continue; }
    lines.push(`${clean(el.closest('label')?.querySelector('span'))}: ${el.tagName === 'SELECT' ? clean(el.selectedOptions[0]) : el.value}`);
  }
  for (const sec of document.querySelectorAll('.dy .dy-out:not(#sweep)')) {
    if (sec.hidden || !sec.querySelector('[data-out]')) continue;
    lines.push('', `[${clean(sec.querySelector('h2'))}]`);
    for (const d of sec.querySelectorAll('.dy-stats > div')) lines.push(`${clean(d.querySelector('dt'))}: ${clean(d.querySelector('dd'))}`);
    for (const table of sec.querySelectorAll('table')) {
      if (!table.querySelector('[data-out]')) continue;
      for (const row of table.rows) lines.push([...row.cells].map(clean).join('\t'));
    }
  }
  lines.push('', location.href);
  return lines.join('\n');
}

if (bar) {
  bar.hidden = false;
  const fav = bar.querySelector('[data-fav]');
  const showFav = () => {
    const on = isToolFav(id);
    fav.textContent = on ? fav.dataset.on : fav.dataset.off;
    fav.setAttribute('aria-pressed', String(on));
  };
  fav.addEventListener('click', () => { toggleToolFav(id); showFav(); });
  showFav();
  bar.querySelector('[data-copy-result]')?.addEventListener('click', async e => {
    const btn = e.currentTarget; // await のあとは currentTarget が null になる
    if (await copy(resultText())) flash(btn);
  });
  bar.querySelector('[data-share]')?.addEventListener('click', async e => {
    const btn = e.currentTarget;
    if (navigator.share) {
      try { await navigator.share({ title: document.title, url: location.href }); return; } catch (err) { if (err.name === 'AbortError') return; }
    }
    if (await copy(location.href)) flash(btn);
  });
  useTool(id);
}
