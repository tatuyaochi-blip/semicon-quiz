// ページを開いたときに、サイトへの要望をお問い合わせで受け付けていることを、少しの間だけ表示する。
// 1回の訪問(同じタブ)につき1回だけ。×で閉じることもできる。クイズ画面には出さない(build.js 側で出力しない)。
const el = document.querySelector('.contact-toast');
if (el) {
  let seen = false;
  try { seen = sessionStorage.getItem('contactToastSeen') === '1'; } catch {}
  if (!seen) {
    try { sessionStorage.setItem('contactToastSeen', '1'); } catch {}
    el.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));
    const hide = () => {
      el.classList.remove('show');
      setTimeout(() => { el.hidden = true; }, 400);
    };
    const timer = setTimeout(hide, 6000);
    el.querySelector('button').addEventListener('click', () => { clearTimeout(timer); hide(); });
  }
}
