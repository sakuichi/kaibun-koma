/* コマの上面に書く文の改行位置 */
const LN = (() => {
  // 行頭に来てはいけない文字（小さい字・長音・句読点）
  const NO_HEAD = 'ぁぃぅぇぉっゃゅょゎゕゖァィゥェォッャュョヮヵヶー、。！？!?,.';

  // toks は RD.tokenize(text).toks。語の途中では切らず、語が目安より長いときだけ文字で切る
  function layoutLines(toks) {
    const words = toks.map(t => [...t.surface].filter(c => !/\s/.test(c))).filter(w => w.length);
    const n = words.reduce((a, w) => a + w.length, 0);
    if (!n) return [];
    const target = Math.max(3, Math.ceil(Math.sqrt(n) * 1.15)); // 文字のかたまりが丸っぽくなる1行の文字数
    const lines = [[]];
    for (const w of words) {
      const cur = lines[lines.length - 1];
      if (w.length > target) {
        for (const c of w) {
          const last = lines[lines.length - 1];
          if (last.length >= target) lines.push([c]); else last.push(c);
        }
      } else if (cur.length && cur.length + w.length > target) lines.push([...w]);
      else cur.push(...w);
    }
    // 行頭禁則：前の行の末尾へ送る
    for (let i = 1; i < lines.length; i++) while (lines[i].length && NO_HEAD.includes(lines[i][0])) lines[i - 1].push(lines[i].shift());
    return lines.filter(l => l.length).map(l => l.join(''));
  }

  return { layoutLines };
})();
if (typeof module !== 'undefined') module.exports = LN;
