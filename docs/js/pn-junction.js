// pn接合(階段接合・空乏近似)の計算ページ。内蔵電位、空乏層幅、最大電界、接合容量。温度は 300 K
const form = document.getElementById('pn-form');
const lang = document.documentElement.lang || 'en';
const fmt = (x, d = 3) => (Number.isFinite(x) ? x.toLocaleString(lang, { maximumSignificantDigits: d }) : '–');
const out = k => document.querySelector(`[data-out="${k}"]`);
const q = 1.602e-19, kT = 0.02585, e0 = 8.854e-14; // C、eV(300 K)、F/cm
// 300 K の代表値: 真性キャリア密度 ni (cm⁻³) と比誘電率
const MAT = { si: [1.0e10, 11.7], ge: [2.0e13, 16.0], gaas: [2.1e6, 12.9] };

function update() {
  const [ni, er] = MAT[form.elements.mat.value] ?? MAT.si;
  const num = (k, min = 0) => { const v = Number(form.elements[k].value); return Number.isFinite(v) && v > min ? v : Number(form.elements[k].defaultValue); };
  const na = num('na'), nd = num('nd'), vr = Number(form.elements.vr.value) || 0;
  const es = er * e0;
  const vbi = kT * Math.log((na * nd) / (ni * ni));
  const v = vbi + vr;
  const valid = v > 0;
  const wd = valid ? Math.sqrt(((2 * es * v) / q) * (1 / na + 1 / nd)) : NaN; // cm
  const xn = (wd * na) / (na + nd), xp = (wd * nd) / (na + nd);
  out('vbi').textContent = `${fmt(vbi)} V`;
  out('w').textContent = valid ? `${fmt(wd * 1e4)} µm` : '–';
  out('xn').textContent = valid ? `${fmt(xn * 1e4)} µm` : '–';
  out('xp').textContent = valid ? `${fmt(xp * 1e4)} µm` : '–';
  out('emax').textContent = valid ? `${fmt((q * nd * xn) / es / 1e3)} kV/cm` : '–';
  out('cj').textContent = valid ? `${fmt((es / wd) * 1e9)} nF/cm²` : '–';
  document.getElementById('pn-warn').hidden = valid;
}
form.addEventListener('input', update);
form.addEventListener('submit', e => e.preventDefault());
update();
