// 二分木。二分探索木(挿入・削除・探索)と、配列で表すヒープ(最大・最小、1つずつ挿入)を作り、なぞり順を求める。
// 木の節は { k, l, r }。ヒープは配列で持ち、i 番目の子は 2i+1 と 2i+2(0から数える)
const cmp = (a, b) => (typeof a === 'number' && typeof b === 'number' ? a - b : String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0);

// 二分探索木に挿入(同じキーは無視して dup に数える)
export function bstInsert(root, k) {
  if (!root) return { k, l: null, r: null };
  let n = root;
  for (;;) {
    const c = cmp(k, n.k);
    if (c === 0) return root;
    const side = c < 0 ? 'l' : 'r';
    if (!n[side]) { n[side] = { k, l: null, r: null }; return root; }
    n = n[side];
  }
}
// 削除: 子が2つなら、右の部分木の最小(次に大きいキー)で置き換える
export function bstDelete(root, k) {
  if (!root) return { root, found: false };
  const c = cmp(k, root.k);
  if (c < 0) { const r = bstDelete(root.l, k); root.l = r.root; return { root, found: r.found }; }
  if (c > 0) { const r = bstDelete(root.r, k); root.r = r.root; return { root, found: r.found }; }
  if (!root.l) return { root: root.r, found: true };
  if (!root.r) return { root: root.l, found: true };
  let m = root.r;
  while (m.l) m = m.l;
  root.k = m.k;
  root.r = bstDelete(root.r, m.k).root;
  return { root, found: true, succ: m.k };
}
// 探索: 比べた節の列
export function bstSearch(root, k) {
  const path = [];
  for (let n = root; n; n = cmp(k, n.k) < 0 ? n.l : n.r) {
    path.push(n.k);
    if (cmp(k, n.k) === 0) return { path, found: true };
  }
  return { path, found: false };
}
export const pre = n => (n ? [n.k, ...pre(n.l), ...pre(n.r)] : []);
export const ino = n => (n ? [...ino(n.l), n.k, ...ino(n.r)] : []);
export const post = n => (n ? [...post(n.l), ...post(n.r), n.k] : []);
export function level(n) {
  const out = [], q = n ? [n] : [];
  while (q.length) { const x = q.shift(); out.push(x.k); if (x.l) q.push(x.l); if (x.r) q.push(x.r); }
  return out;
}
export const height = n => (n ? 1 + Math.max(height(n.l), height(n.r)) : 0);
export const size = n => (n ? 1 + size(n.l) + size(n.r) : 0);

// ヒープに1つずつ挿入する(末尾に置き、親と比べて上へ移す)。swaps は挿入ごとの交換の回数
export function heapBuild(keys, max) {
  const a = [], swaps = [];
  const before = (x, y) => (max ? cmp(x, y) > 0 : cmp(x, y) < 0);
  for (const k of keys) {
    a.push(k);
    let i = a.length - 1, s = 0;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (!before(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]]; i = p; s++;
    }
    swaps.push(s);
  }
  return { a, swaps };
}
// 根を取り出す(末尾を根に移して下へ移す)
export function heapPop(a, max) {
  const before = (x, y) => (max ? cmp(x, y) > 0 : cmp(x, y) < 0);
  const top = a[0], last = a.pop();
  if (a.length) {
    a[0] = last;
    let i = 0;
    for (;;) {
      const l = 2 * i + 1, r = l + 1;
      let m = i;
      if (l < a.length && before(a[l], a[m])) m = l;
      if (r < a.length && before(a[r], a[m])) m = r;
      if (m === i) break;
      [a[i], a[m]] = [a[m], a[i]]; i = m;
    }
  }
  return top;
}
// 配列のヒープを木の形に({ k, l, r })
export const heapTree = (a, i = 0) => (i < a.length ? { k: a[i], l: heapTree(a, 2 * i + 1), r: heapTree(a, 2 * i + 2), i } : null);

// キーの列を読む。数ならすべて数、そうでなければ文字列
export function parseKeys(s) {
  const t = s.split(/[\s,、]+/).filter(Boolean);
  if (t.length > 40 || t.some(x => x.length > 6)) return null;
  return t.every(x => /^-?\d+(\.\d+)?$/.test(x)) ? t.map(Number) : t;
}
