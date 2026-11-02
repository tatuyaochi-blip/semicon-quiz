// 資料のページ(略語辞典)の、略語の取り出し方の検査。実行: node --test tools/tests/*.test.mjs(npm test に含まれる)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { isAbbr, abbrOf, fullName, isFormula, abbrList } from '../reference.js';

test('略語とみなす語と、見出しからの取り出し方', () => {
  for (const w of ['CMOS', 'SoC', 'FinFET', 'I2C', 'DDR5', 'CSMA/CA', 'ATT&CK']) assert.ok(isAbbr(w), w);
  for (const w of ['Cu', 'SRAM セル', '14644', 'Express', 'ABCDEFGHIJKLM']) assert.ok(!isAbbr(w), w);
  assert.deepEqual(abbrOf({ term: 'CMOS' }), { abbr: 'CMOS', lead: true });
  assert.deepEqual(abbrOf({ term: 'RIE(反応性イオンエッチング)' }), { abbr: 'RIE', lead: true });
  assert.deepEqual(abbrOf({ term: '過渡増速拡散(TED)' }), { abbr: 'TED', lead: false });
  assert.deepEqual(abbrOf({ term: 'ショットキーバリアダイオード', aliases: ['SBD'] }), { abbr: 'SBD', lead: false });
  for (const term of ['KVキャッシュ', 'ISO 14644-1', 'PCI Express', 'しきい値電圧']) assert.equal(abbrOf({ term }), null, term);
});

test('英語の見出しからの正式名称と、化学式の除外', () => {
  assert.equal(fullName('RIE (reactive ion etching)', 'RIE'), 'reactive ion etching');
  assert.equal(fullName('Transient enhanced diffusion (TED)', 'TED'), 'Transient enhanced diffusion');
  assert.equal(fullName('CMOS', 'CMOS'), '');
  for (const w of ['GaN', 'GaAs', 'SiH4', 'Ga2O3', '4H-SiC', 'NF3', 'SiON', 'PH3']) assert.ok(isFormula(w), w);
  for (const w of ['NF', 'CoWoS', 'SoC', 'IPv4', 'CMOS', 'HF', 'FP8']) assert.ok(!isFormula(w), w);
});

test('サイトの用語集から作った一覧: すべての語に正式名称があり、化学式・除外した名前が入らない', () => {
  const glossary = JSON.parse(fs.readFileSync(new URL('../../data/glossary.json', import.meta.url)));
  const en = JSON.parse(fs.readFileSync(new URL('../../data/i18n/en/glossary.json', import.meta.url)));
  const extra = JSON.parse(fs.readFileSync(new URL('../../data/reference/abbr.json', import.meta.url)));
  const list = abbrList(glossary, en, extra);
  assert.ok(list.length > 300, `${list.length} 語`);
  assert.deepEqual(list.filter(x => !x.full).map(x => x.abbr), [], '正式名称のない略語');
  for (const x of list) assert.ok(!isFormula(x.abbr) && !extra.exclude.includes(x.abbr), x.abbr);
  const by = Object.fromEntries(list.map(x => [x.abbr, x.full]));
  assert.equal(by.DIBL, 'drain-induced barrier lowering'); assert.equal(by.RIE, 'reactive ion etching'); assert.equal(by.QoS, 'Quality of Service');
  // 補足の正式名称は、実在する略語だけ(綴りの誤りで使われないものがないか)
  for (const k of Object.keys(extra.full)) assert.ok(list.some(x => x.abbr === k), `abbr.json の ${k} が一覧にない`);
});
