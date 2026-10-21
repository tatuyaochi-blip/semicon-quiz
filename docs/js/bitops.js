// ビット演算。2つの値(10進数・16進数 0x…・2進数 0b…)をビット幅 w の符号なし整数として、AND・OR・XOR・NOT・
// 論理シフトと算術シフト(左右)・左右の回転を計算し、ビットの並びを色分けして表示する。負の10進数は2の補数として読む
export function parseVal(s, w) {
  const t = s.trim().replace(/_/g, '').toLowerCase();
  let v;
  if (/^-?0x[0-9a-f]+$/.test(t)) v = BigInt(t.replace('-', '')) * (t.startsWith('-') ? -1n : 1n);
  else if (/^-?0b[01]+$/.test(t)) v = BigInt(t.replace('-', '')) * (t.startsWith('-') ? -1n : 1n);
  else if (/^-?\d+$/.test(t)) v = BigInt(t);
  else return null;
  const m = (1n << BigInt(w)) - 1n;
  if (v < -(1n << BigInt(w - 1)) || v > m) return null;
  return v & m;
}
export function ops(a, b, k, w) {
  const W = BigInt(w), m = (1n << W) - 1n, K = BigInt(k);
  const signed = x => (x >> (W - 1n) ? x - (1n << W) : x);
  const sar = x => (signed(x) >> K) & m;
  const rotl = x => ((x << K) | (x >> (W - K))) & m;
  const rotr = x => ((x >> K) | (x << (W - K))) & m;
  return {
    and: a & b, or: a | b, xor: a ^ b, nota: ~a & m, nand: ~(a & b) & m,
    shl: (a << K) & m, shr: a >> K, sar: sar(a), rotl: k % w === 0 ? a : rotl(a), rotr: k % w === 0 ? a : rotr(a),
    signedA: signed(a),
  };
}
const form = globalThis.document?.getElementById('bo2-form');
if (form) {
  let T = {};
  try { T = JSON.parse(form.dataset.text); } catch {}
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const bin = (x, w) => x.toString(2).padStart(w, '0');
  const group = s => s.replace(/(.{4})(?=.)/g, '$1 ');
  const row = (label, x, w, cls = '', a = null) => {
    const bits = bin(x, w);
    const cells = [...bits].map((c, i) => `<span class="${c === '1' ? 'one' : 'zero'}${a !== null && bits[i] !== a[i] ? ' chg' : ''}">${c}</span>${(w - 1 - i) % 4 === 0 && i < w - 1 ? '<i></i>' : ''}`).join('');
    const signedV = x >> BigInt(w - 1) ? x - (1n << BigInt(w)) : x;
    return `<tr class="${cls}"><th>${esc(label)}</th><td class="bits">${cells}</td><td>${x.toString(10)}${signedV < 0n ? ` (${String(signedV).replace("-", "−")})` : ''}</td><td>0x${x.toString(16).toUpperCase().padStart(Math.ceil(w / 4), '0')}</td></tr>`;
  };
  function update() {
    const w = Number(form.elements.w.value), k = Math.round(Number(form.elements.k.value));
    const a = parseVal(form.elements.a.value, w), b = parseVal(form.elements.b.value, w);
    const ok = a !== null && b !== null && k >= 0 && k <= w;
    document.getElementById('bo2-error').hidden = ok;
    const box = document.getElementById('bo2-table');
    if (!ok) { box.innerHTML = ''; return; }
    const r = ops(a, b, k, w);
    const A = bin(a, w);
    box.innerHTML = `<table class="bo2-table"><thead><tr><th></th><th>${esc(T.col_bits)}</th><th>${esc(T.col_dec)}</th><th>${esc(T.col_hex)}</th></tr></thead><tbody>
      ${row('A', a, w, 'in')}${row('B', b, w, 'in')}
      <tr class="sep"><td colspan="4">${esc(T.logic)}</td></tr>
      ${row('A AND B', r.and, w)}${row('A OR B', r.or, w)}${row('A XOR B', r.xor, w)}${row('NOT A', r.nota, w)}${row('A NAND B', r.nand, w)}
      <tr class="sep"><td colspan="4">${esc(T.shifts.replace('{k}', k))}</td></tr>
      ${row(`A << ${k}`, r.shl, w, '', A)}${row(`A >> ${k} (${T.logical})`, r.shr, w, '', A)}${row(`A >> ${k} (${T.arith})`, r.sar, w, '', A)}${row(`${T.rotl} ${k}`, r.rotl, w, '', A)}${row(`${T.rotr} ${k}`, r.rotr, w, '', A)}
    </tbody></table>`;
  }
  form.addEventListener('input', update);
  form.addEventListener('submit', e => e.preventDefault());
  update();
}
