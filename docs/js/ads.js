// 広告枠。ページ内の <div data-ad="名前"></div> を slot() の結果に置き換える。
// 現在はプレースホルダーのみ。広告を導入するときは slot() の中身だけを変更する。
// クイズ画面では読み込まない（build.js で ads:false のページは除外）。

export function slot(name) {
  const el = document.createElement('aside');
  el.className = 'ad-slot';
  el.dataset.slot = name;
  if (document.documentElement.hasAttribute('data-ad-ph')) el.textContent = `AD (${name})`;
  return el;
}

document.querySelectorAll('[data-ad]').forEach(p => p.replaceWith(slot(p.dataset.ad)));
