// 擬似言語(基本情報技術者試験の科目Bの書き方)の小さな処理系。字句に分け、行ごとの文を組み立てて実行し、
// 1行ごとに変数の値を記録する(トレース)。対応するもの:
//   宣言  整数型: x ← 0 / 実数型 / 文字列型 / 論理型 / 整数型の配列: a ← {1, 2, 3}
//   代入  x ← 式 / a[i] ← 式      出力  出力 式, 式 …(print も可)
//   if (条件) … elseif (条件) … else … endif     while (条件) … endwhile     do … while (条件)
//   for (i を 1 から n まで 1 ずつ増やす) … endfor(減らす も可)
//   ○整数型: f(整数型: n) … return 式 / ○g(整数型: n)(手続)
//   式  + − × ÷(整数どうしは切り捨て)mod and or not = ≠ ≦ ≧ < >、a[i](1から数える)、aの要素数、関数呼出し
//   aの末尾に x を追加する
export class PseudoError extends Error { constructor(msg, line) { super(msg); this.line = line; } }

const KW = { '整数型': 'int', '実数型': 'real', '文字列型': 'str', '論理型': 'bool' };

// 字句
function lex(src, line) {
  const t = [];
  const s = src.replace(/＝/g, '=').replace(/（/g, '(').replace(/）/g, ')').replace(/，/g, ',').replace(/：/g, ':').replace(/<=/g, '≦').replace(/>=/g, '≧').replace(/!=/g, '≠').replace(/<-/g, '←').replace(/\*/g, '×').replace(/\//g, '÷').replace(/−/g, '-');
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '"' || c === '「' || c === '“') {
      const close = c === '"' ? '"' : c === '「' ? '」' : '”';
      const j = s.indexOf(close, i + 1);
      if (j < 0) throw new PseudoError('str', line);
      t.push({ k: 'str', v: s.slice(i + 1, j) }); i = j + 1; continue;
    }
    const num = /^\d+(\.\d+)?/.exec(s.slice(i));
    if (num) { t.push({ k: 'num', v: Number(num[0]), real: !!num[1] }); i += num[0].length; continue; }
    if ('←+-×÷=≠≦≧<>()[]{},:'.includes(c)) { t.push({ k: 'op', v: c }); i++; continue; }
    const w = /^[\p{L}\p{N}_]+/u.exec(s.slice(i));
    if (w) {
      // 「aの要素数」「aの末尾に」は名前と分けて読む
      let word = w[0];
      const m = /^(.+?)の(要素数|末尾に)$/.exec(word) || /^(.+?)の(要素数|末尾に)/.exec(word);
      if (m && !KW[word]) { t.push({ k: 'id', v: m[1] }); t.push({ k: 'id', v: `の${m[2]}` }); i += m[1].length + 1 + m[2].length; continue; }
      t.push({ k: 'id', v: word }); i += word.length; continue;
    }
    throw new PseudoError('char', line);
  }
  return t;
}

