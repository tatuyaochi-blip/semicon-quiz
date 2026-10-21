// 投資の評価。初期投資と毎年のキャッシュフロー、割引率から、正味現在価値 NPV = Σ CFₜ ÷ (1 + r)ᵗ − 初期投資、
// 内部収益率 IRR(NPV が 0 になる割引率。二分法で求める)、回収期間(割り引かない場合と割り引く場合。年の途中は直線で補う)、
// 収益性指数 PI = 将来のキャッシュフローの現在価値 ÷ 初期投資 を求める
export function evaluate(inv, cfs, r) {
  const pv = cfs.map((c, t) => c / (1 + r) ** (t + 1));
  const sumPv = pv.reduce((a, b) => a + b, 0);
  const npvAt = rate => cfs.reduce((a, c, t) => a + c / (1 + rate) ** (t + 1), 0) - inv;
  // IRR: NPV(rate) は rate について単調に減る(キャッシュフローがすべて0以上のとき)。−99%〜1000% の範囲で探す
  let irr = NaN;
  if (cfs.every(c => c >= 0) && npvAt(-0.99) > 0 && npvAt(10) < 0) {
    let lo = -0.99, hi = 10;
    for (let k = 0; k < 200; k++) { const m = (lo + hi) / 2; if (npvAt(m) > 0) lo = m; else hi = m; }
    irr = (lo + hi) / 2;
  }
  const payback = list => {
    let acc = 0;
    for (let t = 0; t < list.length; t++) {
      if (acc + list[t] >= inv - 1e-9) return t + (list[t] > 0 ? (inv - acc) / list[t] : 0);
      acc += list[t];
    }
    return NaN;
  };
  return { pv, sumPv, npv: sumPv - inv, irr, payback: payback(cfs), dpayback: payback(pv), pi: inv > 0 ? sumPv / inv : NaN };
}
const form = globalThis.document?.getElementById('nv-form');
if (form) {
  const out = k => document.querySelector(`[data-out="${k}"]`);
  let T = {};
  try { T = JSON.parse(form.dataset.text); } catch {}
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const n = v => (Number.isFinite(v) ? String(Number(v.toFixed(2))).replace(/\B(?=(\d{3})+(?!\d))/g, ',').replace('-', '−') : '–');
  const pct = v => (Number.isFinite(v) ? `${Number((v * 100).toFixed(2))}%`.replace('-', '−') : '–');
  const yrs = v => (Number.isFinite(v) ? `${Number(v.toFixed(2))} ${T.years}` : T.not_recovered);
  function update() {
    const inv = Number(form.elements.inv.value), r = Number(form.elements.rate.value) / 100;
    const cfs = form.elements.cfs.value.split(/[\s,、]+/).filter(Boolean).map(Number);
    const ok = inv > 0 && r > -1 && cfs.length >= 1 && cfs.length <= 30 && cfs.every(Number.isFinite);
    document.getElementById('nv-error').hidden = ok;
    if (!ok) { for (const k of ['npv', 'irr', 'payback', 'dpayback', 'pi', 'verdict']) out(k).textContent = '–'; document.getElementById('nv-table').innerHTML = ''; return; }
    const x = evaluate(inv, cfs, r);
    out('npv').textContent = n(x.npv); out('irr').textContent = pct(x.irr); out('pi').textContent = Number.isFinite(x.pi) ? x.pi.toFixed(3) : '–';
    out('payback').textContent = yrs(x.payback); out('dpayback').textContent = yrs(x.dpayback);
    out('verdict').textContent = x.npv > 1e-9 ? T.go : x.npv < -1e-9 ? T.nogo : T.even;
    let acc = -inv, accPv = -inv;
    const rows = [`<tr><td>0</td><td>${n(-inv)}</td><td>1</td><td>${n(-inv)}</td><td>${n(acc)}</td><td>${n(accPv)}</td></tr>`];
    cfs.forEach((c, t) => { acc += c; accPv += x.pv[t]; rows.push(`<tr><td>${t + 1}</td><td>${n(c)}</td><td>${(1 / (1 + r) ** (t + 1)).toFixed(4)}</td><td>${n(x.pv[t])}</td><td${acc >= 0 ? ' class="pos"' : ''}>${n(acc)}</td><td${accPv >= 0 ? ' class="pos"' : ''}>${n(accPv)}</td></tr>`); });
    document.getElementById('nv-table').innerHTML = `<table class="sp-pairs nv-table"><thead><tr><th>${esc(T.col_year)}</th><th>${esc(T.col_cf)}</th><th>${esc(T.col_df)}</th><th>${esc(T.col_pv)}</th><th>${esc(T.col_acc)}</th><th>${esc(T.col_accpv)}</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;
  }
  form.addEventListener('input', e => { if (e.target.name !== 'example') update(); });
  form.elements.example.addEventListener('change', () => {
    const ex = T.examples[Number(form.elements.example.value)];
    if (!ex) return;
    form.elements.inv.value = String(ex.inv); form.elements.rate.value = String(ex.rate); form.elements.cfs.value = ex.cfs;
    update();
  });
  form.addEventListener('submit', e => e.preventDefault());
  form.elements.example.value = '0';
  form.elements.example.dispatchEvent(new Event('change'));
}
