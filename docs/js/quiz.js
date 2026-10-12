// クイズ画面。選択肢の数に依存しない（2択・3択・4択…すべて同じ処理）
import { h, home, getData, makeT, loc } from './dom.js';
import * as store from './store.js';
import modes from './modes/index.js';

const app = document.getElementById('quiz');
const params = Object.fromEntries(new URLSearchParams(location.search));
const mode = modes.find(m => m.id === params.mode) || modes.find(m => m.id === 'random');
const index = await getData('index.json');
const t = makeT(index.strings);
const catName = id => index.categories.find(c => c.id === id)?.name ?? '';
const title = loc(mode.label) + (params.c ? ` : ${catName(params.c)}` : '');
const homeUrl = params.c ? `${home}c/${params.c}/` : home;

let qs, i, answers, done;
start();

async function start() {
  const ids = mode.cats ? mode.cats(params, index) : index.categories.map(c => c.id);
  const pool = (await Promise.all(ids.map(id =>
    getData(`q/${id}.json`).then(list => list.map(q => ({ ...q, cat: id })))))).flat();
  qs = mode.pick(pool, params, { store });
  i = 0;
  answers = [];
  document.title = `${title} | ${document.title.split(' | ').pop()}`;
  if (!qs.length) {
    app.replaceChildren(
      h('h1', {}, title),
      h('p', {}, loc(mode.empty) || t('no_questions')),
      h('a', { class: 'btn btn-primary', href: homeUrl }, t('back')));
    return;
  }
  show();
}

function show() {
  const q = qs[i];
  done = false;
  const buttons = q.choices.map((text, n) =>
    h('button', { class: 'choice', type: 'button', onclick: () => answer(n) },
      h('span', { class: 'choice-mark' }, String.fromCharCode(65 + n)),
      h('span', { class: 'choice-text' }, text)));

  app.replaceChildren(
    h('div', { class: 'quiz-head' },
      h('span', { class: 'quiz-title' }, title),
      h('span', { class: 'quiz-count' }, `${i + 1} / ${qs.length}`)),
    h('div', { class: 'progress' }, h('div', { class: 'progress-bar', style: `width:${(i / qs.length) * 100}%` })),
    h('p', { class: 'q-cat' }, catName(q.cat)),
    h('h1', { class: 'q-text' }, q.question),
    h('div', { class: 'choices' }, buttons),
    h('div', { class: 'feedback', hidden: true }));
  window.scrollTo(0, 0);
}

function answer(n) {
  if (done) return;
  done = true;
  const q = qs[i];
  const ok = n === q.answer;
  store.record(q.id, q.cat, ok);
  answers.push({ q, choice: n, ok });

  const buttons = app.querySelectorAll('.choice');
  buttons.forEach(b => (b.disabled = true));
  app.querySelector('.progress-bar').style.width = `${((i + 1) / qs.length) * 100}%`;

  if (mode.feedback === 'end') {
    buttons[n].classList.add('selected');
    setTimeout(next, 300);
    return;
  }

  buttons[q.answer].classList.add('correct');
  if (!ok) buttons[n].classList.add('wrong');
  const fb = app.querySelector('.feedback');
  const last = i === qs.length - 1;
  fb.replaceChildren(
    h('p', { class: `verdict ${ok ? 'ok' : 'ng'}` }, ok ? t('correct') : t('incorrect', { mark: String.fromCharCode(65 + q.answer) })),
    h('p', { class: 'explanation' }, q.explanation),
    h('button', { class: 'btn btn-primary btn-block', type: 'button', onclick: next }, last ? t('see_result') : t('next')));
  fb.className = `feedback ${ok ? 'ok' : 'ng'}`;
  fb.hidden = false;
  fb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function next() {
  i++;
  if (i < qs.length) show();
  else result();
}

function result() {
  const score = answers.filter(a => a.ok).length;
  const total = answers.length;
  const pct = Math.round((score / total) * 100);
  store.addHistory({ mode: mode.id, c: params.c || null, score, total });
  const msg = t(pct >= 80 ? 'msg_good' : pct >= 60 ? 'msg_mid' : 'msg_low');
  const wrong = total - score;

  app.replaceChildren(
    h('div', { class: 'result' },
      h('p', { class: 'quiz-title' }, title),
      h('h1', {}, t('result')),
      h('p', { class: 'score' }, h('b', {}, score), t('score_total', { total })),
      h('p', { class: 'score-pct' }, t('rate_pct', { pct })),
      h('p', {}, msg),
      h('div', { class: 'actions' },
        wrong > 0 && h('a', { class: 'btn btn-primary', href: `${home}quiz/?mode=weak${params.c ? `&c=${params.c}` : ''}` }, t('retry_wrong')),
        h('button', { class: `btn ${wrong ? 'btn-ghost' : 'btn-primary'}`, type: 'button', onclick: start }, t('again')),
        h('a', { class: 'btn btn-ghost', href: homeUrl }, t(params.c ? 'to_category' : 'to_top')))),
    h('h2', {}, t('review_heading')),
    h('ol', { class: 'review' }, answers.map(({ q, choice, ok }) =>
      h('li', { class: ok ? 'ok' : 'ng' },
        h('details', { open: !ok },
          h('summary', {}, h('span', { class: 'badge' }, ok ? '○' : '×'), q.question),
          h('ul', { class: 'review-choices' }, q.choices.map((c, n) =>
            h('li', { class: n === q.answer ? 'is-answer' : n === choice ? 'is-chosen' : '' },
              `${String.fromCharCode(65 + n)}. ${c}`,
              n === q.answer ? t('mark_correct') : n === choice ? t('mark_yours') : ''))),
          h('p', { class: 'explanation' }, q.explanation))))));
  window.scrollTo(0, 0);
}

// キーボード操作: 数字キーで選択、Enterで次へ
document.addEventListener('keydown', e => {
  if (!qs?.length || i >= qs.length) return;
  const n = Number(e.key) - 1;
  if (!done && n >= 0 && n < qs[i].choices.length) answer(n);
  else if (done && e.key === 'Enter' && mode.feedback !== 'end') {
    e.preventDefault();
    next();
  }
});
