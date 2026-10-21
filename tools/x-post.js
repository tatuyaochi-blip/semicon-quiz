// X(旧Twitter)に「今日の半導体クイズ」を1日1問投稿する。GitHub Actions(.github/workflows/x-daily.yml)から毎朝動かす。
// 問題は日付ごとに決まり、投稿できる問題を一巡するまで同じ問題は出ない。選択肢が短い問題は投票で、長い問題は本文に選択肢を書いて出す。
//
// 実行:
//   node tools/x-post.js --preview [日数]   今日から数日分の投稿文を表示する(既定14日。投稿はしない)
//   node tools/x-post.js --post              今日の問題を投稿する(環境変数 X_API_KEY・X_API_SECRET・X_ACCESS_TOKEN・X_ACCESS_TOKEN_SECRET が必要)
//   node tools/x-post.js --post --date 2026-10-22   日付を指定する(確かめるとき用)
//
// 設定は config.json の xPost: { lang, start, hashtag, campaign }
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = path.resolve(import.meta.dirname, '..');
const readJSON = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const config = readJSON('config.json');
const opt = { lang: 'ja', start: '2026-10-22', hashtag: '半導体', campaign: 'daily_quiz', ...(config.xPost ?? {}) };
const L = config.languages.find(x => x.code === opt.lang);
const isDef = L.code === config.languages[0].code;

// 投稿文の長さ(X の数え方): 主な欧文の文字は1、日本語などは2、URLは長さによらず23。上限は280
const weight = s => [...s.normalize('NFC')].reduce((n, ch) => {
  const c = ch.codePointAt(0);
  return n + (c <= 4351 || (c >= 8192 && c <= 8205) || (c >= 8208 && c <= 8223) || (c >= 8242 && c <= 8247) ? 1 : 2);
}, 0);
const URL_WEIGHT = 23;
const LIMIT = 280;
const POLL_OPTION = 25; // 投票の選択肢は25文字まで

const T = {
  ja: { head: '【今日の半導体クイズ】', answer: '答えと解説👉 ' },
  en: { head: 'Semiconductor quiz of the day: ', answer: 'Answer and explanation 👉 ' },
}[L.code] ?? { head: '', answer: '👉 ' };

// 投稿できる問題: 図がない(図を見ないと解けない)、投票か本文のどちらかの形で280に収まる
const cats = readJSON('data/categories.json');
const catT = isDef ? {} : readJSON(`data/i18n/${L.code}/categories.json`);
const pool = [];
for (const c of cats) {
  const file = `data/questions/${c.id}.json`;
  if (!fs.existsSync(path.join(root, file))) continue;
  const tq = isDef ? {} : readJSON(`data/i18n/${L.code}/questions/${c.id}.json`);
  for (const q0 of readJSON(file)) {
    if (q0.figure || (!isDef && !tq[q0.id])) continue;
    const q = { ...q0, ...(tq[q0.id] ?? {}) };
    const post = compose(q, catT[c.id]?.name ?? c.name, c.id);
    if (post) pool.push(post);
  }
}
// 並び順は問題IDのハッシュで決める(問題が増えても、ほかの問題の順番はほとんど変わらない)
const key = id => crypto.createHash('sha1').update(`semiconroom-x:${id}`).digest('hex');
pool.sort((a, b) => (key(a.id) < key(b.id) ? -1 : 1));

