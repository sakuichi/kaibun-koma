// 対戦計算 simulate / gaugePower / oppPower のテスト（src/battle.js）
// 実行: npm test
const test = require('node:test');
const assert = require('node:assert/strict');
const KB = require('../src/kaibun.js');
const BT = require('../src/battle.js');

const spec = (yomi, power) => ({ stats: KB.stats(KB.judge(yomi)), power });
const vs = (me, myPower, opp, oppPower, seed) => BT.simulate([spec(me, myPower), spec(opp, oppPower)], seed);
const near = (a, b) => Math.abs(a - b) < 1e-9; // 小数の計算誤差だけを許す

// ---- 項目6：同じ条件なら同じ結果・必ず終わる ----

// 項目6
test('項目6 同じ specs と seed なら simulate の結果は完全に同じ', () => {
  const specs = [spec('たけやぶやけた', 0.6), spec('しんぶんし', BT.oppPower('しんぶんし'))];
  const a = BT.simulate(specs, 7);
  const b = BT.simulate(specs, 7);
  assert.deepStrictEqual(b, a);
});

// 項目6
test('項目6 全組み合わせ×強さ×種で、対戦は制限時間内に決着し、勝者と決まり手は決まった値', () => {
  const YOMIS = ['たけやぶやけた', 'しんぶんし', 'わたしまけましたわ', 'あああああ', 'たけやぶやかた'];
  const KIMARITE = ['場外', '先に止まる', '時間切れ', '相打ち'];
  for (const me of YOMIS) {
    for (const opp of YOMIS) {
      for (const power of [0.1, 0.6, 1.15]) {
        for (const seed of [1, 2, 3]) {
          const label = `${me} (${power}) 対 ${opp} seed ${seed}`;
          const r = vs(me, power, opp, BT.oppPower(opp), seed);
          assert.ok(r.decideFrame * BT.DT <= BT.TMAX + 1e-9, `${label}: decideFrame ${r.decideFrame} が制限時間を超えた`);
          assert.ok([0, 1, -1].includes(r.winner), `${label}: winner ${r.winner}`);
          assert.ok(KIMARITE.includes(r.kimarite), `${label}: kimarite ${r.kimarite}`);
          assert.ok(r.frames.length > r.decideFrame, `${label}: frames.length ${r.frames.length} <= decideFrame ${r.decideFrame}`);
        }
      }
    }
  }
});

// 項目6
test('項目6 ひとり回しは勝者・決まり手が null で、上限時間内に止まる', () => {
  for (const yomi of ['たけやぶやけた', 'しんぶんし', 'あああああ', 'たけやぶやかた']) {
    for (const power of [0.1, 0.7, 1.15]) {
      const r = BT.simulate([spec(yomi, power)], 1);
      assert.equal(r.winner, null, `${yomi} (${power})`);
      assert.equal(r.kimarite, null, `${yomi} (${power})`);
      assert.ok(r.decideFrame * BT.DT <= BT.SOLO_MAX + 1e-9, `${yomi} (${power}): decideFrame ${r.decideFrame} が上限を超えた`);
    }
  }
});

// 項目6
test('項目6 ひとり回し：同じ回文なら強く投げた方（1.15）が弱く投げた方（0.1）より長く回る', () => {
  const strong = BT.simulate([spec('たけやぶやけた', 1.15)], 1).decideFrame;
  const weak = BT.simulate([spec('たけやぶやけた', 0.1)], 1).decideFrame;
  assert.ok(strong > weak, `1.15: ${strong} > 0.1: ${weak} のはず`);
});

