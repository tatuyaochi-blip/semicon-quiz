// ハミング符号。データのビットを符号化し(位置が2のべき乗のビットがパリティ)、ビットを押して誤りを入れると、
// シンドロームから誤りの位置を求めて訂正する。SECDED では全体のパリティを1ビット足し、2ビットの誤りを「検出のみ」と見分ける
const form = document.getElementById('hm-form');
let T = {};
try { T = JSON.parse(form.dataset.text); } catch {}
const isPow2 = x => (x & (x - 1)) === 0;
// 符号化: 位置 1..n のうち 2 のべき乗にパリティ、それ以外にデータを上位から順に入れる
export function encode(data, secded) {
  const k = data.length;
  let r = 0;
  while (2 ** r < k + r + 1) r++;
  const n = k + r;
  const code = new Array(n + 1).fill(0); // 1 始まり
  let j = 0;
  for (let i = 1; i <= n; i++) if (!isPow2(i)) code[i] = data[j++];
  for (let p = 1; p <= n; p <<= 1) {
    let x = 0;
    for (let i = 1; i <= n; i++) if (i & p && i !== p) x ^= code[i];
    code[p] = x;
  }
  if (secded) code[0] = code.slice(1).reduce((a, b) => a ^ b, 0); // 全体のパリティ(位置0)
  return { code, n, r };
}
// 復号: シンドローム = 誤りのある位置(0 なら誤りなし)。SECDED では全体のパリティも見る
export function decode(code, n, secded) {
  let syn = 0;
  for (let i = 1; i <= n; i++) if (code[i]) syn ^= i;
  const overall = secded ? code.reduce((a, b) => a ^ b, 0) : null;
  let status, pos = null;
  if (!secded) status = syn === 0 ? 'ok' : syn <= n ? 'corrected' : 'invalid';
  else if (syn === 0 && overall === 0) status = 'ok';
  else if (overall === 1) { if (syn <= n) { status = 'corrected'; pos = syn; } else status = 'invalid'; } // 奇数個の誤り(1ビットとみなして訂正。syn = 0 なら全体のパリティビット自身)
  else status = 'double';
  if (!secded && status === 'corrected') pos = syn;
  const fixed = code.slice();
  if (status === 'corrected' && pos != null && pos <= n) fixed[pos] ^= 1;
  const data = [];
  for (let i = 1; i <= n; i++) if (!isPow2(i)) data.push(fixed[i]);
  return { syn, overall, status, pos, data };
}

let state = null; // { code, n, r, flips:Set }
function build() {
  const k = Number(form.elements.k.value);
  let bits = form.elements.data.value.replace(/[^01]/g, '');
  const err = document.getElementById('hm-error');
  err.hidden = bits.length === k;
  bits = bits.padStart(k, '0').slice(-k);
  const enc = encode([...bits].map(Number), form.elements.secded.checked);
  state = { ...enc, data: bits, flips: new Set() };
  render();
}
function render() {
  const secded = form.elements.secded.checked;
  const { n, r } = state;
  const recv = state.code.slice();
  for (const i of state.flips) recv[i] ^= 1;
  const start = secded ? 0 : 1;
  const cell = i => {
    const kind = i === 0 ? 'all' : isPow2(i) ? 'p' : 'd';
    const label = i === 0 ? 'P0' : isPow2(i) ? `P${i}` : `D`;
    return `<button type="button" class="hm-bit ${kind}${state.flips.has(i) ? ' flip' : ''}" data-i="${i}" aria-label="${i}: ${recv[i]}"><small>${i}</small>${recv[i]}<em>${label}</em></button>`;
  };
  document.getElementById('hm-code').innerHTML = Array.from({ length: n - start + 1 }, (_, t) => cell(start + t)).join('');
  // 各パリティが受け持つ位置
  const rows = [];
  for (let p = 1; p <= n; p <<= 1) {
    const cover = [];
    let x = 0;
    for (let i = 1; i <= n; i++) if (i & p) { cover.push(i); x ^= recv[i]; }
    rows.push(`<tr class="${x ? 'bad' : ''}"><td>P${p}</td><td>${cover.join(', ')}</td><td>${x}</td></tr>`);
  }
  document.getElementById('hm-checks').innerHTML = rows.join('');
  const d = decode(recv, n, secded);
  document.getElementById('hm-info').textContent = T.info.replace('{k}', state.data.length).replace('{r}', r + (secded ? 1 : 0)).replace('{n}', n + (secded ? 1 : 0)).replace('{rate}', (state.data.length / (n + (secded ? 1 : 0)) * 100).toFixed(1));
  document.getElementById('hm-syn').textContent = `${d.syn} (${d.syn.toString(2).padStart(r, '0')})${secded ? ` / P0 = ${d.overall}` : ''}`;
  const msg = { ok: T.st_ok, corrected: T.st_fixed.replace('{pos}', d.pos === 0 ? 'P0' : d.pos), double: T.st_double, invalid: T.st_invalid }[d.status];
  const st = document.getElementById('hm-status');
  st.textContent = msg;
  st.className = `hm-status ${d.status}`;
  const out = d.data.join('');
  const same = out === state.data;
  document.getElementById('hm-out').textContent = d.status === 'double' ? '–' : `${out}${same ? '' : ` (${T.miscorrect})`}`;
  document.getElementById('hm-flips').textContent = String(state.flips.size);
}
document.getElementById('hm-code').addEventListener('click', e => {
  const b = e.target.closest('.hm-bit');
  if (!b) return;
  const i = Number(b.dataset.i);
  if (state.flips.has(i)) state.flips.delete(i); else state.flips.add(i);
  render();
});
document.getElementById('hm-reset').addEventListener('click', () => { state.flips.clear(); render(); });
form.addEventListener('input', e => { if (e.target.name !== 'k') build(); });
form.elements.k.addEventListener('change', () => {
  const k = Number(form.elements.k.value);
  form.elements.data.value = '1011'.repeat(16).slice(0, k);
  build();
});
form.addEventListener('submit', e => e.preventDefault());
build();
