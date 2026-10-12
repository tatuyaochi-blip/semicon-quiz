// 成績ページ
import { h, base, getJSON } from './dom.js';
import * as store from './store.js';
import modes from './modes/index.js';

const root = document.getElementById('stats');
const index = await getJSON('data/index.json');
const catName = id => index.categories.find(c => c.id === id)?.name;
const pct = rate => (rate == null ? '—' : `${rate}%`);

render();

function render() {
  const all = store.stats();
  const total = index.categories.reduce((s, c) => s + c.count, 0);
  const history = store.history().slice(0, 10);

  root.replaceChildren(h('div', {},
    h('div', { class: 'stat-tiles' },
      tile(pct(all.rate), '全体の正答率'),
      tile(`${all.answered}`, `解いた問題 / ${total}問`),
      tile(`${all.weak}`, '苦手問題'),
      tile(`${store.history().length}`, '挑戦回数')),
    all.weak > 0 && h('p', {}, h('a', { class: 'btn btn-primary', href: `${base}quiz/?mode=weak` }, `苦手問題を解く（${all.weak}問）`)),

    index.exams.map(e => e.groups.map(g =>
      h('section', {},
        h('h2', {}, g.name),
        h('div', { class: 'stat-rows' }, index.categories.filter(c => c.exam === e.id && c.group === g.id).map(c => {
          const s = store.stats(c.id);
          return h('div', { class: 'stat-row' },
            h('a', { class: 'stat-name', href: `${base}c/${c.id}/` }, c.name),
            h('div', { class: 'meter' }, h('div', { class: 'meter-bar', style: `width:${s.rate ?? 0}%` })),
            h('span', { class: 'stat-pct' }, pct(s.rate)),
            h('span', { class: 'stat-sub' }, `${s.answered}/${c.count}問`,
              s.weak > 0 && h('a', { href: `${base}quiz/?mode=weak&c=${c.id}` }, ` 苦手${s.weak}`)));
        }))))),

    h('section', {},
      h('h2', {}, '最近の挑戦'),
      history.length
        ? h('ul', { class: 'history' }, history.map(x => h('li', {},
          h('span', { class: 'muted' }, new Date(x.at).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })),
          h('span', {}, (modes.find(m => m.id === x.mode)?.label ?? x.mode) + (x.c ? `：${catName(x.c)}` : '')),
          h('b', {}, `${x.score}/${x.total}`))))
        : h('p', { class: 'muted' }, 'まだ挑戦の記録がありません。')),

    h('section', {},
      h('h2', {}, '記録のリセット'),
      h('button', {
        class: 'btn btn-ghost', type: 'button',
        onclick: () => {
          if (confirm('すべての解答記録を削除します。よろしいですか？')) {
            store.reset();
            render();
          }
        },
      }, 'すべての記録を削除'))));
}

function tile(num, label) {
  return h('div', { class: 'tile' }, h('span', { class: 'tile-num' }, num), h('span', { class: 'tile-label' }, label));
}
