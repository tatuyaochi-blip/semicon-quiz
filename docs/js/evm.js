// アーンドバリューマネジメント(EVM)。計画価値 PV・出来高 EV・実コスト AC と完成時総予算 BAC から、
// スケジュール差異 SV = EV − PV、コスト差異 CV = EV − AC、SPI = EV ÷ PV、CPI = EV ÷ AC、
// 完成時総コストの見積もり EAC(今の効率が続く場合 BAC ÷ CPI、残りは計画どおりの場合 AC + (BAC − EV))、ETC = EAC − AC、VAC = BAC − EAC を求める
export function evm({ bac, pv, ev, ac }) {
  const r = { sv: ev - pv, cv: ev - ac, spi: pv > 0 ? ev / pv : NaN, cpi: ac > 0 ? ev / ac : NaN, done: bac > 0 ? ev / bac : NaN };
  r.eac = r.cpi > 0 ? bac / r.cpi : NaN;
  r.eacPlan = ac + (bac - ev);
  r.eacBoth = r.cpi > 0 && r.spi > 0 ? ac + (bac - ev) / (r.cpi * r.spi) : NaN;
  r.etc = r.eac - ac;
  r.vac = bac - r.eac;
  r.tcpi = bac - ac > 0 ? (bac - ev) / (bac - ac) : NaN;
  return r;
}
const form = globalThis.document?.getElementById('ev-form');
if (form) {
  const out = k => document.querySelector(`[data-out="${k}"]`);
  let T = {};
  try { T = JSON.parse(form.dataset.text); } catch {}
  const f2 = v => (Number.isFinite(v) ? String(Number(v.toFixed(2))) : '–');
  const f3 = v => (Number.isFinite(v) ? v.toFixed(2) : '–');
  const sign = v => (Number.isFinite(v) ? `${v > 0 ? '+' : v < 0 ? '−' : ''}${f2(Math.abs(v))}` : '–');
  function chart(x, r) {
    const svg = document.getElementById('ev-chart');
    const W = 600, H = 240, L = 50, R = 20, Tp = 12, B = 28;
    const ymax = Math.max(x.bac, r.eac || 0, x.ac, x.pv) * 1.08 || 1;
    const now = Math.min(Math.max(x.now, 0), 100);
    const sx = t => L + t / 100 * (W - L - R), sy = v => Tp + (1 - v / ymax) * (H - Tp - B);
    // 計画は「今」の PV を通って完了時に BAC に達する折れ線、実績(EV・AC)は今まで、見積もり(EAC)は今から完了まで
    const tNow = now;
    const plan = `${sx(0)},${sy(0)} ${sx(tNow)},${sy(x.pv)} ${sx(100)},${sy(x.bac)}`;
    let g = `<line class="grid" x1="${L}" x2="${W - R}" y1="${sy(x.bac)}" y2="${sy(x.bac)}"></line><text x="${L - 6}" y="${sy(x.bac) + 4}" text-anchor="end">BAC</text>`;
    g += `<line class="axis" x1="${L}" x2="${W - R}" y1="${sy(0)}" y2="${sy(0)}"></line><line class="now" x1="${sx(tNow)}" x2="${sx(tNow)}" y1="${Tp}" y2="${sy(0)}"></line><text x="${sx(tNow)}" y="${H - 8}" text-anchor="middle">${T.now}</text>`;
    g += `<polyline class="pv" points="${plan}"></polyline>`;
    g += `<polyline class="ev" points="${sx(0)},${sy(0)} ${sx(tNow)},${sy(x.ev)}"></polyline><polyline class="ac" points="${sx(0)},${sy(0)} ${sx(tNow)},${sy(x.ac)}"></polyline>`;
    if (Number.isFinite(r.eac)) g += `<polyline class="eac" points="${sx(tNow)},${sy(x.ac)} ${sx(100)},${sy(r.eac)}"></polyline><text class="eac-t" x="${W - R}" y="${sy(r.eac) - 6}" text-anchor="end">EAC</text>`;
    // ラベルは「今」の線の左に、重ならないよう14px以上離して置く
    const pts = [['pv', x.pv], ['ev', x.ev], ['ac', x.ac]].map(([k, v]) => ({ k, v, y: sy(v) })).sort((a, b) => a.y - b.y);
    for (let i = 1; i < pts.length; i++) pts[i].ly = Math.max(pts[i].y, (pts[i - 1].ly ?? pts[i - 1].y) + 14);
    pts[0].ly = pts[0].y;
    for (const q of pts) g += `<circle class="${q.k}" cx="${sx(tNow)}" cy="${q.y}" r="4"></circle><text class="${q.k}-t lbl" x="${sx(tNow) - 10}" y="${q.ly + 4}" text-anchor="end">${q.k.toUpperCase()} ${f2(q.v)}</text>`;
    svg.innerHTML = g;
  }
  function update() {
    const x = Object.fromEntries(['bac', 'pv', 'ev', 'ac', 'now'].map(k => [k, Number(form.elements[k].value)]));
    const ok = x.bac > 0 && x.pv >= 0 && x.ev >= 0 && x.ac >= 0 && x.now >= 0 && x.now <= 100;
    document.getElementById('ev-error').hidden = ok;
    if (!ok) { document.querySelectorAll('[data-out]').forEach(e => { e.textContent = '–'; }); return; }
    const r = evm(x);
    out('sv').textContent = sign(r.sv); out('cv').textContent = sign(r.cv);
    out('spi').textContent = f3(r.spi); out('cpi').textContent = f3(r.cpi);
    out('done').textContent = Number.isFinite(r.done) ? `${f2(r.done * 100)}%` : '–';
    out('eac').textContent = f2(r.eac); out('eacPlan').textContent = f2(r.eacPlan); out('eacBoth').textContent = f2(r.eacBoth);
    out('etc').textContent = f2(r.etc); out('vac').textContent = sign(r.vac); out('tcpi').textContent = f3(r.tcpi);
    const sch = !Number.isFinite(r.spi) ? '' : r.spi < 1 ? T.behind : r.spi > 1 ? T.ahead : T.on_time;
    const cost = !Number.isFinite(r.cpi) ? '' : r.cpi < 1 ? T.over : r.cpi > 1 ? T.under : T.on_budget;
    document.getElementById('ev-verdict').textContent = [sch, cost].filter(Boolean).join(' ');
    chart(x, r);
  }
  form.addEventListener('input', e => { if (e.target.name !== 'example') update(); });
  form.elements.example.addEventListener('change', () => {
    const ex = T.examples[Number(form.elements.example.value)];
    if (!ex) return;
    for (const k of ['bac', 'pv', 'ev', 'ac', 'now']) form.elements[k].value = String(ex[k]);
    update();
  });
  form.addEventListener('submit', e => e.preventDefault());
  form.elements.example.value = '0';
  form.elements.example.dispatchEvent(new Event('change'));
}
