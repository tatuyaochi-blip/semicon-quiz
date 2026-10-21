// 順序回路の状態遷移(入力は 0 と 1)。表 m = { type: 'moore' | 'mealy', states: [{ name, next: [入力0の行き先, 入力1の行き先], out }] }
// out は、ムーア型なら状態の出力(文字列)、ミーリ型なら [入力0のときの出力, 入力1のときの出力]。最初の状態から始める

// 入力の列を順に与え、たどった状態と出力を返す(ムーア型の出力は、その時点の状態の出力)
export function simulate(m, input) {
  let s = 0;
  const steps = [];
  for (const ch of input) {
    const x = Number(ch);
    const next = m.states[s].next[x];
    const out = m.type === 'mealy' ? m.states[s].out[x] : m.states[next].out;
    steps.push({ from: s, x, to: next, out });
    s = next;
  }
  return steps;
}

// 最初の状態からたどり着ける状態
export function reachable(m) {
  const seen = new Set([0]), stack = [0];
  while (stack.length) for (const t of m.states[stack.pop()].next) if (!seen.has(t)) { seen.add(t); stack.push(t); }
  return seen;
}

// 状態の最小化(分割を細かくしていく方法)。たどり着けない状態を除いてから、
// 出力が同じものを同じ組に入れ、行き先の組が違うものを分けることを、変わらなくなるまで繰り返す。
// 返り値の groups は同じ働きをする状態の組(元の番号)、rounds は各段階の分け方
export function minimize(m) {
  const live = [...reachable(m)].sort((a, b) => a - b);
  const sig0 = i => JSON.stringify(m.type === 'mealy' ? m.states[i].out : m.states[i].out);
  let cls = new Map(live.map(i => [i, sig0(i)]));
  const norm = c => { const ids = new Map(); const r = new Map(); for (const i of live) { const k = c.get(i); if (!ids.has(k)) ids.set(k, ids.size); r.set(i, ids.get(k)); } return r; };
  cls = norm(cls);
  const rounds = [cls];
  for (;;) {
    const next = norm(new Map(live.map(i => [i, JSON.stringify([cls.get(i), ...m.states[i].next.map(t => cls.get(t))])])));
    const count = c => new Set(c.values()).size;
    if (count(next) === count(cls)) break;
    cls = next; rounds.push(cls);
  }
  const groups = [];
  for (const i of live) (groups[cls.get(i)] ??= []).push(i);
  return { groups, rounds, unreachable: m.states.map((_, i) => i).filter(i => !cls.has(i)) };
}

// 最小化した表(組の代表に名前をまとめる)
export function reduced(m) {
  const { groups } = minimize(m);
  const of = new Map();
  groups.forEach((g, k) => g.forEach(i => of.set(i, k)));
  return {
    type: m.type,
    states: groups.map(g => ({ name: g.map(i => m.states[i].name).join('='), next: m.states[g[0]].next.map(t => of.get(t)), out: m.states[g[0]].out })),
  };
}

// 例
export const EXAMPLES = {
  // 1 が2回続いたら 1 を出す(ムーア型)
  ones: { type: 'moore', states: [{ name: 'S0', next: [0, 1], out: '0' }, { name: 'S1', next: [0, 2], out: '0' }, { name: 'S2', next: [0, 2], out: '1' }], input: '0110111' },
  // 入力を上位桁から2進数として読み、3で割った余りを状態にする(余り0のとき 1 を出す)
  mod3: { type: 'moore', states: [{ name: 'R0', next: [0, 1], out: '1' }, { name: 'R1', next: [2, 0], out: '0' }, { name: 'R2', next: [1, 2], out: '0' }], input: '1001' },
  // 「101」を見つけたら 1 を出す(ミーリ型。重なりも数える)
  seq101: { type: 'mealy', states: [{ name: 'A', next: [0, 1], out: ['0', '0'] }, { name: 'B', next: [2, 1], out: ['0', '0'] }, { name: 'C', next: [0, 1], out: ['0', '1'] }], input: '1010110' },
  // 偶奇(1 の個数が奇数なら 1)
  parity: { type: 'moore', states: [{ name: 'EVEN', next: [0, 1], out: '0' }, { name: 'ODD', next: [1, 0], out: '1' }], input: '1101' },
  // 無駄な状態を含む表(最小化の練習)
  redundant: { type: 'moore', states: [{ name: 'A', next: [1, 2], out: '0' }, { name: 'B', next: [3, 4], out: '0' }, { name: 'C', next: [3, 4], out: '0' }, { name: 'D', next: [1, 2], out: '1' }, { name: 'E', next: [1, 2], out: '1' }, { name: 'F', next: [5, 0], out: '0' }], input: '0101' },
};
