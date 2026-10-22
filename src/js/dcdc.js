// DC-DC コンバータ(降圧・昇圧・昇降圧)の理想的な定常状態。スイッチとダイオードの電圧降下と損失は考えない。
// 電流連続モード(CCM): デューティ比 D は 降圧 Vout/Vin、昇圧 1 − Vin/Vout、昇降圧 |Vout|/(Vin + |Vout|)。
// インダクタ電流のリプル ΔI(山から谷まで): 降圧 (Vin − Vout)·D/(L·f)、昇圧と昇降圧 Vin·D/(L·f)。平均電流: 降圧 Iout、昇圧と昇降圧 Iout/(1 − D)
// 出力電圧のリプル: 降圧 ΔI/(8·f·C)、昇圧と昇降圧 Iout·D/(f·C)(コンデンサの容量分。ESR があれば ESR × 電流の振れ幅を足す)
// 電流の谷が 0 を下回る(負荷が軽い)と電流不連続モード(DCM)になる。DCM の D は、K = 2L/(R·T)(R = Vout/Iout、T = 1/f)を使う
// 次の関係から求める(Erickson, Fundamentals of Power Electronics): 降圧 M = 2/(1 + √(1 + 4K/D²))、昇圧 M = (1 + √(1 + 4D²/K))/2、昇降圧 M = D/√K
import { lineChart } from './chart.js';

export function dcdc({ topo, vin, vout, iout, f, L, C, esr = 0 }) {
  const M = vout / vin;
  if (topo === 'buck' && !(vout < vin)) return { error: 'buck_range' };
  if (topo === 'boost' && !(vout > vin)) return { error: 'boost_range' };
  const T = 1 / f;
  const R = vout / iout;
  const Dccm = topo === 'buck' ? M : topo === 'boost' ? 1 - 1 / M : M / (1 + M);
  // CCM のリプルと平均電流
  const slopeOn = topo === 'buck' ? vin - vout : vin;      // スイッチがオンのあいだの L の電圧
  const slopeOff = vout;                                       // オフのあいだ(降圧は Vout、昇圧は Vout − Vin、昇降圧は |Vout|)
  const di = slopeOn * Dccm / (L * f);
  const iavg = topo === 'buck' ? iout : iout / (1 - Dccm);
  const ccm = iavg - di / 2 > 0;
  // CCM と DCM の境目の出力電流
  const icrit = topo === 'buck' ? di / 2 : (di / 2) * (1 - Dccm);
  // L を選ぶ目安: リプルを平均電流の 30% にする L
  const L30 = slopeOn * Dccm / (0.3 * iavg * f);
  if (ccm) {
    const dvC = topo === 'buck' ? di / (8 * f * C) : iout * Dccm / (f * C);
    const dvE = esr * (topo === 'buck' ? di : iavg + di / 2);
    return { mode: 'ccm', D: Dccm, di, iavg, ipk: iavg + di / 2, imin: iavg - di / 2, icrit, L30, dv: dvC + dvE,
      wave: wave(Dccm, slopeOn / L, (topo === 'buck' ? slopeOff : topo === 'boost' ? vout - vin : vout) / L, iavg - di / 2, T) };
  }
  const K = 2 * L / (R * T);
  const D = topo === 'buck' ? Math.sqrt(4 * K / ((2 / M - 1) ** 2 - 1)) : topo === 'boost' ? Math.sqrt(K * ((2 * M - 1) ** 2 - 1) / 4) : M * Math.sqrt(K);
  const ipk = slopeOn * D / (L * f);
  const down = (topo === 'buck' ? vout : topo === 'boost' ? vout - vin : vout) / L;
  return { mode: 'dcm', D, di: ipk, iavg: NaN, ipk, imin: 0, icrit, L30, dv: NaN, wave: wave(D, slopeOn / L, down, 0, T) };
}

