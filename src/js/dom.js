// ブラウザ用の共通関数

export const base = document.documentElement.dataset.base;

export const getJSON = path => fetch(base + path).then(r => r.json());

// h('button', { class: 'x', onclick: fn }, '子要素', ...)
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  el.append(...children.flat(Infinity).filter(c => c != null && c !== false));
  return el;
}
