// 画面の数値の合格基準を測る検査(2026-11-13)。基準と根拠は quality/design.md の「数値の合格基準」。
// ビルド後の docs/ をローカルで配信し、代表のページを 携帯(360px・390px)と PC(1280px)、明るい配色と暗い配色で開いて測る。
// 実行: node tools/check-design.js [--verbose](Playwright が必要。見つからないときは PLAYWRIGHT=パス で指定)
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const port = 8092;
const origin = `http://localhost:${port}`;
const verbose = process.argv.includes('--verbose');

let chromium;
try {
  ({ chromium } = await import(process.env.PLAYWRIGHT || 'playwright'));
} catch {
  console.error('Playwright が見つかりません。PLAYWRIGHT=/path/to/playwright/index.mjs を指定してください');
  process.exit(2);
}

// 基準(数値を変えるときは design.md も直す)
export const RULES = {
  contrast: 4.5,        // 文字と背景の明るさの比(WCAG 2.2 AA 1.4.3)。大きな文字(24px 以上、または 18.66px 以上の太字)は 3
  contrastLarge: 3,
  minFont: 12,          // どの文字も 12px 以上(図・数式・表の添え字の中は除く)
  bodyFont: 15,         // 本文の段落は 15px 以上
  lineHeight: [1.5, 2], // 本文の段落の行間は文字の大きさの 1.5〜2 倍
  cplJa: 45,            // 本文の段落の1行の字数(日本語・中国語・韓国語。全角の字で数える)の上限
  cplEn: 80,            // 同じく英語(空白を含む字数。WCAG 1.4.8 の 80字)
  fontSizes: 10,        // 1ページで使う文字の大きさの種類の上限(図・数式は除く)
  target: 24,           // 押せる部品の高さ・幅の下限(WCAG 2.2 AA 2.5.8)。文の中のリンクは除く
  btnHeight: 44,        // ボタン(.btn)の高さの下限
  filledBtn: 1,         // 1画面(画面の高さ1つ分)に見える塗りのボタンの数の上限
  overflow: 0,          // 横にはみ出す量(px)
};

const PAGES = ['', 'term/1t1c-cell/', 'compare/npn-vs-pnp/', 'learn/arrhenius-equation-in-chips/', 'c/physics/',
  'tools/adc-snr-enob-calculator/', 'q/physics/physics-001/', 'glossary/', 'reference/', 'about/', 'figures/', 'learn/', 'tools/', 'c/'];
const LANGS = ['', 'en/', 'zh-hant/', 'ko/'];
const VIEWS = [{ w: 360, name: '携帯360' }, { w: 390, name: '携帯390' }, { w: 1280, name: 'PC' }];

