// 損益分岐点。売上高・変動費・固定費から、変動費率 = 変動費 ÷ 売上高、限界利益率 = 1 − 変動費率、
// 損益分岐点売上高 = 固定費 ÷ 限界利益率、安全余裕率 = (売上高 − 損益分岐点売上高) ÷ 売上高、目標利益に必要な売上高 = (固定費 + 目標利益) ÷ 限界利益率 を求める。
// 単価と1個あたりの変動費が分かるときは、損益分岐点の販売数量 = 固定費 ÷ (単価 − 1個あたりの変動費) も
export function breakeven({ sales, vc, fc, target = 0 }) {
  const vr = vc / sales, mr = 1 - vr;
  const bep = mr > 0 ? fc / mr : NaN;
  return { vr, mr, bep, profit: sales - vc - fc, safety: (sales - bep) / sales, need: mr > 0 ? (fc + target) / mr : NaN, ratio: bep / sales };
}
const form = globalThis.document?.getElementById('be-form');
if (form) {
  const out = k => document.querySelector(`[data-out="${k}"]`);
  let T = {};
  try { T = JSON.parse(form.dataset.text); } catch {}
  const n = v => (Number.isFinite(v) ? String(Number(v.toFixed(2))).replace(/\B(?=(\d{3})+(?!\d))/g, ',').replace('-', '−') : '–');
  const pct = v => (Number.isFinite(v) ? `${Number((v * 100).toFixed(2))}%`.replace('-', '−') : '–');
  function chart(x, r) {
    const svg = document.getElementById('be-chart');
    const W = 600, H = 300, L = 70, R = 20, Tp = 14, B = 34;
    const smax = Math.max(x.sales, Number.isFinite(r.bep) ? r.bep : 0, Number.isFinite(r.need) ? r.need : 0) * 1.25 || 1;
    const ymax = smax;
    const sx = v => L + v / smax * (W - L - R), sy = v => Tp + (1 - v / ymax) * (H - Tp - B);
    const cost = s => x.fc + r.vr * s;
    let g = `<line class="axis" x1="${L}" y1="${sy(0)}" x2="${W - R}" y2="${sy(0)}"></line><line class="axis" x1="${L}" y1="${Tp}" x2="${L}" y2="${sy(0)}"></line>`;
    g += `<line class="sales" x1="${sx(0)}" y1="${sy(0)}" x2="${sx(smax)}" y2="${sy(smax)}"></line><text class="sales-t" x="${sx(smax) - 4}" y="${sy(smax) + 16}" text-anchor="end">${esc(T.lg_sales)}</text>`;
    g += `<line class="cost" x1="${sx(0)}" y1="${sy(cost(0))}" x2="${sx(smax)}" y2="${sy(cost(smax))}"></line><text class="cost-t" x="${sx(smax) - 4}" y="${sy(cost(smax)) - 6}" text-anchor="end">${esc(T.lg_cost)}</text>`;
    g += `<line class="fixed" x1="${sx(0)}" y1="${sy(x.fc)}" x2="${sx(smax)}" y2="${sy(x.fc)}"></line><text class="fixed-t" x="${L + 4}" y="${sy(x.fc) - 6}">${esc(T.lg_fixed)}</text>`;
    if (Number.isFinite(r.bep) && r.bep <= smax) g += `<circle class="bep" cx="${sx(r.bep)}" cy="${sy(r.bep)}" r="5"></circle><line class="guide" x1="${sx(r.bep)}" y1="${sy(r.bep)}" x2="${sx(r.bep)}" y2="${sy(0)}"></line><text class="bep-t" x="${sx(r.bep)}" y="${H - 14}" text-anchor="middle">${esc(T.lg_bep)}</text>`;
    g += `<line class="now" x1="${sx(x.sales)}" y1="${Tp}" x2="${sx(x.sales)}" y2="${sy(0)}"></line><text x="${sx(x.sales)}" y="${Tp + 10}" text-anchor="middle">${esc(T.lg_now)}</text>`;
    svg.innerHTML = g;
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  function update() {
    const x = Object.fromEntries(['sales', 'vc', 'fc', 'target', 'price', 'uvc'].map(k => [k, Number(form.elements[k].value)]));
    const ok = x.sales > 0 && x.vc >= 0 && x.fc >= 0 && x.vc < x.sales;
    document.getElementById('be-error').hidden = ok;
    if (!ok) { document.querySelectorAll('[data-out]').forEach(e => { e.textContent = '–'; }); document.getElementById('be-chart').innerHTML = ''; return; }
    const r = breakeven(x);
    out('profit').textContent = n(r.profit);
    out('vr').textContent = pct(r.vr);
    out('mr').textContent = pct(r.mr);
    out('bep').textContent = n(r.bep);
    out('ratio').textContent = pct(r.ratio);
    out('safety').textContent = pct(r.safety);
    out('need').textContent = n(r.need);
    out('qty').textContent = x.price > x.uvc && x.price > 0 ? `${n(Math.ceil(x.fc / (x.price - x.uvc) - 1e-9))} ${T.units}` : '–';
    chart(x, r);
  }
  form.addEventListener('input', e => { if (e.target.name !== 'example') update(); });
  form.elements.example.addEventListener('change', () => {
    const ex = T.examples[Number(form.elements.example.value)];
    if (!ex) return;
    for (const k of ['sales', 'vc', 'fc', 'target', 'price', 'uvc']) form.elements[k].value = String(ex[k] ?? 0);
    update();
  });
  form.addEventListener('submit', e => e.preventDefault());
  form.elements.example.value = '0';
  form.elements.example.dispatchEvent(new Event('change'));
}
