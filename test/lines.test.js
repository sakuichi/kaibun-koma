// 上面の改行 layoutLines のテスト（src/lines.js）
// 実行: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const RD = require('../src/reading.js');
const LN = require('../src/lines.js');

RD.setDict(fs.readFileSync(path.join(__dirname, '../dict/dict.txt'), 'utf8'));

const layout = text => LN.layoutLines(RD.tokenize(text).toks);
const noSpace = s => s.replace(/\s/g, '');
const charCount = s => [...noSpace(s)].length;
const guide = s => Math.max(3, Math.ceil(Math.sqrt(charCount(s)) * 1.15));
const NG_HEAD = 'ぁぃぅぇぉっゃゅょゎァィゥェォッャュョヮヵヶー、。！？';

// 行の切れ目（つないだ文の中の位置）を返す。例: ['ab','cde'] → [2]
function breaks(lines) {
  const out = []; let pos = 0;
  for (let i = 0; i < lines.length - 1; i++) { pos += lines[i].length; out.push(pos); }
  return out;
}

function assertNoBadHead(lines, label) {
  for (const line of lines) {
    assert.ok(line.length > 0, `${label}: 空の行がある ${JSON.stringify(lines)}`);
    assert.ok(!NG_HEAD.includes(line[0]), `${label}: 行頭が「${line[0]}」で始まっている ${JSON.stringify(lines)}`);
  }
}

// ---- 項目9：上面の改行 ----

// 項目9
test('項目9 「新聞紙」は1行のまま', () => {
  assert.deepStrictEqual(layout('新聞紙'), ['新聞紙']);
});

// 項目9
test('項目9 「世の中ね顔かお金かなのよ」は元の文に戻り、「世の中」「お金」を途中で切らない', () => {
  const text = '世の中ね顔かお金かなのよ';
  const lines = layout(text);
  assert.equal(lines.join(''), text);
  const bs = breaks(lines);
  for (const word of ['世の中', 'お金']) {
    const start = text.indexOf(word);
    const end = start + word.length;
    for (const b of bs) {
      assert.ok(!(b > start && b < end), `「${word}」の途中（位置${b}）で切れている ${JSON.stringify(lines)}`);
    }
  }
});

// 項目9
const SAMPLES = [
  'ながきよのとおのねぶりのみなめざめなみのりぶねのおとのよきかな', // 31文字のかな
  '長き夜の遠の睡りの皆目醒め波乗り船の音の良きかな',
  '世の中ね顔かお金かなのよ',
  'わたしまけましたわ',
  '竹藪 焼けた',
];
for (const text of SAMPLES) {
  test(`項目9 「${text}」：つなぐと元の文（空白を除く）に戻り、行頭禁則を守り、行の長さは目安＋2以下`, () => {
    const lines = layout(text);
    assert.ok(Array.isArray(lines) && lines.length >= 1);
    assert.equal(lines.join(''), noSpace(text));
    assertNoBadHead(lines, text);
    const limit = guide(text) + 2;
    for (const line of lines) {
      assert.ok([...line].length <= limit, `「${line}」の長さ ${[...line].length} が目安＋2（${limit}）を超えている ${JSON.stringify(lines)}`);
    }
  });
}

// 項目9
test('項目9 小さい字が多い「ちょっとまったちょっと」でも行頭禁則が守られる', () => {
  const text = 'ちょっとまったちょっと';
  assertNoBadHead(layout(text), text);
});
