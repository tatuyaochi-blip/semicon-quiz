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
  // 埋め込みコード: ?embed=1 を付けた iframe と、サイトへのリンク(iframe を読めない環境でも出典がわかるように)
  const embed = document.getElementById('qs-embed');
  if (embed) {
    const esc = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    const site = new URL(home, location.href).href;
    embed.value = `<iframe src="${esc(`${url}&embed=1`)}" title="${esc(t || embed.dataset.site)}" width="100%" height="640" style="border:1px solid #ddd;border-radius:8px" loading="lazy"></iframe>\n<p><a href="${esc(site)}">${esc(embed.dataset.site)}</a></p>`;
  }
  out.hidden = false;
  out.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});

// コピーボタン(URL と埋め込みコード)
const copyFrom = box => async e => {
  const btn = e.currentTarget;
  try { await navigator.clipboard.writeText(box.value); } catch { box.select(); document.execCommand?.('copy'); }
  const label = btn.textContent;
  btn.textContent = btn.dataset.done;
  setTimeout(() => (btn.textContent = label), 1500);
};
document.getElementById('qs-embed-copy')?.addEventListener('click', copyFrom(document.getElementById('qs-embed')));
document.getElementById('qs-copy').addEventListener('click', copyFrom(urlBox));
