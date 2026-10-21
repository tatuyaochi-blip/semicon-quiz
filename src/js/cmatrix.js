// 混同行列(2クラス)。真陽性 TP・偽陰性 FN・偽陽性 FP・真陰性 TN から、正解率 = (TP + TN) ÷ 全体、適合率 = TP ÷ (TP + FP)、
// 再現率 = TP ÷ (TP + FN)、特異度 = TN ÷ (TN + FP)、偽陽性率 = FP ÷ (FP + TN)、F値 = 2 × 適合率 × 再現率 ÷ (適合率 + 再現率)、
// Fβ値、バランス正解率 = (再現率 + 特異度) ÷ 2、マシューズ相関係数 MCC を求める。分母が0の指標は求められない(NaN)
const div = (a, b) => (b > 0 ? a / b : NaN);
export function metrics({ tp, fn, fp, tn, beta = 1 }) {
  const n = tp + fn + fp + tn;
  const precision = div(tp, tp + fp), recall = div(tp, tp + fn), specificity = div(tn, tn + fp);
  const b2 = beta * beta;
  const fbeta = (p, r) => (Number.isFinite(p) && Number.isFinite(r) && b2 * p + r > 0 ? (1 + b2) * p * r / (b2 * p + r) : NaN);
  const d = (tp + fp) * (tp + fn) * (tn + fp) * (tn + fn);
  return {
    n, accuracy: div(tp + tn, n), error: div(fp + fn, n), precision, recall, specificity,
    fpr: div(fp, fp + tn), fnr: div(fn, tp + fn), npv: div(tn, tn + fn),
    f1: fbeta(precision, recall), fbeta: b2 === 1 ? NaN : fbeta(precision, recall),
    balanced: Number.isFinite(recall) && Number.isFinite(specificity) ? (recall + specificity) / 2 : NaN,
    mcc: d > 0 ? (tp * tn - fp * fn) / Math.sqrt(d) : NaN,
    prevalence: div(tp + fn, n),
  };
}
const form = globalThis.document?.getElementById('cm-form');
if (form) {
  const out = k => document.querySelector(`[data-out="${k}"]`);
  let T = {};
  try { T = JSON.parse(form.dataset.text); } catch {}
  const pct = v => (Number.isFinite(v) ? `${Number((v * 100).toFixed(2))}%` : '–');
  const num = v => (Number.isFinite(v) ? String(Number(v.toFixed(4))).replace('-', '−') : '–');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const KEYS = ['tp', 'fn', 'fp', 'tn'];
  function matrix(x) {
    const cell = (k, cls) => `<td class="cm-cell ${cls}"><b>${esc(T[`c_${k}`])}</b><span>${fmt(x[k])}</span></td>`;
    document.getElementById('cm-matrix').innerHTML = `<table class="cm-table"><thead><tr><th rowspan="2" colspan="2"></th><th colspan="2">${esc(T.pred)}</th></tr>`
      + `<tr><th>${esc(T.pos)}</th><th>${esc(T.neg)}</th></tr></thead><tbody>`
      + `<tr><th rowspan="2" class="cm-side">${esc(T.actual)}</th><th>${esc(T.pos)}</th>${cell('tp', 'ok')}${cell('fn', 'ng')}</tr>`
      + `<tr><th>${esc(T.neg)}</th>${cell('fp', 'ng')}${cell('tn', 'ok')}</tr></tbody></table>`;
  }
  function update() {
    const x = Object.fromEntries([...KEYS, 'beta'].map(k => [k, Number(form.elements[k].value)]));
    const ok = KEYS.every(k => Number.isInteger(x[k]) && x[k] >= 0) && x.tp + x.fn + x.fp + x.tn > 0 && x.beta > 0;
    document.getElementById('cm-error').hidden = ok;
    if (!ok) { document.querySelectorAll('[data-out]').forEach(e => { e.textContent = '–'; }); document.getElementById('cm-matrix').innerHTML = ''; return; }
    const r = metrics(x);
    matrix(x);
    for (const k of ['accuracy', 'precision', 'recall', 'specificity', 'fpr', 'npv', 'f1', 'balanced', 'prevalence']) out(k).textContent = pct(r[k]);
    out('fbeta').textContent = x.beta === 1 ? pct(r.f1) : pct(r.fbeta);
    out('mcc').textContent = num(r.mcc);
    out('n').textContent = fmt(r.n);
    // 正解率だけが高く、再現率が低いとき(不均衡なデータ)は注意を出す
    document.getElementById('cm-warn').hidden = !(r.accuracy >= 0.9 && Number.isFinite(r.recall) && r.recall < 0.5);
  }
  form.addEventListener('input', e => { if (e.target.name !== 'example') update(); });
  form.elements.example.addEventListener('change', () => {
    const ex = T.examples[Number(form.elements.example.value)];
    if (!ex) return;
    for (const k of KEYS) form.elements[k].value = String(ex[k]);
    form.elements.beta.value = String(ex.beta ?? 1);
    update();
  });
  form.addEventListener('submit', e => e.preventDefault());
  form.elements.example.value = '0';
  form.elements.example.dispatchEvent(new Event('change'));
}
