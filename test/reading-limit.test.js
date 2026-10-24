// 直した読みの長さの上限のテスト（src/reading.js の checkReading）
// 実行: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const RD = require('../src/reading.js');

// 決まり（2026-10-24 ユーザー承認）：漢字1文字につき6かなまで、英字・数字1文字につき4かなまで。
// 漢字1文字に長い回文の読みを付けて、表示と無関係な強いコマを作るズルを防ぐ
test('上限 漢字1文字に7かな以上の読みは long で通らない', () => {
  const r = RD.checkReading('亜', 'たけやぶやけた');
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'long');
});

test('上限 漢字1文字に6かなまでの読みは通る（「志」→「こころざし」など長い読みも収まる）', () => {
  assert.equal(RD.checkReading('志', 'こころざし').ok, true);
  assert.equal(RD.checkReading('亜', 'ああああああ').ok, true);
});

test('上限 漢字2文字なら12かなまで通り、13かなは通らない', () => {
  assert.equal(RD.checkReading('漢字', 'あ'.repeat(12)).ok, true);
  const r = RD.checkReading('漢字', 'あ'.repeat(13));
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'long');
});

test('上限 英字・数字は1文字につき4かなまで', () => {
  assert.equal(RD.checkReading('ab', 'えーびー').ok, true);
  const r = RD.checkReading('a', 'えーびーしー');
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'long');
});

test('上限 かなの部分を変えたときは、長さより先に kana と答える', () => {
  assert.equal(RD.checkReading('亜け', 'たけやぶやけだ').reason, 'kana');
});
