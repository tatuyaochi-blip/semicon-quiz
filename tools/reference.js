import { icon } from './icons.js';

// 資料のページ: 資料のトップ /reference/ と、略語・読み方辞典 /reference/abbreviations/。
// build.js の buildLang の最後で呼ぶ(ほかのページを作り終えてから、その言語にあるページだけをトップに並べるため)

// 略語とみなす語: 英数字(と - + / &)だけで、大文字を2つ以上含み、12文字以内。数字だけのものは除く
const WORD = /^[A-Za-z0-9][A-Za-z0-9\-+/&]*$/;
export const isAbbr = w => WORD.test(w) && (w.match(/[A-Z]/g)?.length ?? 0) >= 2 && w.length <= 12 && !/^\d+$/.test(w);

// 用語の見出しから略語を取り出す。見出しが略語そのもの(CMOS)、略語で始まるかっこ書き(RIE(反応性イオンエッチング))、
// かっこの中が略語(過渡増速拡散(TED))、別名が略語そのもの、のどれかに限る(「KVキャッシュ」「ISO 14644-1」などは略語の項目にしない)。
// lead は見出しが略語で始まるか(そのときだけ、見出しの読みが略語の読みになる)
export function abbrOf(g) {
  const t = g.term;
  let m;
  if (isAbbr(t)) return { abbr: t, lead: true };
  if ((m = t.match(/^([A-Za-z0-9][A-Za-z0-9\-+/&]*)[(（]/)) && isAbbr(m[1])) return { abbr: m[1], lead: true };
  if ((m = t.match(/[(（]([A-Za-z0-9][A-Za-z0-9\-+/&]*)[)）]$/)) && isAbbr(m[1])) return { abbr: m[1], lead: false };
  const al = (g.aliases ?? []).find(isAbbr);
  return al ? { abbr: al, lead: false } : null;
}

// 英語の見出し「RIE (reactive ion etching)」「Transient enhanced diffusion (TED)」から正式名称を取り出す。分からなければ ''
export function fullName(enTerm, abbr) {
  const m = String(enTerm ?? '').match(/^(.*?)\s*\(([^()]+)\)$/);
  if (!m) return '';
  const a = m[1].trim(), b = m[2].trim();
  if (a === abbr) return b;
  if (b === abbr) return a;
  return '';
}

// 化学式(GaN・SiH4・Ga2O3・4H-SiC など)は略語ではないので除く。小文字か数字を含み、元素記号と数字だけでできているもの
const EL = '(?:A[lrsu]|B|Br|C[lou]?|F|Ga|Ge|H[ef]?|In|K|N|Ni|O|P|Ru|S[bi]?|Ta|Ti|W|Zr)';
const FORMULA = new RegExp(`^(?:\\d[A-Z]-)?(?:${EL}\\d*)+$`);
const NOT_FORMULA = new Set(['FP8']); // 元素記号の並びに見えるが略語(8ビット浮動小数点)
export const isFormula = w => !NOT_FORMULA.has(w) && /[a-z0-9]/.test(w) && FORMULA.test(w);

// 用語集(既定言語)と英語の訳から、略語の一覧を作る。並びは略語のアルファベット順。
// extra: data/reference/abbr.json(正式名称の補足 full と、略語ではない名前 exclude)。
// 英語の見出しから取った正式名称は、固有名詞でなければ小文字で始める(「Intrusion detection system」→「intrusion detection system」)
export function abbrList(glossary, enGlo, extra = {}) {
  const lower = s => (/^[A-Z][a-z]/.test(s) && !/\s[A-Z][a-z]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s); // 「Quality of Service」のような書き方はそのまま
  return glossary.map(g => {
    const a = abbrOf(g);
    if (!a || isFormula(a.abbr) || (extra.exclude ?? []).includes(a.abbr)) return null;
    const auto = fullName(enGlo[g.term]?.term, a.abbr);
    return { key: g.term, abbr: a.abbr, lead: a.lead, full: extra.full?.[a.abbr] ?? (auto ? lower(auto) : '') };
  }).filter(Boolean).sort((x, y) => x.abbr.localeCompare(y.abbr, 'en', { sensitivity: 'base' }) || x.key.localeCompare(y.key, 'ja'));
}
const initial = s => (/^[A-Za-z]/.test(s) ? s[0].toUpperCase() : '0-9');

// ---- オープンデータ(用語集と7言語の対訳。CC BY 4.0) ----
// 用語ごとに、スラッグ(各言語の解説ページの URL に使う)・分野・7言語の見出しと短い説明。CSV は見出しだけ
export const OPEN_LICENSE = { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/', attribution: 'Semiconductor Room (https://semiconroom.com/)' };
export function openData({ glossary, gloByLang, langCodes, pageLangs = langCodes, defLang, termSlug }) {
  const terms = glossary.map(g => {
    const term = {}, desc = {};
    for (const x of langCodes) {
      const v = x === defLang ? g : gloByLang[x]?.[g.term];
      if (v?.term) { term[x] = v.term; if (v.desc) desc[x] = v.desc; }
    }
    return { slug: termSlug[g.term], field: g.cat, term, desc };
  });
  const json = JSON.stringify({ name: 'Semiconductor Room glossary', license: OPEN_LICENSE.name, licenseUrl: OPEN_LICENSE.url, attribution: OPEN_LICENSE.attribution,
    languages: langCodes, pageUrl: `https://semiconroom.com/{lang}/term/{slug}/ (lang: ${pageLangs.filter(x => x !== defLang).join(', ')}; Japanese: https://semiconroom.com/term/{slug}/)`, terms });
  const q = v => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const csv = '﻿' + [['slug', 'field', ...langCodes], ...terms.map(t => [t.slug, t.field, ...langCodes.map(x => t.term[x] ?? '')])].map(r => r.map(v => q(String(v))).join(',')).join('\r\n') + '\r\n';
  return { json, csv, n: terms.length };
}

// ctx: build.js の buildLang の中の値と関数
export function buildReference(ctx) {
  const { L, code, defLang, home, base, langs, dataLangs = langs, page, esc, t, S, terms, termSlug, built, short, crumbs, R, glossary, enGlo, abbrExtra, gloGroups, gloByLang, write } = ctx;
  if (!R) return;
  const termIn = new Map(terms.map(g => [g.key, g]));

  // ---- 略語・読み方辞典 ----
  const all = abbrList(glossary, enGlo, abbrExtra);
  const rows = all.filter(x => termIn.has(x.key));
  if (rows.length) {
    const groups = [...new Set(rows.map(x => initial(x.abbr)))].sort((a, b) => (a === '0-9') - (b === '0-9') || a.localeCompare(b));
    const reading = x => (code === defLang && x.lead ? glossary.find(g => g.term === x.key)?.reading ?? '' : '');
    const p = `${L.path}reference/abbreviations/`;
    const n = rows.length;
    page({
      path: p,
      alt: Object.fromEntries(langs.filter(x => x.code === defLang || ctx.hasLang(x.code)).map(x => [x.code, `${x.path}reference/abbreviations/`])),
      title: R.abbr_title.replace('{n}', n),
      description: R.abbr_description.replace('{n}', n),
      scripts: ['glossary.js'],
      jsonld: crumbs([t('breadcrumb_top'), home], [R.nav, `${home}reference/`], [R.abbr_h1, `${home}reference/abbreviations/`]),
      content: `<nav class="breadcrumb"><a href="${home}">${esc(t('breadcrumb_top'))}</a> <span>›</span> <a href="${home}reference/">${esc(R.nav)}</a></nav>
<h1>${esc(R.abbr_h1)}</h1>
<p class="lead">${esc(R.abbr_lead.replace('{n}', n))}</p>
<div class="search">
  <input id="glossary-q" type="search" placeholder="${esc(R.abbr_search)}" aria-label="${esc(R.abbr_search)}">
  <span id="glossary-count" class="muted" data-label="${esc(t('glossary_count'))}"></span>
</div>
<nav class="glossary-nav abbr-nav" aria-label="${esc(R.abbr_nav)}"><p>${groups.map(gr => `<a class="chip" href="#abbr-${gr}">${gr}</a>`).join(' ')}</p></nav>
${groups.map(gr => `<section class="glossary-cat" id="abbr-${gr}">
  <h2>${gr}</h2>
  <div class="table-wrap"><table class="numbers dict abbr">
    <thead><tr><th scope="col">${esc(R.abbr_col_abbr)}</th><th scope="col">${esc(R.abbr_col_full)}</th><th scope="col">${esc(R.abbr_col_term)}</th></tr></thead>
    <tbody>${rows.filter(x => initial(x.abbr) === gr).map(x => {
      const g = termIn.get(x.key), rd = reading(x);
      return `
      <tr class="term"><th scope="row" lang="en"><abbr title="${esc(x.full)}">${esc(x.abbr)}</abbr>${rd ? `<small lang="ja">${esc(rd)}</small>` : ''}</th><td lang="en">${esc(x.full || '–')}</td><td><a href="${home}term/${termSlug[x.key]}/">${esc(g.term)}</a><small>${esc(short(g.desc, 90))}</small></td></tr>`;
    }).join('')}
    </tbody>
  </table></div>
</section>`).join('\n')}
<p class="muted">${esc(R.abbr_note)}</p>
<div data-ad="glossary"></div>
<p><a class="btn btn-ghost" href="${home}reference/">${esc(R.to_hub)}</a></p>`,
    });
  }

  // ---- 7言語の対訳表(分野の区分ごとのページと、その一覧) ----
  // 1つの表にすると1,300語 × 7列で重いので、区分(基礎・デバイス・前工程…)ごとに分ける。
  // 列は表示する言語をボタンで選ぶ(既定はこのページの言語・英語・もう1つ。選んだ言語はブラウザに保存。multilingual.js)
  if (gloGroups?.length) {
    const cols = [code, ...['en', 'ja', 'zh-hant'].filter(x => x !== code)].slice(0, 3);
    const order = [...dataLangs.map(x => x.code)].sort((a, b) => (cols.includes(b) - cols.includes(a)) || cols.indexOf(a) - cols.indexOf(b));
    const nameIn = (key, x) => (x === defLang ? key : gloByLang[x]?.[key]?.term);
    const lang = x => dataLangs.find(y => y.code === x);
    const hasPages = x => langs.some(y => y.code === x); // サイトに出している言語だけ、用語ページへリンクする
    const cell = (key, x) => {
      const nm = nameIn(key, x), l = lang(x);
      const rd = x === defLang && code === defLang ? glossary.find(g => g.term === key)?.reading ?? '' : '';
      return `<td data-l="${x}" lang="${l.htmlLang}">${nm ? `${hasPages(x) ? `<a href="${base}${l.path}term/${termSlug[key]}/">${esc(nm)}</a>` : `<span>${esc(nm)}</span>`}${rd ? `<small>${esc(rd)}</small>` : ''}` : '–'}</td>`;
    };
    const altFor = sub => Object.fromEntries(langs.filter(x => x.code === defLang || ctx.hasLang(x.code)).map(x => [x.code, `${x.path}${sub}`]));
    const picker = `<div class="ml-pick" role="group" aria-label="${esc(R.ml_cols)}"><span class="muted">${esc(R.ml_cols)}</span> ${order.map(x => `<button type="button" class="chip" data-ml="${x}" aria-pressed="${cols.includes(x)}">${esc(lang(x).label)}</button>`).join(' ')}</div>`;
    const cards = [];
    for (const gr of gloGroups) {
      const n = gr.cats.reduce((k, x) => k + x.list.length, 0);
      const sub = `reference/multilingual/${gr.id}/`;
      cards.push(`<li><a class="cmp-card" href="${home}${sub}"><strong>${esc(gr.name)}</strong><span>${esc(R.ml_card.replace('{n}', n))}</span></a></li>`);
      page({
        path: `${L.path}${sub}`,
        alt: altFor(sub),
        // 用語集と内容が重なるので検索には出さない(2026-11-05、検索表示の急落を受けた運営者の判断。ページは資料から使える)
        noindex: true,
        title: R.ml_group_title.replace('{group}', gr.name).replace('{n}', n),
        description: R.ml_group_description.replace('{group}', gr.name).replace('{n}', n),
        scripts: ['glossary.js', 'multilingual.js'],
        jsonld: crumbs([t('breadcrumb_top'), home], [R.nav, `${home}reference/`], [R.ml_h1, `${home}reference/multilingual/`], [gr.name, `${home}${sub}`]),
        content: `<nav class="breadcrumb"><a href="${home}">${esc(t('breadcrumb_top'))}</a> <span>›</span> <a href="${home}reference/">${esc(R.nav)}</a> <span>›</span> <a href="${home}reference/multilingual/">${esc(R.ml_h1)}</a></nav>
<h1>${esc(R.ml_group_h1.replace('{group}', gr.name))}</h1>
<p class="lead">${esc(R.ml_group_lead.replace('{n}', n))}</p>
${picker}
<div class="search">
  <input id="glossary-q" type="search" placeholder="${esc(R.ml_search)}" aria-label="${esc(R.ml_search)}">
  <span id="glossary-count" class="muted" data-label="${esc(t('glossary_count'))}"></span>
</div>
<nav class="glossary-nav" aria-label="${esc(t('glossary_nav'))}"><p>${gr.cats.map(({ c, list }) => `<a class="chip" href="#cat-${c.id}">${esc(c.name)} <small>${list.length}</small></a>`).join(' ')}</p></nav>
${gr.cats.map(({ c, list }) => `<section class="glossary-cat" id="cat-${c.id}">
  <h2>${esc(c.name)}</h2>
  <div class="table-wrap"><table class="numbers dict ml" data-show="${cols.join(' ')}">
    <thead><tr>${order.map(x => `<th scope="col" data-l="${x}">${esc(lang(x).label)}</th>`).join('')}</tr></thead>
    <tbody>${list.map(g => `
      <tr class="term">${order.map(x => cell(g.key, x)).join('')}</tr>`).join('')}
    </tbody>
  </table></div>
</section>`).join('\n')}
<p class="muted">${esc(R.ml_note)}</p>
<div data-ad="glossary"></div>
<p><a class="btn btn-ghost" href="${home}reference/multilingual/">${esc(R.ml_to_index)}</a></p>`,
      });
    }
    const total = gloGroups.reduce((s2, gr) => s2 + gr.cats.reduce((k, x) => k + x.list.length, 0), 0);
    page({
      path: `${L.path}reference/multilingual/`,
      alt: altFor('reference/multilingual/'),
      title: R.ml_title.replace('{n}', total),
      description: R.ml_description.replace('{n}', total),
      jsonld: crumbs([t('breadcrumb_top'), home], [R.nav, `${home}reference/`], [R.ml_h1, `${home}reference/multilingual/`]),
      content: `<nav class="breadcrumb"><a href="${home}">${esc(t('breadcrumb_top'))}</a> <span>›</span> <a href="${home}reference/">${esc(R.nav)}</a></nav>
<h1>${esc(R.ml_h1)}</h1>
<p class="lead">${esc(R.ml_lead.replace('{n}', total))}</p>
<p class="muted">${dataLangs.map(x => esc(x.label)).join(' · ')}</p>
<ul class="cmp-list">${cards.join('')}</ul>
<div data-ad="glossary"></div>
<p><a class="btn btn-ghost" href="${home}reference/">${esc(R.to_hub)}</a></p>`,
    });
  }

  // ---- オープンデータ: ファイルは既定言語のときに1回だけ書き、説明のページは各言語に作る ----
  if (write) {
    const od = openData({ glossary, gloByLang, langCodes: dataLangs.map(x => x.code), pageLangs: langs.map(x => x.code), defLang, termSlug });
    if (code === defLang) { write('open-data/semiconroom-glossary.json', od.json); write('open-data/semiconroom-glossary.csv', od.csv); }
    const kb = s2 => `${Math.round(Buffer.byteLength(s2) / 1024)} KB`;
    const sub = 'reference/open-data/';
    page({
      path: `${L.path}${sub}`,
      alt: Object.fromEntries(langs.filter(x => x.code === defLang || ctx.hasLang(x.code)).map(x => [x.code, `${x.path}${sub}`])),
      title: R.od_title.replace('{n}', od.n),
      description: R.od_description.replace('{n}', od.n),
      jsonld: crumbs([t('breadcrumb_top'), home], [R.nav, `${home}reference/`], [R.od_h1, `${home}${sub}`]),
      content: `<nav class="breadcrumb"><a href="${home}">${esc(t('breadcrumb_top'))}</a> <span>›</span> <a href="${home}reference/">${esc(R.nav)}</a></nav>
<h1>${esc(R.od_h1)}</h1>
<p class="lead">${esc(R.od_lead.replace('{n}', od.n))}</p>
<section>
  <h2>${esc(R.od_files)}</h2>
  <ul class="cmp-list">
    <li><a class="cmp-card" href="${base}open-data/semiconroom-glossary.csv" download><strong>CSV (${kb(od.csv)})</strong><span>${esc(R.od_csv)}</span></a></li>
    <li><a class="cmp-card" href="${base}open-data/semiconroom-glossary.json" download><strong>JSON (${kb(od.json)})</strong><span>${esc(R.od_json)}</span></a></li>
  </ul>
</section>
<section>
  <h2>${esc(R.od_license_h)}</h2>
  <p>${esc(R.od_license).replace('{license}', `<a href="${OPEN_LICENSE.url}" rel="license">${OPEN_LICENSE.name}</a>`)}</p>
  <p><code>${esc(OPEN_LICENSE.attribution)}</code></p>
  <p class="muted">${esc(R.od_scope)}</p>
</section>
<section>
  <h2>${esc(R.od_fields_h)}</h2>
  <ul>${R.od_fields.map(f => `<li>${esc(f)}</li>`).join('')}</ul>
</section>
<p><a class="btn btn-ghost" href="${home}reference/">${esc(R.to_hub)}</a></p>`,
    });
  }

  // ---- 資料のトップ ----
  // アイコンと短い名前のタイル(以前は各ページの長いタイトルと説明の文章カードで、一目で分かりにくかった)。この言語で作られたページだけを並べる
  const TILE_ICON = { 'glossary/': 'glossary', 'reference/abbreviations/': 'abbr', 'reference/multilingual/': 'langs', 'glossary/trilingual/': 'langs', 'numbers/': 'numbers', 'news-terms/': 'news',
    'figures/': 'figures', 'compare/': 'compare', 'beyond-scaling/': 'trend', 'careers/': 'careers', 'interview-questions/': 'interview', 'it-exam-guide/': 'exam', 'reference/open-data/': 'download' };
  const card = sub => {
    const x = built.get(`${L.path}${sub}`);
    if (!x) return '';
    const name = R.tiles?.[sub] ?? String(x.title).split(/\s*[:：|｜—–]\s*/)[0];
    return `<li><a class="ref-tile" href="${home}${sub}" title="${esc(x.title)}">${icon(TILE_ICON[sub] ?? 'other')}<span>${esc(name)}</span></a></li>`;
  };
  const sections = R.sections.map(s => ({ ...s, html: s.pages.map(card).join('') })).filter(s => s.html);
  page({
    path: `${L.path}reference/`,
    alt: Object.fromEntries(langs.filter(x => x.code === defLang || ctx.hasLang(x.code)).map(x => [x.code, `${x.path}reference/`])),
    title: R.hub_title,
    description: R.hub_description,
    jsonld: crumbs([t('breadcrumb_top'), home], [R.nav, `${home}reference/`]),
    content: `<nav class="breadcrumb"><a href="${home}">${esc(t('breadcrumb_top'))}</a></nav>
<h1>${esc(R.hub_h1)}</h1>
<p class="lead">${esc(R.hub_lead)}</p>
${sections.map(s => `<section>
  <h2>${esc(s.h)}</h2>
  <p class="muted">${esc(s.p)}</p>
  <ul class="ref-tiles">${s.html}</ul>
</section>`).join('\n')}
<div data-ad="glossary"></div>`,
  });
}
