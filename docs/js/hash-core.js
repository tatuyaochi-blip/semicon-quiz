// ハッシュ表。キーを大きさ m の表に入れ、衝突の処理(チェイン法・線形探査・二次探査・ダブルハッシュ)ごとに、
// 各キーが入った位置と調べた位置の列(探査の列)を記録する。数のキーは h(k) = k mod m、文字列のキーは文字コードの和 mod m
export const METHODS = ['chain', 'linear', 'quadratic', 'double'];

export const keyNum = k => (typeof k === 'number' ? k : [...String(k)].reduce((s, c) => s + c.codePointAt(0), 0));
const mod = (a, m) => ((a % m) + m) % m;

// 2つ目のハッシュ関数(ダブルハッシュ): h2(k) = r − (k mod r)。r は m より小さい最大の素数(m が 2 以下なら 1)
export function secondPrime(m) {
  for (let r = m - 1; r >= 2; r--) { let p = true; for (let d = 2; d * d <= r; d++) if (r % d === 0) { p = false; break; } if (p) return r; }
  return 1;
}

export function insertAll(keys, m, method) {
  const h1 = k => mod(keyNum(k), m);
  const r = secondPrime(m), h2 = k => (r > 1 ? r - mod(keyNum(k), r) : 1);
  if (method === 'chain') {
    const table = Array.from({ length: m }, () => []);
    const rec = keys.map(k => { const i = h1(k); const probes = table[i].length + 1; table[i].push(k); return { k, h: i, pos: i, seq: [i], probes, collide: probes > 1 }; });
    return { table, rec, failed: [] };
  }
  const table = Array(m).fill(null);
  const rec = [], failed = [];
  for (const k of keys) {
    const h = h1(k), seq = [];
    let placed = -1;
    for (let j = 0; j < m; j++) {
      const i = method === 'linear' ? mod(h + j, m) : method === 'quadratic' ? mod(h + j * j, m) : mod(h + j * h2(k), m);
      seq.push(i);
      if (table[i] === null) { table[i] = k; placed = i; break; }
    }
    if (placed < 0) failed.push(k);
    rec.push({ k, h, pos: placed, seq, probes: seq.length, collide: seq.length > 1, step: method === 'double' ? h2(k) : null });
  }
  return { table, rec, failed };
}

// 探索: 見つかるまで(または空き/一巡まで)に調べた位置の列
export function search(table, k, m, method) {
  const h = mod(keyNum(k), m);
  if (method === 'chain') { const i = table[h].indexOf(k); return { found: i >= 0, probes: i >= 0 ? i + 1 : table[h].length, seq: [h] }; }
  const r = secondPrime(m), h2 = r > 1 ? r - mod(keyNum(k), r) : 1, seq = [];
  for (let j = 0; j < m; j++) {
    const i = method === 'linear' ? mod(h + j, m) : method === 'quadratic' ? mod(h + j * j, m) : mod(h + j * h2, m);
    seq.push(i);
    if (table[i] === k) return { found: true, probes: seq.length, seq };
    if (table[i] === null) return { found: false, probes: seq.length, seq };
  }
  return { found: false, probes: seq.length, seq };
}

export function parseKeys(s) {
  const t = s.split(/[\s,、]+/).filter(Boolean);
  if (t.length > 60 || t.some(x => x.length > 8)) return null;
  return t.every(x => /^\d+$/.test(x)) ? t.map(Number) : t;
}
