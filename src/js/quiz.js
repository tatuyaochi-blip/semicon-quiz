// クイズ画面。選択肢の数に依存しない（2択・3択・4択…すべて同じ処理）
import { h, home, getData, makeT } from './dom.js';
import * as store from './store.js';
import modes from './modes/index.js';
import { termMatcher, linkTerms, reportUrl, shuffle } from './util.js';
import { diagnosisReport } from './diagnosis.js';

const app = document.getElementById('quiz');
const params = Object.fromEntries(new URLSearchParams(location.search));
const mode = modes.find(m => m.id === params.mode) || modes.find(m => m.id === 'random');
const index = await getData('index.json');
const t = makeT(index.strings);
const catName = id => index.categories.find(c => c.id === id)?.name ?? '';
const label = index.modes[mode.id].label;
// ?c= が存在しない分野(古いリンクなど)のときは、分野の指定がないものとして扱う
const cat = index.categories.find(c => c.id === params.c);
const title = label + (cat ? ` : ${cat.name}` : '');
const homeUrl = cat ? `${home}c/${cat.id}/` : home;
const matcher = termMatcher(index.glossary);

// 図: ビルド時に作った SVG をそのまま入れる
const figure = svg => {
  const el = h('figure', { class: 'fig' });
  el.innerHTML = svg;
  return el;
};

// 解説文(用語集の語にリンク)、図、選択肢ごとの補足(choiceNotes)、誤り報告リンク
const explain = q => h('div', {},
  h('p', { class: 'explanation' }, linkTerms(q.explanation, matcher).map(p => (typeof p === 'string' ? p
    : h('a', { class: 'term-link', href: `${home}glossary/#${encodeURIComponent(p.id)}` }, p.text)))),
  q.figureSvg && figure(q.figureSvg),
  q.choiceNotes && h('ul', { class: 'choice-notes' }, q.choiceNotes.map((note, n) =>
    note && h('li', {}, h('b', {}, `${String.fromCharCode(65 + n)}. `), note))),
  index.reportFormUrl && h('p', { class: 'q-report' },
    h('a', { class: 'report-link', href: reportUrl(index.reportFormUrl, q.id, index.lang), target: '_blank', rel: 'noopener' }, t('report_error'))));

// 言語を切り替えても同じ出題条件(?mode=…&c=…)のままにする
document.querySelectorAll('.lang-switch a').forEach(a => (a.search = location.search));

let qs, i, answers, done, loadError;
start();

// retry を渡すと、その問題だけを出し直す(結果画面の「間違えた問題を解き直す」)
async function start(retry) {
  if (retry) qs = shuffle(retry);
  else {
    const known = new Set(index.categories.map(c => c.id));
    const ids = (mode.cats ? mode.cats(params, index) : [...known]).filter(id => known.has(id));
    try {
      const pool = (await Promise.all(ids.map(id =>
        getData(`q/${id}.json`).then(list => list.map(q => ({ ...q, cat: id })))))).flat();
      qs = mode.pick(pool, params, { store });
    } catch {
      qs = []; // 問題データを読めない(オフラインで未保存など)
      loadError = true;
    }
  }
  i = 0;
  answers = [];
  document.title = `${title} | ${document.title.split(' | ').pop()}`;
  if (!qs.length) {
    app.replaceChildren(
      h('h1', {}, title),
      h('p', {}, (!loadError && index.modes[mode.id].empty) || t('no_questions')),
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
    explain(q),
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
  store.addHistory({ mode: mode.id, c: cat?.id ?? null, score, total });
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
        // 今回間違えた問題だけを、この画面のまま出し直す(過去の苦手問題は混ぜない)
        wrong > 0 && h('button', { class: 'btn btn-primary', type: 'button', onclick: () => start(answers.filter(a => !a.ok).map(a => a.q)) }, t('retry_wrong')),
        h('button', { class: `btn ${wrong ? 'btn-ghost' : 'btn-primary'}`, type: 'button', onclick: () => start() }, t('again')),
        h('a', { class: 'btn btn-ghost', href: homeUrl }, t(cat ? 'to_category' : 'to_top')),
        shareButton(score, total))),
    mode.report === 'diagnosis' && diagnosisReport(answers, index, t),
    h('h2', {}, t('review_heading')),
    h('ol', { class: 'review' }, answers.map(({ q, choice, ok }) =>
      h('li', { class: ok ? 'ok' : 'ng' },
        h('details', { open: !ok },
          h('summary', {}, h('span', { class: 'badge' }, ok ? '○' : '×'), q.question),
          h('ul', { class: 'review-choices' }, q.choices.map((c, n) =>
            h('li', { class: n === q.answer ? 'is-answer' : n === choice ? 'is-chosen' : '' },
              `${String.fromCharCode(65 + n)}. ${c}`,
              n === q.answer ? t('mark_correct') : n === choice ? t('mark_yours') : ''))),
          explain(q))))));
  window.scrollTo(0, 0);
}

// 結果の共有: Web Share API、使えなければ X の共有リンク
function shareButton(score, total) {
  const text = t('share_text', { title: cat ? cat.name : label, score, total, site: index.siteName });
  const url = new URL(homeUrl, location.href).href;
  if (navigator.share) {
    return h('button', { class: 'btn btn-ghost', type: 'button', onclick: () => navigator.share({ text, url }).catch(() => {}) }, t('share'));
  }
  return h('a', { class: 'btn btn-ghost', href: `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, target: '_blank', rel: 'noopener' }, t('share'));
}

// キーボード操作: 数字キーで選択、Enterで次へ
document.addEventListener('keydown', e => {
  // Ctrl+1 などブラウザのショートカット、キーの押しっぱなしでは反応しない
  if (!qs?.length || i >= qs.length || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
  const n = Number(e.key) - 1;
  if (!done && n >= 0 && n < qs[i].choices.length) answer(n);
  else if (done && e.key === 'Enter' && mode.feedback !== 'end') {
    e.preventDefault();
    next();
  }
});
