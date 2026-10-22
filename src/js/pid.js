// PID 制御のステップ応答。目標値を 0 から 1 に変えたときの、制御対象の出力 y と操作量 u を時間を追って計算する。
// 制御対象: 一次遅れ K/(Ts+1)、むだ時間つき一次遅れ K·e^(−Ls)/(Ts+1)、二次遅れ K·ωn²/(s²+2ζωn·s+ωn²)、積分つき一次遅れ K/(s(Ts+1))(モータの位置など)
// 制御器: u = Kp·e + Ki·∫e dt + Kd·de/dt(e = 目標値 − 出力)。微分は時定数 Tf = Kd/(N·Kp) の一次フィルタを通す(Kp = 0 のときは Kd/N)
// 操作量の上限 umax(0 は上限なし)で u を ±umax に制限する。積分の巻き上がり対策を入れると、u が上限に張り付いて誤差が同じ向きのあいだは積分を止める
// 計算は 4 次のルンゲ・クッタ法(1 ステップのあいだ u は一定)。指標は最終値(終わりの 2% の時間の平均)を基準にする
import { lineChart } from './chart.js';
export const PLANTS = ['fo', 'fopdt', 'so', 'int'];
const STEPS = 20000;

function plantDeriv(p, x, u) {
  if (p.plant === 'so') return [x[1], p.K * p.wn * p.wn * u - 2 * p.zeta * p.wn * x[1] - p.wn * p.wn * x[0]];
  if (p.plant === 'int') return [x[1], (p.K * u - x[1]) / p.T]; // y' = v, T·v' = K·u − v
  return [(p.K * u - x[0]) / p.T, 0];
}

export function simulate(p) {
  const dt = p.tEnd / STEPS;
  const delaySteps = p.plant === 'fopdt' ? Math.round(p.L / dt) : 0;
  const ubuf = new Array(delaySteps).fill(0);
  let x = [0, 0], integ = 0, dstate = 0, ePrev = 1;
  const Tf = p.kd > 0 ? Math.max(p.kd / (p.N * (p.kp > 0 ? p.kp : 1)), dt) : 0;
  const t = [0], y = [0], u = [];
  let unstable = false;
  for (let k = 0; k < STEPS; k++) {
    const e = 1 - x[0];
    // 微分項: D(s) = Kd·s / (Tf·s + 1) を後退差分で
    let dterm = 0;
    if (p.kd > 0) { dstate = (Tf * dstate + p.kd * (e - ePrev)) / (Tf + dt); dterm = dstate; }
    ePrev = e;
    let uc = p.kp * e + p.ki * integ + dterm;
    const sat = p.umax > 0 && Math.abs(uc) > p.umax;
    const us = sat ? Math.sign(uc) * p.umax : uc;
    // 積分: 巻き上がり対策ありのときは、飽和していて誤差が飽和を強める向きなら止める
    if (!(p.antiWindup && sat && Math.sign(e) === Math.sign(uc))) integ += e * dt;
    u.push(us);
    let ua = us;
    if (delaySteps) { ubuf.push(us); ua = ubuf.shift(); }
    const k1 = plantDeriv(p, x, ua);
    const k2 = plantDeriv(p, [x[0] + k1[0] * dt / 2, x[1] + k1[1] * dt / 2], ua);
    const k3 = plantDeriv(p, [x[0] + k2[0] * dt / 2, x[1] + k2[1] * dt / 2], ua);
    const k4 = plantDeriv(p, [x[0] + k3[0] * dt, x[1] + k3[1] * dt], ua);
    x = [x[0] + (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]) * dt / 6, x[1] + (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]) * dt / 6];
    t.push((k + 1) * dt); y.push(x[0]);
    if (!Number.isFinite(x[0]) || Math.abs(x[0]) > 1e6) { unstable = true; break; }
  }
  u.push(u.at(-1) ?? 0);
  return { t, y, u, unstable, ...metrics(t, y, unstable) };
}

