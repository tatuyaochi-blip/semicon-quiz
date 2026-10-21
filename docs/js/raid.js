// RAID の容量と信頼性。ディスクの台数 n・1台の容量・1台の年間故障率から、RAID 0/1/5/6/10 の実効容量・容量効率・
// 何台まで壊れてもよいか、1年間にデータを失う確率(修理を考えない簡単なモデル: 各ディスクが独立に確率 p で壊れる)を求める。
// RAID 1 は n 台すべてに同じデータ(ミラー)、RAID 10 は2台ずつのミラーを並べる
export const LEVELS = ['0', '1', '5', '6', '10'];
const comb = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return r; };
export function raid(level, n, size, p) {
  const ok = { '0': n >= 1, '1': n >= 2, '5': n >= 3, '6': n >= 4, '10': n >= 4 && n % 2 === 0 }[level];
  if (!ok) return null;
  const usable = { '0': n * size, '1': size, '5': (n - 1) * size, '6': (n - 2) * size, '10': (n / 2) * size }[level];
  const tol = { '0': 0, '1': n - 1, '5': 1, '6': 2, '10': 1 }[level];
  // データを失う確率: k 台が壊れる確率の和(RAID 10 は、同じミラーの2台がどちらも壊れたとき)
  const pk = k => comb(n, k) * p ** k * (1 - p) ** (n - k);
  let lose;
  if (level === '10') { const m = n / 2, pair = p * p; lose = 1 - (1 - pair) ** m; }
  else { let s = 0; for (let k = tol + 1; k <= n; k++) s += pk(k); lose = s; }
  return { usable, eff: usable / (n * size), tol, lose, tolBest: level === '10' ? n / 2 : tol };
}
const form = globalThis.document?.getElementById('rd-form');
if (form) {
  const out = k => document.querySelector(`[data-out="${k}"]`);
  let T = {};
  try { T = JSON.parse(form.dataset.text); } catch {}
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const num = v => String(Number(v.toPrecision(4)));
  const prob = v => (v < 1e-6 ? v.toExponential(2).replace('e-', '×10^-') : `${num(v * 100)}%`);
  function disks(level, n) {
    // 図: 各ディスクに入るもの(D: データ、P/Q: パリティ、M: ミラー)を4ストライプ分
    const rows = 4, cell = (r, d) => {
      if (level === '0') return 'D';
      if (level === '1') return d === 0 ? 'D' : 'M';
      if (level === '10') return d % 2 === 0 ? 'D' : 'M';
      if (level === '5') return (n - 1 - (r % n)) === d ? 'P' : 'D';
      const pd = (n - 1 - (r % n)), qd = (pd + 1) % n;
      return d === pd ? 'P' : d === qd ? 'Q' : 'D';
    };
    return `<div class="rd-disks" style="grid-template-columns: repeat(${Math.min(n, 12)}, minmax(0, 1fr))">${Array.from({ length: Math.min(n, 12) }, (_, d) => `<div class="rd-disk"><div class="rd-name">${esc(T.disk.replace('{i}', d + 1))}</div>${Array.from({ length: rows }, (_, r) => { const c = cell(r, d); return `<div class="rd-blk ${c}">${c}</div>`; }).join('')}</div>`).join('')}</div>`;
  }
  function update() {
    const level = form.elements.level.value, n = Math.round(Number(form.elements.n.value)), size = Number(form.elements.size.value), p = Number(form.elements.afr.value) / 100;
    const r = n >= 1 && n <= 64 && size > 0 && p >= 0 && p <= 1 ? raid(level, n, size, p) : null;
    document.getElementById('rd-error').hidden = !!r;
    document.getElementById('rd-error').textContent = T.invalid[level];
    if (!r) { for (const k of ['usable', 'eff', 'tol', 'lose']) out(k).textContent = '–'; document.getElementById('rd-fig').innerHTML = ''; document.getElementById('rd-cmp').innerHTML = ''; return; }
    out('usable').textContent = `${num(r.usable)} ${T.unit}`;
    out('eff').textContent = `${num(r.eff * 100)}%`;
    out('tol').textContent = r.tolBest > r.tol ? T.tol_range.replace('{a}', r.tol).replace('{b}', r.tolBest) : T.tol_n.replace('{a}', r.tol);
    out('lose').textContent = prob(r.lose);
    document.getElementById('rd-fig').innerHTML = disks(level, n);
    document.getElementById('rd-cmp').innerHTML = `<table class="sp-pairs"><thead><tr><th>${esc(T.col_level)}</th><th>${esc(T.col_usable)}</th><th>${esc(T.col_eff)}</th><th>${esc(T.col_tol)}</th><th>${esc(T.col_lose)}</th></tr></thead><tbody>${
      LEVELS.map(l => { const x = raid(l, n, size, p); return `<tr${l === level ? ' class="cur"' : ''}><td>RAID ${l}</td>${x ? `<td>${num(x.usable)} ${esc(T.unit)}</td><td>${num(x.eff * 100)}%</td><td>${x.tolBest > x.tol ? `${x.tol}〜${x.tolBest}` : x.tol}</td><td>${prob(x.lose)}</td>` : `<td colspan="4" class="muted">${esc(T.na)}</td>`}</tr>`; }).join('')}</tbody></table>`;
  }
  form.addEventListener('input', update);
  form.addEventListener('submit', e => e.preventDefault());
  update();
}
