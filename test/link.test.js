// 挑戦リンク encodeChallenge / decodeChallenge のテスト（src/link.js）
// 実行: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const LK = require('../src/link.js');

// ---- 項目8：挑戦リンク ----

// 項目8
test('項目8 読みなしで組み立てたリンクを読み取ると文が戻り、yomi は null', () => {
  assert.deepStrictEqual(LK.decodeChallenge(LK.encodeChallenge('竹藪焼けた')), { text: '竹藪焼けた', yomi: null });
});

// 項目8
test('項目8 直した読み付きで組み立てたリンクを読み取ると文と読みが戻る', () => {
  assert.deepStrictEqual(LK.decodeChallenge(LK.encodeChallenge('竹藪焼けた', 'たけやぶやけた')),
    { text: '竹藪焼けた', yomi: 'たけやぶやけた' });
});

// 項目8
test('項目8 点数や強さなど k と y 以外の値は無視される', () => {
  const r = LK.decodeChallenge('?k=' + encodeURIComponent('竹藪焼けた') + '&score=100&power=9');
  assert.deepStrictEqual(r, { text: '竹藪焼けた', yomi: null });
  assert.deepStrictEqual(Object.keys(r).sort(), ['text', 'yomi']);
});

// 項目8
test('項目8 k がない・空・空白だけ・長すぎるリンクは null', () => {
  assert.equal(LK.MAX_LEN, 60);
  assert.equal(LK.decodeChallenge(''), null, '空文字');
  assert.equal(LK.decodeChallenge('?y=あ'), null, 'k がない');
  assert.equal(LK.decodeChallenge('?k='), null, 'k が空');
  assert.equal(LK.decodeChallenge('?k=' + encodeURIComponent(' 　 ')), null, 'k が空白だけ');
  assert.equal(LK.decodeChallenge('?k=' + encodeURIComponent('あ'.repeat(LK.MAX_LEN + 1))), null, 'MAX_LEN を超える');
});
