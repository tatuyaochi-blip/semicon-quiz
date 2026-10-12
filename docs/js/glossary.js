// 用語集の絞り込み検索（カタカナ/ひらがな・全角/半角の違いは無視）
const norm = s => s.normalize('NFKC').toLowerCase()
  .replace(/[ァ-ヶ]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60));

const input = document.getElementById('glossary-q');
const count = document.getElementById('glossary-count');
const items = [...document.querySelectorAll('.term')].map(el => ({ el, text: norm(el.textContent) }));

function filter() {
  const words = norm(input.value).split(/\s+/).filter(Boolean);
  let n = 0;
  for (const { el, text } of items) {
    const hit = words.every(w => text.includes(w));
    el.hidden = !hit;
    if (hit) n++;
  }
  count.textContent = `${n}件`;
}

input.addEventListener('input', filter);
filter();
