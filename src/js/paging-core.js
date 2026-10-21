// ページ置換アルゴリズム。参照列とページ枠の数から、参照ごとのヒット・ページフォルト・追い出すページと枠の中身を記録する。
// FIFO(最も古く読み込んだページ)、LRU(最も長く参照されていないページ)、OPT(今後最も長く参照されないページ)、
// Clock(参照ビットを見て、1なら0にして見逃す。二度目の機会)。空きの枠があるうちは、左の枠から順に使う
export const ALGOS = ['fifo', 'lru', 'opt', 'clock'];

export function simulate(refs, n, algo) {
  const frames = Array(n).fill(null);
  const loaded = Array(n).fill(-1), used = Array(n).fill(-1), refbit = Array(n).fill(0);
  let hand = 0, faults = 0;
  const steps = [];
  refs.forEach((p, t) => {
    let i = frames.indexOf(p);
    let victim = null, slot = i;
    const hit = i >= 0;
    if (hit) { used[i] = t; refbit[i] = 1; }
    else {
      faults++;
      slot = frames.indexOf(null);
      if (slot < 0) {
        if (algo === 'fifo') slot = loaded.indexOf(Math.min(...loaded));
        else if (algo === 'lru') slot = used.indexOf(Math.min(...used));
        else if (algo === 'opt') {
          // 今後の最初の参照が最も遠い(または二度と参照されない)ページ。同じなら左の枠
          const next = frames.map(f => { const k = refs.indexOf(f, t + 1); return k < 0 ? Infinity : k; });
          slot = next.indexOf(Math.max(...next));
        } else {
          while (refbit[hand]) { refbit[hand] = 0; hand = (hand + 1) % n; }
          slot = hand; hand = (hand + 1) % n;
        }
        victim = frames[slot];
      } else if (algo === 'clock') hand = (slot + 1) % n;
      frames[slot] = p; loaded[slot] = t; used[slot] = t; refbit[slot] = 1;
    }
    steps.push({ p, hit, slot, victim, frames: [...frames], bits: [...refbit], hand });
  });
  return { steps, faults, hits: refs.length - faults };
}

// 参照列: 空白・カンマ区切りの数や英字。1文字ずつの「70120304」も受け付ける
export function parseRefs(s) {
  const t = s.trim();
  if (!t) return [];
  const parts = /[\s,、]/.test(t) ? t.split(/[\s,、]+/).filter(Boolean) : [...t];
  return parts.every(x => /^[A-Za-z0-9]{1,4}$/.test(x)) ? parts : null;
}