function compose(q, catName, cat) {
  const url = `${config.baseUrl}${L.path}q/${cat}/${q.id}/?utm_source=x&utm_medium=social&utm_campaign=${opt.campaign}`;
  const tail = `\n\n${T.answer}${url}\n#${opt.hashtag}`;
  const len = s => weight(s.replace(url, '')) + URL_WEIGHT;
  const head = `${T.head}${catName}\n${q.question}`;
  // 正解の選択肢だけが目立って長い問題は、長さで答えがわかってしまうので出さない
  const size = x => [...x].length;
  const others = q.choices.filter((_, i) => i !== q.answer).map(size);
  if (size(q.choices[q.answer]) > Math.max(...others) * 1.6 + 4) return null;
  if (q.choices.every(x => [...x].length <= POLL_OPTION) && len(head + tail) <= LIMIT) {
    return { id: q.id, text: head + tail, poll: q.choices, answer: q.choices[q.answer], weight: len(head + tail) };
  }
  const text = `${head}\n\n${q.choices.map((x, i) => `${'ABCDEFG'[i]}. ${x}`).join('\n')}${tail}`;
  return len(text) <= LIMIT ? { id: q.id, text, poll: null, answer: q.choices[q.answer], weight: len(text) } : null;
}

// 日付(日本時間)→ その日の問題
const today = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
const dayIndex = d => Math.round((Date.parse(d) - Date.parse(opt.start)) / 86400e3);
const pick = d => pool[((dayIndex(d) % pool.length) + pool.length) % pool.length];

// OAuth 1.0a の署名(X API v2 の投稿はユーザーの認可が要る)
function oauthHeader(method, url, env) {
  const enc = s => encodeURIComponent(s).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  const p = {
    oauth_consumer_key: env.X_API_KEY,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: env.X_ACCESS_TOKEN,
    oauth_version: '1.0',
  };
  const params = Object.keys(p).sort().map(k => `${enc(k)}=${enc(p[k])}`).join('&');
  const base = [method, enc(url), enc(params)].join('&');
  const signingKey = `${enc(env.X_API_SECRET)}&${enc(env.X_ACCESS_TOKEN_SECRET)}`;
  p.oauth_signature = crypto.createHmac('sha1', signingKey).update(base).digest('base64');
  return 'OAuth ' + Object.keys(p).sort().map(k => `${enc(k)}="${enc(p[k])}"`).join(', ');
}

async function post(item) {
  const env = process.env;
  const missing = ['X_API_KEY', 'X_API_SECRET', 'X_ACCESS_TOKEN', 'X_ACCESS_TOKEN_SECRET'].filter(k => !env[k]);
  if (missing.length) throw new Error(`環境変数がありません: ${missing.join(', ')}`);
  const url = 'https://api.x.com/2/tweets';
  const body = { text: item.text, ...(item.poll ? { poll: { options: item.poll, duration_minutes: 1440 } } : {}) };
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: oauthHeader('POST', url, env), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`X API ${res.status}: ${JSON.stringify(json)}`);
  return json.data?.id;
}

const show = (d, x) => `===== ${d}(${x.id}${x.poll ? '・投票' : ''}・${x.weight}/${LIMIT}) 正解: ${x.answer}\n${x.text}${x.poll ? `\n[投票] ${x.poll.join(' / ')}` : ''}\n`;

const args = process.argv.slice(2);
const dateArg = args.includes('--date') ? args[args.indexOf('--date') + 1] : today();
if (args[0] === '--post') {
  const item = pick(dateArg);
  console.log(show(dateArg, item));
  const id = await post(item);
  console.log(`投稿しました: https://x.com/i/web/status/${id}`);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `投稿しました: https://x.com/i/web/status/${id}\n\n\`\`\`\n${show(dateArg, item)}\`\`\`\n`);
} else {
  const n = Number(args[1] ?? 14);
  const out = [`投稿できる問題: ${pool.length}問(投票 ${pool.filter(x => x.poll).length}問)。一巡するまで同じ問題は出ません\n`];
  for (let i = 0; i < n; i++) {
    const d = new Date(Date.parse(dateArg) + i * 86400e3).toISOString().slice(0, 10);
    out.push(show(d, pick(d)));
  }
  console.log(out.join('\n'));
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## 投稿の予定(まだ投稿していません)\n\n\`\`\`\n${out.join('\n')}\`\`\`\n`);
}
