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

// ctx: build.js の buildLang の中の値と関数
export function buildReference(ctx) {
  const { L, code, defLang, home, base, langs, page, esc, t, S, terms, termSlug, built, short, crumbs, R, glossary, enGlo, abbrExtra } = ctx;
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

  // ---- 資料のトップ ----
  // 各ページのタイトル(「:」より前)と説明を、そのページ自身の言葉で使う。この言語で作られたページだけを並べる
  const card = sub => {
    const x = built.get(`${L.path}${sub}`);
    if (!x) return '';
    const name = String(x.title).split(/\s*[:：|｜—–]\s*/)[0];
    return `<li><a class="cmp-card" href="${home}${sub}"><strong>${esc(name)}</strong><span>${esc(short(x.description, 110))}</span></a></li>`;
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
  <ul class="cmp-list">${s.html}</ul>
</section>`).join('\n')}
<div data-ad="glossary"></div>`,
  });
}
