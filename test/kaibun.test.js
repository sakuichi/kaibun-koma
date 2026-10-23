// 回文判定 judge とコマ性能 stats のテスト（src/kaibun.js）
// 実行: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const KB = require('../src/kaibun.js');

const LONG_TEXT = '長き夜の遠の睡りの皆目醒め波乗り船の音の良きかな';
const LONG_YURUME = 'ながきよのとおのねぶりのみなめざめなみのりぶねのおとのよきかな';
const LONG_SEIRITSU = 'なかきよのとおのねふりのみなめさめなみのりふねのおとのよきかな';

// ---- 項目1：回文判定 ----

// 項目1
test('項目1 「たけやぶやけた」（竹藪焼けた）は成立', () => {
  assert.equal(KB.judge('たけやぶやけた', '竹藪焼けた').kind, '成立');
});

// 項目1
test('項目1 「たけやぶやけだ」は濁点の違いだけなのでゆるめ', () => {
  assert.equal(KB.judge('たけやぶやけだ').kind, 'ゆるめ');
});

// 項目1
test('項目1 「長き夜の…」は濁点ありの読みでゆるめ、濁点を外した読みで成立し、ゆるめの方が点が低い', () => {
  const yurume = KB.judge(LONG_YURUME, LONG_TEXT);
  const seiritsu = KB.judge(LONG_SEIRITSU, LONG_TEXT);
  assert.equal(yurume.kind, 'ゆるめ');
  assert.equal(seiritsu.kind, '成立');
  assert.ok(yurume.score < seiritsu.score, `ゆるめ ${yurume.score} < 成立 ${seiritsu.score} のはず`);
});

// 項目1
test('項目1 「たけやぶやかた」は不成立で、崩れた位置は1、点数は0', () => {
  const j = KB.judge('たけやぶやかた');
  assert.equal(j.kind, '不成立');
  assert.equal(j.bad, 1);
  assert.equal(j.score, 0);
});

// 項目1
test('項目1 成立の点数は0〜100の整数で、内訳 len+strict+variety+words の合計と一致する（誤差1以内）', () => {
  for (const [yomi, text] of [['たけやぶやけた', '竹藪焼けた'], [LONG_SEIRITSU, LONG_TEXT]]) {
    const j = KB.judge(yomi, text);
    assert.equal(j.kind, '成立', yomi);
    assert.ok(Number.isInteger(j.score), `${yomi} の score ${j.score} は整数のはず`);
    assert.ok(j.score >= 0 && j.score <= 100, `${yomi} の score ${j.score} は0〜100のはず`);
    const sum = j.parts.len + j.parts.strict + j.parts.variety + j.parts.words;
    assert.ok(Math.abs(j.score - sum) <= 1, `${yomi}: score ${j.score} と内訳の合計 ${sum} の差は1以内のはず`);
  }
});

// ---- 項目2：手抜き対策 ----

// 項目2
test('項目2 「あああああ」は手抜きで30点以下、攻撃は「たけやぶやけた」より弱い', () => {
  const tenuki = KB.judge('あああああ');
  assert.equal(tenuki.kind, '手抜き');
  assert.ok(tenuki.score <= 30, `score ${tenuki.score} は30以下のはず`);
  const a = KB.stats(tenuki).attack;
  const b = KB.stats(KB.judge('たけやぶやけた')).attack;
  assert.ok(a < b, `手抜きの攻撃 ${a} < たけやぶやけた の攻撃 ${b} のはず`);
});

// 項目2
test('項目2 「あいあいあいあ」は手抜き', () => {
  assert.equal(KB.judge('あいあいあいあ').kind, '手抜き');
});

// 項目2
test('項目2 短い回文「とまと」「きつつき」は手抜きにせず成立', () => {
  assert.equal(KB.judge('とまと').kind, '成立');
  assert.equal(KB.judge('きつつき').kind, '成立');
});

// ---- 項目3：短すぎ ----

// 項目3
test('項目3 空文字・記号だけ・2音・長音を除くと2音の読みは短すぎで0点', () => {
  for (const yomi of ['', '！？', 'ああ', 'るーる']) {
    const j = KB.judge(yomi);
    assert.equal(j.kind, '短すぎ', `「${yomi}」は短すぎのはず`);
    assert.equal(j.score, 0, `「${yomi}」は0点のはず`);
  }
});

// ---- 項目5：コマ性能 ----

// 項目5
test('項目5 同じ judge 結果から作った stats は何度呼んでも同じ', () => {
  const j = KB.judge('たけやぶやけた', '竹藪焼けた');
  const s1 = KB.stats(j);
  const s2 = KB.stats(j);
  const s3 = KB.stats(KB.judge('たけやぶやけた', '竹藪焼けた'));
  assert.deepEqual(s2, s1);
  assert.deepEqual(s3, s1);
});

// 項目5
test('項目5 長い「わたしまけましたわ」は「しんぶんし」より重い', () => {
  const long = KB.stats(KB.judge('わたしまけましたわ')).weight;
  const short = KB.stats(KB.judge('しんぶんし')).weight;
  assert.ok(long > short, `わたしまけましたわ ${long} > しんぶんし ${short} のはず`);
});

// 項目5
test('項目5 成立の持久力はゆるめより大きい', () => {
  const s = KB.stats(KB.judge('たけやぶやけた')).endurance;
  const y = KB.stats(KB.judge('たけやぶやけだ')).endurance;
  assert.ok(s > y, `成立 ${s} > ゆるめ ${y} のはず`);
});

const VARIOUS = ['たけやぶやけた', 'たけやぶやけだ', 'しんぶんし', 'わたしまけましたわ', 'あああああ',
  'たけやぶやかた', 'ああ', 'とまと', LONG_YURUME, LONG_SEIRITSU, 'よのなかねかおかおかねかなのよ'];

// 項目5
test('項目5 大きさ radius はどの回文でも同じ', () => {
  const r0 = KB.stats(KB.judge(VARIOUS[0])).radius;
  for (const y of VARIOUS) {
    assert.equal(KB.stats(KB.judge(y)).radius, r0, `「${y}」の radius`);
  }
});

// 項目5
test('項目5 重さ weight は 0.8〜3 の範囲', () => {
  for (const y of VARIOUS) {
    const w = KB.stats(KB.judge(y)).weight;
    assert.ok(w >= 0.8 && w <= 3, `「${y}」の weight ${w} は0.8〜3のはず`);
  }
});
