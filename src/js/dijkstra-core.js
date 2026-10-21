// ダイクストラ法。辺の一覧(「A B 4」= A と B の間の重み4の辺)から、出発点から各頂点への最短距離と経路を求め、
// 1回ごとに「確定する頂点」と「距離を更新した頂点」を記録する。重みは0以上。同じ距離の頂点が複数あるときは、名前の順で先のものを確定する

// 辺の一覧を読む。1行に「始点 終点 重み」。空白・カンマ・矢印(->)で区切れる
export function parseEdges(text) {
  const edges = [], nodes = [];
  const add = v => { if (!nodes.includes(v)) nodes.push(v); };
  const lines = text.split(/\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  for (const [k, l] of lines.entries()) {
    const m = l.split(/\s*(?:->|→|,|\s)\s*/).filter(Boolean);
    if (m.length !== 3 || !/^[A-Za-z0-9_]{1,8}$/.test(m[0]) || !/^[A-Za-z0-9_]{1,8}$/.test(m[1]) || !/^\d+(\.\d+)?$/.test(m[2])) return { error: k + 1 };
    edges.push({ u: m[0], v: m[1], w: Number(m[2]) });
    add(m[0]); add(m[1]);
  }
  return { edges, nodes };
}

const byName = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

export function dijkstra(nodes, edges, source, directed) {
  const adj = new Map(nodes.map(n => [n, []]));
  for (const e of edges) {
    adj.get(e.u).push({ to: e.v, w: e.w, e });
    if (!directed) adj.get(e.v).push({ to: e.u, w: e.w, e });
  }
  const dist = new Map(nodes.map(n => [n, Infinity])), prev = new Map(nodes.map(n => [n, null])), done = new Set();
  dist.set(source, 0);
  const steps = [];
  for (;;) {
    // 未確定の頂点のうち距離が最小のもの
    const cand = nodes.filter(n => !done.has(n) && dist.get(n) < Infinity).sort((a, b) => dist.get(a) - dist.get(b) || byName(a, b));
    if (!cand.length) break;
    const u = cand[0];
    done.add(u);
    const updated = [];
    for (const { to, w } of adj.get(u)) {
      if (done.has(to)) continue;
      const nd = dist.get(u) + w;
      if (nd < dist.get(to)) { dist.set(to, nd); prev.set(to, u); updated.push(to); }
    }
    steps.push({ u, updated, dist: new Map(dist), done: new Set(done), prev: new Map(prev) });
  }
  return { dist, prev, steps };
}

export function pathTo(prev, target) {
  const p = [];
  for (let v = target; v !== null; v = prev.get(v)) p.unshift(v);
  return p;
}
