// 解答記録の保存はすべてここで行う（localStorage）
// 形式: { q: { 問題ID: { c: 分野ID, ok: 正解数, ng: 不正解数, last: 直近の正誤, at: 時刻, box: 箱(1〜5), due: 次に出す日 } }, history: [...] }
// box と due は後から追加した項目。ない記録は「箱1・最後に解いた翌日」とみなす

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
  // ライトナー方式: 正解なら1つ上の箱、不正解なら箱1。箱ごとに 1・2・4・8・16 日後に出す
  r.box = ok ? Math.min((r.box ?? 0) + 1, 5) : 1;
  r.due = dayStart(r.at, INTERVALS[r.box - 1]);
  save();
}

const INTERVALS = [1, 2, 4, 8, 16];

// at の日の n 日後の 0時(端末の時刻)
function dayStart(at, n) {
  const d = new Date(at);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d.getTime();
}

// 直近で間違えた問題を「苦手」とする
export const isWeak = id => data.q[id]?.last === false;

// 今日の復習に入る問題(出す日が今日以前)
export function isDue(id) {
  const r = data.q[id];
  return !!r && (r.due ?? dayStart(r.at, 1)) <= Date.now();
}

export const dueCount = () => Object.keys(data.q).filter(isDue).length;

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

// バックアップ(成績ページのJSON書き出し・読み込み)
export const exportData = () => JSON.stringify(data);

// 記録を置き換える。形式が違えば false を返す
export function importData(json) {
  let d;
  try { d = JSON.parse(json); } catch { return false; }
  if (!d || typeof d.q !== 'object' || !Array.isArray(d.history)) return false;
  data = d;
  save();
  return true;
}
