// 待ち行列(M/M/1 と M/M/c)。到着率 λ とサービス率 μ(または平均サービス時間)と窓口の数 c から、
// 利用率 ρ = λ/(cμ)、待っている数 Lq、系内の数 L、待ち時間 Wq、系内時間 W を求める。
// M/M/c の待つ確率はアーランC式。ρ ≥ 1 では行列が限りなく伸びるので結果を出さない
const form = document.getElementById('qu-form');
const out = k => document.querySelector(`[data-out="${k}"]`);
let T = {};
try { T = JSON.parse(form.dataset.text); } catch {}

// アーランC: c 個の窓口がすべてふさがっていて待つ確率
export function erlangC(c, a) { // a = λ/μ(提供される負荷、アーラン)
  let term = 1, sum = 1; // k = 0
  for (let k = 1; k < c; k++) { term *= a / k; sum += term; }
  const last = term * (a / c) / (1 - a / c); // a^c / c! × 1/(1 − ρ)
  return last / (sum + last);
}
export function mmc(lambda, mu, c) {
  const rho = lambda / (c * mu);
  if (!(rho < 1)) return { rho, stable: false };
  const a = lambda / mu;
  const pw = c === 1 ? rho : erlangC(c, a);
  const lq = pw * rho / (1 - rho);
  const wq = lq / lambda;
  return { rho, stable: true, pw, lq, wq, w: wq + 1 / mu, l: lq + a };
}
const fmt = (x, d = 4) => (Number.isFinite(x) ? Number(x.toPrecision(d)).toString() : '–');

function update() {
  const unit = form.elements.unit.value;
  const lambda = Number(form.elements.lambda.value);
  const c = Math.max(1, Math.round(Number(form.elements.c.value)));
  // サービスは「平均サービス時間」か「サービス率」のどちらで入れてもよい
  const ts = Number(form.elements.ts.value);
  const mu = 1 / ts;
  const ok = lambda > 0 && ts > 0;
  document.getElementById('qu-error').hidden = ok;
  const r = ok ? mmc(lambda, mu, c) : null;
  document.getElementById('qu-unstable').hidden = !r || r.stable;
  out('rho').textContent = r ? `${fmt(r.rho * 100, 4)}%` : '–';
  out('mu').textContent = ok ? `${fmt(mu)} /${unit}` : '–';
  for (const k of ['pw', 'lq', 'l', 'wq', 'w']) out(k).textContent = '–';
  if (!r?.stable) return;
  out('pw').textContent = `${fmt(r.pw * 100, 4)}%`;
  out('lq').textContent = fmt(r.lq);
  out('l').textContent = fmt(r.l);
  out('wq').textContent = `${fmt(r.wq)} ${unit}`;
  out('w').textContent = `${fmt(r.w)} ${unit}`;
  // 利用率と待ち時間の関係のグラフ(同じ λ の割合を変えたとき)
  chart(mu, c, unit, r.rho);
}
function chart(mu, c, unit, now) {
  const svg = document.getElementById('qu-chart');
  const W = 600, H = 260, L = 50, B = 30, R = 10, Tp = 10;
  const xs = Array.from({ length: 95 }, (_, i) => 0.01 + i * 0.01); // ρ = 0.01〜0.95
  const ys = xs.map(rho => mmc(rho * c * mu, mu, c).wq * mu); // 待ち時間 ÷ 平均サービス時間
  const ymax = Math.max(1, Math.min(20, Math.ceil(Math.max(...ys))));
  const px = x => L + (x / 1) * (W - L - R), py = y => H - B - Math.min(y, ymax) / ymax * (H - B - Tp);
  const path = xs.map((x, i) => `${i ? 'L' : 'M'}${px(x).toFixed(1)} ${py(ys[i]).toFixed(1)}`).join(' ');
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(x => `<line x1="${px(x)}" x2="${px(x)}" y1="${H - B}" y2="${Tp}" class="grid"/><text x="${px(x)}" y="${H - 10}" text-anchor="middle">${x * 100}%</text>`).join('');
  const yt = [0, ymax / 2, ymax].map(y => `<text x="${L - 6}" y="${py(y) + 4}" text-anchor="end">${fmt(y, 3)}</text>`).join('');
  const mark = now < 0.95 ? `<circle cx="${px(now)}" cy="${py(mmc(now * c * mu, mu, c).wq * mu)}" r="5" class="mark"/>` : '';
  svg.innerHTML = `${ticks}${yt}<path d="${path}" class="line"/>${mark}<text x="${L}" y="${Tp + 4}" class="lbl">${T.chart_y}</text><text x="${W - R}" y="${H - B - 6}" text-anchor="end" class="lbl">${T.chart_x}</text>`;
}
form.addEventListener('input', update);
form.addEventListener('submit', e => e.preventDefault());
update();
