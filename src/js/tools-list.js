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
    shown += n;
  }
  if (none) none.hidden = shown > 0;
});