// 項目6
test('項目6 ひとり回し：同じ強さ0.7なら、長い回文 > 短い回文 > 不成立 の順に長く回る', () => {
  const long = BT.simulate([spec('よのなかねかおかおかねかなのよ', 0.7)], 1).decideFrame;
  const short = BT.simulate([spec('しんぶんし', 0.7)], 1).decideFrame;
  const bad = BT.simulate([spec('たけやぶやかた', 0.7)], 1).decideFrame;
  assert.ok(long > short, `よのなか… ${long} > しんぶんし ${short} のはず`);
  assert.ok(short > bad, `しんぶんし ${short} > たけやぶやかた ${bad} のはず`);
});

// ---- 項目7：腕次第で逆転 ----

// 項目7
test('項目7 ゲージの真ん中（0.5）と真ん中から0.03（0.53）は会心の強さ', () => {
  assert.equal(BT.gaugePower(0.5), BT.CRIT_POWER);
  assert.equal(BT.gaugePower(0.53), BT.CRIT_POWER);
});

// 項目7
test('項目7 ゲージの両端は同じ値で最小（0.1）', () => {
  assert.equal(BT.gaugePower(0), BT.gaugePower(1));
  assert.ok(near(BT.gaugePower(0), 0.1), `gaugePower(0) ${BT.gaugePower(0)} は0.1のはず`);
  for (let i = 0; i <= 100; i++) {
    const x = i / 100;
    assert.ok(BT.gaugePower(x) >= BT.gaugePower(0), `gaugePower(${x}) ${BT.gaugePower(x)} が端より小さい`);
  }
});

// 項目7
test('項目7 ゲージは左右対称', () => {
  assert.ok(near(BT.gaugePower(0.2), BT.gaugePower(0.8)), `0.2: ${BT.gaugePower(0.2)} と 0.8: ${BT.gaugePower(0.8)}`);
  assert.ok(near(BT.gaugePower(0.4), BT.gaugePower(0.6)), `0.4: ${BT.gaugePower(0.4)} と 0.6: ${BT.gaugePower(0.6)}`);
});

// 項目7
test('項目7 ゲージは真ん中に近づくほど強い（0 < 0.2 < 0.4 < 0.46）', () => {
  const p = [0, 0.2, 0.4, 0.46].map(BT.gaugePower);
  assert.ok(p[0] < p[1] && p[1] < p[2] && p[2] < p[3], `0, 0.2, 0.4, 0.46 → ${p.join(', ')}`);
});

// 項目7
test('項目7 相手の投げの強さ oppPower は同じ読みなら同じ値で、0.45〜0.85', () => {
  for (const y of ['たけやぶやけた', 'しんぶんし', 'わたしまけましたわ', 'あああああ', 'たけやぶやかた', 'よのなかねかおかおかねかなのよ']) {
    const p = BT.oppPower(y);
    assert.equal(BT.oppPower(y), p, y);
    assert.ok(p >= 0.45 && p <= 0.85, `${y}: oppPower ${p} は0.45〜0.85のはず`);
  }
});

function winsOfTenuki(myPower, oppPower) {
  let wins = 0;
  for (let seed = 1; seed <= 40; seed++) {
    if (vs('あああああ', myPower, 'たけやぶやけた', oppPower, seed).winner === 0) wins++;
  }
  return wins;
}

// 項目7
test('項目7 手抜きの「あああああ」でも会心で投げれば「たけやぶやけた」に40戦中4勝以上し、0.3で投げたときより勝つ', () => {
  const opp = BT.oppPower('たけやぶやけた');
  const crit = winsOfTenuki(BT.CRIT_POWER, opp);
  const weak = winsOfTenuki(0.3, opp);
  assert.ok(crit >= 4, `会心での勝ち ${crit} は4以上のはず`);
  assert.ok(crit > weak, `会心での勝ち ${crit} > 0.3での勝ち ${weak} のはず`);
});

// 項目7
test('項目7 同じ強さ0.7どうしなら「あああああ」は「たけやぶやけた」に40戦中8勝以下', () => {
  const wins = winsOfTenuki(0.7, 0.7);
  assert.ok(wins <= 8, `あああああ の勝ち ${wins} は8以下のはず`);
});
