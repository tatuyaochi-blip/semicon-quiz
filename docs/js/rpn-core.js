// 逆ポーランド記法(後置記法)の変換。中置記法の式を操車場アルゴリズムで後置記法に直し、その途中のスタックと出力を記録する。
// 後置記法から構文木を作り、前置記法(ポーランド記法)と、かっこを最小限にした中置記法に戻す。値はスタックで計算する
export const OPS = { '+': [1, 'L'], '-': [1, 'L'], '*': [2, 'L'], '/': [2, 'L'], '^': [3, 'R'] };

// 字句に分ける。数・変数(英字で始まる名前)・演算子・かっこ。× ÷ − は * / - とみなす
export function tokenize(src) {
  const s = src.replace(/×/g, '*').replace(/÷/g, '/').replace(/[−–]/g, '-').replace(/（/g, '(').replace(/）/g, ')');
  const out = [];
  const re = /\s*(?:(\d+(?:\.\d+)?)|([A-Za-z_][A-Za-z_0-9]*)|([-+*/^()]))/y;
  let m;
  re.lastIndex = 0;
  while (re.lastIndex < s.length) {
    const at = re.lastIndex;
    if (/^\s*$/.test(s.slice(at))) break;
    m = re.exec(s);
    if (!m) return { error: 'char', at };
    out.push(m[1] ? { t: 'num', v: m[1] } : m[2] ? { t: 'var', v: m[2] } : m[3] === '(' || m[3] === ')' ? { t: m[3], v: m[3] } : { t: 'op', v: m[3] });
  }
  return { tokens: out };
}

// 操車場アルゴリズム。各字句での動作(action)、そのあとのスタックと出力を steps に残す
export function toPostfix(tokens) {
  const out = [], st = [], steps = [];
  let prev = null;
  const snap = (tok, action) => steps.push({ tok, action, stack: st.map(x => x.v), out: out.map(x => x.v) });
  for (const tk of tokens) {
    // 並びの検査: 値の後に値やかっこ開き、演算子の後に演算子やかっこ閉じは誤り(単項マイナスは扱わない)
    const valueBefore = prev && (prev.t === 'num' || prev.t === 'var' || prev.t === ')');
    if ((tk.t === 'num' || tk.t === 'var' || tk.t === '(') && valueBefore) return { error: 'missing_op', tok: tk.v, steps };
    if ((tk.t === 'op' || tk.t === ')') && !valueBefore) return { error: tk.t === 'op' && (tk.v === '-' || tk.v === '+') ? 'unary' : 'missing_operand', tok: tk.v, steps };
    if (tk.t === 'num' || tk.t === 'var') { out.push(tk); snap(tk.v, 'output'); }
    else if (tk.t === 'op') {
      const [p, a] = OPS[tk.v];
      const popped = [];
      while (st.length && st[st.length - 1].t === 'op') {
        const [q] = OPS[st[st.length - 1].v];
        if (q > p || (q === p && a === 'L')) { const x = st.pop(); out.push(x); popped.push(x.v); } else break;
      }
      st.push(tk);
      snap(tk.v, popped.length ? { pop: popped } : 'push');
    } else if (tk.t === '(') { st.push(tk); snap('(', 'push'); }
    else {
      const popped = [];
      while (st.length && st[st.length - 1].t !== '(') { const x = st.pop(); out.push(x); popped.push(x.v); }
      if (!st.length) return { error: 'paren', tok: ')', steps };
      st.pop();
      snap(')', { pop: popped, paren: true });
    }
    prev = tk;
  }
  if (!prev || !(prev.t === 'num' || prev.t === 'var' || prev.t === ')')) return { error: prev ? 'missing_operand' : 'empty', tok: prev?.v, steps };
  const rest = [];
  while (st.length) {
    const x = st.pop();
    if (x.t === '(') return { error: 'paren', tok: '(', steps };
    out.push(x); rest.push(x.v);
  }
  if (rest.length) steps.push({ tok: '', action: { pop: rest, end: true }, stack: [], out: out.map(x => x.v) });
  return { postfix: out, steps };
}

// 後置記法の字句の列(空白区切りの文字列も可)から構文木を作る
export function treeFromPostfix(tokens) {
  const st = [];
  for (const tk of tokens) {
    if (tk.t === 'op') {
      if (st.length < 2) return { error: 'rpn_short', tok: tk.v };
      const r = st.pop(), l = st.pop();
      st.push({ op: tk.v, l, r });
    } else if (tk.t === 'num' || tk.t === 'var') st.push({ v: tk.v });
    else return { error: 'rpn_paren' };
  }
  if (st.length !== 1) return { error: st.length ? 'rpn_extra' : 'empty' };
  return { tree: st[0] };
}

export const postfixOf = n => (n.op ? [...postfixOf(n.l), ...postfixOf(n.r), n.op] : [n.v]);
export const prefixOf = n => (n.op ? [n.op, ...prefixOf(n.l), ...prefixOf(n.r)] : [n.v]);
// かっこを最小限にした中置記法。左の子は優先順位が低いとき、右の子は低いとき(同じ順位なら左結合の演算子のとき)にかっこを付ける
export function infixOf(n) {
  if (!n.op) return n.v;
  const [p, a] = OPS[n.op];
  const wrap = (c, right) => {
    const s = infixOf(c);
    if (!c.op) return s;
    const [q] = OPS[c.op];
    const need = q < p || (q === p && (right ? a === 'L' : a === 'R'));
    return need ? `(${s})` : s;
  };
  return `${wrap(n.l, false)} ${n.op} ${wrap(n.r, true)}`;
}

// スタックによる計算。変数の値は vars から。各字句でのスタックを steps に残す
export function evaluate(tokens, vars = {}) {
  const st = [], steps = [];
  for (const tk of tokens) {
    if (tk.t === 'num') st.push(Number(tk.v));
    else if (tk.t === 'var') {
      if (!(tk.v in vars) || !Number.isFinite(vars[tk.v])) return { missing: tk.v, steps };
      st.push(vars[tk.v]);
    } else {
      const b = st.pop(), a = st.pop();
      const v = tk.v === '+' ? a + b : tk.v === '-' ? a - b : tk.v === '*' ? a * b : tk.v === '/' ? a / b : a ** b;
      st.push(v);
      steps.push({ tok: tk.v, a, b, v, stack: [...st] });
      continue;
    }
    steps.push({ tok: tk.v, stack: [...st] });
  }
  return { value: st[0], steps };
}