export function metrics(t, y, unstable) {
  const n = y.length;
  if (unstable) return { final: NaN, ess: NaN, overshoot: NaN, rise: NaN, peakTime: NaN, settle: NaN, settled: false };
  const tail = y.slice(Math.floor(n * 0.98));
  const final = tail.reduce((s, v) => s + v, 0) / tail.length;
  const tailSpread = Math.max(...tail) - Math.min(...tail);
  let iPeak = 0;
  for (let i = 1; i < n; i++) if (y[i] > y[iPeak]) iPeak = i;
  const overshoot = final > 0 ? Math.max(0, (y[iPeak] - final) / final * 100) : NaN;
  const cross = lv => { for (let i = 1; i < n; i++) if (y[i] >= lv) return t[i - 1] + (t[i] - t[i - 1]) * (lv - y[i - 1]) / (y[i] - y[i - 1]); return NaN; };
  const rise = final > 0 ? cross(0.9 * final) - cross(0.1 * final) : NaN;
  // 整定時間: 最終値の ±2% の帯から最後に出た時刻。終わりでもまだ揺れていれば「落ち着いていない」
  const band = Math.abs(final) * 0.02;
  const settled = tailSpread <= band;
  let settle = 0;
  for (let i = n - 1; i >= 0; i--) if (Math.abs(y[i] - final) > band) { settle = t[Math.min(i + 1, n - 1)]; break; }
  return { final, ess: 1 - final, overshoot, rise, peakTime: t[iPeak], settle: settled ? settle : NaN, settled };
}

const form = globalThis.document?.getElementById('pid-form');
if (form) {
  let T = {};
  try { T = JSON.parse(form.dataset.text); } catch {}
  const out = k => document.querySelector(`[data-out="${k}"]`);
  const f = (v, d = 3) => (Number.isFinite(v) ? Number(v.toPrecision(d)).toLocaleString(document.documentElement.lang, { maximumFractionDigits: 6 }) : '–');
  const read = k => { const v = Number(form.elements[k].value); return Number.isFinite(v) ? v : Number(form.elements[k].defaultValue); };
  const warn = document.getElementById('pid-warn');
  function update() {
    const plant = form.elements.plant.value;
    form.dataset.plant = plant;
    const p = { plant, K: read('K'), T: Math.max(read('T'), 1e-6), zeta: Math.max(read('zeta'), 0), wn: Math.max(read('wn'), 1e-6), L: Math.max(read('L'), 0),
      kp: read('kp'), ki: Math.max(read('ki'), 0), kd: Math.max(read('kd'), 0), N: Math.max(read('N'), 1), umax: Math.max(read('umax'), 0),
      antiWindup: form.elements.aw.checked, tEnd: Math.max(read('tend'), 1e-3) };
    const r = simulate(p);
    out('final').textContent = f(r.final, 4);
    out('ess').textContent = f(r.ess, 3);
    out('overshoot').textContent = Number.isFinite(r.overshoot) ? `${f(r.overshoot, 3)}%` : '–';
    out('rise').textContent = Number.isFinite(r.rise) ? `${f(r.rise, 3)} ${T.sec}` : '–';
    out('settle').textContent = Number.isFinite(r.settle) ? `${f(r.settle, 3)} ${T.sec}` : '–';
    out('umaxv').textContent = f(Math.max(...r.u.map(Math.abs)), 3);
    warn.textContent = r.unstable ? T.unstable : !r.settled ? T.not_settled : '';
    warn.hidden = !warn.textContent;
    const step = Math.max(1, Math.floor(r.t.length / 600));
    const pick = arr => r.t.filter((_, i) => i % step === 0).map((x, j) => [x, arr[j * step]]);
    lineChart(document.getElementById('pid-chart'), { xlabel: T.x_label, ylabel: T.y_label,
      series: [{ points: [[0, 1], [r.t.at(-1), 1]], cls: 'dash' }, { points: pick(r.y), cls: 'ac' }] });
    lineChart(document.getElementById('pid-u-chart'), { xlabel: T.x_label, ylabel: T.u_label,
      series: [...(p.umax > 0 ? [{ points: [[0, p.umax], [r.t.at(-1), p.umax]], cls: 'dash' }] : []), { points: pick(r.u), cls: 'ac2' }] });
  }
  form.addEventListener('input', e => { if (e.target.name !== 'example') update(); });
  form.elements.example.addEventListener('change', () => {
    const ex = T.examples[Number(form.elements.example.value)];
    if (!ex) return;
    for (const [k, v] of Object.entries(ex.set)) {
      if (k === 'aw') form.elements.aw.checked = !!v; else form.elements[k].value = String(v);
    }
    update();
  });
  form.addEventListener('submit', e => e.preventDefault());
  update();
}
