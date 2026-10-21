// 稼働率。MTBF と MTTR から A = MTBF / (MTBF + MTTR) を求め、年間の停止時間に直す。
// 装置の組み合わせは、行ごとに「n 台のうち k 台が動けばよい」装置のまとまり(k = 1 なら並列)を作り、まとまりを直列につなぐ。
// まとまりの稼働率は Σ_{j=k}^{n} C(n, j) a^j (1 − a)^(n − j)、全体は各まとまりの積
const form = document.getElementById('av-form');
const out = k => document.querySelector(`[data-out="${k}"]`);
let T = {};
try { T = JSON.parse(form.dataset.text); } catch {}
const ROWS = 5;
const HOURS = 24 * 365;

const comb = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return r; };
export const kOfN = (a, k, n) => { let s = 0; for (let j = k; j <= n; j++) s += comb(n, j) * a ** j * (1 - a) ** (n - j); return s; };
export const fromMtbf = (mtbf, mttr) => mtbf / (mtbf + mttr);
const pct = x => `${Number((x * 100).toPrecision(8)).toString()}%`;
// 停止時間を「時間・分」で(1時間未満なら分、1分未満なら秒)
function downtime(a) {
  const h = (1 - a) * HOURS;
  if (h >= 1) return `${Number(h.toPrecision(4))} ${T.h} (${T.per_year})`;
  const m = h * 60;
  return m >= 1 ? `${Number(m.toPrecision(4))} ${T.min} (${T.per_year})` : `${Number((m * 60).toPrecision(3))} ${T.sec} (${T.per_year})`;
}
// 「9 がいくつ並ぶか」(99.9% なら 3)
const nines = a => (a >= 1 ? '∞' : Number((-Math.log10(1 - a)).toFixed(1)).toString());

function update() {
  // MTBF・MTTR
  const mtbf = Number(form.elements.mtbf.value), mttr = Number(form.elements.mttr.value);
  const ok1 = mtbf > 0 && mttr >= 0;
  const a1 = ok1 ? fromMtbf(mtbf, mttr) : NaN;
  out('a1').textContent = ok1 ? pct(a1) : '–';
  out('down1').textContent = ok1 ? downtime(a1) : '–';
  out('fail1').textContent = ok1 ? `${Number((HOURS / (mtbf + mttr)).toPrecision(3))} ${T.times}` : '–';
  // 組み合わせ
  let total = 1, used = 0, bad = false;
  for (let i = 0; i < ROWS; i++) {
    const v = form.elements[`a${i}`].value;
    if (v === '') { out(`g${i}`).textContent = ''; continue; }
    const a = Number(v) / 100, n = Math.round(Number(form.elements[`n${i}`].value)), k = Math.round(Number(form.elements[`k${i}`].value));
    if (!(a >= 0 && a <= 1 && n >= 1 && k >= 1 && k <= n)) { bad = true; out(`g${i}`).textContent = '–'; continue; }
    const g = kOfN(a, k, n);
    out(`g${i}`).textContent = pct(g);
    total *= g; used++;
  }
  document.getElementById('av-error').hidden = !bad;
  out('total').textContent = used ? pct(total) : '–';
  out('down').textContent = used ? downtime(total) : '–';
  out('nines').textContent = used ? nines(total) : '–';
}
form.addEventListener('input', update);
form.addEventListener('submit', e => e.preventDefault());
update();
