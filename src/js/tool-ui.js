// 計算ツールの共通の操作(各ツールの {id}.js の後に読み込む):
// 1. 結果のコピー・共有のボタンを、結果の枠の下へ移す(結果に対する操作なので)
// 2. 入力を初期値に戻す「リセット」ボタン
// 3. 画面の幅が狭いとき、主な結果が画面の外にある間は、画面の上に主な結果を出す(入力を変えながら結果を見られる)
// 4. 主な結果が変わったら、短く色を付けて知らせる(動きを減らす設定では付けない)
const dy = document.querySelector('.tool-page .dy');
const form = dy?.querySelector('form.dy-form');
const firstOut = dy?.querySelector(':scope > form + .dy-out, :scope > .dy-side > .dy-out');
const main = dy?.querySelector('.dy-stats > .main');

// 1. コピー・共有のボタン
const bar = document.querySelector('.tool-actions');
const acts = bar ? [...bar.querySelectorAll('[data-copy-result], button[data-share]')] : [];
if (firstOut && acts.length) {
  const row = document.createElement('p');
  row.className = 'dy-out-actions';
  row.append(...acts);
  firstOut.append(row);
}

// 2. リセット
// (入力と結果が左右に分かれる普通のツールだけ。図や表を直接操作するツールは、独自の消去ボタンを持つ)
if (form && dy.classList.contains('split') && dy.dataset.reset && form.querySelector('h2')) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'dy-reset';
  btn.textContent = dy.dataset.reset;
  btn.addEventListener('click', () => {
    form.reset();
    form.dispatchEvent(new Event('input', { bubbles: true }));
    for (const el of form.querySelectorAll('select, input')) el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  form.querySelector('h2').after(btn);
}

if (main) {
  const dt = main.querySelector('dt'), dd = main.querySelector('dd');
  // 3. 画面の上の結果バー
  const sticky = document.createElement('button');
  sticky.type = 'button';
  sticky.className = 'dy-sticky';
  sticky.hidden = true;
  const name = document.createElement('span'), val = document.createElement('b');
  sticky.append(name, val);
  document.body.append(sticky);
  const mirror = () => { name.textContent = dt.textContent; val.textContent = dd.textContent; };
  mirror();
  // 主な結果と入力欄が「いま見えている範囲」にあるかを調べる。キーボードが出ている間は見える範囲が狭くなるので、
  // visualViewport(実際に見えている範囲)で判定し、バーもその上端に合わせる。ページの先頭ではヘッダーに重なるので出さない
  const vv = window.visualViewport;
  const check = () => {
    const top = vv?.offsetTop ?? 0, h = vv?.height ?? innerHeight;
    const r = main.getBoundingClientRect(), f = (form ?? dy).getBoundingClientRect();
    const mainSeen = r.bottom > top + 8 && r.top + r.height * 0.5 < top + h;
    const toolSeen = f.bottom > top + 40 && f.top < top + h;
    sticky.hidden = !(toolSeen && !mainSeen && scrollY > 120 && matchMedia('(max-width: 1023px)').matches);
    sticky.style.top = `${top}px`;
  };
  for (const ev of ['scroll', 'resize']) { addEventListener(ev, check, { passive: true }); vv?.addEventListener(ev, check, { passive: true }); }
  form?.addEventListener('focusin', () => setTimeout(check, 300));
  check();
  sticky.addEventListener('click', () => main.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }));
  // 4. 値が変わったことを知らせる
  let timer;
  new MutationObserver(() => {
    mirror();
    for (const el of [main, sticky]) { el.classList.remove('changed'); void el.offsetWidth; el.classList.add('changed'); }
    clearTimeout(timer);
    timer = setTimeout(() => { main.classList.remove('changed'); sticky.classList.remove('changed'); }, 700);
  }).observe(dd, { childList: true, characterData: true, subtree: true });
}
