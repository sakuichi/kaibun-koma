/* 回文判定 judge とコマ性能 stats */
const KB = (() => {
  const SMALL = { 'ぁ': 'あ', 'ぃ': 'い', 'ぅ': 'う', 'ぇ': 'え', 'ぉ': 'お', 'っ': 'つ', 'ゃ': 'や', 'ゅ': 'ゆ', 'ょ': 'よ', 'ゎ': 'わ', 'ゕ': 'か', 'ゖ': 'け' };
  const RADIUS = 0.13; // コマの大きさは全員同じ（長い回文は文字が上面からはみ出す）
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // 読みをひらがな1文字ずつに分ける（カタカナはひらがなにそろえ、かなと長音以外は捨てる）
  function toKana(yomi) {
    const out = [];
    for (const ch of String(yomi || '').normalize('NFKC')) {
      let c = ch.codePointAt(0);
      if (c >= 0x30A1 && c <= 0x30F6) c -= 0x60;
      const h = String.fromCodePoint(c);
      if ((c >= 0x3041 && c <= 0x3096) || h === 'ー') out.push(h);
    }
    return out;
  }
  // 比べるためにゆるめる：濁点・半濁点を外し、小書き文字を大きくし、長音は捨てる
  function loosen(ch) {
    if (ch === 'ー') return '';
    const base = ch.normalize('NFD').replace(/[゙゚]/g, '');
    return SMALL[base] || base;
  }
  const isPal = a => a.join('') === [...a].reverse().join('');

  function judge(yomi, text) {
    const kana = toKana(yomi);
    const n = kana.filter(c => c !== 'ー').length;
    const zero = { len: 0, strict: 0, variety: 0, words: 0 };
    if (n < 3) return { kind: '短すぎ', kana, loose: [], n, uniq: 0, bad: -1, score: 0, parts: zero };
    const loose = kana.map(loosen).filter(Boolean);
    const uniq = new Set(loose).size;
    if (!isPal(loose)) {
      let bad = -1;
      for (let i = 0; i < loose.length / 2; i++) if (loose[i] !== loose[loose.length - 1 - i]) { bad = i; break; }
      return { kind: '不成立', kana, loose, n, uniq, bad, score: 0, parts: zero };
    }
    // 音の種類が1つだけ、または種類が少なすぎる回文は手抜き。「とまと」「きつつき」のような短い回文は手抜きにしない
    const lazy = uniq <= 1 || uniq / loose.length < 0.34;
    const kind = lazy ? '手抜き' : isPal(kana) ? '成立' : 'ゆるめ';
    // 点数の内訳（各0〜25）：長さ・厳密さ・音の多様さ・漢字の含有（文章らしさ）
    const kanji = [...String(text || '')].filter(c => /[㐀-鿿々]/.test(c)).length;
    const parts = {
      len: 25 * (1 - Math.exp(-n / 12)),
      strict: (isPal(kana) ? 25 : 15) * (lazy ? 0.5 : 1),
      variety: 25 * Math.min(1, uniq / 7) * Math.min(1, uniq / loose.length / 0.6),
      words: 25 * Math.min(1, kanji / 4)
    };
    const score = clamp(Math.round(parts.len + parts.strict + parts.variety + parts.words), 0, 100);
    return { kind, kana, loose, n, uniq, bad: -1, score, parts };
  }

  // 長いほど重い（伸びは頭打ち）、厳密なほど長く回る、音の種類が多いほど攻撃が強い（伸びは頭打ち）
  function stats(j) {
    const weight = clamp(0.8 + 0.5 * Math.log2(Math.max(j.n, 3) / 3), 0.8, 3);
    const endurance = { '成立': 1, 'ゆるめ': 0.75, '手抜き': 0.6, '不成立': 0.35, '短すぎ': 0.3 }[j.kind];
    let attack = 0.3 + 0.9 * (1 - Math.exp(-j.uniq / 6));
    if (j.kind === '手抜き') attack *= 0.6;
    return { weight, endurance, attack, radius: RADIUS };
  }

  return { judge, stats, RADIUS };
})();
if (typeof module !== 'undefined') module.exports = KB;