// インダクタ電流の波形を2周期ぶん: オンで傾き up、オフで傾き down で下がり、0 に達したら 0 のまま(DCM)
function wave(D, up, down, i0, T) {
  const pts = [];
  for (let n = 0; n < 2; n++) {
    const t0 = n * T, ipk = i0 + up * D * T;
    const tFall = Math.min((ipk - 0) / down, (1 - D) * T);
    const iEnd = Math.max(ipk - down * (1 - D) * T, 0);
    pts.push([t0, i0], [t0 + D * T, ipk], [t0 + D * T + tFall, ipk - down * tFall]);
    if (iEnd === 0) pts.push([t0 + T, 0]);
  }
  return pts;
}

const form = globalThis.document?.getElementById('dc-form');
if (form) {
  let T = {};
  try { T = JSON.parse(form.dataset.text); } catch {}
  const lang = document.documentElement.lang;
  const out = k => document.querySelector(`[data-out="${k}"]`);
  const g = (v, d = 3) => (Number.isFinite(v) ? Number(v.toPrecision(d)).toLocaleString(lang, { maximumFractionDigits: 9 }) : '–');
  const si = (v, unit) => {
    if (!Number.isFinite(v)) return '–';
    const a = Math.abs(v), [k, p] = a >= 1 || a === 0 ? [1, ''] : a >= 1e-3 ? [1e3, 'm'] : a >= 1e-6 ? [1e6, 'µ'] : [1e9, 'n'];
    return `${g(v * k)} ${p}${unit}`;
  };
  const read = k => Number(form.elements[k].value) * Number(form.elements[`${k}u`]?.value ?? 1);
  const err = document.getElementById('dc-error');
  function update() {
    const p = { topo: form.elements.topo.value, vin: read('vin'), vout: Math.abs(read('vout')), iout: read('iout'), f: read('f'), L: read('L'), C: read('C'), esr: read('esr') };
    const bad = ['vin', 'vout', 'iout', 'f', 'L', 'C'].find(k => !(p[k] > 0)) || !(p.esr >= 0);
    const r = bad ? { error: 'positive' } : dcdc(p);
    if (r.error) { err.textContent = T[r.error]; err.hidden = false; document.querySelectorAll('[data-out]').forEach(e => { e.textContent = '–'; }); document.getElementById('dc-chart').innerHTML = ''; return; }
    err.hidden = true;
    out('mode').textContent = r.mode === 'ccm' ? T.ccm : T.dcm;
    out('D').textContent = `${g(r.D * 100)}%`;
    out('iavg').textContent = si(r.iavg, 'A');
    out('di').textContent = r.mode === 'ccm' ? `${si(r.di, 'A')} (${g(r.di / r.iavg * 100)}%)` : si(r.di, 'A');
    out('ipk').textContent = si(r.ipk, 'A');
    out('icrit').textContent = si(r.icrit, 'A');
    out('dv').textContent = r.mode === 'ccm' ? `${si(r.dv, 'V')} (${g(r.dv / p.vout * 100)}%)` : '–';
    out('L30').textContent = si(r.L30, 'H');
    document.getElementById('dc-note').textContent = r.mode === 'ccm' ? '' : T.dcm_note;
    lineChart(document.getElementById('dc-chart'), { xlabel: T.x_label, ylabel: T.y_label, ymin: 0,
      series: [{ points: r.wave.map(([t, i]) => [t * 1e6, i]), cls: 'ac' }, ...(r.mode === 'ccm' ? [{ points: [[0, r.iavg], [r.wave.at(-1)[0] * 1e6, r.iavg]], cls: 'dash' }] : [])] });
  }
  form.addEventListener('input', e => { if (e.target.name !== 'example') update(); });
  form.elements.example.addEventListener('change', () => {
    const ex = T.examples[Number(form.elements.example.value)];
    if (!ex) return;
    for (const [k, v] of Object.entries(ex.set)) form.elements[k].value = String(v);
    update();
  });
  form.addEventListener('submit', e => e.preventDefault());
  update();
}
