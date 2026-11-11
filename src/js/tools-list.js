// 計算ツールの一覧(/tools/): 上部に「お気に入り」と「最近使ったツール」を出す(このブラウザに保存したものだけ)
import { toolFavs, recentTools } from './store.js';

const root = document.querySelector('[data-tool-mine]');
const card = id => document.querySelector(`.tool-all [data-tool="${CSS.escape(id)}"]`);
function fill(name, ids) {
  const box = root.querySelector(`[data-list="${name}"]`);
  const cards = ids.map(card).filter(Boolean);
  box.querySelector('.mode-grid').replaceChildren(...cards.map(c => c.cloneNode(true)));
  box.hidden = !cards.length;
  return cards.length;
}
if (root) {
  const fav = toolFavs();
  const n = fill('fav', fav) + fill('recent', recentTools().filter(id => !fav.includes(id)));
  root.hidden = !n;
}

// 絞り込み: 入力した語をすべて含むカードだけを残し、カードが1つもない分野は見出しごと隠す
const filter = document.querySelector('[data-tools-filter]');
const none = document.querySelector('[data-tools-none]');
const norm = s => s.toLowerCase().normalize('NFKC');
filter?.addEventListener('input', () => {
  const words = norm(filter.value).split(/\s+/).filter(Boolean);
  let shown = 0;
  for (const sec of document.querySelectorAll('.tools-group')) {
    let n = 0;
    for (const a of sec.querySelectorAll('.tool-card')) {
      const hit = words.every(w => norm(a.textContent).includes(w));
      a.hidden = !hit;
      if (hit) n++;
    }
    sec.hidden = !n;
    // 分野の欄は開閉式。絞り込み中は当たりのある欄を開き、絞り込みをやめたら閉じる
    if (sec.tagName === 'DETAILS') sec.open = words.length > 0 && n > 0;
    const count = sec.querySelector('[data-count]');
    if (count) count.textContent = n;
    shown += n;
  }
  if (none) none.hidden = shown > 0;
});

// 一覧の開き方: PC(幅900px以上)は全部の大分類を開いて一目で見渡せるようにし、スマホは最初の大分類だけ開く。
// URL に #tg-… があるときは open-hash.js がその大分類を開く
const groups = [...document.querySelectorAll('details.tools-group')];
if (groups.length && !location.hash) {
  if (matchMedia('(min-width: 900px)').matches) groups.forEach(d => (d.open = true));
  else groups[0].open = true;
}
