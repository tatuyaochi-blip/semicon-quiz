// 解答記録の保存はすべてここで行う（localStorage）
// 形式: { q: { 問題ID: { c: 分野ID, ok: 正解数, ng: 不正解数, last: 直近の正誤, at: 時刻 } }, history: [...] }

const KEY = 'sq:v1';
const empty = () => ({ q: {}, history: [] });

let data = load();

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || empty();
  } catch {
    return empty();
  }
}

function save() {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function record(id, cat, ok) {
  const r = (data.q[id] ||= { c: cat, ok: 0, ng: 0 });
  if (ok) r.ok++;
  else r.ng++;
  r.last = ok;
  r.at = Date.now();
  save();
}

// 直近で間違えた問題を「苦手」とする
export const isWeak = id => data.q[id]?.last === false;

// cat を省略すると全分野の集計
export function stats(cat) {
  let ok = 0, ng = 0, answered = 0, weak = 0;
  for (const r of Object.values(data.q)) {
    if (cat && r.c !== cat) continue;
    ok += r.ok;
    ng += r.ng;
    answered++;
    if (r.last === false) weak++;
  }
  return { ok, ng, answered, weak, rate: ok + ng ? Math.round((ok / (ok + ng)) * 100) : null };
}

export function addHistory(entry) {
  data.history.unshift({ ...entry, at: Date.now() });
  data.history.length = Math.min(data.history.length, 50);
  save();
}

export const history = () => data.history;

export function reset() {
  data = empty();
  save();
}
