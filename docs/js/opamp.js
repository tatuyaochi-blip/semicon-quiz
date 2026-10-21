// オペアンプの増幅回路(理想オペアンプとして直流の値を計算)。
// 反転: G = −Rf/Rin、非反転: G = 1 + Rf/Rg、ボルテージフォロワ: G = 1、差動(抵抗比がそろっている): Vout = (Rf/R1)(V2 − V1)。
// 出力は電源電圧(V+、V−)で頭打ちにする。目標ゲインには、Rin を 1 kΩ〜100 kΩ の E24 から選び、Rf を E24 で合わせた組を3つ示す
import { si, num, reader, E24, eNear } from './eng.js';
const form = document.getElementById('oa-form');
const out = k => document.querySelector(`[data-out="${k}"]`);
const val = reader(form);
let T = {};
try { T = JSON.parse(form.dataset.text); } catch {}

function show() {
  const c = form.elements.circuit.value;
  form.querySelectorAll('[data-show]').forEach(el => { el.hidden = !el.dataset.show.split(' ').includes(c); });
}
function update() {
  const c = form.elements.circuit.value;
  const rf = val('rf', 1e-9) * 1e3, rin = val('rin', 1e-9) * 1e3;
  const vin = val('vin'), v1 = val('v1'), v2 = val('v2');
  const vp = val('vpos'), vn = val('vneg');
  const g = { inv: -rf / rin, noninv: 1 + rf / rin, follower: 1, diff: rf / rin }[c];
  const ideal = c === 'diff' ? g * (v2 - v1) : g * vin;
  const vout = Math.min(Math.max(ideal, vn), vp);
  out('gain').textContent = `${num(g, 4)}×`;
  out('gain_db').textContent = `${num(20 * Math.log10(Math.abs(g)), 4)} dB`;
  out('vout').textContent = si(vout, 'V', 4);
  document.getElementById('oa-sat').hidden = ideal <= vp && ideal >= vn;
  out('zin').textContent = c === 'inv' ? si(rin, 'Ω') : c === 'diff' ? si(2 * rin, 'Ω') : T.zin_high;
  // 目標ゲインに近い組
  const t = Number(form.elements.t.value);
  const ratio = c === 'noninv' ? t - 1 : Math.abs(t);
  const box = document.getElementById('oa-pairs');
  if (c === 'follower' || !(ratio > 0)) { box.innerHTML = '<tr><td colspan="4">–</td></tr>'; return; }
  const rins = [3, 4].flatMap(e => E24.map(m => Number((m * 10 ** e).toPrecision(3)))).concat(1e5);
  const gainOf = (f, r) => (c === 'noninv' ? 1 + f / r : c === 'inv' ? -f / r : f / r);
  const want = c === 'inv' ? -Math.abs(t) : t;
  const cands = rins.map(r => { const f = eNear(ratio * r); return { f, r, g: gainOf(f, r) }; })
    .filter(x => x.f >= 100 && x.f <= 1e7)
    .sort((a, b) => Math.abs(a.g / want - 1) - Math.abs(b.g / want - 1) || a.r - b.r);
  const seen = new Set();
  box.innerHTML = cands.filter(x => { const k = num(x.g, 6); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 3)
    .map(x => `<tr><td>${si(x.f, 'Ω')}</td><td>${si(x.r, 'Ω')}</td><td>${num(x.g, 4)}×</td><td>${(x.g / want - 1) >= 0 ? '+' : '−'}${num(Math.abs(x.g / want - 1) * 100, 2)}%</td></tr>`).join('');
}
form.elements.circuit.addEventListener('change', () => { show(); update(); });
form.addEventListener('input', update);
form.addEventListener('submit', e => e.preventDefault());
show();
update();
