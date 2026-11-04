// 7言語の対訳表: 表示する言語の列をボタンで選ぶ。1〜4言語まで。選んだ言語はブラウザに保存し、ほかの区分のページでも使う
const KEY = 'mlCols';
const tables = [...document.querySelectorAll('table.ml')];
const buttons = [...document.querySelectorAll('[data-ml]')];
const MAX = 4;

function apply(list) {
  for (const t of tables) t.dataset.show = list.join(' ');
  for (const b of buttons) b.setAttribute('aria-pressed', String(list.includes(b.dataset.ml)));
}
let cols = tables[0]?.dataset.show.split(' ') ?? [];
try {
  const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
  if (Array.isArray(saved) && saved.length && saved.every(x => buttons.some(b => b.dataset.ml === x))) cols = saved;
} catch {}
apply(cols);

for (const b of buttons) {
  b.addEventListener('click', () => {
    const x = b.dataset.ml;
    if (cols.includes(x)) { if (cols.length > 1) cols = cols.filter(y => y !== x); }
    else cols = [...cols, x].slice(-MAX);
    apply(cols);
    try { localStorage.setItem(KEY, JSON.stringify(cols)); } catch {}
  });
}
