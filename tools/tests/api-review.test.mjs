// tools/api-review.js(Claude API での問題の点検)の単体テスト。通信はしない(fetch は差し替え)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  buildRequests, estimate, checkBudget, parseResults, realCost, createBatch, liveCategories, customId, PRICES, FINDINGS_SCHEMA, reportMarkdown,
} from '../api-review.js';

const config = JSON.parse(fs.readFileSync(new URL('../../config.json', import.meta.url)));

test('公開中の分野だけを対象にし、外した分野は含めない', () => {
  const ids = liveCategories().map((c) => c.id);
  for (const ex of config.excludeCats) assert.ok(!ids.includes(ex), ex);
  assert.ok(ids.includes('mosfet'));
});

test('全問を1回ずつ依頼し、custom_id は公式の形式に合う', () => {
  const cats = liveCategories().map((c) => c.id);
  const reqs = buildRequests({ cats });
  const seen = new Map();
  for (const r of reqs) {
    assert.match(r.custom_id, /^[a-zA-Z0-9_-]{1,64}$/);
    for (const id of r.meta.ids) seen.set(id, (seen.get(id) || 0) + 1);
  }
  let total = 0;
  for (const c of cats) total += JSON.parse(fs.readFileSync(new URL(`../../data/questions/${c}.json`, import.meta.url))).length;
  assert.equal(seen.size, total);
  assert.ok([...seen.values()].every((n) => n === 1));
  assert.equal(new Set(reqs.map((r) => r.custom_id)).size, reqs.length);
});

test('リクエストの形: キャッシュは4か所以内、Batch で使えない項目を入れない', () => {
  const [r] = buildRequests({ cats: ['mosfet'], chunk: 5 });
  const p = r.params;
  const marks = [...p.system, ...p.messages[0].content].filter((b) => b.cache_control).length;
  assert.ok(marks >= 1 && marks <= 4);
  for (const k of ['stream', 'speed', 'fallbacks', 'temperature', 'top_p', 'top_k', 'thinking']) assert.ok(!(k in p), k);
  assert.ok(p.max_tokens > 0);
  assert.equal(p.output_config.format.type, 'json_schema');
  assert.equal(r.meta.ids.length, 5);
  // 問題の部分には4言語が入り、日本語だけに正解の番号がある
  const items = JSON.parse(p.messages[0].content[1].text.replace(/^[^\n]*\n/, ''));
  assert.ok(items[0].ja && items[0].en && items[0]['zh-hant'] && items[0].ko);
  assert.ok('answer' in items[0].ja && !('answer' in items[0].en));
});

test('構造化出力のスキーマ: すべての object が additionalProperties: false', () => {
  const walk = (s) => {
    if (s.type === 'object') { assert.equal(s.additionalProperties, false); Object.values(s.properties).forEach(walk); }
    if (s.type === 'array') walk(s.items);
  };
  walk(FINDINGS_SCHEMA);
});

test('見積もり: 最悪の額は目安以上で、上限を超えたら送らない', () => {
  const reqs = buildRequests({ cats: ['mosfet', 'bjt'] });
  const est = estimate(reqs);
  assert.ok(est.worstUsd >= est.likelyUsd && est.likelyUsd > 0);
  // 出力の上限だけでも 件数 × max_tokens × 出力単価 以上になる
  assert.ok(est.worstUsd >= reqs.length * 24000 * PRICES['claude-opus-5-5'].output / 1e6);
  assert.equal(checkBudget(est, { maxUsd: est.worstUsd + 1, totalCapUsd: 0 }).ok, true);
  assert.equal(checkBudget(est, { maxUsd: est.worstUsd - 0.01, totalCapUsd: 0 }).ok, false);
  assert.equal(checkBudget(est, { maxUsd: NaN, totalCapUsd: 0 }).ok, false);
  assert.equal(checkBudget(est, { maxUsd: 1000, totalCapUsd: 100, spentUsd: 100 - est.worstUsd + 0.01 }).ok, false);
  assert.throws(() => estimate(reqs, { model: 'unknown-model' }));
});

