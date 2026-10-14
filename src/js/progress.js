// トップ・分野ページの正答率と復習の表示
import * as store from './store.js';

for (const el of document.querySelectorAll('[data-rate]')) {
  const { rate } = store.stats(el.dataset.rate);
  if (rate != null) el.textContent = `${rate}%`;
}
for (const el of document.querySelectorAll('[data-answered]')) {
  el.textContent = store.stats(el.dataset.answered).answered;
}

// トップページの連続学習日数と、今日の1問を解いたかどうか
const streakEl = document.querySelector('[data-streak]');
if (streakEl && store.streak()) {
  streakEl.textContent = streakEl.dataset.streak.replace('{n}', store.streak());
  streakEl.hidden = false;
}
const daily = document.querySelector('.mode-card[href*="mode=daily"]');
if (daily && streakEl && store.dailyDone()) {
  daily.classList.add('done');
  daily.querySelector('strong').append(` ✓ ${streakEl.dataset.dailyDone}`);
}

// トップページの「今日の復習 n問」(0問なら出さない)
const due = document.querySelector('[data-review-due]');
if (due && store.dueCount()) {
  due.textContent = due.dataset.reviewDue.replace('{n}', store.dueCount());
  due.parentElement.hidden = false;
}
