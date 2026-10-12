// 模擬試験：全分野から30問。解説は最後にまとめて表示
import { sample } from '../util.js';

export default {
  id: 'exam',
  label: '模擬試験（30問）',
  desc: '全分野から30問。解説は最後にまとめて表示します',
  order: 4,
  scope: ['top'],
  feedback: 'end',
  pick: pool => sample(pool, 30),
};
