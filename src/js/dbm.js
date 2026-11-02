// dB・dBm の換算。P[W] = 10^(dBm/10) / 1000、負荷抵抗 R での実効電圧 Vrms = √(P·R)、dBµV = 20·log10(Vrms / 1 µV)。
// dB から電力比 10^(dB/10) と電圧比 10^(dB/20)。dBm と mW はどちらを書き換えても、もう一方を計算し直す
import { si, num, reader } from './eng.js';
const form = document.getElementById('db-form');
const out = k => document.querySelector(`[data-out="${k}"]`);
// dBm と負荷抵抗 r(Ω)から、電力・dBW・実効電圧・ピークtoピーク電圧(正弦波)・dBµV
export function fromDbm(dbm, r = 50) {
  const p = 10 ** (dbm / 10) / 1000, vrms = Math.sqrt(p * r);
  return { p, dbw: dbm - 30, vrms, vpp: vrms * 2 * Math.SQRT2, dbuv: 20 * Math.log10(vrms / 1e-6) };
}
// dB から電力比と電圧比
export const ratios = db => ({ pr: 10 ** (db / 10), vr: 10 ** (db / 20) });

if (form) {
const val = reader(form);

function update(e) {
  const dEl = form.elements.dbm, mEl = form.elements.mw;
  let dbm;
  if (e?.target === mEl) {
    const mw = Number(mEl.value);
    dbm = mw > 0 ? 10 * Math.log10(mw) : NaN;
    if (Number.isFinite(dbm)) dEl.value = Number(dbm.toFixed(3));
  } else {
    dbm = val('dbm');
    mEl.value = Number((10 ** (dbm / 10)).toPrecision(4));
  }
  const { p, dbw, vrms, vpp, dbuv } = fromDbm(dbm, val('r', 1e-9));
  out('w').textContent = si(p, 'W', 4);
  out('dbw').textContent = Number.isFinite(dbm) ? `${num(dbw, 5)} dBW` : '–';
  out('vrms').textContent = si(vrms, 'V', 4);
  out('vpp').textContent = si(vpp, 'V', 4);
  out('dbuv').textContent = Number.isFinite(vrms) ? `${num(dbuv, 5)} dBµV` : '–';
  const { pr, vr } = ratios(val('db'));
  out('pr').textContent = `${num(pr, 4)}×`;
  out('vr').textContent = `${num(vr, 4)}×`;
}
form.addEventListener('input', update);
form.addEventListener('submit', e => e.preventDefault());
update();
}
