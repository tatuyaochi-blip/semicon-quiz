// トップ・分野ページの正答率表示
import * as store from './store.js';

for (const el of document.querySelectorAll('[data-rate]')) {
  const { rate } = store.stats(el.dataset.rate);
  if (rate != null) el.textContent = `${rate}%`;
}
for (const el of document.querySelectorAll('[data-answered]')) {
  el.textContent = store.stats(el.dataset.answered).answered;
}