function measure(R) {
  const rgb = c => (c.match(/[\d.]+/g) || [0, 0, 0, 0]).map(Number);
  const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
  // 背景: 親をたどって最初の不透明な背景色。背景に画像(グラデーション)があるときは測れないので null
  const bgOf = el => {
    for (; el; el = el.parentElement) {
      const s = getComputedStyle(el);
      if (s.backgroundImage !== 'none' && !s.backgroundImage.startsWith('url(')) return null;
      const c = rgb(s.backgroundColor);
      if (c.length < 4 || c[3] > .9) return c;
    }
    return [255, 255, 255];
  };
  const skip = el => el.closest('sub, sup, svg, math, .math-block, .fig, figure, pre, code, [data-ad], .adsbygoogle, .lang-banner, .km-cell, .hm-bit, .rd-name, table.mlt, .sr-only, [aria-hidden="true"]');
  const visible = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.opacity !== '0'; };
  const ctx = document.createElement('canvas').getContext('2d');
  const out = { contrast: [], minFont: [], body: [], cpl: [], lh: [], sizes: new Set(), target: [], btn: [], filled: 0, overflow: 0 };
  const lang = document.documentElement.lang, isJa = /^(ja|zh|ko)/.test(lang); // 韓国語は空白を除いた字数を日本語と同じ上限で見る
  for (const el of document.querySelectorAll('body *')) {
    if (skip(el) || !visible(el)) continue;
    const txt = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
    const s = getComputedStyle(el);
    const fs = parseFloat(s.fontSize);
    if (txt.length >= 1) {
      out.sizes.add(Math.round(fs * 10) / 10);
      if (fs < R.minFont - .05) out.minFont.push(`${fs}px「${txt.slice(0, 16)}」`);
      const bg = bgOf(el);
      if (bg) {
        const fg = rgb(s.color); const a = fg[3] ?? 1;
        const mix = fg.slice(0, 3).map((v, i) => v * a + bg[i] * (1 - a));
        const L1 = lum(mix), L2 = lum(bg);
        const cr = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05);
        const large = fs >= 24 || (fs >= 18.66 && +s.fontWeight >= 700);
        if (cr < (large ? R.contrastLarge : R.contrast) - .005) out.contrast.push(`${cr.toFixed(2)}「${txt.slice(0, 16)}」(${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]})`);
      }
    }
    // 本文の段落: 記事・用語・比較・解説の p(カードや表の中は除く)
    if (el.tagName === 'P' && txt.length > 40 && !el.closest('a, li, td, th, .card, .ref-tile, .mode-card, .rail-box, .hero-sample, .q-mini, footer, header, nav, .muted') && !el.classList.contains('muted') && !/(^| )hero-/.test(el.className)) {
      if (fs < R.bodyFont - .05) out.body.push(`${fs}px「${txt.slice(0, 16)}」`);
      const lh = parseFloat(s.lineHeight) / fs;
      if (lh < R.lineHeight[0] - .01 || lh > R.lineHeight[1] + .01) out.lh.push(`${lh.toFixed(2)}「${txt.slice(0, 16)}」`);
      // 1行の字数 = 段落の幅 ÷ その段落の字の平均の幅(実際の書体で測る)。日本語・中国語では半角の字を 0.55字と数える
      const t2 = el.textContent.replace(/\s+/g, lang.startsWith('ko') ? '' : ' ').trim();
      const n = isJa && !lang.startsWith('ko') ? [...t2].reduce((a, c) => a + (c.charCodeAt(0) < 0x2000 ? .55 : 1), 0) : t2.length;
      ctx.font = `${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
      const w = el.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight);
      // 韓国語: 手元の検査環境にハングルの書体がなく字幅を測れないので、1字 = 文字の大きさ1つ分として数える
      const cpl = lang.startsWith('ko') ? w / parseFloat(s.fontSize) : n ? w / (ctx.measureText(el.textContent.replace(/\s+/g, ' ').trim()).width / n) : 0;
      if (cpl > (isJa ? R.cplJa : R.cplEn) + .5) out.cpl.push(`${Math.round(cpl)}字「${txt.slice(0, 16)}」`);
    }
  }
  // 押せる部品(文の中のリンクは除く)。小さくても、24px の円がほかの部品の円と重ならない(中心の間が 24px 以上)なら可(WCAG 2.5.8 の間隔の例外)
  const targets = [];
  for (const el of document.querySelectorAll('a, button, summary, input, select, textarea, [role="button"]')) {
    if (el.closest('.lang-banner, svg, [data-ad]') || !visible(el)) continue;
    const s = getComputedStyle(el);
    const inline = el.tagName === 'A' && s.display === 'inline' && el.parentElement && /^(P|LI|TD|DD|SPAN|EM|STRONG|SMALL|FIGCAPTION|LABEL|H\d)$/.test(el.parentElement.tagName) && el.parentElement.textContent.trim().length > el.textContent.trim().length + 2 && !el.closest('nav.breadcrumb');
    const r = el.getBoundingClientRect();
    targets.push({ el, r, inline, cx: r.left + r.width / 2, cy: r.top + r.height / 2 });
  }
  for (const t of targets) {
    if (t.inline) continue;
    const { el, r } = t;
    const name = (el.textContent || el.value || el.getAttribute('aria-label') || '').trim().slice(0, 14);
    if (r.height < R.target - .5 || r.width < R.target - .5) {
      const near = targets.some(u => u !== t && !u.el.contains(el) && !el.contains(u.el) && Math.hypot(u.cx - t.cx, u.cy - t.cy) < R.target);
      if (near) out.target.push(`${Math.round(r.width)}×${Math.round(r.height)}「${name}」(${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]})`);
    }
    if (el.classList.contains('btn') && r.height < R.btnHeight - .5) out.btn.push(`${Math.round(r.height)}px「${name}」`);
  }
  const probe = document.createElement('i'); probe.style.color = 'var(--accent)'; document.body.append(probe);
  const accent = rgb(getComputedStyle(probe).color).slice(0, 3).join(); probe.remove();
  const fills = [...document.querySelectorAll('a, button')].filter(el => visible(el) && !el.closest('[hidden], svg') && !el.hasAttribute('aria-pressed') && el.getAttribute('aria-current') == null)
    .filter(el => { // 押した状態の切り替え(絞り込みのボタンなど)は上で除いた
    const s = getComputedStyle(el);
    return s.backgroundImage.includes('gradient') || rgb(s.backgroundColor).slice(0, 3).join() === accent && (rgb(s.backgroundColor)[3] ?? 1) > .9;
  });
  out.filledNames = fills.map(el => el.textContent.trim().slice(0, 12));
  const fillY = fills.map(el => el.getBoundingClientRect().top + scrollY);
  const vh = innerHeight;
  out.filled = Math.max(0, ...fillY.map(y => fillY.filter(z => z >= y && z < y + vh).length));
  out.overflow = Math.max(0, document.documentElement.scrollWidth - innerWidth);
  out.sizes = [...out.sizes].sort((a, b) => a - b);
  return out;
}

const server = spawn(process.execPath, [path.join(root, 'tools/serve.js'), String(port)], { stdio: 'ignore' });
const fails = {};
let checked = 0;
const add = (kind, where, items) => { if (!items.length) return; (fails[kind] ??= []).push(`${where}: ${items.slice(0, verbose ? 99 : 3).join(' / ')}${items.length > 3 && !verbose ? ` …ほか${items.length - 3}件` : ''}`); };
try {
  await new Promise(r => setTimeout(r, 800));
  const browser = await chromium.launch({ args: ['--no-proxy-server'] });
  for (const dark of [false, true]) for (const v of VIEWS) {
    const page = await browser.newPage({ viewport: { width: v.w, height: 800 }, colorScheme: dark ? 'dark' : 'light', locale: 'ja-JP' });
    for (const L of LANGS) for (const p of PAGES) {
      const rel = L + p;
      if (!fs.existsSync(path.join(root, 'docs', rel, 'index.html'))) continue;
      await page.goto(`${origin}/${rel}`, { waitUntil: 'load' });
      const r = await page.evaluate(measure, RULES);
      const where = `/${rel} ${v.name}${dark ? '・暗' : ''}`;
      checked++;
      add('文字と背景の明るさの比', where, r.contrast);
      add(`${RULES.minFont}px 未満の文字`, where, r.minFont);
      if (!dark) {
        add(`本文の段落が ${RULES.bodyFont}px 未満`, where, r.body);
        add('本文の段落の行間', where, r.lh);
        add('1行の字数', where, r.cpl);
        if (r.sizes.length > RULES.fontSizes) add('文字の大きさの種類', where, [`${r.sizes.length}種(${r.sizes.join(', ')})`]);
        add(`押せる部品が ${RULES.target}px 未満`, where, r.target);
        add(`ボタンの高さが ${RULES.btnHeight}px 未満`, where, r.btn);
        if (r.filled > RULES.filledBtn) add('1画面の塗りのボタン', where, [`${r.filled}個(${r.filledNames.join('・')})`]);
        if (r.overflow > RULES.overflow) add('横のはみ出し', where, [`${r.overflow}px`]);
      }
    }
    await page.close();
  }
  await browser.close();
} finally {
  server.kill();
}
const kinds = Object.keys(fails);
for (const k of kinds) {
  console.log(`\n■ ${k}(${fails[k].length}画面)`);
  for (const x of fails[k].slice(0, verbose ? 999 : 6)) console.log('  ' + x);
  if (!verbose && fails[k].length > 6) console.log(`  …ほか${fails[k].length - 6}画面(--verbose ですべて表示)`);
}
console.log(`\n${checked} 画面を測りました。${kinds.length ? `基準に届かない項目: ${kinds.length}種類` : 'OK: すべて基準を満たしています'}`);
process.exit(kinds.length ? 1 : 0);
