// データの転送時間。データ量(バイト)を8倍してビットにし、回線速度 × 伝送効率で割る。
// 単位の接頭辞はデータ量・回線速度とも10の累乗(k = 1000)を基本とし、データ量は2の累乗(Ki = 1024)も選べる。
// 逆に、決まった時間で送るのに必要な回線速度も求める
export const SIZE_UNITS = { B: 1, kB: 1e3, MB: 1e6, GB: 1e9, TB: 1e12, KiB: 1024, MiB: 1024 ** 2, GiB: 1024 ** 3, TiB: 1024 ** 4 };
export const RATE_UNITS = { bps: 1, kbps: 1e3, Mbps: 1e6, Gbps: 1e9 };
export function transfer(sizeBytes, rateBps, eff) {
  const bits = sizeBytes * 8, eRate = rateBps * eff;
  return { bits, eRate, sec: bits / eRate };
}
const form = globalThis.document?.getElementById('tf-form');
if (form) {
  const out = k => document.querySelector(`[data-out="${k}"]`);
  let T = {};
  try { T = JSON.parse(form.dataset.text); } catch {}
  const num = v => (Number.isFinite(v) ? (Math.abs(v) >= 1e6 || (Math.abs(v) < 1e-3 && v !== 0) ? v.toExponential(3).replace(/\.?0+e/, 'e').replace('e+', '×10^').replace('e-', '×10^-') : String(Number(v.toPrecision(6)))) : '–');
  // 秒を読みやすい単位で
  const dur = s => {
    if (!Number.isFinite(s)) return '–';
    if (s < 1e-3) return `${num(s * 1e6)} µs`;
    if (s < 1) return `${num(s * 1e3)} ms`;
    if (s < 60) return `${num(s)} ${T.u_s}`;
    if (s < 3600) return `${num(s)} ${T.u_s} (${Math.floor(s / 60)} ${T.u_min} ${Number((s % 60).toFixed(1))} ${T.u_s})`;
    return `${num(s)} ${T.u_s} (${Math.floor(s / 3600)} ${T.u_h} ${Math.floor((s % 3600) / 60)} ${T.u_min})`;
  };
  const rate = bps => (bps >= 1e9 ? `${num(bps / 1e9)} Gbps` : bps >= 1e6 ? `${num(bps / 1e6)} Mbps` : bps >= 1e3 ? `${num(bps / 1e3)} kbps` : `${num(bps)} bps`);
  function update() {
    const size = Number(form.elements.size.value) * SIZE_UNITS[form.elements.sunit.value];
    const r = Number(form.elements.rate.value) * RATE_UNITS[form.elements.runit.value];
    const eff = Number(form.elements.eff.value) / 100;
    const ok = size > 0 && r > 0 && eff > 0 && eff <= 1;
    document.getElementById('tf-error').hidden = ok;
    if (!ok) { for (const k of ['bits', 'erate', 'time', 'need']) out(k).textContent = '–'; document.getElementById('tf-steps').textContent = ''; return; }
    const x = transfer(size, r, eff);
    out('bits').textContent = `${num(x.bits)} bit`;
    out('erate').textContent = rate(x.eRate);
    out('time').textContent = dur(x.sec);
    document.getElementById('tf-steps').textContent = T.steps.replaceAll('{size}', num(size)).replaceAll('{bits}', num(x.bits)).replaceAll('{rate}', num(r)).replaceAll('{eff}', num(eff)).replaceAll('{erate}', num(x.eRate)).replaceAll('{sec}', num(x.sec));
    const t = Number(form.elements.target.value);
    out('need').textContent = t > 0 ? rate(x.bits / t / eff) : '–';
  }
  form.addEventListener('input', e => { if (e.target.name !== 'example') update(); });
  form.elements.example.addEventListener('change', () => {
    const ex = T.examples[Number(form.elements.example.value)];
    if (!ex) return;
    for (const k of ['size', 'sunit', 'rate', 'runit', 'eff', 'target']) form.elements[k].value = String(ex[k]);
    update();
  });
  form.addEventListener('submit', e => e.preventDefault());
  form.elements.example.value = '0';
  form.elements.example.dispatchEvent(new Event('change'));
}
