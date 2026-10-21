// 論理回路シミュレーター。部品を置いて配線し、入力を切り替えて出力を確かめる。
// 回路は { parts: [{ id, type, x, y, v }], wires: [{ from, to, pin }] }(from・to は部品の id、pin は入力の番号)。
// 値は信号が落ち着くまで繰り返し計算する(フィードバックのあるラッチも動く。落ち着かなければ発振として知らせる)。
// D フリップフロップは CLK 入力の立ち上がりで D を取り込む。ブラウザに保存し、URL(#c=…)で共有できる
const root = document.getElementById('ls');
const svg = document.getElementById('ls-svg');
const NS = 'http://www.w3.org/2000/svg';
let T = {};
try { T = JSON.parse(root.dataset.text); } catch {}

// 部品の形: 幅・高さ、入力ピンの y、出力ピンの y(出力のない部品は null)
const GATES = ['and', 'or', 'not', 'nand', 'nor', 'xor', 'xnor'];
const SHAPE = {
  in: { w: 50, h: 30, ins: [], out: 15 },
  clk: { w: 50, h: 30, ins: [], out: 15 },
  out: { w: 40, h: 30, ins: [15], out: null },
  not: { w: 70, h: 40, ins: [20], out: 20 },
  dff: { w: 70, h: 60, ins: [15, 45], out: 15 },
};
for (const g of GATES) if (g !== 'not') SHAPE[g] = { w: 70, h: 40, ins: [10, 30], out: 20 };
const FN = {
  and: (a, b) => a & b, or: (a, b) => a | b, not: a => a ^ 1,
  nand: (a, b) => (a & b) ^ 1, nor: (a, b) => (a | b) ^ 1, xor: (a, b) => a ^ b, xnor: (a, b) => (a ^ b) ^ 1,
};
const W = 800, H = 480, GRID = 10;
const KEY = 'semiconroom-logic-sim';

let parts = [], wires = [], nextId = 1;
let val = new Map(); // 部品の出力の値
let q = new Map(); // フリップフロップの記憶している値
let prevClk = new Map(); // フリップフロップの CLK 入力の前回の値
let unstable = false;
let sel = null; // { kind: 'part' | 'wire', id }
let pending = null; // 配線の途中 { kind: 'in' | 'out', part, pin }
let running = true;

// ---- 計算 ----
const inputOf = (p, pin) => {
  const w = wires.find(w => w.to === p.id && w.pin === pin);
  return w ? val.get(w.from) ?? 0 : 0;
};
function settle() {
  unstable = false;
  for (const p of parts) {
    if (p.type === 'in' || p.type === 'clk') val.set(p.id, p.v ? 1 : 0);
    else if (p.type === 'dff') val.set(p.id, q.get(p.id) ?? 0);
  }
  const gates = parts.filter(p => FN[p.type]);
  for (let n = 0; ; n++) {
    let changed = false;
    for (const p of gates) {
      const v = FN[p.type](inputOf(p, 0), inputOf(p, 1));
      if (val.get(p.id) !== v) { val.set(p.id, v); changed = true; }
    }
    if (!changed) break;
    if (n > gates.length * 2 + 10) { unstable = true; break; }
  }
}
// 落ち着いたあとで CLK の立ち上がりを調べ、同時に D を取り込む(取り込んだ結果でまた立ち上がりが起きれば繰り返す)
function update() {
  settle();
  for (let n = 0; n < 16; n++) {
    const ff = parts.filter(p => p.type === 'dff');
    const edge = ff.filter(p => !prevClk.get(p.id) && inputOf(p, 1));
    for (const p of ff) prevClk.set(p.id, inputOf(p, 1));
    if (!edge.length) break;
    const d = edge.map(p => inputOf(p, 0));
    edge.forEach((p, i) => q.set(p.id, d[i]));
    settle();
  }
}

