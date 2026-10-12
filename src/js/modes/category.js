// 分野別：その分野の問題をすべてランダムな順で出題
import { shuffle } from '../util.js';

export default {
  id: 'category',
  label: 'この分野を解く',
  desc: 'この分野の問題をすべて、ランダムな順で出題します',
  order: 1,
  scope: ['category'],          // 表示する場所: 'top' = トップページ, 'category' = 分野ページ
  feedback: 'instant',          // 'instant' = 1問ごとに解説, 'end' = 最後にまとめて解説
  cats: params => [params.c],   // 読み込む分野（省略すると全分野）
  pick: pool => shuffle(pool),
};
