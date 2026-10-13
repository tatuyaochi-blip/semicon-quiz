// 分野ページの難易度の絞り込み: 問題一覧と「この分野を解く」のリンクに反映する
const buttons = document.querySelectorAll('[data-level-btn]');
const solve = document.querySelector('.mode-card[href*="mode=category"]');

for (const b of buttons) {
  b.addEventListener('click', () => {
    const lv = b.dataset.levelBtn;
    buttons.forEach(x => x.setAttribute('aria-pressed', x === b));
    document.querySelectorAll('.q-list li').forEach(li => (li.hidden = lv && li.dataset.level !== lv));
    const url = new URL(solve.href);
    if (lv) url.searchParams.set('level', lv);
    else url.searchParams.delete('level');
    solve.href = url.href;
  });
}
