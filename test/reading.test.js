// 読み取り autoReading と、直した読みの確認 checkReading のテスト（src/reading.js）
// 実行: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const RD = require('../src/reading.js');

// 辞書を使うテストだけで読み込む（checkReading は辞書なしで動く約束）
let dictLoaded = false;
function loadDict() {
  if (dictLoaded) return;
  RD.setDict(fs.readFileSync(path.join(__dirname, '../dict/dict.txt'), 'utf8'));
  dictLoaded = true;
}

// ---- 項目4：読みの修正（辞書あり） ----

// 項目4
test('項目4 辞書あり：「新聞紙」の推定読みは「しんぶんし」', () => {
  loadDict();
  assert.equal(RD.autoReading('新聞紙').yomi, 'しんぶんし');
});

// 項目4
test('項目4 辞書あり：「世の中ね顔かお金かなのよ」の推定読みは「よのなかねかおかおかねかなのよ」', () => {
  loadDict();
  assert.equal(RD.autoReading('世の中ね顔かお金かなのよ').yomi, 'よのなかねかおかおかねかなのよ');
});

// 項目4
test('項目4 辞書あり：「竹藪焼けた」では「藪」が読めなかった漢字に入る', () => {
  loadDict();
  const r = RD.autoReading('竹藪焼けた');
  assert.ok(Array.isArray(r.unknown));
  assert.ok(r.unknown.includes('藪'), `unknown ${JSON.stringify(r.unknown)} に「藪」が含まれるはず`);
});

// ---- 項目4：直した読みの確認 checkReading ----

// 項目4
test('項目4 カタカナで直した読みはひらがなにそろえて通る', () => {
  assert.deepEqual(RD.checkReading('竹藪焼けた', 'タケヤブヤケタ'), { ok: true, yomi: 'たけやぶやけた', reason: null });
});

// 項目4
test('項目4 かなの部分「けた」を「けだ」に変えた読みは kana で通らない', () => {
  const r = RD.checkReading('竹藪焼けた', 'たけやぶやけだ');
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'kana');
});

// 項目4
test('項目4 表示「あ」と無関係な読みを入れるズルは kana で通らない', () => {
  const r = RD.checkReading('あ', 'たけやぶやけた');
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'kana');
});

// 項目4
test('項目4 漢字のかたまりの読みが空だと empty で通らない', () => {
  const r = RD.checkReading('竹藪焼けた', 'けた');
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'empty');
});

// 項目4
test('項目4 「長き夜の…」に濁点ありの正しい読みを入れると通る', () => {
  const r = RD.checkReading('長き夜の遠の睡りの皆目醒め波乗り船の音の良きかな',
    'ながきよのとおのねぶりのみなめざめなみのりぶねのおとのよきかな');
  assert.equal(r.ok, true);
});

// 項目4
test('項目4 文と読みの空白は無視される', () => {
  assert.equal(RD.checkReading('竹藪 焼けた', 'たけやぶ やけた').ok, true);
});
