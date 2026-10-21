// マルチメディアのデータ量。画像は 横 × 縦 × 1画素のビット数、音声は 標本化周波数 × 量子化ビット数 × チャネル数 × 秒数、
// 動画は 1枚の画像 × フレームレート × 秒数(+ 音声)。圧縮率で割った値と、ビットレート、指定の回線での転送時間も出す
export function media(m) {
  let bits = 0, rate = null;
  if (m.kind === 'image') bits = m.w * m.h * m.bpp;
  else if (m.kind === 'audio') { rate = m.fs * m.qbits * m.ch; bits = rate * m.sec; }
  else { const frame = m.w * m.h * m.bpp, a = m.audio ? m.fs * m.qbits * m.ch : 0; rate = frame * m.fps + a; bits = rate * m.sec; }
  const comp = m.ratio > 0 ? bits / m.ratio : bits;
  return { bits, bytes: bits / 8, comp, compBytes: comp / 8, rate, compRate: rate === null ? null : rate / (m.ratio > 0 ? m.ratio : 1) };
}
const form = globalThis.document?.getElementById('md-form');
if (form) {
  const out = k => document.querySelector(`[data-out="${k}"]`);
  let T = {};
  try { T = JSON.parse(form.dataset.text); } catch {}
  // 中国語は全角のかっこ
  const ZH = document.documentElement.lang.startsWith('zh');
  const num = v => (Number.isFinite(v) ? String(Number(v.toPrecision(4))) : '–');
  // バイト数を 10 の累乗の接頭辞で(括弧内に 2 の累乗も)
  const bytes = b => {
    const u = [['TB', 1e12], ['GB', 1e9], ['MB', 1e6], ['kB', 1e3]].find(([, f]) => b >= f);
    const v = u ? `${num(b / u[1])} ${u[0]}` : `${num(b)} B`;
    const w = [['GiB', 2 ** 30], ['MiB', 2 ** 20], ['KiB', 2 ** 10]].find(([, f]) => b >= f);
    return w ? `${v}${ZH ? '（' : ' ('}${num(b / w[1])} ${w[0]}${ZH ? '）' : ')'}` : v;
  };
  const bps = r => (r >= 1e9 ? `${num(r / 1e9)} Gbps` : r >= 1e6 ? `${num(r / 1e6)} Mbps` : r >= 1e3 ? `${num(r / 1e3)} kbps` : `${num(r)} bps`);
  function update() {
    const g = k => Number(form.elements[k].value);
    const kind = form.elements.kind.value;
    for (const el of form.querySelectorAll('[data-kind]')) el.hidden = !el.dataset.kind.split(' ').includes(kind);
    const m = { kind, w: g('w'), h: g('h'), bpp: g('bpp'), fs: g('fs') * 1000, qbits: g('qbits'), ch: g('ch'), sec: g('sec'), fps: g('fps'), ratio: g('ratio'), audio: form.elements.audio.checked };
    const need = kind === 'image' ? ['w', 'h', 'bpp'] : kind === 'audio' ? ['fs', 'qbits', 'ch', 'sec'] : ['w', 'h', 'bpp', 'fps', 'sec'];
    const ok = need.every(k => m[k] > 0) && m.ratio > 0 && (kind !== 'video' || !m.audio || (m.fs > 0 && m.qbits > 0 && m.ch > 0));
    document.getElementById('md-error').hidden = ok;
    if (!ok) { for (const k of ['raw', 'comp', 'rate', 'time']) out(k).textContent = '–'; document.getElementById('md-steps').textContent = ''; return; }
    const r = media(m);
    out('raw').textContent = bytes(r.bytes);
    out('comp').textContent = bytes(r.compBytes);
    out('rate').textContent = r.rate === null ? '–' : `${bps(r.rate)} → ${bps(r.compRate)}`;
    const line = g('line') * 1e6;
    out('time').textContent = line > 0 ? `${num(r.comp / line)} ${T.sec}` : '–';
    const fmt = n => Number(n).toLocaleString('en').replace(/,/g, ' ');
    document.getElementById('md-steps').textContent = kind === 'image' ? T.steps_image.replace('{w}', fmt(m.w)).replace('{h}', fmt(m.h)).replace('{bpp}', m.bpp).replace('{bits}', fmt(r.bits)).replace('{bytes}', fmt(r.bytes))
      : kind === 'audio' ? T.steps_audio.replace('{fs}', fmt(m.fs)).replace('{q}', m.qbits).replace('{ch}', m.ch).replace('{sec}', fmt(m.sec)).replace('{bits}', fmt(r.bits)).replace('{bytes}', fmt(r.bytes))
      : T.steps_video.replace('{w}', fmt(m.w)).replace('{h}', fmt(m.h)).replace('{bpp}', m.bpp).replace('{fps}', m.fps).replace('{rate}', fmt(r.rate)).replace('{sec}', fmt(m.sec)).replace('{bits}', fmt(r.bits));
  }
  form.addEventListener('input', e => { if (e.target.name !== 'example') update(); });
  form.elements.example.addEventListener('change', () => {
    const ex = T.examples[Number(form.elements.example.value)];
    if (!ex) return;
    for (const [k, v] of Object.entries(ex)) if (k !== 'label' && form.elements[k]) { if (k === 'audio') form.elements[k].checked = !!v; else form.elements[k].value = String(v); }
    update();
  });
  form.addEventListener('submit', e => e.preventDefault());
  form.elements.example.value = '0';
  form.elements.example.dispatchEvent(new Event('change'));
}
