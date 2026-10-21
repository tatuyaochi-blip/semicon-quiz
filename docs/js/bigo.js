// 計算量の比較。O(1)〜O(n!) のそれぞれで、データ数 n のときの手順の回数と、1秒あたりの処理回数から求めた時間を表とグラフにする。
// 「データ数 n₁ で t₁ 秒なら n₂ では何秒か」の見積もりも行う(手順の回数の比で時間が増えるとみなす)
const form = document.getElementById('bo-form');
const out = k => document.querySelector(`[data-out="${k}"]`);
let T = {};
try { T = JSON.parse(form.dataset.text); } catch {}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
// 回数は 10 を底とする対数で扱う(n! や 2ⁿ は大きすぎるため)
// log10(n!)。大きな n はスターリングの近似(n が1000を超えると相対誤差は 10⁻⁴ 未満)
const lgamma = n => { if (n > 1000) return n * Math.log10(n / Math.E) + 0.5 * Math.log10(2 * Math.PI * n); let s = 0; for (let k = 2; k <= n; k++) s += Math.log10(k); return s; };
export const ORDERS = [
  ['1', () => 0],
  ['log n', n => Math.log10(Math.max(Math.log2(n), 1))],
  ['n', n => Math.log10(n)],
  ['n log n', n => Math.log10(n * Math.max(Math.log2(n), 1))],
  ['n²', n => 2 * Math.log10(n)],
  ['n³', n => 3 * Math.log10(n)],
  ['2ⁿ', n => n * Math.log10(2)],
  ['n!', n => lgamma(n)],
];
const sci = l => {
  if (!Number.isFinite(l)) return '–';
  if (l < 6) return String(Number((10 ** l).toPrecision(4)));
  const e = Math.floor(l);
  return `${(10 ** (l - e)).toFixed(2)}×10^${e}`;
};
// 秒数(10を底とする対数)を読みやすい単位に
function dur(l) {
  const u = [[-9, T.u_ns], [-6, T.u_us], [-3, T.u_ms], [0, T.u_s], [Math.log10(60), T.u_min], [Math.log10(3600), T.u_h], [Math.log10(86400), T.u_d], [Math.log10(86400 * 365.25), T.u_y]];
  if (l < -9) return `< 1 ${T.u_ns}`;
  let [b, name] = u[0];
  for (const x of u) if (l >= x[0]) [b, name] = x;
  const v = l - b;
  if (name === T.u_y && v >= 6) return `${sci(v)} ${name}`;
  return `${Number((10 ** v).toPrecision(3))} ${name}`;
}
function chart(nMax) {
  const svg = document.getElementById('bo-chart');
  const W = 600, H = 280, L = 46, R = 70, Tp = 10, B = 30, ymax = 12;
  const ns = Array.from({ length: 60 }, (_, i) => 1 + (nMax - 1) * i / 59);
  const sx = n => L + (n - 1) / (nMax - 1) * (W - L - R), sy = l => Tp + (1 - Math.min(Math.max(l, 0), ymax) / ymax) * (H - Tp - B);
  let g = '';
  for (let l = 0; l <= ymax; l += 3) g += `<line class="grid" x1="${L}" x2="${W - R}" y1="${sy(l)}" y2="${sy(l)}"></line><text x="${L - 6}" y="${sy(l) + 4}" text-anchor="end">10^${l}</text>`;
  for (const n of [1, Math.round(nMax / 2), nMax]) g += `<text x="${sx(n)}" y="${H - 10}" text-anchor="middle">${n}</text>`;
  ORDERS.forEach(([name, f], i) => {
    const pts = ns.map(n => `${sx(n).toFixed(1)},${sy(f(n)).toFixed(1)}`).join(' ');
    g += `<polyline class="c${i}" points="${pts}"></polyline>`;
    // 上限で切った線は、上限に達した所の左下にラベルを置く
    const cut = ns.find(n => f(n) >= ymax);
    g += cut === undefined ? `<text class="lbl c${i}" x="${W - R + 4}" y="${(sy(f(nMax)) + 4).toFixed(1)}">${esc(name)}</text>`
      : `<text class="lbl c${i}" x="${(sx(cut) - 6).toFixed(1)}" y="${(sy(ymax) + 14).toFixed(1)}" text-anchor="end">${esc(name)}</text>`;
  });
  svg.innerHTML = g;
}
function update() {
  const n = Math.round(Number(form.elements.n.value));
  const ops = Number(form.elements.ops.value);
  const ok = n >= 1 && n <= 1e9 && ops > 0;
  document.getElementById('bo-error').hidden = ok;
  const tb = document.getElementById('bo-table');
  if (!ok) { tb.innerHTML = ''; return; }
  const lo = Math.log10(ops);
  tb.innerHTML = `<table class="sp-pairs"><thead><tr><th>${esc(T.col_order)}</th><th>${esc(T.col_steps)}</th><th>${esc(T.col_time)}</th><th>${esc(T.col_example)}</th></tr></thead><tbody>${
    ORDERS.map(([name, f], i) => { const l = f(n); return `<tr><td><span class="bo-dot c${i}"></span>O(${esc(name)})</td><td>${sci(l)}</td><td>${esc(dur(l - lo))}</td><td>${esc(T.examples[i])}</td></tr>`; }).join('')}</tbody></table>`;
  chart(Math.min(Math.max(n, 10), 60));
  // 見積もり
  const o = Number(form.elements.order.value), n1 = Number(form.elements.n1.value), t1 = Number(form.elements.t1.value), n2 = Number(form.elements.n2.value);
  const ok2 = n1 >= 1 && n2 >= 1 && t1 > 0 && n1 <= 1e9 && n2 <= 1e9;
  if (!ok2) { out('t2').textContent = '–'; out('ratio').textContent = '–'; return; }
  const f = ORDERS[o][1], d = f(n2) - f(n1);
  out('ratio').textContent = `${sci(d)} ${T.times}`;
  out('t2').textContent = dur(Math.log10(t1) + d);
}
form.addEventListener('input', update);
form.addEventListener('submit', e => e.preventDefault());
update();
