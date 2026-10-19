// 解答記録の保存はすべてここで行う（localStorage）
// 形式: { q: { 問題ID: { c: 分野ID, ok: 正解数, ng: 不正解数, last: 直近の正誤, at: 時刻, box: 箱(1〜5), due: 次に出す日 } }, history: [...] }
// box と due は後から追加した項目。ない記録は「箱1・最後に解いた翌日」とみなす

const KEY = 'sq:v1';
const empty = () => ({ q: {}, history: [] });

let data = load();

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    return valid(d) ? d : empty();
  } catch {
    return empty();
  }
}

// 容量オーバーやブラウザの設定で保存できなくても、解答や表示は続けられるようにする
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // この回の記録は保存されないが、画面の動作は止めない
  }
}

// 記録の形式の検査(読み込み時とバックアップの読み込み時)
function isObj(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function valid(d) {
  return isObj(d) && isObj(d.q) && Array.isArray(d.history)
    && Object.values(d.q).every(r => isObj(r) && Number.isFinite(r.ok) && Number.isFinite(r.ng))
    && d.history.every(isObj)
    && (d.days == null || (Array.isArray(d.days) && d.days.every(x => typeof x === 'string')));
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
export const weakCount = () => Object.keys(data.q).filter(isWeak).length;

// 解いた問題があるか(トップの「続きから」の表示の判定)
export const hasRecords = () => Object.keys(data.q).length > 0;

// 最後に解いた問題の分野
export function lastCategory() {
  let last = null;
  for (const r of Object.values(data.q)) if (r.c && (!last || (r.at ?? 0) > (last.at ?? 0))) last = r;
  return last?.c ?? null;
}

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
  // 学習した日(連続学習日数の計算用)。days は後から追加した項目で、古い記録にはない
  const today = dayKey(Date.now());
  data.days = (data.days || []).filter(d => d !== today).concat(today).slice(-400);
  save();
}

// 端末の日付で YYYY-MM-DD
const dayKey = at => new Date(at).toLocaleDateString('sv-SE');

// 連続学習日数: 今日(まだなら昨日)から、毎日続けて学習した日数
export function streak() {
  const days = new Set(data.days || []);
  const d = new Date();
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(dayKey(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

// 今日の1問をもう解いたか
export const dailyDone = () => data.history.some(h => h.mode === 'daily' && dayKey(h.at) === dayKey(Date.now()));

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
  if (!valid(d)) return false;
  data = d;
  save();
  return true;
}
