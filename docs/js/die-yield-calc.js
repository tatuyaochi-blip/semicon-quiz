// ダイ数・歩留まり・良品1個あたりのコストの計算(DOMに依存しない。build.js からも使う)
// 長さは mm、欠陥密度は 個/cm²

// 経験式によるウエハ1枚あたりのダイ数: πr²/S − πd/√(2S)。S はスクライブ込みのダイ1個の面積
export const dpwFormula = (d, s) => Math.max(0, Math.PI * (d / 2) ** 2 / s - Math.PI * d / Math.sqrt(2 * s));

// 格子に並べて、使える円(半径 r)に完全に収まるダイを数える。格子の置き方を4通り試して最も多いものを返す
// 戻り値: { n, ox, oy } (ox, oy は格子の原点のずれ)
export function dpwGrid(r, w, h, px, py) {
  let best = { n: 0, ox: 0, oy: 0 };
  if (r <= 0 || w <= 0 || h <= 0) return best;
  const inside = (x, y) => x * x + y * y <= r * r;
  for (const ox of [0, px / 2]) for (const oy of [0, py / 2]) {
    let n = 0;
    const i0 = Math.floor((-r - ox) / px) - 1, i1 = Math.ceil((r - ox) / px) + 1;
    const j0 = Math.floor((-r - oy) / py) - 1, j1 = Math.ceil((r - oy) / py) + 1;
    for (let i = i0; i <= i1; i++) {
      const x0 = ox + i * px, x1 = x0 + w;
      if (x1 < -r || x0 > r) continue;
      for (let j = j0; j <= j1; j++) {
        const y0 = oy + j * py, y1 = y0 + h;
        if (inside(x0, y0) && inside(x1, y0) && inside(x0, y1) && inside(x1, y1)) n++;
      }
    }
    if (n > best.n) best = { n, ox, oy };
  }
  return best;
}

// 歩留まりモデル。ad = ダイ面積(cm²) × 欠陥密度(個/cm²)、alpha = 欠陥の集中度(負の二項モデル)
export const yields = (ad, alpha) => ({
  poisson: Math.exp(-ad),
  murphy: ad > 0 ? ((1 - Math.exp(-ad)) / ad) ** 2 : 1,
  negbin: (1 + ad / alpha) ** -alpha,
});

// 入力 { d, w, h, scribe(µm), edge, d0, alpha, cost } → 計算結果一式
export function compute({ d, w, h, scribe, edge, d0, alpha, cost }) {
  const px = w + scribe / 1000, py = h + scribe / 1000;
  const r = d / 2 - edge;
  const grid = dpwGrid(r, w, h, px, py);
  const formula = dpwFormula(2 * r, px * py);
  const area = w * h; // mm²
  const y = yields((area / 100) * d0, alpha);
  const per = model => {
    const good = grid.n * y[model];
    return { y: y[model], good, cost: good > 0 ? cost / good : NaN };
  };
  return { r, px, py, area, grid, formula, poisson: per('poisson'), murphy: per('murphy'), negbin: per('negbin') };
}
