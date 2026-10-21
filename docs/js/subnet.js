// IPv4 のサブネット計算。アドレスとプレフィックス長(またはサブネットマスク)から、ネットワークアドレス・ブロードキャスト・
// ホストの範囲と数・ワイルドカードマスク・アドレスの種類を求める。分割後のプレフィックス長を選ぶとサブネットを並べ、
// 必要なホスト数からは収容できる最小のサブネットを求める。/31 は2台(RFC 3021)、/32 は1台として数える
const form = document.getElementById('sn-form');
const out = k => document.querySelector(`[data-out="${k}"]`);
let T = {};
try { T = JSON.parse(form.dataset.text); } catch {}

export const parseIp = s => {
  const m = s.trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return null;
  const o = m.slice(1).map(Number);
  return o.every(x => x <= 255) ? ((o[0] << 24) >>> 0) + (o[1] << 16) + (o[2] << 8) + o[3] : null;
};
export const ipStr = x => [24, 16, 8, 0].map(s => (x >>> s) & 255).join('.');
export const maskOf = n => (n === 0 ? 0 : (0xFFFFFFFF << (32 - n)) >>> 0);
// 「/27」「27」「255.255.255.224」を受け付ける。マスクは1が上位から連続しているものだけ
export function parsePrefix(s) {
  const t = s.trim().replace(/^\//, '');
  if (/^\d{1,2}$/.test(t)) { const n = Number(t); return n <= 32 ? n : null; }
  const m = parseIp(t);
  if (m == null) return null;
  const n = 32 - Math.log2(((~m) >>> 0) + 1);
  return Number.isInteger(n) && maskOf(n) === m ? n : null;
}
export const usable = n => (n === 32 ? 1 : n === 31 ? 2 : 2 ** (32 - n) - 2);
export function info(ip, n) {
  const mask = maskOf(n), net = (ip & mask) >>> 0, bc = (net | (~mask >>> 0)) >>> 0;
  const first = n >= 31 ? net : net + 1, last = n >= 31 ? bc : bc - 1;
  return { net, bc, first, last, mask, wild: (~mask) >>> 0, hosts: usable(n), total: 2 ** (32 - n) };
}
// アドレスの種類(特別な範囲を先に調べる)
const RANGES = [
  ['unspecified', '0.0.0.0', 32], ['broadcast', '255.255.255.255', 32], ['loopback', '127.0.0.0', 8],
  ['private', '10.0.0.0', 8], ['private', '172.16.0.0', 12], ['private', '192.168.0.0', 16],
  ['cgnat', '100.64.0.0', 10], ['linklocal', '169.254.0.0', 16],
  ['doc', '192.0.2.0', 24], ['doc', '198.51.100.0', 24], ['doc', '203.0.113.0', 24],
  ['multicast', '224.0.0.0', 4], ['reserved', '240.0.0.0', 4],
];
export const kindOf = ip => RANGES.find(([, a, n]) => ((ip & maskOf(n)) >>> 0) === parseIp(a))?.[0] ?? 'public';
const classOf = ip => { const a = ip >>> 24; return a < 128 ? 'A' : a < 192 ? 'B' : a < 224 ? 'C' : a < 240 ? 'D' : 'E'; };
const bin = x => [24, 16, 8, 0].map(s => ((x >>> s) & 255).toString(2).padStart(8, '0')).join('.');
// ネットワーク部とホスト部を色分けした2進数(n ビット目で区切る。ドットの分を数え直す)
const colored = (x, n) => {
  const b = bin(x);
  const cut = n + Math.floor(Math.max(0, n - 1) / 8);
  return `<span class="sn-net">${b.slice(0, cut)}</span><span class="sn-host">${b.slice(cut)}</span>`;
};

function update() {
  const ip = parseIp(form.elements.ip.value);
  const n = parsePrefix(form.elements.prefix.value);
  const err = document.getElementById('sn-error');
  err.hidden = ip != null && n != null;
  const keys = ['cidr', 'network', 'broadcast', 'first', 'last', 'hosts', 'total', 'mask', 'wildcard', 'kind', 'cls'];
  if (ip == null || n == null) { for (const k of keys) out(k).textContent = '–'; document.getElementById('sn-bin').innerHTML = ''; document.getElementById('sn-split').innerHTML = ''; needUpdate(); return; }
  const r = info(ip, n);
  out('cidr').textContent = `${ipStr(r.net)}/${n}`;
  out('network').textContent = ipStr(r.net);
  out('broadcast').textContent = n >= 31 ? '–' : ipStr(r.bc);
  out('first').textContent = ipStr(r.first);
  out('last').textContent = ipStr(r.last);
  out('hosts').textContent = r.hosts.toLocaleString('en').replace(/,/g, '');
  out('total').textContent = String(r.total);
  out('mask').textContent = ipStr(r.mask);
  out('wildcard').textContent = ipStr(r.wild);
  out('kind').textContent = T.kinds?.[kindOf(ip)] ?? kindOf(ip);
  out('cls').textContent = classOf(ip);
  document.getElementById('sn-p31').hidden = n < 31;
  document.getElementById('sn-bin').innerHTML = `<div>${T.bin_ip}</div><code>${colored(ip, n)}</code><div>${T.bin_mask}</div><code>${colored(r.mask, n)}</code>`;
  // 分割
  const sp = Number(form.elements.split.value);
  const box = document.getElementById('sn-split');
  if (sp > n) {
    const count = 2 ** (sp - n), size = 2 ** (32 - sp), show = Math.min(count, 256);
    const rows = [];
    for (let i = 0; i < show; i++) {
      const s = info((r.net + i * size) >>> 0, sp);
      rows.push(`<tr><td>${ipStr(s.net)}/${sp}</td><td>${ipStr(s.first)} – ${ipStr(s.last)}</td><td>${sp >= 31 ? '–' : ipStr(s.bc)}</td></tr>`);
    }
    box.innerHTML = `<p>${T.split_count.replace('{n}', count).replace('{h}', usable(sp))}${count > 256 ? ` ${T.split_more}` : ''}</p><div class="table-wrap"><table class="sp-pairs"><thead><tr><th>${T.col_net}</th><th>${T.col_range}</th><th>${T.col_bc}</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
  } else box.innerHTML = '';
  needUpdate();
}
// 必要なホスト数から最小のサブネット
function needUpdate() {
  const h = Math.floor(Number(form.elements.need.value));
  const el = out('need');
  if (!(h >= 1)) { el.textContent = '–'; return; }
  let n = 32;
  while (n > 1 && usable(n) < h) n--;
  el.textContent = usable(n) >= h ? T.need_result.replace('{h}', h).replace('{n}', n).replace('{m}', usable(n)) : T.need_too_many;
}
// 分割の選択肢は、今のプレフィックス長より長いものだけを使える
function splitOptions() {
  const n = parsePrefix(form.elements.prefix.value);
  for (const o of form.elements.split.options) o.disabled = o.value !== '0' && n != null && Number(o.value) <= n;
  if (form.elements.split.selectedOptions[0]?.disabled) form.elements.split.value = '0';
}
form.addEventListener('input', () => { splitOptions(); update(); });
form.addEventListener('submit', e => e.preventDefault());
splitOptions();
update();
