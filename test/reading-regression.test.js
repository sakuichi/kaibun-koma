// 不具合の再現テスト（src/reading.js の checkReading）
// 実行: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const RD = require('../src/reading.js');

// レビューで見つかった不具合：細工した挑戦リンク（漢字とかなが交互の文＋一致しない長い読み）を開くと、
// 読みの確認に時間がかかりすぎてページが固まる（正規表現の後戻りが指数的に増えていた）
test('不具合 漢字とかなが交互の文に一致しない長い読みを渡しても、すぐに「通らない」と答える', () => {
  const text = '漢あ'.repeat(11), yomi = 'あ'.repeat(33) + 'い';
  const t0 = Date.now();
  const r = RD.checkReading(text, yomi);
  const ms = Date.now() - t0;
  assert.equal(r.ok, false);
  assert.ok(ms < 300, `${ms}ms かかった（300ms 未満のはず）`);
});
