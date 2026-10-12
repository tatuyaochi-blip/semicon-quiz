// DOMに依存しない共通関数（build.js からも読み込まれる）

export function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const sample = (list, n) => shuffle(list).slice(0, n);