// ---- 名前(入力は A, B, C…、出力は X, Y, Z…) ----
const IN_NAMES = 'ABCDEFGHIJKLMNOPQRSTUVW';
const OUT_NAMES = 'XYZWVUTSRQPONMLKJIHGFED';
function names() {
  const m = new Map();
  parts.filter(p => p.type === 'in').forEach((p, i) => m.set(p.id, IN_NAMES[i] ?? `I${i}`));
  parts.filter(p => p.type === 'out').forEach((p, i) => m.set(p.id, OUT_NAMES[i] ?? `O${i}`));
  return m;
}

// ---- 描画 ----
const el = (tag, attrs = {}, parent) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  parent?.appendChild(e);
  return e;
};
const pinPos = (p, kind, pin = 0) => {
  const s = SHAPE[p.type];
  return kind === 'out' ? [p.x + s.w, p.y + s.out] : [p.x, p.y + s.ins[pin]];
};
const wirePath = ([x1, y1], [x2, y2]) => {
  const dx = Math.max(30, Math.abs(x2 - x1) / 2);
  return `M${x1} ${y1} C${x1 + dx} ${y1} ${x2 - dx} ${y2} ${x2} ${y2}`;
};
// ゲートの記号(ANSI の形)。本体は x = 10〜60、出力の否定の丸は x = 64
function gateBody(g, type) {
  const inv = ['nand', 'nor', 'xnor', 'not'].includes(type);
  const base = type.replace(/^n(?=and|or)/, '').replace(/^xn/, 'x');
  let d;
  if (type === 'not') d = 'M10 4 L56 20 L10 36 Z';
  else if (base === 'and') d = 'M10 0 H40 A20 20 0 0 1 40 40 H10 Z';
  else d = 'M14 0 Q34 20 14 40 Q48 40 60 20 Q48 0 14 0 Z';
  el('path', { d, class: 'ls-body' }, g);
  if (base === 'xor') el('path', { d: 'M8 0 Q28 20 8 40', class: 'ls-line' }, g);
  if (inv) el('circle', { cx: type === 'not' ? 60 : 64, cy: 20, r: 4, class: 'ls-body' }, g);
  // 入力と出力の短い線
  for (const y of SHAPE[type].ins) el('line', { x1: 0, y1: y, x2: base === 'and' || type === 'not' ? 10 : 18, y2: y, class: 'ls-line' }, g);
  el('line', { x1: inv ? (type === 'not' ? 64 : 68) : 60, y1: 20, x2: 70, y2: 20, class: 'ls-line' }, g);
  const t = el('text', { x: type === 'not' ? 26 : 34, y: 24, class: 'ls-glabel', 'text-anchor': 'middle' }, g);
  t.textContent = type.toUpperCase();
}
function render() {
  svg.replaceChildren();
  const nm = names();
  const wl = el('g', {}, svg);
  for (const w of wires) {
    const a = parts.find(p => p.id === w.from), b = parts.find(p => p.id === w.to);
    if (!a || !b) continue;
    const on = val.get(a.id) === 1;
    const d = wirePath(pinPos(a, 'out'), pinPos(b, 'in', w.pin));
    el('path', { d, class: 'ls-hit', 'data-wire': w.id }, wl);
    el('path', { d, class: `ls-wire${on ? ' on' : ''}${sel?.kind === 'wire' && sel.id === w.id ? ' sel' : ''}`, 'data-wire': w.id }, wl);
  }
  for (const p of parts) {
    const s = SHAPE[p.type];
    const g = el('g', { transform: `translate(${p.x} ${p.y})`, class: `ls-part${sel?.kind === 'part' && sel.id === p.id ? ' sel' : ''}`, 'data-part': p.id }, svg);
    el('rect', { x: -4, y: -4, width: s.w + 8, height: s.h + 8, class: 'ls-frame' }, g);
    const v = val.get(p.id) === 1;
    if (FN[p.type]) gateBody(g, p.type);
    else if (p.type === 'in' || p.type === 'clk') {
      el('rect', { x: 0, y: 0, width: 40, height: 30, rx: 6, class: `ls-sw${v ? ' on' : ''}` }, g);
      el('line', { x1: 40, y1: 15, x2: 50, y2: 15, class: 'ls-line' }, g);
      if (p.type === 'clk') el('path', { d: 'M6 20 H12 V10 H20 V20 H28 V10 H34', class: 'ls-clkmark' }, g);
      else { const t = el('text', { x: 20, y: 20, 'text-anchor': 'middle', class: 'ls-val' }, g); t.textContent = v ? '1' : '0'; }
    } else if (p.type === 'out') {
      const on = inputOf(p, 0) === 1;
      el('line', { x1: 0, y1: 15, x2: 12, y2: 15, class: 'ls-line' }, g);
      el('circle', { cx: 26, cy: 15, r: 13, class: `ls-lamp${on ? ' on' : ''}` }, g);
      const t = el('text', { x: 26, y: 20, 'text-anchor': 'middle', class: 'ls-val' }, g); t.textContent = on ? '1' : '0';
    } else if (p.type === 'dff') {
      el('rect', { x: 10, y: 0, width: 50, height: 60, class: 'ls-body' }, g);
      el('path', { d: 'M10 39 L18 45 L10 51', class: 'ls-line' }, g);
      for (const y of s.ins) el('line', { x1: 0, y1: y, x2: 10, y2: y, class: 'ls-line' }, g);
      el('line', { x1: 60, y1: 15, x2: 70, y2: 15, class: 'ls-line' }, g);
      [['D', 14, 19, 'start'], ['Q', 56, 19, 'end'], ['DFF', 35, 58, 'middle']].forEach(([s2, x, y, a]) => {
        const t = el('text', { x, y, 'text-anchor': a, class: 'ls-glabel' }, g); t.textContent = s2;
      });
    }
    if (nm.has(p.id)) { const t = el('text', { x: p.type === 'out' ? 26 : 20, y: -8, 'text-anchor': 'middle', class: 'ls-name' }, g); t.textContent = nm.get(p.id); }
    // ピン(押しやすいように見えない大きな円を重ねる)
    s.ins.forEach((y, i) => {
      const on = inputOf(p, i) === 1;
      el('circle', { cx: 0, cy: y, r: 4, class: `ls-pin${on ? ' on' : ''}${pending?.kind === 'in' && pending.part === p.id && pending.pin === i ? ' pend' : ''}` }, g);
      el('circle', { cx: 0, cy: y, r: 11, class: 'ls-pinhit', 'data-pin': 'in', 'data-part': p.id, 'data-i': i }, g);
    });
    if (s.out != null) {
      el('circle', { cx: s.w, cy: s.out, r: 4, class: `ls-pin${v ? ' on' : ''}${pending?.kind === 'out' && pending.part === p.id ? ' pend' : ''}` }, g);
      el('circle', { cx: s.w, cy: s.out, r: 11, class: 'ls-pinhit', 'data-pin': 'out', 'data-part': p.id, 'data-i': 0 }, g);
    }
  }
  if (pending && ghost) el('path', { d: pending.kind === 'out' ? wirePath(pendingPos(), ghost) : wirePath(ghost, pendingPos()), class: 'ls-wire ghost' }, svg);
  document.getElementById('ls-unstable').hidden = !unstable;
  document.getElementById('ls-del').disabled = !sel;
  const hasClk = parts.some(p => p.type === 'clk');
  document.getElementById('ls-pause').hidden = !hasClk;
  document.getElementById('ls-step').hidden = !hasClk;
  document.getElementById('ls-pause').textContent = running ? T.pause : T.resume;
  table();
}
let ghost = null;
const pendingPos = () => { const p = parts.find(x => x.id === pending.part); return pinPos(p, pending.kind, pending.pin); };