// 式の構文解析(優先順位の低い順に or, and, not, 比較, + -, × ÷ mod, 単項 -)
function parseExpr(toks, line) {
  let p = 0;
  const peek = () => toks[p], next = () => toks[p++];
  const isOp = v => peek() && peek().k === 'op' && peek().v === v;
  const isId = v => peek() && peek().k === 'id' && peek().v === v;
  const expect = v => { if (!isOp(v)) throw new PseudoError('syntax', line); p++; };
  const or = () => { let a = and(); while (isId('or')) { p++; a = { op: 'or', a, b: and() }; } return a; };
  const and = () => { let a = not(); while (isId('and')) { p++; a = { op: 'and', a, b: not() }; } return a; };
  const not = () => { if (isId('not')) { p++; return { op: 'not', a: not() }; } return cmp(); };
  const cmp = () => { let a = add(); if (peek() && peek().k === 'op' && '=≠≦≧<>'.includes(peek().v)) { const o = next().v; a = { op: o, a, b: add() }; } return a; };
  const add = () => { let a = mul(); while (isOp('+') || isOp('-')) { const o = next().v; a = { op: o, a, b: mul() }; } return a; };
  const mul = () => { let a = un(); while (isOp('×') || isOp('÷') || isId('mod')) { const o = next().v; a = { op: o, a, b: un() }; } return a; };
  const un = () => { if (isOp('-')) { p++; return { op: 'neg', a: un() }; } return post(); };
  const post = () => {
    let a = prim();
    for (;;) {
      if (isOp('[')) { p++; const i = or(); expect(']'); a = { op: 'idx', a, i }; }
      else if (isId('の要素数')) { p++; a = { op: 'len', a }; }
      else break;
    }
    return a;
  };
  const prim = () => {
    const t = next();
    if (!t) throw new PseudoError('syntax', line);
    if (t.k === 'num') return { lit: t.v, real: t.real };
    if (t.k === 'str') return { lit: t.v };
    if (t.k === 'op' && t.v === '(') { const e = or(); expect(')'); return e; }
    if (t.k === 'op' && t.v === '{') {
      const items = [];
      if (!isOp('}')) { do { items.push(or()); } while (isOp(',') && ++p); }
      expect('}');
      return { op: 'arr', items };
    }
    if (t.k === 'id') {
      if (t.v === 'true' || t.v === 'false') return { lit: t.v === 'true' };
      if (t.v === '未定義' || t.v === '未定義の値') return { lit: null };
      if (isOp('(')) {
        p++; const args = [];
        if (!isOp(')')) { do { args.push(or()); } while (isOp(',') && ++p); }
        expect(')');
        return { op: 'call', name: t.v, args };
      }
      return { v: t.v };
    }
    throw new PseudoError('syntax', line);
  };
  const e = or();
  if (p !== toks.length) throw new PseudoError('syntax', line);
  return e;
}

// 行を読んで、ブロックの入れ子を組み立てる。関数・手続(○の行)の本体は、○の行より深く字下げした行
export function parse(src) {
  const all = src.split('\n').map((t, k) => ({ raw: t.replace(/\/\*.*?\*\/|\/\/.*$/g, '').replace(/\t/g, '    '), ln: k + 1 }));
  const indent = l => /^ */.exec(l.raw.replace(/　/g, '  '))[0].length;
  const funcs = {};
  const main = [];
  for (let k = 0; k < all.length; k++) {
    const t = all[k].raw.trim();
    if (!t.startsWith('○')) { main.push(all[k]); continue; }
    const base = indent(all[k]), body = [];
    let e = k + 1;
    while (e < all.length && (!all[e].raw.trim() || indent(all[e]) > base)) body.push(all[e++]);
    const m = /^○\s*(?:(整数型|実数型|文字列型|論理型)(?:の配列)?\s*[:：]\s*)?([\p{L}\p{N}_]+)\s*\((.*)\)\s*$/u.exec(t);
    if (!m) throw new PseudoError('syntax', all[k].ln);
    const params = m[3].trim() ? m[3].split(/[,，]/).map(x => { const [ty, nm] = x.includes(':') || x.includes('：') ? x.split(/[:：]/) : ['', x]; return { name: nm.trim(), type: typeOf(ty.trim()) }; }) : [];
    funcs[m[2]] = { params, body: parseLines(body), ln: all[k].ln, type: typeOf(m[1] ?? '') };
    k = e - 1;
  }
  return { main: parseLines(main), funcs };
}
const typeOf = ty => (ty.startsWith('整数型') ? (ty.includes('配列') ? 'int[]' : 'int') : ty.startsWith('実数型') ? 'real' : ty.startsWith('文字列型') ? 'str' : ty.startsWith('論理型') ? 'bool' : null);

