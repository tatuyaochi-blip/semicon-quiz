// 並べ替え(ソート)の手順を記録する。各アルゴリズムは配列を実際に並べ替えながら、
// 比較(cmp)・交換(swap)・書き込み(set)・確定(done)の出来事を順に記録し、画面はそれを1つずつ再生する
export const ALGOS = ['bubble', 'selection', 'insertion', 'shell', 'merge', 'quick', 'heap'];
// 安定(同じ値の順番が保たれる)かどうか
export const STABLE = { bubble: true, selection: false, insertion: true, shell: false, merge: true, quick: false, heap: false };

export function record(name, input) {
  const a = [...input];
  const ev = [];
  let cmps = 0, writes = 0;
  const less = (i, j) => { cmps++; ev.push({ t: 'cmp', i, j }); return a[i] < a[j]; };
  const lessV = (v, j) => { cmps++; ev.push({ t: 'cmp', i: j, j }); return v < a[j]; };
  const swap = (i, j) => { if (i === j) return; writes += 2; [a[i], a[j]] = [a[j], a[i]]; ev.push({ t: 'swap', i, j }); };
  const set = (i, v) => { writes++; a[i] = v; ev.push({ t: 'set', i, v }); };
  const done = (...is) => ev.push({ t: 'done', is });
  const n = a.length;
  ({
    // バブルソート: 隣どうしを比べて大きい方を後ろへ。交換がなければ終わる
    bubble() {
      for (let end = n - 1; end > 0; end--) {
        let swapped = false;
        for (let i = 0; i < end; i++) if (less(i + 1, i)) { swap(i, i + 1); swapped = true; }
        done(end);
        if (!swapped) { done(...Array.from({ length: end }, (_, k) => k)); return; }
      }
      done(0);
    },
    // 選択ソート: 残りの最小値を探して先頭と交換する
    selection() {
      for (let i = 0; i < n - 1; i++) {
        let m = i;
        for (let j = i + 1; j < n; j++) if (less(j, m)) m = j;
        swap(i, m);
        done(i);
      }
      done(n - 1);
    },
    // 挿入ソート: 取り出した値より大きいものを1つずつ後ろへずらし、空いた所に入れる
    insertion() {
      for (let i = 1; i < n; i++) {
        const v = a[i];
        let j = i - 1;
        while (j >= 0 && lessV(v, j)) { set(j + 1, a[j]); j--; }
        if (j + 1 !== i) set(j + 1, v);
      }
      done(...Array.from({ length: n }, (_, k) => k));
    },
    // シェルソート: 間隔 h(1, 4, 13, 40 …)ごとの挿入ソートを、間隔を縮めながら繰り返す
    shell() {
      let h = 1;
      while (h * 3 + 1 < n) h = h * 3 + 1;
      for (; h >= 1; h = (h - 1) / 3) {
        for (let i = h; i < n; i++) {
          const v = a[i];
          let j = i - h;
          while (j >= 0 && lessV(v, j)) { set(j + h, a[j]); j -= h; }
          if (j + h !== i) set(j + h, v);
        }
      }
      done(...Array.from({ length: n }, (_, k) => k));
    },
    // マージソート: 半分ずつに分けて並べ替え、2つの並びを先頭から比べて併合する(作業用の配列を使う)
    merge() {
      const sort = (lo, hi) => {
        if (hi - lo < 1) return;
        const mid = (lo + hi) >> 1;
        sort(lo, mid); sort(mid + 1, hi);
        const left = a.slice(lo, mid + 1), right = a.slice(mid + 1, hi + 1);
        let i = 0, j = 0, k = lo;
        while (i < left.length && j < right.length) {
          cmps++; ev.push({ t: 'cmp', i: lo + i, j: mid + 1 + j });
          // 右が真に小さいときだけ右を先に(等しければ左を先にして安定にする)
          set(k++, right[j] < left[i] ? right[j++] : left[i++]);
        }
        while (i < left.length) set(k++, left[i++]);
        while (j < right.length) set(k++, right[j++]);
      };
      sort(0, n - 1);
      done(...Array.from({ length: n }, (_, k) => k));
    },
    // クイックソート: 末尾を基準値(ピボット)にして、小さいものを前に集め(Lomuto の分割)、基準値の位置を確定させる
    quick() {
      const sort = (lo, hi) => {
        if (lo > hi) return;
        if (lo === hi) { done(lo); return; }
        let p = lo;
        for (let i = lo; i < hi; i++) if (less(i, hi)) swap(i, p++);
        swap(p, hi);
        done(p);
        sort(lo, p - 1); sort(p + 1, hi);
      };
      sort(0, n - 1);
    },
    // ヒープソート: 最大値が根に来るヒープを作り、根を末尾と交換してヒープを縮める
    heap() {
      const down = (i, size) => {
        for (;;) {
          const l = 2 * i + 1, r = l + 1;
          let m = i;
          if (l < size && less(m, l)) m = l;
          if (r < size && less(m, r)) m = r;
          if (m === i) return;
          swap(i, m); i = m;
        }
      };
      for (let i = (n >> 1) - 1; i >= 0; i--) down(i, n);
      for (let end = n - 1; end > 0; end--) { swap(0, end); done(end); down(0, end); }
      done(0);
    },
  })[name]();
  return { events: ev, cmps, writes, result: a };
}

// 再現できる乱数(同じ種なら同じ並び)
export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
// 最初の並び: random(ばらばら)・nearly(ほぼ整列)・reversed(逆順)・few(同じ値が多い)
export function makeData(n, kind, seed) {
  const r = rng(seed);
  const base = Array.from({ length: n }, (_, i) => i + 1);
  const shuffle = arr => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  if (kind === 'reversed') return base.reverse();
  if (kind === 'nearly' && n > 1) { const k = Math.max(1, Math.round(n / 10)); for (let t = 0; t < k; t++) { const i = Math.floor(r() * (n - 1)); [base[i], base[i + 1]] = [base[i + 1], base[i]]; } return base; }
  if (kind === 'few') return shuffle(base.map(v => Math.ceil(v / n * 4) * Math.ceil(n / 4)));
  return shuffle(base);
}
