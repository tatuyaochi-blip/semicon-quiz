// CPUスケジューリング。プロセス(名前・到着時刻・実行時間・優先度)から、各方式でCPUを割り当てた順番(ガントチャート)と、
// 各プロセスの終了時刻・ターンアラウンド時間(終了 − 到着)・待ち時間(ターンアラウンド − 実行時間)・応答時間(初めて動いた時刻 − 到着)を求める。
// 方式: FCFS(到着順)、SJF(実行時間の短い順、横取りなし)、SRT(残り時間の短い順、横取りあり)、RR(ラウンドロビン、時間 q ごとに交代)、
// 優先度(数が小さいほど優先、横取りなし/あり)。同じ条件のときは到着の早い順、それも同じなら入力の順
export const ALGOS = ['fcfs', 'sjf', 'srt', 'rr', 'prio', 'prio-p'];

export function schedule(procs, algo, q = 2) {
  const n = procs.length;
  const rem = procs.map(p => p.burst), start = Array(n).fill(null), end = Array(n).fill(null);
  const gantt = [];
  const run = (i, t0, t1) => {
    if (t1 <= t0) return;
    const last = gantt[gantt.length - 1];
    if (last && last.i === i && last.t1 === t0) last.t1 = t1; else gantt.push({ i, t0, t1 });
    if (start[i] === null && i !== null) start[i] = t0;
  };
  const order = (a, b) => procs[a].arrival - procs[b].arrival || a - b;
  let t = Math.min(...procs.map(p => p.arrival));
  if (t > 0) gantt.push({ i: null, t0: 0, t1: t });
  const ready = () => procs.map((_, i) => i).filter(i => procs[i].arrival <= t && rem[i] > 0);
  const left = () => rem.some(r => r > 0);
  const idleUntilNext = () => {
    const next = Math.min(...procs.map((p, i) => (rem[i] > 0 ? p.arrival : Infinity)));
    gantt.push({ i: null, t0: t, t1: next }); t = next;
  };
  if (algo === 'rr') {
    // 到着したプロセスを待ち行列の後ろへ。時間切れのプロセスは、同じ時刻に到着したプロセスの後ろに並べる
    const queue = [], seen = new Set();
    const admit = until => procs.map((_, i) => i).filter(i => !seen.has(i) && procs[i].arrival <= until).sort(order).forEach(i => { seen.add(i); queue.push(i); });
    admit(t);
    while (left()) {
      if (!queue.length) { idleUntilNext(); admit(t); continue; }
      const i = queue.shift();
      const d = Math.min(q, rem[i]);
      run(i, t, t + d); t += d; rem[i] -= d;
      admit(t);
      if (rem[i] > 0) queue.push(i); else end[i] = t;
    }
  } else {
    const preempt = algo === 'srt' || algo === 'prio-p';
    const key = i => (algo === 'sjf' ? procs[i].burst : algo === 'srt' ? rem[i] : algo === 'fcfs' ? 0 : procs[i].prio);
    while (left()) {
      const r = ready();
      if (!r.length) { idleUntilNext(); continue; }
      const i = r.sort((a, b) => key(a) - key(b) || order(a, b))[0];
      if (!preempt) { run(i, t, t + rem[i]); t += rem[i]; rem[i] = 0; end[i] = t; continue; }
      // 横取りあり: 次に誰かが到着するまで、または終わるまで動かす
      const nextArr = Math.min(...procs.map((p, k) => (p.arrival > t && rem[k] > 0 ? p.arrival : Infinity)));
      const d = Math.min(rem[i], nextArr - t);
      run(i, t, t + d); t += d; rem[i] -= d;
      if (rem[i] === 0) end[i] = t;
    }
  }
  const rows = procs.map((p, i) => ({ end: end[i], tat: end[i] - p.arrival, wait: end[i] - p.arrival - p.burst, resp: start[i] - p.arrival }));
  const avg = k => rows.reduce((s, r) => s + r[k], 0) / n;
  const switches = gantt.filter(g => g.i !== null).length - 1;
  return { gantt, rows, avg: { tat: avg('tat'), wait: avg('wait'), resp: avg('resp') }, makespan: t, switches };
}