// ---- 真理値表(クロック・フリップフロップ・ループのない、入力1〜6個の回路) ----
function hasLoop() {
  const state = new Map();
  const visit = id => {
    if (state.get(id) === 1) return true;
    if (state.get(id) === 2) return false;
    state.set(id, 1);
    for (const w of wires.filter(w => w.from === id)) if (visit(w.to)) return true;
    state.set(id, 2);
    return false;
  };
  return parts.some(p => visit(p.id));
}
function table() {
  const box = document.getElementById('ls-table');
  const ins = parts.filter(p => p.type === 'in'), outs = parts.filter(p => p.type === 'out');
  const ok = ins.length >= 1 && ins.length <= 6 && outs.length >= 1 && !parts.some(p => p.type === 'clk' || p.type === 'dff') && !hasLoop();
  if (!ok) { box.innerHTML = `<p class="muted">${esc(T.table_none ?? '')}</p>`; return; }
  const nm = names();
  const saved = ins.map(p => p.v), savedVal = new Map(val);
  const cur = ins.reduce((n, p) => n * 2 + (p.v ? 1 : 0), 0);
  const rows = [];
  for (let k = 0; k < 2 ** ins.length; k++) {
    ins.forEach((p, i) => { p.v = (k >> (ins.length - 1 - i)) & 1; });
    settle();
    rows.push(`<tr${k === cur ? ' class="cur"' : ''}>${ins.map(p => `<td>${p.v}</td>`).join('')}${outs.map(p => `<td class="o">${inputOf(p, 0)}</td>`).join('')}</tr>`);
  }
  ins.forEach((p, i) => { p.v = saved[i]; });
  val = savedVal;
  unstable = false;
  box.innerHTML = `<div class="table-wrap"><table class="ls-tt"><thead><tr>${ins.map(p => `<th>${nm.get(p.id)}</th>`).join('')}${outs.map(p => `<th class="o">${nm.get(p.id)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// ---- 保存と共有 ----
const TYPES = ['in', 'out', 'clk', ...GATES, 'dff'];
function encode() {
  const idx = new Map(parts.map((p, i) => [p.id, i]));
  const data = { p: parts.map(p => [TYPES.indexOf(p.type), p.x, p.y, p.v ? 1 : 0]), w: wires.map(w => [idx.get(w.from), idx.get(w.to), w.pin]) };
  return btoa(JSON.stringify(data)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function decode(s) {
  const data = JSON.parse(atob(s.replace(/-/g, '+').replace(/_/g, '/')));
  const ps = data.p.map(([t, x, y, v], i) => ({ id: i + 1, type: TYPES[t], x: clampX(x), y: clampY(y), v: v ? 1 : 0 }));
  if (ps.some(p => !SHAPE[p.type]) || ps.length > 200) throw new Error('bad');
  const ws = data.w.filter(([a, b, pin]) => ps[a] && ps[b] && SHAPE[ps[a].type].out != null && pin < SHAPE[ps[b].type].ins.length)
    .map(([a, b, pin], i) => ({ id: i + 1, from: a + 1, to: b + 1, pin }));
  return { ps, ws };
}
function load(ps, ws) {
  parts = ps; wires = ws;
  nextId = Math.max(0, ...parts.map(p => p.id), ...wires.map(w => w.id)) + 1;
  val = new Map(); q = new Map(); prevClk = new Map(); sel = null; pending = null;
  update();
}
function save() {
  try { localStorage.setItem(KEY, encode()); } catch {}
}
const clampX = x => Math.max(10, Math.min(W - 80, Math.round(x / GRID) * GRID));
const clampY = y => Math.max(20, Math.min(H - 70, Math.round(y / GRID) * GRID));

// ---- 例 ----
// [種類, x, y, 値] と [元の番号, 先の番号, 入力ピン](番号は部品の並び順、0 から)
const EXAMPLES = {
  half: { p: [['in', 40, 80], ['in', 40, 200], ['xor', 220, 70], ['and', 220, 190], ['out', 400, 80], ['out', 400, 200]],
    w: [[0, 2, 0], [1, 2, 1], [0, 3, 0], [1, 3, 1], [2, 4, 0], [3, 5, 0]] },
  full: { p: [['in', 30, 60], ['in', 30, 140], ['in', 30, 300], ['xor', 160, 70], ['xor', 330, 150], ['and', 160, 210], ['and', 330, 260], ['or', 490, 230], ['out', 640, 160], ['out', 640, 240]],
    w: [[0, 3, 0], [1, 3, 1], [3, 4, 0], [2, 4, 1], [0, 5, 0], [1, 5, 1], [3, 6, 0], [2, 6, 1], [6, 7, 0], [5, 7, 1], [4, 8, 0], [7, 9, 0]] },
  // A・B がデータ、C が選択信号
  mux: { p: [['in', 30, 60], ['in', 30, 170], ['in', 30, 300], ['not', 140, 290], ['and', 290, 70], ['and', 290, 210], ['or', 450, 140], ['out', 600, 150]],
    w: [[2, 3, 0], [0, 4, 0], [3, 4, 1], [2, 5, 0], [1, 5, 1], [4, 6, 0], [5, 6, 1], [6, 7, 0]] },
  // A が S(下)、B が R(上)。上の NOR が Q(X)、下の NOR がその反転(Y)
  sr: { p: [['in', 40, 260], ['in', 40, 70], ['nor', 240, 70], ['nor', 240, 240], ['out', 440, 80], ['out', 440, 250]],
    w: [[1, 2, 0], [3, 2, 1], [2, 3, 0], [0, 3, 1], [2, 4, 0], [3, 5, 0]] },
  nandxor: { p: [['in', 30, 80], ['in', 30, 240], ['nand', 160, 150], ['nand', 320, 70], ['nand', 320, 230], ['nand', 480, 150], ['out', 640, 160]],
    w: [[0, 2, 0], [1, 2, 1], [0, 3, 0], [2, 3, 1], [2, 4, 0], [1, 4, 1], [3, 5, 0], [4, 5, 1], [5, 6, 0]] },
  counter: { p: [['clk', 30, 330], ['dff', 260, 60], ['dff', 260, 230], ['not', 110, 50], ['xor', 110, 220], ['out', 460, 70], ['out', 460, 240]],
    w: [[1, 3, 0], [3, 1, 0], [0, 1, 1], [1, 4, 0], [2, 4, 1], [4, 2, 0], [0, 2, 1], [1, 5, 0], [2, 6, 0]] },
};
function loadExample(key) {
  const e = EXAMPLES[key];
  const ps = e.p.map(([type, x, y], i) => ({ id: i + 1, type, x, y, v: 0 }));
  load(ps, e.w.map(([a, b, pin], i) => ({ id: i + 1, from: a + 1, to: b + 1, pin })));
  running = true;
  changed();
}

// ---- 操作 ----
function changed() { update(); render(); save(); }
const point = e => {
  const m = svg.getScreenCTM().inverse();
  const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(m);
  return [pt.x, pt.y];
};
function addPart(type) {
  const s = SHAPE[type];
  // 空いている場所を左上から探す
  for (let y = 30; y <= H - s.h - 20; y += 20) for (let x = 20; x <= W - s.w - 20; x += 20) {
    const free = parts.every(p => { const t = SHAPE[p.type]; return x + s.w + 30 < p.x || p.x + t.w + 30 < x || y + s.h + 20 < p.y || p.y + t.h + 20 < y; });
    if (free) { const p = { id: nextId++, type, x, y, v: 0 }; parts.push(p); sel = { kind: 'part', id: p.id }; changed(); return; }
  }
}
function connect(a, b) {
  // a・b は { kind, part, pin }。出力から入力へつなぎ、同じ入力への古い線は外す
  const [o, i] = a.kind === 'out' ? [a, b] : [b, a];
  if (o.kind !== 'out' || i.kind !== 'in') return;
  wires = wires.filter(w => !(w.to === i.part && w.pin === i.pin));
  wires.push({ id: nextId++, from: o.part, to: i.part, pin: i.pin });
}
function removeSel() {
  if (!sel) return;
  if (sel.kind === 'part') { parts = parts.filter(p => p.id !== sel.id); wires = wires.filter(w => w.from !== sel.id && w.to !== sel.id); }
  else wires = wires.filter(w => w.id !== sel.id);
  sel = null;
  changed();
}

let drag = null; // { part, dx, dy, moved, x0, y0 }
svg.addEventListener('pointerdown', e => {
  const t = e.target;
  const [x, y] = point(e);
  if (t.dataset.pin) {
    e.preventDefault();
    const here = { kind: t.dataset.pin, part: Number(t.dataset.part), pin: Number(t.dataset.i) };
    if (pending && pending.kind !== here.kind) { connect(pending, here); pending = null; ghost = null; changed(); return; }
    pending = here; ghost = [x, y]; drag = { wire: true, x0: e.clientX, y0: e.clientY, moved: false };
    svg.setPointerCapture(e.pointerId);
    render();
    return;
  }
  const g = t.closest('[data-part]');
  if (g) {
    e.preventDefault();
    const p = parts.find(p => p.id === Number(g.dataset.part));
    sel = { kind: 'part', id: p.id };
    drag = { part: p, dx: x - p.x, dy: y - p.y, x0: e.clientX, y0: e.clientY, moved: false };
    svg.setPointerCapture(e.pointerId);
    render();
    return;
  }
  if (t.dataset.wire) { sel = { kind: 'wire', id: Number(t.dataset.wire) }; pending = null; ghost = null; render(); return; }
  sel = null; pending = null; ghost = null; render();
});
svg.addEventListener('pointermove', e => {
  if (!drag) return;
  if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 4) drag.moved = true;
  const [x, y] = point(e);
  if (drag.wire) { ghost = [x, y]; render(); return; }
  if (!drag.moved) return;
  drag.part.x = clampX(x - drag.dx); drag.part.y = clampY(y - drag.dy);
  render();
});
svg.addEventListener('pointerup', e => {
  if (!drag) return;
  const d = drag; drag = null;
  if (d.wire) {
    const t = document.elementFromPoint(e.clientX, e.clientY);
    if (t?.dataset?.pin && pending) {
      const here = { kind: t.dataset.pin, part: Number(t.dataset.part), pin: Number(t.dataset.i) };
      if (here.kind !== pending.kind) { connect(pending, here); pending = null; ghost = null; changed(); return; }
    }
    // 少し押しただけなら、次にほかのピンを押すまで配線の途中のままにする
    if (d.moved) { pending = null; ghost = null; }
    render();
    return;
  }
  if (!d.moved && d.part.type === 'in') { d.part.v = d.part.v ? 0 : 1; changed(); return; }
  if (d.moved) save();
  render();
});
document.addEventListener('keydown', e => {
  if ((e.key === 'Delete' || e.key === 'Backspace') && sel && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName)) { e.preventDefault(); removeSel(); }
  if (e.key === 'Escape') { pending = null; ghost = null; sel = null; render(); }
});

root.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', () => addPart(b.dataset.add)));
document.getElementById('ls-del').addEventListener('click', removeSel);
document.getElementById('ls-clear').addEventListener('click', () => { if (confirm(T.confirm_clear)) { load([], []); changed(); } });
document.getElementById('ls-example').addEventListener('change', e => { if (e.target.value) loadExample(e.target.value); e.target.value = ''; });
document.getElementById('ls-pause').addEventListener('click', () => { running = !running; render(); });
document.getElementById('ls-step').addEventListener('click', () => {
  running = false;
  for (const p of parts.filter(p => p.type === 'clk')) p.v = 0;
  update();
  for (const p of parts.filter(p => p.type === 'clk')) p.v = 1;
  changed();
});
document.getElementById('ls-share').addEventListener('click', async e => {
  const url = `${location.origin}${location.pathname}#c=${encode()}`;
  history.replaceState(history.state, '', url);
  try { await navigator.clipboard.writeText(url); e.target.textContent = T.copied; setTimeout(() => { e.target.textContent = T.share; }, 1500); } catch {}
});
// クロック: 1秒ごとに 0 と 1 を切り替える(画面に見えていないときは止める)
setInterval(() => {
  if (!running || document.hidden) return;
  const clks = parts.filter(p => p.type === 'clk');
  if (!clks.length) return;
  for (const p of clks) p.v = p.v ? 0 : 1;
  update(); render();
}, 1000);

// 最初の回路: URL の #c=、ブラウザに保存した回路、半加算器の例の順
(function init() {
  const h = location.hash.match(/^#c=([\w-]+)/);
  let s = h?.[1];
  if (!s) try { s = localStorage.getItem(KEY); } catch {}
  if (s) try { const { ps, ws } = decode(s); load(ps, ws); render(); return; } catch {}
  loadExample('half');
})();
