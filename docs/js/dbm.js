// dB・dBm の換算。P[W] = 10^(dBm/10) / 1000、負荷抵抗 R での実効電圧 Vrms = √(P·R)、dBµV = 20·log10(Vrms / 1 µV)。
// dB から電力比 10^(dB/10) と電圧比 10^(dB/20)。dBm と mW はどちらを書き換えても、もう一方を計算し直す
import { si, num, reader } from './eng.js';
const form = document.getElementById('db-form');
const out = k => document.querySelector(`[data-out="${k}"]`);
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
  const p = 10 ** (dbm / 10) / 1000;
  const r = val('r', 1e-9);
  const vrms = Math.sqrt(p * r);
  out('w').textContent = si(p, 'W', 4);
  out('dbw').textContent = Number.isFinite(dbm) ? `${num(dbm - 30, 5)} dBW` : '–';
  out('vrms').textContent = si(vrms, 'V', 4);
  out('vpp').textContent = si(vrms * 2 * Math.SQRT2, 'V', 4);
  out('dbuv').textContent = Number.isFinite(vrms) ? `${num(20 * Math.log10(vrms / 1e-6), 5)} dBµV` : '–';
  const db = val('db');
  out('pr').textContent = `${num(10 ** (db / 10), 4)}×`;
  out('vr').textContent = `${num(10 ** (db / 20), 4)}×`;
}
form.addEventListener('input', update);
form.addEventListener('submit', e => e.preventDefault());
update();