function parseLines(lines) {
  let i = 0;
  const stmtsUntil = (ends) => {
    const out = [];
    while (i < lines.length) {
      const raw = lines[i].raw.trim();
      const ln = lines[i].ln;
      if (!raw) { i++; continue; }
      const head = raw.split(/[\s(]/)[0];
      if (ends.includes(head) || ends.includes(raw)) return { out, end: head, raw, ln };
      i++;
      out.push(stmt(raw, ln));
    }
    if (!ends.includes('EOF')) throw new PseudoError('block', lines.length ? lines[lines.length - 1].ln : 1);
    return { out, end: 'EOF' };
  };
  const cond = (raw, kw, ln) => {
    const m = new RegExp(`^${kw}\\s*\\((.*)\\)\\s*$`).exec(raw);
    if (!m) throw new PseudoError('syntax', ln);
    return parseExpr(lex(m[1], ln), ln);
  };
  const stmt = (raw, ln) => {
    if (raw.startsWith('○')) throw new PseudoError('nested', ln);
    if (raw.startsWith('if')) {
      const branches = [{ c: cond(raw, 'if', ln), body: null, ln }];
      let r = stmtsUntil(['elseif', 'else', 'endif']);
      branches[0].body = r.out;
      let els = null;
      while (r.end === 'elseif') { const c = cond(r.raw, 'elseif', r.ln); i++; const ln2 = r.ln; r = stmtsUntil(['elseif', 'else', 'endif']); branches.push({ c, body: r.out, ln: ln2 }); }
      if (r.end === 'else') { i++; r = stmtsUntil(['endif']); els = r.out; }
      if (r.end !== 'endif') throw new PseudoError('block', ln);
      i++;
      return { k: 'if', branches, els, ln };
    }
    if (raw.startsWith('while')) { const c = cond(raw, 'while', ln); const r = stmtsUntil(['endwhile']); if (r.end !== 'endwhile') throw new PseudoError('block', ln); i++; return { k: 'while', c, body: r.out, ln }; }
    if (raw === 'do') { const r = stmtsUntil(['while']); if (r.end !== 'while') throw new PseudoError('block', ln); i++; return { k: 'do', c: cond(r.raw, 'while', r.ln), body: r.out, ln, cln: r.ln }; }
    if (raw.startsWith('for')) {
      const m = /^for\s*\(\s*([\p{L}\p{N}_]+)\s*を\s*(.+?)\s*から\s*(.+?)\s*まで\s*(.+?)\s*ずつ\s*(増やす|減らす)\s*\)\s*$/u.exec(raw);
      if (!m) throw new PseudoError('for', ln);
      const r = stmtsUntil(['endfor']); if (r.end !== 'endfor') throw new PseudoError('block', ln); i++;
      return { k: 'for', v: m[1], from: parseExpr(lex(m[2], ln), ln), to: parseExpr(lex(m[3], ln), ln), step: parseExpr(lex(m[4], ln), ln), down: m[5] === '減らす', body: r.out, ln };
    }
    if (/^return(\s|$)/.test(raw)) { const e = raw.slice(6).trim(); return { k: 'return', e: e ? parseExpr(lex(e, ln), ln) : null, ln }; }
    if (/^(出力|print)(\s|$)/.test(raw)) {
      const body = raw.replace(/^(出力|print)/, '').trim();
      const toks = lex(body, ln), parts = [];
      let cur = [], depth = 0;
      for (const t of toks) { if (t.k === 'op' && '([{'.includes(t.v)) depth++; if (t.k === 'op' && ')]}'.includes(t.v)) depth--; if (t.k === 'op' && t.v === ',' && depth === 0) { parts.push(cur); cur = []; } else cur.push(t); }
      if (cur.length) parts.push(cur);
      return { k: 'print', es: parts.map(x => parseExpr(x, ln)), ln };
    }
    // 宣言: 型: 名前 ← 式, 名前 …
    const decl = /^(整数型|実数型|文字列型|論理型)(の配列)?\s*[:：]\s*(.*)$/.exec(raw);
    if (decl) {
      const items = [];
      for (const part of splitTop(decl[3])) {
        const m = /^([\p{L}\p{N}_]+)\s*(?:←\s*(.*))?$/u.exec(part.trim().replace(/<-/g, '←'));
        if (!m) throw new PseudoError('syntax', ln);
        items.push({ name: m[1], e: m[2] !== undefined ? parseExpr(lex(m[2], ln), ln) : null });
      }
      return { k: 'decl', type: decl[2] ? `${KW[decl[1]]}[]` : KW[decl[1]], arr: !!decl[2], items, ln };
    }
    // 配列の末尾に追加
    const app = /^([\p{L}\p{N}_]+)\s*の末尾に\s*(.+?)\s*を追加する$/u.exec(raw);
    if (app) return { k: 'append', name: app[1], e: parseExpr(lex(app[2], ln), ln), ln };
    // 代入、または手続の呼出し
    const toks = lex(raw, ln);
    const at = toks.findIndex(t => t.k === 'op' && t.v === '←');
    if (at > 0) {
      const target = parseExpr(toks.slice(0, at), ln);
      if (!(target.v || target.op === 'idx')) throw new PseudoError('syntax', ln);
      return { k: 'assign', target, e: parseExpr(toks.slice(at + 1), ln), ln };
    }
    const e = parseExpr(toks, ln);
    if (e.op !== 'call') throw new PseudoError('syntax', ln);
    return { k: 'call', e, ln };
  };
  return stmtsUntil(['EOF']).out;
}
// カンマで分ける(かっこの中は分けない)
function splitTop(s) {
  const out = []; let depth = 0, cur = '';
  for (const c of s) { if ('([{'.includes(c)) depth++; if (')]}'.includes(c)) depth--; if ((c === ',' || c === '，') && depth === 0) { out.push(cur); cur = ''; } else cur += c; }
  if (cur.trim()) out.push(cur);
  return out;
}

const RET = Symbol('ret');
// 実行。steps には「実行した行・その後の変数(呼出しの深さごと)」を記録する
export function run(src, { maxSteps = 20000 } = {}) {
  const prog = parse(src);
  const steps = [], output = [];
  const frames = [{ name: '', vars: new Map(), types: new Map() }];
  let count = 0, calls = 0;
  const frame = () => frames[frames.length - 1];
  const snap = (ln, note) => {
    if (++count > maxSteps) throw new PseudoError('steps', ln);
    steps.push({ ln, depth: frames.length - 1, fn: frame().name, vars: [...frame().vars].map(([k, v]) => [k, show(v)]), note });
  };
  const lookup = (name, ln) => {
    if (frame().vars.has(name)) return frame().vars.get(name);
    if (frames[0].vars.has(name)) return frames[0].vars.get(name);
    throw new PseudoError(`undef:${name}`, ln);
  };
  // 整数型の変数(と整数型の配列の要素)に入れる値は、小数部を切り捨てる
  const fit = (type, v) => ((type === 'int' || type === 'int[]') && typeof v === 'number' && !Number.isInteger(v) ? Math.trunc(v) : v);
  const owner = name => (!frame().vars.has(name) && frames[0].vars.has(name) && frames.length > 1 ? frames[0] : frame());
  const setVar = (name, v) => { const f = owner(name); f.vars.set(name, fit(f.types.get(name), v)); };
  const num = (x, ln) => { if (typeof x !== 'number') throw new PseudoError('type', ln); return x; };
  const ev = (e, ln) => {
    if ('lit' in e) return e.lit;
    if (e.v !== undefined) return lookup(e.v, ln);
    switch (e.op) {
      case 'arr': return { arr: e.items.map(x => ev(x, ln)) };
      case 'idx': { const a = ev(e.a, ln), i = num(ev(e.i, ln), ln); if (!a || !a.arr) throw new PseudoError('notarr', ln); if (!Number.isInteger(i) || i < 1 || i > a.arr.length) throw new PseudoError(`range:${i}`, ln); return a.arr[i - 1]; }
      case 'len': { const a = ev(e.a, ln); if (!a || !a.arr) throw new PseudoError('notarr', ln); return a.arr.length; }
      case 'neg': return -num(ev(e.a, ln), ln);
      case 'not': return !truth(ev(e.a, ln), ln);
      case 'and': return truth(ev(e.a, ln), ln) && truth(ev(e.b, ln), ln);
      case 'or': return truth(ev(e.a, ln), ln) || truth(ev(e.b, ln), ln);
      case 'call': return callFn(e.name, e.args.map(x => ev(x, ln)), ln);
    }
    const a = ev(e.a, ln), b = ev(e.b, ln);
    switch (e.op) {
      case '+': return typeof a === 'string' || typeof b === 'string' ? `${show(a)}${show(b)}` : num(a, ln) + num(b, ln);
      case '-': return num(a, ln) - num(b, ln);
      case '×': return num(a, ln) * num(b, ln);
      case '÷': { if (num(b, ln) === 0) throw new PseudoError('div0', ln); return num(a, ln) / b; }
      case 'mod': { if (num(b, ln) === 0) throw new PseudoError('div0', ln); return num(a, ln) % b; }
      case '=': return eq(a, b);
      case '≠': return !eq(a, b);
      case '<': return num(a, ln) < num(b, ln);
      case '>': return num(a, ln) > num(b, ln);
      case '≦': return num(a, ln) <= num(b, ln);
      case '≧': return num(a, ln) >= num(b, ln);
    }
    throw new PseudoError('syntax', ln);
  };
  const truth = (v, ln) => { if (typeof v !== 'boolean') throw new PseudoError('bool', ln); return v; };
  const callFn = (name, args, ln) => {
    const f = prog.funcs[name];
    if (!f) throw new PseudoError(`nofunc:${name}`, ln);
    if (f.params.length !== args.length) throw new PseudoError(`args:${name}`, ln);
    if (frames.length > 200) throw new PseudoError('deep', ln);
    calls++;
    // 配列は参照渡し、それ以外は値渡し
    frames.push({ name, vars: new Map(f.params.map((p, k) => [p.name, fit(p.type, args[k])])), types: new Map(f.params.map(p => [p.name, p.type])) });
    snap(f.ln, `call:${name}(${args.map(show).join(', ')})`);
    let r;
    try { const x = block(f.body); r = x && x.v !== undefined ? fit(f.type, x.v) : undefined; }
    finally { frames.pop(); }
    return r ?? null;
  };
  const block = body => {
    for (const s of body) { const r = exec(s); if (r && r[RET]) return r; }
    return null;
  };
  const exec = s => {
    const ln = s.ln;
    switch (s.k) {
      case 'nop': return null;
      case 'decl': for (const it of s.items) { frame().types.set(it.name, s.type); frame().vars.set(it.name, it.e ? fit(s.type, copyIfLit(ev(it.e, ln), it.e)) : s.arr ? { arr: [] } : null); } snap(ln); return null;
      case 'assign': {
        const v = copyIfLit(ev(s.e, ln), s.e);
        if (s.target.v) setVar(s.target.v, v);
        else {
          const a = ev(s.target.a, ln), i = num(ev(s.target.i, ln), ln);
          if (!a || !a.arr) throw new PseudoError('notarr', ln);
          if (!Number.isInteger(i) || i < 1 || i > a.arr.length) throw new PseudoError(`range:${i}`, ln);
          const base = s.target.a.v ? owner(s.target.a.v).types.get(s.target.a.v) : null;
          a.arr[i - 1] = fit(base, v);
        }
        snap(ln); return null;
      }
      case 'append': { const a = lookup(s.name, ln); if (!a || !a.arr) throw new PseudoError('notarr', ln); a.arr.push(ev(s.e, ln)); snap(ln); return null; }
      case 'print': { const text = s.es.map(e => show(ev(e, ln))).join(' '); output.push(text); snap(ln, `out:${text}`); return null; }
      case 'call': ev(s.e, ln); snap(ln); return null;
      case 'return': { const v = s.e ? ev(s.e, ln) : undefined; snap(ln, `ret:${v === undefined ? '' : show(v)}`); return { [RET]: true, v }; }
      case 'if': {
        for (const b of s.branches) { const c = truth(ev(b.c, b.ln), b.ln); snap(b.ln, `cond:${c}`); if (c) return block(b.body); }
        return s.els ? block(s.els) : null;
      }
      case 'while': for (;;) { const c = truth(ev(s.c, ln), ln); snap(ln, `cond:${c}`); if (!c) return null; const r = block(s.body); if (r) return r; }
      case 'do': for (;;) { const r = block(s.body); if (r) return r; const c = truth(ev(s.c, s.cln), s.cln); snap(s.cln, `cond:${c}`); if (!c) return null; }
      case 'for': {
        let v = num(ev(s.from, ln), ln);
        const to = num(ev(s.to, ln), ln), st = num(ev(s.step, ln), ln);
        if (st <= 0) throw new PseudoError('step', ln);
        for (;;) {
          setVar(s.v, v);
          const c = s.down ? v >= to : v <= to;
          snap(ln, `cond:${c}`);
          if (!c) return null;
          const r = block(s.body); if (r) return r;
          v = num(lookup(s.v, ln), ln) + (s.down ? -st : st);
        }
      }
    }
    return null;
  };
  block(prog.main);
  return { steps, output, calls };
}
// 配列の定数({1, 2})は毎回新しく作る(同じ配列を共有しない)
const copyIfLit = (v, e) => (e.op === 'arr' && v && v.arr ? { arr: [...v.arr] } : v);
const eq = (a, b) => (a && a.arr && b && b.arr ? a.arr.length === b.arr.length && a.arr.every((x, i) => eq(x, b.arr[i])) : a === b);
export function show(v) {
  if (v === null || v === undefined) return '未定義';
  if (v && v.arr) return `{${v.arr.map(show).join(', ')}}`;
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(Number(v.toPrecision(10)));
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return String(v);
}
