/* 挑戦リンクの組み立てと読み取り。入れるのは回文の文字と直した読みだけ（強さは開いた側で計算し直す） */
const LK = (() => {
  const MAX_LEN = 60;
  function encodeChallenge(text, yomi) {
    return '?k=' + encodeURIComponent(text) + (yomi ? '&y=' + encodeURIComponent(yomi) : '');
  }
  // k と y 以外の値（点数など）は無視する。読みの正しさは受け取った側が RD.checkReading で確かめる
  function decodeChallenge(search) {
    let q;
    try { q = new URLSearchParams(search || ''); } catch (e) { return null; }
    const text = (q.get('k') || '').trim();
    if (!text || [...text].length > MAX_LEN) return null;
    const y = (q.get('y') || '').trim();
    return { text, yomi: y || null };
  }
  return { encodeChallenge, decodeChallenge, MAX_LEN };
})();
if (typeof module !== 'undefined') module.exports = LK;
