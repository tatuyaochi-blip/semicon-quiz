// 開閉できる欄(details)へのリンク(#…)で来たとき・ページ内のリンクを押したときに、その欄を開いて見せる
function openTarget() {
  const id = decodeURIComponent(location.hash.slice(1));
  const el = id ? document.getElementById(id) : null;
  const d = el?.tagName === 'DETAILS' ? el : el?.closest('details');
  if (!d) return;
  d.open = true;
  el.scrollIntoView({ block: 'start' });
}
addEventListener('hashchange', openTarget);
openTarget();
