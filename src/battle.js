/* 対戦・ひとり回しの計算。画面から独立した純粋な計算（Nodeでテストする） */
const BT = (() => {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function mulberry32(a) {
    return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function hashStr(s) { let h = 2166136261; for (const c of s) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

  // ゲージの位置0〜1 → 投げの強さ。真ん中ほど強く、端へ行くほど急に弱くなる。ど真ん中は会心で1を超える
  const CRIT = 0.035, CRIT_POWER = 1.15;
  function gaugePower(x) {
    const d = Math.abs(x - 0.5);
    if (d <= CRIT) return CRIT_POWER;
    return 0.1 + 0.9 * Math.pow(clamp(1 - (d - CRIT) / 0.34, 0, 1), 1.6);
  }
  // 相手の投げの強さは、回文の読みから決まる固定値（小数2桁）
  const oppPower = yomi => Math.round((0.45 + 0.4 * ((hashStr('p:' + yomi) % 1000) / 1000)) * 100) / 100;

  const DT = 1 / 60, TMAX = 30, POST = 2.4, SOLO_MAX = 90;
  // 調整値。試作で多数回まわして合わせた。成立どうしで、開始2秒以内の決着が約15%、場外が約30%、1試合の中央値が約6秒
  const PULL0 = 0.5, K = 0.9, SWIRL = 0.2, FRICTION = 0.6, DECAY = 0.05, REST = 0.4, CLASH = 1.5, SPINLOSS = 0.12, JITTER = 1.0,
    LUCK = 0.7, W0 = 0.4, LAUNCH = 1.2, SPEEDW = 0.3, WOBK = 4, V_OUT = 1.6, REST_RIM = 0.55, CRIT_HIT = 2.5, CRIT_DRAIN = 0.18;
  const W_WOBBLE = 0.28, W_FALL = 0.04;

  // specs: [{ stats, power }]（1つならひとり回し）。frames[i][k] = [x, y, 回転, 角度, 傾き, 傾きの向き, 状態(0回転中/1場外/2停止), 高さ]
  function simulate(specs, seed) {
    const rnd = mulberry32(seed || 1);
    const solo = specs.length === 1;
    const T = specs.map((sp, i) => {
      const s = sp.stats, p = clamp(sp.power, 0, CRIT_POWER), pv = Math.min(p, 1);
      let x, y, vx, vy;
      if (solo) { x = -0.5; y = 0.2; vx = 0.7 * (0.6 + 0.4 * pv); vy = -0.45 * (0.6 + 0.4 * pv); }
      else {
        // 中心めがけて勢いよく投げ入れ、最初に正面から激しくぶつける
        const side = i === 0 ? -1 : 1, v = LAUNCH * (0.6 + 0.4 * pv);
        x = side * 0.7; y = side * 0.08;
        const dir = Math.atan2(-y, -x) + side * 0.1 + (rnd() - 0.5) * 0.2;
        vx = Math.cos(dir) * v; vy = Math.sin(dir) * v;
      }
      return { x, y, vx, vy, z: 0, vz: 0, w: W0 + (1 - W0) * p, crit: p >= CRIT_POWER, ang: rnd() * 6.283, phi: 0.25, psi: rnd() * 6.283, state: 0, shake: 0.25,
        m: s.weight, e: s.endurance, a: s.attack, r: s.radius };
    });
    const frames = [], hits = [], rims = [];
    let winner = null, kimarite = null, tDecide = null;
    for (let step = 0; ; step++) {
      const t = step * DT;
      T.forEach((o, k) => {
        if (o.state === 1) {
          o.x += o.vx * DT; o.y += o.vy * DT; o.vz -= 6 * DT; o.z += o.vz * DT;
        } else if (o.state === 2) {
          o.vx *= 0.85; o.vy *= 0.85; o.x += o.vx * DT; o.y += o.vy * DT; o.phi = Math.min(1.35, o.phi + DT * 3.5);
        } else {
          const d = Math.hypot(o.x, o.y) || 1e-6;
          const wob = o.w < W_WOBBLE ? (W_WOBBLE - o.w) / W_WOBBLE : 0;
          const jit = JITTER + 2.2 * wob;
          // 引力が距離に比例だけだと、どの半径でも1周の時間が同じになり2つのコマが出会わない。一定の引力を足す
          const pull = PULL0 + K * d;
          const ax = -o.x / d * pull - o.y / d * SWIRL * o.w + (rnd() - 0.5) * jit;
          const ay = -o.y / d * pull + o.x / d * SWIRL * o.w + (rnd() - 0.5) * jit;
          o.vx += ax * DT; o.vy += ay * DT;
          const fr = Math.exp(-FRICTION * DT); o.vx *= fr; o.vy *= fr;
          o.x += o.vx * DT; o.y += o.vy * DT;
          // 重いほど・厳密なほど回転が長持ちする。ひとり回しは長さと出来の差がはっきり出るようにする
          const lasting = solo ? Math.pow(o.m, 1.5) : 0.4 + 0.6 * o.m;
          o.w -= DT * (DECAY / (o.e * lasting)) * (1 + wob * 1.5);
          o.shake *= Math.exp(-3 * DT);
          o.phi = 0.03 + o.shake + 0.6 * Math.pow(wob, 1.3);
          o.psi += DT * Math.min(14, 0.8 / Math.max(o.w, 0.05));
          // 土俵の縁：外向きの勢いが強ければ場外、弱ければ跳ね返る。首を振っていると踏ん張れない
          const d2 = Math.hypot(o.x, o.y), edge = 1 - o.r * 0.6;
          if (d2 > edge) {
            const nx = o.x / d2, ny = o.y / d2, vr = o.vx * nx + o.vy * ny;
            if (vr > V_OUT * (1 - 0.5 * wob)) { o.state = 1; o.vz = 1.2; o.vx *= 1.2; o.vy *= 1.2; }
            else if (vr > 0) {
              o.vx -= (1 + REST_RIM) * vr * nx; o.vy -= (1 + REST_RIM) * vr * ny;
              o.x -= nx * (d2 - edge); o.y -= ny * (d2 - edge); o.shake += 0.15 * vr;
              if (vr > 0.25) rims.push({ f: frames.length, x: nx, y: ny, p: clamp(vr / V_OUT, 0, 1), k });
            }
          }
          if (o.state === 0 && o.w <= W_FALL) { o.state = 2; o.w = 0; }
        }
        o.ang += o.w * 14 * DT;
      });
      if (!solo) {
        const A = T[0], B = T[1];
        const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy), rr = A.r + B.r;
        if (A.state === 0 && B.state === 0 && d < rr && d > 1e-6) {
          const nx = dx / d, ny = dy / d, im = 1 / A.m, jm = 1 / B.m, ov = rr - d;
          A.x -= nx * ov * im / (im + jm); A.y -= ny * ov * im / (im + jm); B.x += nx * ov * jm / (im + jm); B.y += ny * ov * jm / (im + jm);
          const rel = (B.vx - A.vx) * nx + (B.vy - A.vy) * ny;
          if (rel < 0) {
            const J = -(1 + REST) * rel / (im + jm);
            A.vx -= J * im * nx; A.vy -= J * im * ny; B.vx += J * jm * nx; B.vy += J * jm * ny;
            // 回転どうしの弾き合い：相手の攻撃×回転が強いほど、自分が軽いほど飛ばされる。当たりの良し悪しは種つき乱数
            // 会心で投げたコマは、最初の激突だけ攻撃が大きくなる（会心の一撃）
            const first = hits.length === 0;
            const la = (1 - LUCK + 2 * LUCK * rnd()) * (first && A.crit ? CRIT_HIT : 1), lb = (1 - LUCK + 2 * LUCK * rnd()) * (first && B.crit ? CRIT_HIT : 1);
            const pa = A.a * A.w * la, pb = B.a * B.w * lb, sp = Math.min(1.5, -rel), kick = CLASH * (1 - SPEEDW + SPEEDW * Math.min(1, sp));
            // 首を振り始めたコマは踏ん張りがきかず、飛ばされやすい
            const ka = kick * (1 + WOBK * Math.max(0, (W_WOBBLE * 1.6 - A.w) / (W_WOBBLE * 1.6)));
            const kb = kick * (1 + WOBK * Math.max(0, (W_WOBBLE * 1.6 - B.w) / (W_WOBBLE * 1.6)));
            A.vx -= nx * ka * pb * im; A.vy -= ny * ka * pb * im; B.vx += nx * kb * pa * jm; B.vy += ny * kb * pa * jm;
            // 同じ向きに回るコマは接点で逆向きにこすれ、横へずれる
            const tx = -ny, ty = nx, g = 0.25 * (A.w + B.w);
            A.vx += tx * g * im; A.vy += ty * g * im; B.vx -= tx * g * jm; B.vy -= ty * g * jm;
            A.w -= SPINLOSS * pb * im * (0.6 + 0.4 * Math.min(1, sp)); B.w -= SPINLOSS * pa * jm * (0.6 + 0.4 * Math.min(1, sp));
            if (first && A.crit) B.w -= CRIT_DRAIN;
            if (first && B.crit) A.w -= CRIT_DRAIN;
            A.shake += 0.1 + 0.25 * pb * im; B.shake += 0.1 + 0.25 * pa * jm;
            hits.push({ f: frames.length, x: A.x + nx * A.r, y: A.y + ny * A.r, p: clamp(sp * (pa + pb) * 0.8, 0.15, 1) });
          }
        }
      }
      frames.push(T.map(o => [o.x, o.y, o.w, o.ang, o.phi, o.psi, o.state, o.z]));
      if (tDecide === null) {
        if (solo) {
          if (T[0].state !== 0 || t >= SOLO_MAX) tDecide = t;
        } else {
          const [A, B] = T;
          if (A.state || B.state) {
            if (A.state && B.state) { winner = -1; kimarite = '相打ち'; }
            else { winner = A.state ? 1 : 0; kimarite = T[1 - winner].state === 1 ? '場外' : '先に止まる'; }
            tDecide = t;
          } else if (t >= TMAX) { winner = A.w >= B.w ? 0 : 1; kimarite = '時間切れ'; tDecide = t; }
        }
      }
      if (tDecide !== null && t >= tDecide + POST) break;
    }
    return { frames, hits, rims, winner, kimarite, decideFrame: Math.round(tDecide / DT) };
  }

  return { simulate, gaugePower, oppPower, hashStr, DT, TMAX, SOLO_MAX, CRIT_POWER };
})();
if (typeof module !== 'undefined') module.exports = BT;