test('実費の計算(Batch の単価、1時間キャッシュの書き込みは2倍)', () => {
  const u = { input_tokens: 1e6, output_tokens: 1e6, cache_read_input_tokens: 1e6, cache_creation_input_tokens: 1e6, cache_creation: { ephemeral_1h_input_tokens: 1e6, ephemeral_5m_input_tokens: 0 } };
  assert.equal(+realCost(u, 'claude-opus-5-5').toFixed(4), 2 + 10 + 0.1 + 4);
});

test('結果の整理: 成功・拒否・切れた出力・依頼外の ID を分ける', () => {
  const manifest = [
    { custom_id: customId('mosfet', 0), cat: 'mosfet', ids: ['mosfet-001', 'mosfet-002'] },
    { custom_id: customId('mosfet', 1), cat: 'mosfet', ids: ['mosfet-003'] },
    { custom_id: customId('bjt', 0), cat: 'bjt', ids: ['bjt-001'] },
    { custom_id: customId('bjt', 1), cat: 'bjt', ids: ['bjt-002'] },
  ];
  const f = { id: 'mosfet-002', lang: 'ja', field: 'explanation', kind: 'calculation', severity: 'P0', confidence: 'high', needs_source: false, quote: 'x', problem: 'y', suggestion: 'z' };
  const ok = (id, body, stop = 'end_turn') => ({ custom_id: id, result: { type: 'succeeded', message: { model: 'claude-opus-5-5', stop_reason: stop, usage: { input_tokens: 10, output_tokens: 5 }, content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: JSON.stringify(body) }] } } });
  const lines = [
    ok(customId('mosfet', 0), { checked_ids: ['mosfet-001', 'mosfet-002'], findings: [f, { ...f, id: 'other-999' }] }),
    ok(customId('mosfet', 1), {}, 'refusal'),
    ok(customId('bjt', 0), {}, 'max_tokens'),
    { custom_id: customId('bjt', 1), result: { type: 'errored', error: { type: 'invalid_request' } } },
  ];
  const r = parseResults(lines, manifest);
  assert.deepEqual(r.checked, ['mosfet-001', 'mosfet-002']);
  assert.equal(r.findings.length, 2);
  assert.equal(r.findings.find((x) => x.id === 'other-999').outOfScope, true);
  assert.equal(r.problems.length, 3);
  assert.equal(r.usage.length, 3);
  const md = reportMarkdown({ runId: 't', meta: { model: 'm', effort: 'high', questions: 5, categories: 2, likelyUsd: 1, worstUsd: 2 }, ...r, costUsd: 0.5 });
  assert.match(md, /候補/);
  assert.match(md, /mosfet-002/);
});

test('送信: キーはヘッダーにだけ入り、本文には入らない。キーがなければ送らない', async () => {
  const reqs = buildRequests({ cats: ['mosfet'] });
  const old = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  await assert.rejects(createBatch(reqs, async () => { throw new Error('呼ばれてはいけない'); }), /ANTHROPIC_API_KEY/);
  process.env.ANTHROPIC_API_KEY = 'test-key-not-real';
  let seen;
  const fake = async (url, init) => { seen = { url, init }; return { ok: true, json: async () => ({ id: 'msgbatch_test', processing_status: 'in_progress' }) }; };
  const b = await createBatch(reqs, fake);
  assert.equal(b.id, 'msgbatch_test');
  assert.equal(seen.url, 'https://api.anthropic.com/v1/messages/batches');
  assert.equal(seen.init.headers['x-api-key'], 'test-key-not-real');
  assert.ok(seen.init.headers['anthropic-version']);
  assert.ok(!seen.init.body.includes('test-key-not-real'));
  const body = JSON.parse(seen.init.body);
  assert.equal(body.requests.length, reqs.length);
  assert.ok(!('meta' in body.requests[0]));
  if (old === undefined) delete process.env.ANTHROPIC_API_KEY; else process.env.ANTHROPIC_API_KEY = old;
});
