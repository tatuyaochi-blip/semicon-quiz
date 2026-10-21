// クリティカルパス法(CPM)。作業(名前・所要日数・先行作業)から、最早開始・最早終了・最遅開始・最遅終了・余裕(トータルフロート)を求め、
// 余裕が0の作業をつないだクリティカルパスと、全体の所要日数を出す。先行作業の循環や、存在しない作業の指定は誤りとして返す
export function parseTasks(text) {
  const tasks = [];
  const lines = text.split(/\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  for (const [k, l] of lines.entries()) {
    // 「A 3」「C 4 A,B」「C 4 A B」
    const m = l.split(/[\s,、]+/).filter(Boolean);
    if (m.length < 2 || !/^[\p{L}\p{N}_]{1,8}$/u.test(m[0]) || !/^\d+(\.\d+)?$/.test(m[1]) || m.slice(2).some(x => !/^[\p{L}\p{N}_]{1,8}$/u.test(x))) return { error: 'line', line: k + 1 };
    if (tasks.some(t => t.id === m[0])) return { error: 'dup', id: m[0] };
    tasks.push({ id: m[0], d: Number(m[1]), pre: [...new Set(m.slice(2))] });
  }
  for (const t of tasks) for (const p of t.pre) if (!tasks.some(x => x.id === p) || p === t.id) return { error: 'unknown', id: p, of: t.id };
  return { tasks };
}

export function cpm(tasks) {
  const by = new Map(tasks.map(t => [t.id, t]));
  // トポロジカル順(入力の順をなるべく保つ)
  const order = [], state = new Map();
  const visit = (id, stack) => {
    if (state.get(id) === 2) return true;
    if (state.get(id) === 1) return false;
    state.set(id, 1);
    for (const p of by.get(id).pre) if (!visit(p)) return false;
    state.set(id, 2); order.push(id);
    return true;
  };
  for (const t of tasks) if (!visit(t.id)) return { error: 'cycle' };
  const es = new Map(), ef = new Map();
  for (const id of order) {
    const t = by.get(id);
    es.set(id, Math.max(0, ...t.pre.map(p => ef.get(p))));
    ef.set(id, es.get(id) + t.d);
  }
  const total = Math.max(0, ...tasks.map(t => ef.get(t.id)));
  const succ = new Map(tasks.map(t => [t.id, tasks.filter(x => x.pre.includes(t.id)).map(x => x.id)]));
  const ls = new Map(), lf = new Map();
  for (const id of [...order].reverse()) {
    const s = succ.get(id);
    lf.set(id, s.length ? Math.min(...s.map(x => ls.get(x))) : total);
    ls.set(id, lf.get(id) - by.get(id).d);
  }
  const eps = 1e-9;
  const rows = tasks.map(t => {
    const slack = ls.get(t.id) - es.get(t.id);
    // フリーフロート: 後続の最早開始を遅らせずに遅らせられる日数
    const s = succ.get(t.id);
    const free = (s.length ? Math.min(...s.map(x => es.get(x))) : total) - ef.get(t.id);
    return { ...t, es: es.get(t.id), ef: ef.get(t.id), ls: ls.get(t.id), lf: lf.get(t.id), slack, free, critical: Math.abs(slack) < eps };
  });
  // クリティカルパス: 余裕0の作業を、開始から終了までつないだ列(複数あればすべて)
  const crit = new Set(rows.filter(r => r.critical).map(r => r.id));
  const paths = [];
  const walk = (id, path) => {
    const next = succ.get(id).filter(x => crit.has(x) && Math.abs(es.get(x) - ef.get(id)) < eps);
    if (!next.length) { if (Math.abs(ef.get(id) - total) < eps) paths.push(path); return; }
    for (const x of next) walk(x, [...path, x]);
  };
  for (const r of rows) if (r.critical && r.es === 0) walk(r.id, [r.id]);
  return { rows, total, paths: paths.slice(0, 20), order };
}
