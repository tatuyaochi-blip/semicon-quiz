// ランダム：全分野から10問
import { sample } from '../util.js';

export default {
  id: 'random',
  label: 'ランダム10問',
  desc: '全分野からランダムに10問。すきま時間の腕試しに',
  order: 2,
  scope: ['top'],
  feedback: 'instant',
  pick: pool => sample(pool, 10),
};
