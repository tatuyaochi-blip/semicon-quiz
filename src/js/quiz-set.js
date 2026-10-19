// 問題セットを作るページ。選んだ分野から指定数の問題を選び、?mode=set&ids=… のURLを発行する(データベースは使わない)
import { getData, home } from './dom.js';
import { shuffle } from './util.js';

const form = document.getElementById('qs-form');
const out = document.getElementById('qs-out');
const urlBox = document.getElementById('qs-url');
const boxes = () => [...form.querySelectorAll('input[name="c"]')];

form.querySelector('[data-all]').addEventListener('click', () => boxes().forEach(b => (b.checked = true)));
form.querySelector('[data-none]').addEventListener('click', () => boxes().forEach(b => (b.checked = false)));

form.addEventListener('submit', async e => {
  e.preventDefault();
  const cats = boxes().filter(b => b.checked).map(b => b.value);
  if (!cats.length) { boxes()[0]?.focus(); return; }
  const n = Number(form.elements.n.value) || 10;
  // 分野ごとにシャッフルし、分野を順番に回しながら1問ずつ取る(分野が偏らないように)
  const lists = (await Promise.all(cats.map(c => getData(`q/${c}.json`).catch(() => [])))).map(list => shuffle(list.map(q => q.id)));
  const ids = [];
  for (let i = 0; ids.length < n && lists.some(l => l.length); i++) {
    const l = lists[i % lists.length];
    if (l.length) ids.push(l.pop());
  }
  // 問題IDは英数字とハイフンだけなので、区切りのカンマはエンコードせずに読みやすく残す
  const t = form.elements.t.value.trim();
  const url = new URL(`${home}quiz/?mode=set&ids=${shuffle(ids).join(',')}${t ? `&t=${encodeURIComponent(t)}` : ''}`, location.href).href;
  urlBox.value = url;
  document.getElementById('qs-open').href = url;
  out.hidden = false;
  out.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});

document.getElementById('qs-copy').addEventListener('click', async e => {
  const btn = e.currentTarget;
  try { await navigator.clipboard.writeText(urlBox.value); } catch { urlBox.select(); document.execCommand?.('copy'); }
  const label = btn.textContent;
  btn.textContent = btn.dataset.done;
  setTimeout(() => (btn.textContent = label), 1500);
});
