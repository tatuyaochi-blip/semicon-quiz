// 分野別：その分野の問題をすべてランダムな順で出題
import { shuffle } from '../util.js';

export default {
  id: 'category',
  label: { ja: 'この分野を解く', en: 'Practice this topic', zh: '练习本领域' },
  desc: { ja: 'この分野の問題をすべて、ランダムな順で出題します', en: 'All questions in this topic, in random order', zh: '按随机顺序练习本领域的全部题目' },
  order: 1,
  scope: ['category'],          // 表示する場所: 'top' = トップページ, 'category' = 分野ページ
  feedback: 'instant',          // 'instant' = 1問ごとに解説, 'end' = 最後にまとめて解説
  cats: params => [params.c],   // 読み込む分野（省略すると全分野）
  pick: (pool, params) => shuffle(params.level ? pool.filter(q => String(q.level) === params.level) : pool), // &level=1〜3 で難易度を絞る
};
