/* 漢字の読み取り。tokenize まわりは布団飛ばしの src/engine.js から流用 */
const RD = (() => {
  let DICT = null;
  const MAXW = 8;
  const isKanji = c => /[一-鿿々ヶ]/.test(c);
  const isKana = c => /[ぁ-ゖァ-ヺー]/.test(c);
  const toKata = s => s.replace(/[ぁ-ゖ]/g, c => String.fromCharCode(c.charCodeAt(0) + 0x60));
  const toHira = s => s.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
  const DIGIT = { '0': 'ゼロ', '1': 'イチ', '2': 'ニ', '3': 'サン', '4': 'ヨン', '5': 'ゴ', '6': 'ロク', '7': 'ナナ', '8': 'ハチ', '9': 'キュウ' };

  const FIX = { '行っ': 'イッ', '辛': 'カラ', '辛い': 'カライ', '辛く': 'カラク', '辛かっ': 'カラカッ', '何': 'ナニ', '私': 'ワタシ', '日本': 'ニホン', '上手': 'ジョウズ', '下手': 'ヘタ', '今日': 'キョウ', '明日': 'アシタ', '昨日': 'キノウ', '一人': 'ヒトリ', '二人': 'フタリ', '大人': 'オトナ' };
  const FIXN = ['私', '日本', '今日', '明日', '昨日', '一人', '二人', '大人'];
  const COUNTER = { '時': 'ジ', '分': 'フン', '円': 'エン', '人': 'ニン', '年': 'ネン', '月': 'ガツ', '日': 'ニチ', '個': 'コ', '回': 'カイ', '本': 'ホン', '枚': 'マイ', '匹': 'ヒキ', '歳': 'サイ', '才': 'サイ', '点': 'テン', '位': 'イ', '階': 'カイ', '倍': 'バイ', '秒': 'ビョウ' };
  function readNumber(d) {
    if (d.length > 4) return [...d].map(c => DIGIT[c]).join('');
    const n = d.padStart(4, '0'); let r = '';
    const U = ['セン', 'ヒャク', 'ジュウ', ''];
    const IRR = { '30': 'サンゼン', '80': 'ハッセン', '31': 'サンビャク', '61': 'ロッピャク', '81': 'ハッピャク' };
    for (let i = 0; i < 4; i++) {
      const c = n[i]; if (c === '0') continue;
      if (IRR[c + i]) r += IRR[c + i];
      else r += (c === '1' && i < 3 ? '' : DIGIT[c]) + U[i];
    }
    return r || 'ゼロ';
  }
  function setDict(text) {
    DICT = new Map();
    for (const line of text.split('\n')) {
      const i = line.indexOf('\t');
      if (i > 0) DICT.set(line.slice(0, i), line.slice(i + 1));
    }
    for (const k in FIX) DICT.set(k, (FIXN.includes(k) ? '.' : '') + FIX[k]);
  }

  // 人名の直後がひらがなのとき、「前半の語＋送りがなつきの語」に分けられるならそちらを優先する
  // 例: 明日香る → 明日＋香る、夏美しい → 夏＋美しい
  function splitsBetter(s, i, n) {
    if (!/[ぁ-ゖ]/.test(s[i + n] || '')) return false;
    for (let k = 1; k < n; k++) {
      const head = DICT.get(s.substr(i, k)); if (!head || head[0] === '!') continue;
      for (let m = 1; m <= MAXW - (n - k) && i + n + m <= s.length; m++) {
        if (!/[ぁ-ゖ]/.test(s[i + n + m - 1])) break;
        const tail = DICT.get(s.substr(i + k, n - k + m)); if (tail && tail[0] !== '!') return true;
      }
    }
    return false;
  }
  // 文を「かなの連なり」と「漢字を含む語」に分ける
  function tokenize(text) {
    const s = text.normalize('NFKC');
    const toks = []; const unknown = [];
    let i = 0;
    while (i < s.length) {
      let hit = null;
      if (DICT) {
        for (let n = Math.min(MAXW, s.length - i); n >= 1; n--) {
          const w = s.substr(i, n);
          if (!/[一-鿿々ヶ]/.test(w)) continue;
          const r = DICT.get(w);
          if (r) {
            const name = r[0] === '!', noun = name || r[0] === '.';
            if (name && splitsBetter(s, i, n)) continue; // 「明日香る」を人名の「明日香」と読まない
            hit = { surface: w, reading: noun ? r.slice(1) : r, kind: 'word', noun, name }; break;
          }
        }
      }
      if (hit) { toks.push(hit); i += hit.surface.length; continue; }
      const c = s[i];
      if (isKana(c)) {
        const last = toks[toks.length - 1];
        if (last && last.kind === 'kana') { last.surface += c; last.reading += toKata(c); }
        else toks.push({ surface: c, reading: toKata(c), kind: 'kana' });
      } else if (DIGIT[c]) {
        let d = c; while (DIGIT[s[i + d.length]]) d += s[i + d.length];
        toks.push({ surface: d, reading: readNumber(d), kind: 'word' });
        i += d.length;
        if (COUNTER[s[i]]) { toks.push({ surface: s[i], reading: COUNTER[s[i]], kind: 'word' }); i++; }
        continue;
      } else if (isKanji(c)) {
        unknown.push(c); toks.push({ surface: c, reading: '', kind: 'gap' });
      } else {
        toks.push({ surface: c, reading: '', kind: 'gap' });
      }
      i++;
    }
    return { toks, unknown };
  }

  // 辞書で推定した読み（ひらがな）。記号と読めない文字は含まない。
  // 英字・まれな漢字（CJK拡張A）は tokenize が黙って飛ばすので、読めない文字として unknown に足す（checkReading はこれらに読みを求める）
  function autoReading(text) {
    const { toks, unknown } = tokenize(text);
    for (const t of toks) if (t.kind === 'gap' && /^[A-Za-z㐀-䶿〆]$/.test(t.surface)) unknown.push(t.surface);
    return { yomi: toHira(toks.map(t => t.reading).join('')), unknown };
  }

  // 直した読みを使ってよいか確かめる。かなの部分はそのまま、漢字・数字・英字のかたまりは1文字以上の読みに
  // 置き換わっていること（表示と無関係な読みを入れて強いコマを作るズルの防止）。記号と空白は無視する
  const kanaOnly = s => toHira(s.normalize('NFKC')).replace(/[^ぁ-ゖー]/g, '');
  const isKanaRun = r => /^[ぁ-ゖァ-ヺー]/.test(r) && !/^ヶ/.test(r);
  function checkReading(text, yomi) {
    const y = kanaOnly(yomi || ''), n = y.length;
    const runs = text.normalize('NFKC').match(/[㐀-鿿々ヶ〆0-9A-Za-z]+|[ぁ-ゖァ-ヺー]+/g) || [];
    const parts = runs.map(r => isKanaRun(r) ? toHira(r) : null); // null は読みを当てるかたまり
    // かたまりを前から順に当てはめ、読みの何文字目まで進めるかを表で埋める
    // （正規表現の後戻りに頼ると、一致しないときに時間が指数的に増えてページが固まる）
    const fits = minLen => {
      let reach = new Uint8Array(n + 1); reach[0] = 1;
      for (const p of parts) {
        const next = new Uint8Array(n + 1);
        for (let i = 0; i <= n; i++) {
          if (!reach[i]) continue;
          if (p !== null) { if (y.startsWith(p, i)) next[i + p.length] = 1; }
          else for (let e = i + minLen; e <= n; e++) next[e] = 1;
        }
        reach = next;
      }
      return reach[n] === 1;
    };
    if (fits(1)) return { ok: true, yomi: y, reason: null };
    return { ok: false, yomi: y, reason: fits(0) ? 'empty' : 'kana' };
  }

  return { setDict, tokenize, autoReading, checkReading, toHira };
})();
if (typeof module !== 'undefined') module.exports = RD;
