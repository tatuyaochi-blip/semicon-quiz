// オペアンプの増幅回路(理想オペアンプとして直流の値を計算)。
// 反転: G = −Rf/Rin、非反転: G = 1 + Rf/Rg、ボルテージフォロワ: G = 1、差動(抵抗比がそろっている): Vout = (Rf/R1)(V2 − V1)。
// 出力は電源電圧(V+、V−)で頭打ちにする。目標ゲインには、Rin を 1 kΩ〜100 kΩ の E24 から選び、Rf を E24 で合わせた組を3つ示す
import { si, num, reader, E24, eNear } from './eng.js';
const form = document.getElementById('oa-form');
const out = k => document.querySelector(`[data-out="${k}"]`);
// 回路 c('inv'・'noninv'・'follower'・'diff')、Rf・Rin(Ω)、入力 vin(差動は v1・v2)、電源 vp・vn から、ゲイン・出力・入力抵抗
export function amp({ c, rf, rin, vin = 0, v1 = 0, v2 = 0, vp = Infinity, vn = -Infinity }) {
  const g = { inv: -rf / rin, noninv: 1 + rf / rin, follower: 1, diff: rf / rin }[c];
  const ideal = c === 'diff' ? g * (v2 - v1) : g * vin;
  return { g, db: 20 * Math.log10(Math.abs(g)), ideal, vout: Math.min(Math.max(ideal, vn), vp), sat: !(ideal <= vp && ideal >= vn), zin: c === 'inv' ? rin : c === 'diff' ? 2 * rin : Infinity };
}

// 目標ゲイン t に近い Rf・Rin の組(Rin は 1 kΩ〜100 kΩ の E24、Rf は E24 の最も近い値)を誤差の小さい順に k 個
export function pairs(c, t, k = 3) {
  const ratio = c === 'noninv' ? t - 1 : Math.abs(t);
  if (c === 'follower' || !(ratio > 0)) return [];
  const rins = [3, 4].flatMap(e => E24.map(m => Number((m * 10 ** e).toPrecision(3)))).concat(1e5);
  const gainOf = (f, r) => (c === 'noninv' ? 1 + f / r : c === 'inv' ? -f / r : f / r);
  const want = c === 'inv' ? -Math.abs(t) : t;
  return rins.map(r => { const f = eNear(ratio * r); const g = gainOf(f, r); return { f, r, g, err: g / want - 1 }; })
    .filter(x => x.f >= 100 && x.f <= 1e7)
    // 誤差の小さい順、同じなら Rin が 10 kΩ に近いもの(電流が大きすぎず、雑音も増えにくい)を先に
    .sort((a, b) => Math.abs(a.err) - Math.abs(b.err) || Math.abs(Math.log10(a.r / 1e4)) - Math.abs(Math.log10(b.r / 1e4)))
    .slice(0, k);
}

if (form) {
const val = reader(form);
let T = {};
try { T = JSON.parse(form.dataset.text); } catch {}

function show() {
  const c = form.elements.circuit.value;
  document.querySelectorAll('[data-show]').forEach(el => { el.hidden = !el.dataset.show.split(' ').includes(c); });
}
function update() {
  const c = form.elements.circuit.value;
  const rf = val('rf', 1e-9) * 1e3, rin = val('rin', 1e-9) * 1e3;
  const vin = val('vin'), v1 = val('v1'), v2 = val('v2');
  const vp = val('vpos'), vn = val('vneg');
  const a = amp({ c, rf, rin, vin, v1, v2, vp, vn });
  out('gain').textContent = `${num(a.g, 4)}×`;
  out('gain_db').textContent = `${num(a.db, 4)} dB`;
  out('vout').textContent = si(a.vout, 'V', 4);
  document.getElementById('oa-sat').hidden = !a.sat;
  out('zin').textContent = Number.isFinite(a.zin) ? si(a.zin, 'Ω') : T.zin_high;
  // 目標ゲインに近い組
  const box = document.getElementById('oa-pairs');
  const ps = pairs(c, Number(form.elements.t.value));
  if (!ps.length) { box.innerHTML = '<tr><td colspan="4">–</td></tr>'; return; }
  box.innerHTML = ps
    .map(x => `<tr><td>${si(x.f, 'Ω')}</td><td>${si(x.r, 'Ω')}</td><td>${num(x.g, 4)}×</td><td>${x.err >= 0 ? '+' : '−'}${num(Math.abs(x.err) * 100, 2)}%</td></tr>`).join('');
}
form.elements.circuit.addEventListener('change', () => { show(); update(); });
form.addEventListener('input', update);
form.addEventListener('submit', e => e.preventDefault());
show();
update();
}
