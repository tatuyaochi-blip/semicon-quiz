// 日本語の文節の区切り(src/js/phrase.js)。見出し・ボタン・カードの題・選択肢にだけ <wbr> を入れる
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { phraseHtml } from '../../src/js/phrase.js';

test('見出し: 助詞・句読点・中黒の後ろで区切る', () => {
  assert.equal(phraseHtml('<h2>漏れとリフレッシュ、微細化の工夫</h2>'), '<h2>漏れと<wbr>リフレッシュ、<wbr>微細化の<wbr>工夫</h2>');
  assert.equal(phraseHtml('<h1>違い：構造・使い方を比較</h1>'), '<h1>違い：<wbr>構造・<wbr>使い方を<wbr>比較</h1>');
});

test('送りがなの1字(使い方・読み出し)では区切らない。開きカッコの前は区切る', () => {
  assert.equal(phraseHtml('<h3>読み出し</h3>'), '<h3>読み出し</h3>');
  assert.equal(phraseHtml('<span class="cat-name">回路解析(交流回路・線形回路)</span>'), '<span class="cat-name">回路解析<wbr>(交流回路・<wbr>線形回路)</span>');
});

test('本文の段落、1行で省略する要素、コードや式の中には入れない', () => {
  assert.equal(phraseHtml('<p>電流の向き</p>'), '<p>電流の向き</p>');
  assert.equal(phraseHtml('<summary><span class="tg-preview">半導体物性、PN接合</span></summary>'), '<summary><span class="tg-preview">半導体物性、PN接合</span></summary>');
  assert.equal(phraseHtml('<h2>式<code>a、b</code>の例</h2>'), '<h2>式<code>a、b</code>の<wbr>例</h2>');
});
