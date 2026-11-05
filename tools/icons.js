// サイトで使う線画のアイコン(24×24、線の色は文字色、線の太さ1.8)。
// 分野の大分類(9つ)と、資料のページの種類に使う。どの一覧でも同じアイコンを使い、目印にする
const P = {
  // ---- 分野の大分類 ----
  basic: '<circle cx="12" cy="12" r="1.6" fill="currentColor"/><ellipse cx="12" cy="12" rx="9" ry="3.6"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(-60 12 12)"/>',
  device: '<path d="M3 12h6M9 6.5v11M12 6.5v11M12 8.5h5V4M12 15.5h5V20M12 12h6"/>',
  'front-end': '<circle cx="12" cy="12" r="9"/><path d="M7.5 8.5h9M5.5 12h13M7.5 15.5h9M8.5 7v10M12 4.5v15M15.5 7v10"/>',
  'back-end': '<rect x="4" y="7" width="16" height="7" rx="1.5"/><circle cx="7" cy="17.5" r="1.3"/><circle cx="12" cy="17.5" r="1.3"/><circle cx="17" cy="17.5" r="1.3"/>',
  'design-industry': '<path d="M3 7h6l3 3h9M3 17h7l3-3h8"/><circle cx="9" cy="7" r="1.6"/><circle cx="10" cy="17" r="1.6"/><path d="M17 6v8"/>',
  'cs-basics': '<ellipse cx="8" cy="12" rx="3.5" ry="6"/><path d="M15 8l3-2v12M15 18h6"/>',
  architecture: '<rect x="5" y="5" width="14" height="14" rx="2"/><rect x="9" y="9" width="6" height="6" rx="1"/><path d="M9 2.5v2.5M15 2.5v2.5M9 19v2.5M15 19v2.5M2.5 9h2.5M2.5 15h2.5M19 9h2.5M19 15h2.5"/>',
  software: '<rect x="3" y="4.5" width="18" height="14" rx="2"/><path d="M9 9.5l-2.5 2.5L9 14.5M15 9.5l2.5 2.5-2.5 2.5M13 8.5l-2 7"/>',
  'net-security': '<circle cx="12" cy="5" r="2"/><circle cx="5" cy="18" r="2"/><circle cx="19" cy="18" r="2"/><path d="M11 6.8 6 16.2M13 6.8l5 9.4M7 18h10"/>',
  other: '<circle cx="6" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="18" cy="12" r="1.4" fill="currentColor"/>',
  // ---- 資料のページの種類 ----
  abbr: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5M8.5 13.5 11 7l2.5 6.5M9.4 11.3h3.2"/>',
  langs: '<path d="M3 4.5h11v7.5H8l-3.5 3v-3H3z"/><path d="M14.5 9H21v7.5h-1.5v3l-3.5-3h-4.5V13"/>',
  glossary: '<path d="M3 5h6a3 3 0 0 1 3 3v12a2.5 2.5 0 0 0-2.5-2.5H3z"/><path d="M21 5h-6a3 3 0 0 0-3 3v12a2.5 2.5 0 0 1 2.5-2.5H21z"/>',
  compare: '<rect x="3" y="5" width="7" height="14" rx="1.5"/><rect x="14" y="5" width="7" height="14" rx="1.5"/><path d="M10.5 10h3M10.5 14h3"/>',
  figures: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m6.5 16 3.5-4.5 3 3 2-2 3 3.5"/><circle cx="8.5" cy="8.5" r="1.3"/>',
  numbers: '<path d="M9.5 4 7.5 20M16.5 4l-2 16M4.5 9h16M3.5 15h16"/>',
  news: '<rect x="3" y="5" width="15" height="14" rx="1.5"/><path d="M18 8.5h3v8.5a2 2 0 0 1-2 2M6 9h9M6 12h9M6 15h6"/>',
  trend: '<path d="M3.5 18 9.5 12l4 4 7-8"/><path d="M15.5 8h5v5"/>',
  learn: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.8 10.6c.7.6 1 1.4 1 2.4h5.6c0-1 .3-1.8 1-2.4A6 6 0 0 0 12 3z"/>',
  tools: '<rect x="5" y="3" width="14" height="18" rx="2"/><rect x="8" y="6" width="8" height="3.5" rx=".8"/><path d="M8.5 13.5h.01M12 13.5h.01M15.5 13.5h.01M8.5 17.5h.01M12 17.5h.01M15.5 17.5h.01" stroke-width="2.6"/>',
  careers: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3 12.5h18"/>',
  interview: '<path d="M4 4.5h16v11H9.5L5 19.5v-4H4z"/><path d="M10 8.6a2 2 0 1 1 2.9 1.8c-.6.3-.9.7-.9 1.3M12 13.4h.01"/>',
  exam: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9.5 3h5v2.5h-5zM9 13l2 2 4-4.5"/>',
  download: '<path d="M12 4v11M7 10.5l5 5 5-5M4.5 19.5h15"/>',
  course: '<path d="M4 6h3v3H4zM10.5 6H20M4 11h3v3H4zM10.5 11H20M4 16h3v3H4zM10.5 16H20"/>',
};

export const iconNames = Object.keys(P);
// name のアイコンの SVG。ないときは空文字。cls は追加のクラス
export function icon(name, cls = '') {
  const body = P[name];
  if (!body) return '';
  return `<svg class="ic${cls ? ` ${cls}` : ''}" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
}
