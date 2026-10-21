// パスワードの総当たりにかかる時間。文字の種類 N と長さ L から組み合わせの数 N^L とエントロピー L·log2 N を求め、
// 1秒あたりの試行回数で割って、すべてを試す時間と平均(半分)の時間を出す。入力したパスワード自体は送らず、使う文字の種類と長さだけを見る
const form = document.getElementById('pw-form');
const out = k => document.querySelector(`[data-out="${k}"]`);
let T = {};
try { T = JSON.parse(form.dataset.text); } catch {}
const SETS = { lower: 26, upper: 26, digit: 10, symbol: 32 };

// 大きな数を「1.23×10^45」のように(BigInt を使わず、桁は対数で扱う)
const sci = log10 => {
  if (!Number.isFinite(log10)) return '–';
  if (log10 < 9) return Math.round(10 ** log10).toString();
  const e = Math.floor(log10);
  return `${(10 ** (log10 - e)).toFixed(2)}×10^${e}`;
};
// 秒数(10を底とする対数)を、秒・分・時間・日・年のうち読みやすい単位で
function duration(log10s) {
  const units = [[0, T.u_s], [Math.log10(60), T.u_min], [Math.log10(3600), T.u_h], [Math.log10(86400), T.u_d], [Math.log10(86400 * 365.25), T.u_y]];
  if (log10s < 0) return T.instant;
  let [base, name] = units[0];
  for (const u of units) if (log10s >= u[0]) [base, name] = u;
  const v = log10s - base;
  if (name === T.u_y && v >= 9) return `${sci(v)} ${name}`;
  return `${Number((10 ** v).toPrecision(3))} ${name}`;
}
function update() {
  // 使う文字の種類: チェックボックス、または試しに入れた文字列から判定
  const sample = form.elements.sample.value;
  let n = 0;
  const used = {};
  for (const k of Object.keys(SETS)) {
    const fromSample = sample && { lower: /[a-z]/, upper: /[A-Z]/, digit: /[0-9]/, symbol: /[^A-Za-z0-9]/ }[k].test(sample);
    if (sample) form.elements[k].checked = fromSample;
    used[k] = form.elements[k].checked;
    if (used[k]) n += SETS[k];
  }
  const len = sample ? [...sample].length : Math.round(Number(form.elements.len.value));
  if (sample) form.elements.len.value = String(len);
  const rate = Number(form.elements.rate.value);
  const ok = n > 0 && len >= 1 && rate > 0;
  document.getElementById('pw-error').hidden = ok;
  if (!ok) { for (const k of ['n', 'space', 'bits', 'all', 'avg']) out(k).textContent = '–'; return; }
  const log10Space = len * Math.log10(n);
  out('n').textContent = String(n);
  out('space').textContent = `${n}^${len} = ${sci(log10Space)}`;
  out('bits').textContent = `${(len * Math.log2(n)).toFixed(1)} bit`;
  const log10All = log10Space - Math.log10(rate);
  out('all').textContent = duration(log10All);
  out('avg').textContent = duration(log10All - Math.log10(2));
}
form.addEventListener('input', update);
form.addEventListener('submit', e => e.preventDefault());
update();
