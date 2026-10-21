// CVSS v3.1 の基本値(Base Score)。FIRST の仕様書の式のとおりに計算する。
// ISS = 1 − (1 − C)(1 − I)(1 − A)、影響度 = 6.42 × ISS(スコープ変更なし)/ 7.52 × (ISS − 0.029) − 3.25 × (ISS − 0.02)^15(スコープ変更あり)、
// 攻撃容易性 = 8.22 × AV × AC × PR × UI。影響度が0以下なら0、そうでなければ (影響度 + 攻撃容易性)(スコープ変更ありは ×1.08)を10で頭打ちにして切り上げる
export const METRICS = {
  AV: { N: 0.85, A: 0.62, L: 0.55, P: 0.2 },
  AC: { L: 0.77, H: 0.44 },
  PR: { N: 0.85, L: 0.62, H: 0.27 },
  UI: { N: 0.85, R: 0.62 },
  S: { U: 0, C: 1 },
  C: { H: 0.56, L: 0.22, N: 0 },
  I: { H: 0.56, L: 0.22, N: 0 },
  A: { H: 0.56, L: 0.22, N: 0 },
};
export const KEYS = ['AV', 'AC', 'PR', 'UI', 'S', 'C', 'I', 'A'];
// 仕様書の Roundup: 浮動小数点の誤差を避けるため、10万倍した整数で小数第1位に切り上げる
export function roundup(x) {
  const i = Math.round(x * 100000);
  return i % 10000 === 0 ? i / 100000 : (Math.floor(i / 10000) + 1) / 10;
}
export function score(m) {
  const changed = m.S === 'C';
  const pr = m.PR === 'N' ? 0.85 : m.PR === 'L' ? (changed ? 0.68 : 0.62) : (changed ? 0.5 : 0.27);
  const iss = 1 - (1 - METRICS.C[m.C]) * (1 - METRICS.I[m.I]) * (1 - METRICS.A[m.A]);
  const impact = changed ? 7.52 * (iss - 0.029) - 3.25 * Math.pow(iss - 0.02, 15) : 6.42 * iss;
  const expl = 8.22 * METRICS.AV[m.AV] * METRICS.AC[m.AC] * pr * METRICS.UI[m.UI];
  const base = impact <= 0 ? 0 : roundup(Math.min((changed ? 1.08 : 1) * (impact + expl), 10));
  return { base, iss, impact, expl, severity: severity(base) };
}
export const severity = s => (s === 0 ? 'none' : s < 4 ? 'low' : s < 7 ? 'medium' : s < 9 ? 'high' : 'critical');
export const vector = m => `CVSS:3.1/${KEYS.map(k => `${k}:${m[k]}`).join('/')}`;
// 「CVSS:3.1/AV:N/...」または「AV:N/AC:L/...」を読む。8つの基本評価基準がそろっていなければ null
export function parseVector(s) {
  const parts = String(s).trim().replace(/^CVSS:3\.[01]\//, '').split('/');
  const m = {};
  for (const p of parts) {
    const [k, v] = p.split(':');
    if (!(k in METRICS) || !(v in METRICS[k]) || k in m) return null;
    m[k] = v;
  }
  return KEYS.every(k => k in m) ? m : null;
}

const form = globalThis.document?.getElementById('cv-form');
if (form) {
  let T = {};
  try { T = JSON.parse(form.dataset.text); } catch {}
  const out = k => document.querySelector(`[data-out="${k}"]`);
  const read = () => Object.fromEntries(KEYS.map(k => [k, form.elements[k].value]));
  function show(m) {
    const r = score(m);
    out('base').textContent = r.base.toFixed(1);
    const sev = out('severity');
    sev.textContent = T.sev[r.severity];
    sev.dataset.sev = r.severity;
    out('impact').textContent = r.impact <= 0 ? '0.0' : (Math.round(r.impact * 10) / 10).toFixed(1);
    out('expl').textContent = (Math.round(r.expl * 10) / 10).toFixed(1);
    out('vector').textContent = vector(m);
  }
  function update() {
    form.elements.vec.value = vector(read());
    document.getElementById('cv-error').hidden = true;
    show(read());
  }
  form.addEventListener('change', e => {
    if (e.target.name === 'example') {
      const ex = T.examples[Number(e.target.value)];
      if (ex) { const m = parseVector(ex.vector); KEYS.forEach(k => { form.elements[k].value = m[k]; }); update(); }
      return;
    }
    if (e.target.name !== 'vec') update();
  });
  form.elements.vec.addEventListener('input', () => {
    const m = parseVector(form.elements.vec.value);
    document.getElementById('cv-error').hidden = !!m;
    if (!m) return;
    KEYS.forEach(k => { form.elements[k].value = m[k]; });
    show(m);
  });
  form.addEventListener('submit', e => e.preventDefault());
  form.elements.example.value = '0';
  form.elements.example.dispatchEvent(new Event('change', { bubbles: true }));
}
