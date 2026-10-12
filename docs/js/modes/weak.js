// 苦手問題：直近で間違えた問題を出題（分野ページからは、その分野だけ）
import { shuffle } from '../util.js';

export default {
  id: 'weak',
  label: '苦手問題',
  desc: '直近で間違えた問題だけを解き直します',
  order: 3,
  scope: ['top', 'category'],
  feedback: 'instant',
  cats: (params, index) => (params.c ? [params.c] : index.categories.map(c => c.id)),
  pick: (pool, params, { store }) => shuffle(pool.filter(q => store.isWeak(q.id))),
  empty: 'いま苦手な問題はありません。ほかのモードで問題を解いてみましょう。',
};
