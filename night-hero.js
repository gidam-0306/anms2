/* 버전 B — 첫 화면 전체가 '달밤의 누각'
 * 그림을 화면 크기에 맞춰 배치하고, 잘리는 부분을 채웁니다.
 *  - 다리: 그림 속 다리 한 구간을 좌우로 이어 붙여 화면 끝까지 연장
 *  - 하늘: 그림 바깥까지 이어지는 밤하늘과 별
 *  - 물: 화면 전체 너비로 흐르는 물결과 달빛
 */
(() => {
  const hero = document.querySelector('[data-nhero]');
  if (!hero) return;
  const cv = hero.querySelector('canvas');
  const ctx = cv.getContext('2d');
  const nav = document.querySelector('[data-nav]');
  // 첫 화면 높이를 픽셀로 고정 (가로 폭이 바뀔 때만 다시 잼)
  let lockedW = 0;
  const lockHeight = () => { lockedW = window.innerWidth; hero.style.height = `${Math.max(560, window.innerHeight)}px`; };
  lockHeight();
  const dim = hero.querySelector('.nhero__dim');
  const sceneEl = hero.querySelector('[data-scene]') || cv;
  const walker = hero.querySelector('[data-walker]');
  const railEl = hero.querySelector('.nhero__rail');
  const nameEl = hero.querySelector('.nhero__name');
  // '안명숙' 글자의 위치와 크기 (첫 화면 대비 비율) — 달이 내려앉는 목적지
  const name = { x: 0.68, y: 0.57, hw: 0.025, hh: 0.02 };
  const measureName = () => {
    if (!nameEl || window.scrollY > 4) return;
    const r = nameEl.getBoundingClientRect(), h = hero.getBoundingClientRect();
    if (!h.height || !r.width) return;
    name.x = (r.left + r.width / 2 - h.left) / h.width; name.y = (r.top + r.height / 2 - h.top) / h.height;
    name.hw = r.width / 2 / h.width; name.hh = r.height / 2 / h.height;
  };
  // 달이 닿는 순간: 환하게 빛나고 → 1초 머문 뒤 → 별처럼 두 번 깜박임 (night-hero.css의 .is-shining)
  let shineTimer;
  const shine = () => {
    if (!nameEl) return;
    nameEl.classList.remove('is-shining'); void nameEl.offsetWidth; nameEl.classList.add('is-shining');
    if (wk.state === 'stand') wave(); // 달이 이름을 지날 때 캐릭터도 손을 흔듦
    clearTimeout(shineTimer); shineTimer = setTimeout(() => nameEl.classList.remove('is-shining'), 3200);
  };
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stackMQ = window.matchMedia('(max-width: 820px), (max-aspect-ratio: 21/20)'); // must match night-hero.css

  const TO_NAME = reduceMotion ? 120 : 20; // 해·달이 떠올라 '안명숙'에 닿기까지 걸리는 시간(초) — 고정값
  const REST = 8;                          // 달이 진 뒤 다시 떠오르기까지 쉬는 시간(초)
  const FIRST_TOUCH = 15;                  // 페이지를 연 뒤 첫 만남까지(초): 달이 이미 하늘 높이 떠 있는 상태로 시작
  const TWINKLE = reduceMotion ? 0.3 : 0.6; // 별 반짝임 세기 — 고정값
  const FLOW = 1.95;          // 물살 흐름 빠르기 배율 — 고정값
  let wt = 0;              // 물살 시간 (FLOW에 따라 흐름)
  // 그림 속 좌표 (원본 1000×870 기준)
  const PAVILION_X = 330;                       // 누각 가운데
  // 다리 이음매: 난간 칸 사이의 빈 틈(732, 942)에서 잘라 그대로 이어 붙이면 선이 자연스럽게 이어짐
  const SEG = { x0: 732, x1: 942, y0: 455, y1: 700 };  // 오른쪽으로 반복할 다리 구간
  const SEGL = { x0: 30, x1: 156, y0: 500, y1: 725 };   // 왼쪽으로 반복할 다리 구간 (누각 처마 아래)
  const CROP = { x0: 20, x1: 942, band: 500 };          // 원래 그림: 처마 위는 x0부터, 다리 부분은 SEGL.x1부터

  const ease = (t) => (t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t));
  const img = new Image();
  let src; // 선은 또렷하게, 회색 얼룩·번짐은 지운 그림
  let IW, IH, W, H, dpr, L, scene;
  let FIELD = [], ST = [], moonSpr, WB, WP, COLS;
  let ready = false, running = false, visible = true, last = 0, built = '';
  let tc = null;          // 이번 바퀴에서 흐른 시간(초) — 첫 화면을 그린 뒤 정함
  // 밤과 낮의 순환: 'night'(달이 지나감) → 'day'(해가 떠서 지나감) → 다시 'night'
  let cyc = 'night', sunT = 1e9, DAY = 0; // DAY: 0 = 밤, 1 = 한낮 (sunT가 크면 해는 이미 진 상태)
  const SUNRISE = 5;                     // 해가 떠오를 때 노을빛으로 밝아지는 시간(초)
  const SUNSET = 5;                      // 해가 질 때 어두워지는 시간(초)
  let LINES, INK, RAIL_LINES, RAIL_INK, RAIL_GAP, railBox, lastRailDay = -1;
  let touched = false;    // 이번 바퀴에서 달이 이름에 닿았는지
  let sunTouched = true;  // 이번 낮에 해가 이름에 닿았는지 (처음엔 해가 없으므로 true)
  // Day / Night 버튼으로 바꿀 때: 떠 있던 해·달은 0.8초 동안 사라지고, 그다음 새 해·달이 떠오름
  const VANISH = 0.8;
  let fadeMoon = 1, fadeSun = 1, killMoon = false, killSun = false, duskFrom = 0, duskT = 1e9;

  /* ---------- sprites ---------- */
  const dotSprite = (rgb) => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, `rgba(${rgb},1)`); g.addColorStop(0.18, `rgba(${rgb},0.75)`);
    g.addColorStop(0.5, `rgba(${rgb},0.18)`); g.addColorStop(1, `rgba(${rgb},0)`);
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    return c;
  };
  const softSprite = (col) => {
    const c = document.createElement('canvas'); c.width = 128; c.height = 32;
    const x = c.getContext('2d');
    x.translate(64, 16); x.scale(4, 1);
    const g = x.createRadialGradient(0, 0, 0, 0, 0, 16);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.beginPath(); x.arc(0, 0, 16, 0, 6.283); x.fill();
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-in';
    x.fillStyle = col; x.fillRect(0, 0, 128, 32);
    return c;
  };
  const crescent = (rad) => {
    const s = Math.max(4, Math.round(rad * 2)), R = rad / 1.25, o = s / 2;
    const c = document.createElement('canvas'); c.width = c.height = s;
    const x = c.getContext('2d');
    x.translate(o, o); x.rotate(-0.45); x.translate(-o, -o);
    x.fillStyle = '#fffdf4'; x.beginPath(); x.arc(o, o, R, 0, 6.283); x.fill();
    x.globalCompositeOperation = 'destination-out';
    x.beginPath(); x.arc(o - R * 0.45, o - R * 0.05, R * 0.95, 0, 6.283); x.fill();
    const d = document.createElement('canvas'); d.width = d.height = s;
    const y = d.getContext('2d');
    try { y.filter = 'blur(0.8px)'; } catch (e) { /* older browsers */ }
    y.drawImage(c, 0, 0);
    return d;
  };

  /* ---------- layout: place the drawing, extend bridge & sky, scatter stars ---------- */
  const build = () => {
    const cw = hero.clientWidth, ch = hero.clientHeight;
    if (!cw || !ch) return;
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    if (cw * ch * dpr * dpr > 4.2e6) dpr = Math.sqrt(4.2e6 / (cw * ch));
    W = Math.round(cw * dpr); H = Math.round(ch * dpr);
    const key = `${W}x${H}`;
    if (key === built) return;
    built = key;
    cv.width = W; cv.height = H;

    const stack = stackMQ.matches;
    const k = (H * (stack ? 0.46 : 0.64)) / IH;           // 그림 높이 = 화면의 46% / 64%
    const ix = W * (stack ? 0.46 : 0.27) - PAVILION_X * k; // 누각 위치 (데스크톱은 왼쪽, 글은 오른쪽 하늘)
    const iy = H - IH * k;                                 // 물이 화면 아래에 닿도록
    const S = Math.sqrt(W * H) / 1000;                     // 별·달 크기 기준
    L = { k, ix, iy, S, stack, water: iy + IH * k * 0.82 };

    scene = document.createElement('canvas'); scene.width = W; scene.height = H;
    const sx = scene.getContext('2d', { willReadFrequently: true });
    sx.fillStyle = '#000'; sx.fillRect(0, 0, W, H);
    sx.globalCompositeOperation = 'lighten';
    // 구간을 그대로 / 좌우로 뒤집어 번갈아 붙이면 이음매에서 선 높이가 정확히 맞음
    const tileAt = (g, x, flip) => {
      const sw = g.x1 - g.x0, sh = g.y1 - g.y0, tw = sw * k, th = sh * k, y = iy + g.y0 * k;
      if (!flip) { sx.drawImage(src, g.x0, g.y0, sw, sh, x, y, tw, th); return; }
      sx.save(); sx.translate(x + tw, y); sx.scale(-1, 1); sx.drawImage(src, g.x0, g.y0, sw, sh, 0, 0, tw, th); sx.restore();
    };
    // 오른쪽: 첫 조각은 뒤집어서 원본 942열과 맞물림
    const tr = (SEG.x1 - SEG.x0) * k;
    for (let x = ix + CROP.x1 * k, i = 0; x < W; x += tr, i++) tileAt(SEG, x, i % 2 === 0);
    // 왼쪽: 첫 조각은 원본 그대로라 156열에서 끊김 없이 이어짐
    const tl = (SEGL.x1 - SEGL.x0) * k;
    for (let x = ix + SEGL.x1 * k - tl, i = 0; x + tl > 0; x -= tl, i++) tileAt(SEGL, x, i % 2 === 1);
    // 원래 그림: 처마 위쪽 전체 + 다리 부분은 156열부터
    sx.drawImage(src, CROP.x0, 0, CROP.x1 - CROP.x0, CROP.band, ix + CROP.x0 * k, iy, (CROP.x1 - CROP.x0) * k, CROP.band * k);
    sx.drawImage(src, SEGL.x1, CROP.band, CROP.x1 - SEGL.x1, IH - CROP.band, ix + SEGL.x1 * k, iy + CROP.band * k, (CROP.x1 - SEGL.x1) * k, (IH - CROP.band) * k);
    sx.globalCompositeOperation = 'source-over';
    // 선 그림만 따로: 밤에는 흰 선(LINES), 낮에는 먹선(INK) — 하늘은 매 프레임 따로 칠함
    const lineCanvas = (rgb, gain, y0 = 0, y1 = H) => {
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const id = sx.getImageData(0, y0, W, y1 - y0), d = id.data;
      for (let i = 0; i < d.length; i += 4) { const a = Math.min(255, d[i] * gain); d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; d[i + 3] = a; }
      c.getContext('2d').putImageData(id, 0, y0); return c;
    };
    LINES = lineCanvas([255, 255, 255], 1);
    INK = lineCanvas([28, 40, 62], 1.15);
    // 난간 띠: 캐릭터 앞에 다시 그림 (칸 사이는 하늘색으로 반투명하게 → 다리가 실루엣으로 비침)
    if (railEl) {
      railEl.width = W; railEl.height = H;
      const yCap = Math.round(iy + 478 * k), yTop = Math.round(iy + 498 * k), yBot = Math.round(iy + 615 * k);
      railBox = { yCap, yTop, yBot };
      RAIL_LINES = lineCanvas([255, 255, 255], 1, yCap, yBot);
      RAIL_INK = lineCanvas([28, 40, 62], 1.15, yCap, yBot);
      RAIL_GAP = document.createElement('canvas'); RAIL_GAP.width = W; RAIL_GAP.height = H;
      const gid = sx.getImageData(0, yTop, W, yBot - yTop), gd = gid.data;
      for (let i = 0; i < gd.length; i += 4) { gd[i + 3] = Math.max(0, 120 - gd[i] * 0.47); gd[i] = gd[i + 1] = gd[i + 2] = 255; }
      RAIL_GAP.getContext('2d').putImageData(gid, 0, yTop);
      lastRailDay = -1;
    }

    // 별: 그림 선이 없는 어두운 하늘에만, 크기·밝기·색을 다르게
    const px = sx.getImageData(0, 0, W, H).data;
    const rad = Math.max(2, Math.round(5 * S));
    const dark = (x, y) => {
      for (let yy = y - rad; yy <= y + rad; yy += 2) for (let xx = x - rad; xx <= x + rad; xx += 2) {
        if (px[(yy * W + xx) * 4] > 35) return false;
      }
      return true;
    };
    const yMax = iy + IH * k * 0.5;
    const total = Math.min(1100, Math.round(((W * yMax) / (S * S)) * 5.26e-4));
    FIELD = [];
    for (const [share, m0, m1] of [[190 / 220, 0.05, 0.35], [24 / 220, 0.35, 0.75], [6 / 220, 0.75, 1]]) {
      const target = Math.max(2, Math.round(total * share));
      let placed = 0, tries = 0;
      while (placed < target && tries < target * 30) {
        tries++;
        const x = Math.round(W * (0.005 + 0.99 * Math.random())), y = Math.round(yMax * (0.02 + 0.98 * Math.random()));
        if (x < rad || y < rad || x > W - rad || !dark(x, y)) continue;
        if (m0 > 0.3 && FIELD.some((o) => o.m > 0.3 && Math.hypot(o.x - x, o.y - y) < 45 * S)) continue;
        const m = m0 + (m1 - m0) * Math.random(), q = Math.random();
        const col = q < 0.55 ? COLS[0] : q < 0.75 ? COLS[1] : q < 0.95 ? COLS[2] : COLS[3];
        FIELD.push({ x, y, m, c: col.c, dot: col.dot, r: (0.9 + 4.3 * Math.pow(m, 1.2)) * S, a: 0.28 + 0.72 * m,
          sp: 0.6 + Math.random() * 1.4, ph: Math.random() * 6.28, amp: 0.2 + 0.5 * Math.random() });
        placed++;
      }
    }
    ST = Array.from({ length: Math.min(700, Math.round((120 * W) / (IW * k))) }, () => ({
      x: Math.random(), d: Math.pow(Math.random(), 0.8), w: Math.random(), h: Math.random(),
      ph: Math.random() * 6.28, fs: 0.15 + Math.random() * 0.3, sp: Math.random() }));
    moonSpr = crescent(H * (stack ? 0.034 : 0.05));
    // 초승달의 밝은 부분은 원의 한쪽에 치우쳐 있으므로, 보이는 달의 무게중심을 구해 '안명숙'에 정확히 맞춤
    {
      const sw = moonSpr.width, a = moonSpr.getContext('2d').getImageData(0, 0, sw, sw).data;
      let sxm = 0, sym = 0, n = 0;
      for (let y = 0; y < sw; y++) for (let x = 0; x < sw; x++) { const al = a[(y * sw + x) * 4 + 3]; sxm += x * al; sym += y * al; n += al; }
      L.moonOff = n ? { x: sxm / n - sw / 2, y: sym / n - sw / 2 } : { x: 0, y: 0 };
    }
  };

  /* ---------- per-frame drawing ---------- */
  const glow = (x, y, r, rgb, a) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
  };
  // 달의 길: 왼쪽 하늘에서 떠올라 → 높이 호를 그리고 → '안명숙'을 지나 → 오른쪽 다리 너머로 짐
  // 네 점을 지나는 부드러운 곡선(Catmull-Rom)으로, 이름을 지날 때도 꺾이지 않고 자연스럽게 이어짐
  const moonPath = (forSun = false) => {
    // 초승달은 밝은 부분이 한쪽에 치우쳐 있어 중심을 보정, 해는 둥글어서 보정 없이 같은 궤도를 지남
    const ox = !forSun && L.moonOff ? L.moonOff.x : 0, oy = !forSun && L.moonOff ? L.moonOff.y : 0;
    const nx = name.x * W, ny = name.y * H;
    const high = (nav ? nav.offsetHeight * dpr : 0) + 0.075 * H;
    const pts = L.stack
      ? [[0.04 * W, 0.64 * H], [0.30 * W, 0.47 * H], [nx, ny], [0.98 * W, 0.58 * H]]   // 휴대폰
      : [[0.05 * W, ny], [0.30 * W, high], [nx, ny], [0.97 * W, L.iy + IH * L.k * 0.62]]; // 데스크톱: 다리 난간 높이에서 짐
    const P = pts.map(([x, y]) => ({ x: x - ox, y: y - oy }));
    const len = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
    const l = [len(P[0], P[1]), len(P[1], P[2]), len(P[2], P[3])];
    const speed = (l[0] + l[1]) / TO_NAME;
    const T = l.map((v) => v / speed);
    return { P, T, touch: T[0] + T[1], total: T[0] + T[1] + T[2] };
  };
  const cr = (p0, p1, p2, p3, t) => {
    const t2 = t * t, t3 = t2 * t;
    const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
    return { x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) };
  };
  const moonPos = () => orbitPos(Math.max(0, tc), false);
  // 해와 달이 같은 포물선 궤도를 지남 (s = 떠오른 뒤 흐른 시간)
  const orbitPos = (s, forSun) => {
    const { P, T, total } = moonPath(forSun);
    const A = { x: 2 * P[0].x - P[1].x, y: 2 * P[0].y - P[1].y }, Z = { x: 2 * P[3].x - P[2].x, y: 2 * P[3].y - P[2].y };
    let pt;
    if (s < T[0]) pt = cr(A, P[0], P[1], P[2], s / T[0]);
    else if (s < T[0] + T[1]) pt = cr(P[0], P[1], P[2], P[3], (s - T[0]) / T[1]);
    else pt = cr(P[1], P[2], P[3], Z, Math.min(1, (s - T[0] - T[1]) / T[2]));
    // 떠오를 때 서서히 나타나고, 마지막 구간 끝에서 다리 너머로 지며 사라짐
    const fadeIn = ease(s / (total * 0.06)), fadeOut = 1 - ease((s - (total - T[2] * 0.5)) / (T[2] * 0.5));
    return { x: pt.x, y: pt.y, fade: s >= total ? 0 : fadeIn * fadeOut };
  };

  /* ---------- 밤·낮 하늘 ---------- */
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const rgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  const SKY_N = [[0, 0, 0], [2, 3, 8], [6, 9, 18]];             // 밤: 위 → 가운데 → 수평선
  const SKY_D = [[72, 148, 222], [138, 194, 238], [232, 242, 250]]; // 낮
  const SKY_G = [[44, 52, 98], [196, 128, 120], [255, 182, 120]];   // 새벽·저녁 노을
  const skyCols = (d) => {
    const glow = Math.sin(Math.PI * Math.min(1, d)) * 0.85;         // 해 뜰 때·질 때 가장 붉음
    return SKY_N.map((n, i) => mix(mix(n, SKY_D[i], d), SKY_G[i], glow * (i === 0 ? 0.35 : 1) * (d < 1 ? 1 : 0)));
  };
  const paintSky = (d) => {
    const c = skyCols(d), g = ctx.createLinearGradient(0, 0, 0, L.water);
    g.addColorStop(0, rgb(c[0])); g.addColorStop(0.6, rgb(c[1])); g.addColorStop(1, rgb(c[2]));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  };
  const skyAt = (y, d) => { // 난간 높이의 하늘색 (난간 칸 사이를 채움)
    const c = skyCols(d), t = Math.min(1, y / L.water);
    return t < 0.6 ? mix(c[0], c[1], t / 0.6) : mix(c[1], c[2], (t - 0.6) / 0.4);
  };
  const paintRail = (d) => {
    if (!railEl || !railBox || Math.abs(d - lastRailDay) < 0.004) return;
    lastRailDay = d;
    const rc = railEl.getContext('2d'), { yCap, yBot } = railBox;
    rc.globalAlpha = 1; rc.globalCompositeOperation = 'source-over'; rc.clearRect(0, yCap, W, yBot - yCap);
    rc.drawImage(RAIL_GAP, 0, 0);
    rc.globalCompositeOperation = 'source-in'; rc.fillStyle = rgb(skyAt((railBox.yTop + yBot) / 2, d)); rc.fillRect(0, yCap, W, yBot - yCap);
    rc.globalCompositeOperation = 'source-over';
    rc.globalAlpha = 1 - d; rc.drawImage(RAIL_LINES, 0, 0);
    rc.globalAlpha = d; rc.drawImage(RAIL_INK, 0, 0);
    rc.globalAlpha = 1;
  };
  // 해의 길: 달과 똑같은 궤도
  const sunPos = () => orbitPos(Math.max(0, sunT), true);
  const drawSun = (sun) => {
    if (sun.fade <= 0.01) return;
    const r = H * (L.stack ? 0.03 : 0.045);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    glow(sun.x, sun.y, r * 7, '255,214,150', 0.22 * sun.fade);
    glow(sun.x, sun.y, r * 3, '255,236,190', 0.35 * sun.fade);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = sun.fade;
    const g = ctx.createRadialGradient(sun.x, sun.y, 0, sun.x, sun.y, r);
    g.addColorStop(0, '#fffdf2'); g.addColorStop(0.75, '#fff3c4'); g.addColorStop(1, 'rgba(255,226,150,0.9)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sun.x, sun.y, r, 0, 6.283); ctx.fill();
    ctx.restore();
  };

  const drawWater = (t, moon, d = 0, sun = null) => {
    const k = L.k, y0 = L.water, h = H - y0;
    ctx.save(); ctx.beginPath(); ctx.rect(0, y0, W, h); ctx.clip();
    if (d > 0) { // 낮의 물: 밝은 하늘빛 물
      const dg = ctx.createLinearGradient(0, y0, 0, H);
      dg.addColorStop(0, 'rgb(150,200,236)'); dg.addColorStop(0.45, 'rgb(84,150,210)'); dg.addColorStop(1, 'rgb(38,96,160)');
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = d; ctx.fillStyle = dg; ctx.fillRect(0, y0, W, h);
    }
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1;
    const nightW = 1 - 0.75 * d; // 낮에는 밤 물결 빛을 줄임
    const g = ctx.createLinearGradient(0, y0, 0, H);
    g.addColorStop(0, 'rgba(20,70,150,0)'); g.addColorStop(0.5, 'rgba(22,70,150,0.22)'); g.addColorStop(1, 'rgba(30,95,180,0.38)');
    ctx.globalAlpha = nightW; ctx.fillStyle = g; ctx.fillRect(0, y0, W, h); ctx.globalAlpha = 1;
    for (const q of ST) {
      const d = q.d, s = (0.4 + 1.3 * d) * k, w = (70 + 170 * q.w) * s, hh = (4 + 9 * q.h) * s;
      const y = y0 + h * (0.04 + 0.94 * d) + 3.5 * k * Math.sin(t * 0.7 + q.ph) * (0.5 + d);
      const x = ((q.x * W + t * (7 + 20 * d * q.sp) * k) % (W + 2 * w)) - w;
      const pulse = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(t * q.fs * 0.9 + q.ph));
      ctx.globalAlpha = nightW * (0.09 + 0.17 * d) * pulse * (1 + 0.5 * moon.fade * Math.exp(-Math.pow((x - moon.x) / (W * 0.18), 2)));
      ctx.drawImage(WB, x - w / 2, y - hh / 2, w, hh);
      const ml = moon.fade * Math.exp(-Math.pow((x - moon.x) / (W * 0.16), 2));
      if (ml > 0.03) {
        ctx.globalAlpha = Math.min(0.9, 0.75 * ml * (0.3 + 0.7 * d) * pulse);
        ctx.drawImage(WP, x - w / 2, y - hh * 0.7, w, hh * 1.4);
      }
    }
    if (sun && sun.fade > 0.01) { // 해 아래 물 위에 반짝이는 윤슬
      for (let j = 0; j < 18; j++) {
        const yy = y0 + h * (0.04 + (0.92 * j) / 17), xx = sun.x + Math.sin(t * 0.8 + j * 1.9) * (8 + j * 2.2) * k;
        const w = (22 + j * 9) * k * (0.7 + 0.3 * Math.sin(t * 1.1 + j)), hh = (3 + j * 0.9) * k;
        ctx.globalAlpha = 0.5 * sun.fade * (1 - j / 22) * (0.4 + 0.6 * Math.abs(Math.sin(t * 1.3 + j * 2.3)));
        ctx.drawImage(WP, xx - w / 2, yy - hh / 2, w, hh);
      }
    }
    if (moon.fade > 0.01) { // 달 아래 물 위에 부서지는 달빛 기둥
      for (let j = 0; j < 14; j++) {
        const yy = y0 + h * (0.05 + (0.9 * j) / 13), xx = moon.x + Math.sin(t * 0.5 + j * 1.7) * (6 + j * 1.2) * k;
        const w = (18 + j * 7) * k * (0.8 + 0.2 * Math.sin(t * 0.7 + j)), hh = (5 + j * 1.1) * k;
        ctx.globalAlpha = 0.22 * moon.fade * (1 - j / 16) * (0.5 + 0.5 * Math.sin(t * 0.6 + j * 2.1));
        ctx.drawImage(WP, xx - w / 2, yy - hh / 2, w, hh);
      }
    }
    ctx.restore();
  };

  const draw = (t) => {
    if (!ready || !scene) return;
    const d = DAY;
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    paintSky(d);
    const sun = sunT < moonPath().total ? sunPos() : null; // 해는 지는 동안 밤이 되어도 끝까지 보임
    if (sun) { sun.fade *= fadeSun; drawSun(sun); }
    if (d < 1) { ctx.globalAlpha = 1 - d; ctx.drawImage(LINES, 0, 0); }
    if (d > 0) { ctx.globalAlpha = d; ctx.drawImage(INK, 0, 0); }
    ctx.globalAlpha = 1;
    paintRail(d);
    const starA = Math.pow(1 - d, 2);
    ctx.globalCompositeOperation = 'lighter';
    for (const s of (starA > 0.01 ? FIELD : [])) {
      const nz = 0.45 * Math.sin(t * s.sp * 5.3 + s.ph) + 0.3 * Math.sin(t * s.sp * 8.9 + s.ph * 1.7 + 2) + 0.25 * Math.sin(t * s.sp * 1.3 + s.ph * 2.3);
      const dip = Math.pow(Math.max(0, Math.sin(t * s.sp * 0.9 + s.ph * 3.1)), 14);
      const kk = Math.max(0.15, 1 + TWINKLE * s.amp * (nz - 0.9 * dip));
      const r = s.r;
      ctx.globalAlpha = Math.min(1, s.a * kk * 0.35) * starA; ctx.drawImage(s.dot, s.x - r * 3.2, s.y - r * 3.2, r * 6.4, r * 6.4);
      ctx.globalAlpha = Math.min(1, s.a * kk) * starA; ctx.drawImage(s.dot, s.x - r, s.y - r, r * 2, r * 2);
      if (s.m > 0.75) {
        const ls = r * (4 + 3 * Math.min(1.3, kk));
        ctx.globalAlpha = 1; ctx.lineCap = 'round'; ctx.lineWidth = 0.8 * Math.max(1, L.S);
        ctx.strokeStyle = `rgba(${s.c},${0.3 * Math.min(1, kk) * starA})`;
        ctx.beginPath(); ctx.moveTo(s.x - ls, s.y); ctx.lineTo(s.x + ls, s.y); ctx.moveTo(s.x, s.y - ls); ctx.lineTo(s.x, s.y + ls); ctx.stroke();
      }
    }
    const moon = tc < moonPath().total ? moonPos() : { x: 0, y: 0, fade: 0 }; // 달도 지는 동안 낮이 되어도 끝까지 보임
    moon.fade *= fadeMoon;
    drawWater(wt, moon, d, sun);
    if (d > 0) { // 낮에도 물속 다리 기둥이 은은하게 비치도록
      ctx.save(); ctx.beginPath(); ctx.rect(0, L.water, W, H - L.water); ctx.clip();
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.45 * d; ctx.drawImage(INK, 0, 0); ctx.restore();
    }
    ctx.globalCompositeOperation = 'lighter';
    const rad = moonSpr.width / 2, mr = rad / 1.25;
    glow(moon.x, moon.y, mr * 3.2, '255,236,170', 0.12 * moon.fade);
    glow(moon.x, moon.y, mr * 1.6, '255,240,190', 0.12 * moon.fade);
    ctx.globalAlpha = moon.fade; ctx.drawImage(moonSpr, moon.x - rad, moon.y - rad);
    try {
      ctx.filter = `blur(${3 * L.S}px)`; ctx.globalAlpha = 0.55 * moon.fade;
      ctx.drawImage(moonSpr, moon.x - rad, moon.y - rad); ctx.filter = 'none';
    } catch (e) { /* older browsers */ }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  };

  /* ---------- 걷는 캐릭터 (정면 사진 한 장): 팔다리를 흔들며 난간 뒤를 걸어와, 멈추면 손을 흔듦 ---------- */
  const WALK_DELAY = 0;     // 처음부터 그 자리에 서 있음
  const WALK_SPEED = 0.085; // 걷는 빠르기 (화면 너비 대비 초당)
  const STEP = 0.85;        // 한 걸음 주기(초): 왼발·오른발 한 번씩
  const WAVE_DUR = 2.6;     // 손 흔드는 시간(초)
  const WAVE_HZ = 2.6;      // 1초에 손을 흔드는 횟수
  const wk = { state: 'wait', t: 0, p: 0, standT: 0 };
  const pose = { walk: 0, clock: 0, waveT: -1, raise: 0, blinkAt: 1.5 };
  const part = {};
  if (walker) walker.querySelectorAll('[data-part]').forEach((el) => { part[el.dataset.part] = el; });
  const wave = () => { pose.waveT = 0; };
  const walkerLayout = () => {
    const cw = hero.clientWidth, ch = hero.clientHeight;
    const h = Math.round(ch * (L.stack ? 0.12 : 0.19));     // 캐릭터 키
    const w = (h * 229) / 480;
    const feet = (L.iy + IH * L.k * 0.68) / dpr;             // 난간 뒤 다리 바닥 높이
    const fx = 0.549 * w;                                    // 이미지 안에서 발 가운데 위치
    return { h, w, feet, startX: cw + w * 0.6 - fx, stopX: cw * (L.stack ? 0.66 : 0.45) - fx };
  };
  const approach = (v, to, rate, dt) => v + (to - v) * Math.min(1, dt * rate);
  const updateWalker = (dt) => {
    if (!walker || !L) return;
    if (wk.state === 'wait') {
      wk.t += dt;
      if (wk.t < WALK_DELAY) return;
      // 걷지 않고 멈추는 자리에서 바로 나타나 손을 흔듦
      wk.state = 'stand'; wk.p = 1; wk.standT = 0; walker.classList.add('is-on');
    }
    const g = walkerLayout();
    walker.style.height = `${g.h}px`;
    if (wk.state === 'walk') {
      wk.p = Math.min(1, wk.p + (dt * WALK_SPEED * hero.clientWidth) / Math.max(1, g.startX - g.stopX));
      if (wk.p >= 1) { wk.state = 'stand'; wk.standT = 0; }
    } else if (wk.state === 'stand') {
      const before = wk.standT; wk.standT += dt;
      // 글자가 다 나타난 뒤부터 같은 자리에서 손을 계속 흔듦 (한 번 흔들고 잠깐 쉬고 반복)
      if (wk.standT >= 2.8 && pose.waveT < 0 && wk.standT - (pose.waveEnd || 0) > 0.25) wave();
    }
    const x = wk.state === 'walk' ? g.startX + (g.stopX - g.startX) * wk.p : g.stopX;
    walker.style.transform = `translate3d(${x.toFixed(1)}px, ${(g.feet - g.h * 0.982).toFixed(1)}px, 0)`;

    // 걷기: 무릎을 굽혀 한 발씩 들어 올리고, 팔은 반대쪽 다리와 엇갈리게 앞뒤로 흔듦
    pose.walk = approach(pose.walk, wk.state === 'walk' ? 1 : 0, 6, dt);
    pose.clock += dt * pose.walk;
    const c = (pose.clock * 2 * Math.PI) / STEP, s = Math.sin(c), wa = pose.walk;
    const upL = Math.max(0, s) * wa, upR = Math.max(0, -s) * wa;           // 드는 발 (0~1)
    const legT = (u, dir) => `translateY(${(-7 * Math.sin(u * Math.PI / 2)).toFixed(2)}%) scaleY(${(1 - 0.08 * u).toFixed(3)}) rotate(${(dir * 4 * u).toFixed(2)}deg)`;
    const sway = -2.2 * s * wa - 2.5 * wa;                                   // 디딘 발 쪽으로 살짝 기울고, 걷는 방향(왼쪽)으로 조금 숙임
    // 몸은 한 발로 디딘 순간 가장 높고, 두 발이 바뀌는 순간 내려앉음 → 발이 바닥에 닿는 느낌
    const bob = -(0.6 + 0.4 * Math.cos(2 * c)) * 1.8 * wa;
    pose.pony = approach(pose.pony || 0, (6 * Math.sin(c - 0.9) + 4) * wa, 8, dt); // 걸음보다 살짝 늦게 따라 흔들리는 머리
    // 손 흔들기: 팔을 들어 올린 뒤 손을 빠르게
    let handA = 0;
    if (pose.waveT >= 0) {
      pose.waveT += dt;
      const t = pose.waveT, env = ease((t - 0.25) / 0.2) * ease((WAVE_DUR - t) / 0.3);
      handA = env * 16 * Math.sin((t - 0.25) * 2 * Math.PI * WAVE_HZ);
      if (t >= WAVE_DUR) { pose.waveT = -1; pose.waveEnd = wk.standT; }
    }
    pose.raise = approach(pose.raise, (wk.state === 'stand' && wk.standT >= 2.8) || (pose.waveT >= 0 && pose.waveT < WAVE_DUR - 0.2 ? 1 : 0) ? 1 : 0, 9, dt); // 서 있는 동안은 팔을 든 채로 계속 손 흔들기
    const rz = pose.raise;
    // 팔은 반대쪽 다리와 엇갈리게: 화면 왼쪽 다리가 나갈 때 화면 오른쪽 팔이 앞으로, 그 반대도 마찬가지
    // 정면에서 볼 때 앞으로 가는 팔은 손이 몸 쪽으로 올라오고, 뒤로 가는 팔은 바깥쪽으로 살짝 빠짐
    // 팔을 앞뒤로: 앞으로 가는 팔은 보는 사람 쪽으로 기울며 몸 앞에, 뒤로 가는 팔은 멀어지며 몸 뒤로
    const swR = s * wa, swL = -s * wa;                             // +1 = 앞으로, -1 = 뒤로 (두 팔은 늘 반대, 같은 쪽 다리와도 반대)
    const armT = (sw, inward) => `perspective(240px) rotateX(${(34 * sw).toFixed(2)}deg) rotate(${(inward * 7 * Math.max(0, sw)).toFixed(2)}deg)`;
    const armStyle = (el, sw) => { el.style.zIndex = sw >= 0 ? 3 : 0; el.style.filter = `brightness(${(1 - 0.22 * Math.max(0, -sw)).toFixed(3)})`; };
    if (part.fig) part.fig.style.transform = `rotate(${sway.toFixed(2)}deg)`;
    if (part.upper) part.upper.style.transform = `translateY(${bob.toFixed(2)}%)`;
    if (part.pony) part.pony.style.transform = `rotate(${(pose.pony + 1.5 * Math.sin(pose.clock * 2.1 + wk.standT * 1.7)).toFixed(2)}deg)`;
    if (part.legL) part.legL.style.transform = legT(upL, 1);
    if (part.legR) part.legR.style.transform = legT(upR, -1);
    if (part.armR) { part.armR.style.transform = armT(swR, 1); armStyle(part.armR, swR); }
    // 왼팔: 걸을 땐 내려서 흔들다가, 인사할 땐 바깥으로 들어 올리며 손 흔드는 팔로 바뀜
    if (part.armL) {
      part.armL.style.transform = `perspective(240px) rotateX(${(34 * swL * (1 - rz)).toFixed(2)}deg) rotate(${(-7 * Math.max(0, swL) * (1 - rz) + 120 * rz).toFixed(2)}deg)`;
      armStyle(part.armL, rz > 0.05 ? 1 : swL);
      part.armL.style.opacity = Math.min(1, Math.max(0, (0.7 - rz) / 0.25)).toFixed(3);
    }
    if (part.raise) part.raise.style.opacity = Math.min(1, Math.max(0, (rz - 0.45) / 0.25)).toFixed(3);
    if (part.hand) part.hand.style.transform = `rotate(${handA.toFixed(2)}deg)`;
    // 눈 깜박임: 2~5초마다, 가끔은 두 번 연달아
    pose.blinkAt -= dt;
    if (pose.blinkAt <= 0) {
      walker.classList.add('is-blink');
      setTimeout(() => walker.classList.remove('is-blink'), 120);
      pose.blinkAt = Math.random() < 0.25 ? 0.28 : 2 + Math.random() * 3;
    }
  };

  const frame = (ts) => {
    if (!running) return;
    const dt = last ? Math.min(0.1, (ts - last) / 1000) : 0; last = ts;
    tc += dt;
    wt += dt * FLOW;
    const path = moonPath();
    sunT += dt;
    duskT += dt;
    if (killMoon) { fadeMoon -= dt / VANISH; if (fadeMoon <= 0) { killMoon = false; fadeMoon = 1; if (cyc === 'day') tc = 1e9; } }
    if (killSun) { fadeSun -= dt / VANISH; if (fadeSun <= 0) { killSun = false; fadeSun = 1; if (cyc === 'night') sunT = 1e9; } }
    // 달이 다리 너머로 완전히 진 순간 해가 떠오르고, 해가 완전히 지면 달이 떠오름 (해와 달이 함께 보이지 않음)
    const handoff = path.total;
    if (cyc === 'night') {
      if (!touched && tc >= path.touch) { touched = true; shine(); }  // 달이 '안명숙' 한가운데를 지나는 순간 — 달은 멈추지 않고 계속 감
      if (tc >= handoff) { cyc = 'day'; sunT = 0; sunTouched = false; }
    } else {
      if (!sunTouched && sunT >= path.touch) { sunTouched = true; shine(); } // 해가 '안명숙' 한가운데를 지나는 순간도 똑같이 반짝임
      if (sunT >= handoff) { cyc = 'night'; tc = 0; touched = false; }
    }
    // 하늘 밝기: 해가 떠오르며 밝아지고, 해가 질 때 어두워짐
    const sunLive = cyc === 'day' || sunT < path.total;
    let dayTarget = sunLive ? Math.min(ease(sunT / SUNRISE), ease((path.total - sunT) / SUNSET)) : 0;
    if (cyc === 'night' && duskT < SUNSET) dayTarget = duskFrom * (1 - ease(duskT / SUNSET)); // Night 버튼: 5초에 걸쳐 어두워짐
    DAY = Math.max(0, Math.min(1, dayTarget));
    const isDay = DAY > 0.5;
    if (isDay !== hero.classList.contains('is-day')) { hero.classList.toggle('is-day', isDay); onScroll(); }
    updateToggle();
    draw(ts / 1000);
    updateWalker(dt);
    requestAnimationFrame(frame);
  };
  const start = () => { if (!running && ready && visible && !document.hidden) { running = true; last = 0; requestAnimationFrame(frame); } };
  const stop = () => { running = false; };

  img.onload = () => {
    IW = img.width; IH = img.height;
    src = document.createElement('canvas'); src.width = IW; src.height = IH;
    const sc = src.getContext('2d'); sc.drawImage(img, 0, 0);
    const id = sc.getImageData(0, 0, IW, IH), d = id.data;
    for (let i = 0; i < d.length; i += 4) { // 밝기 75 이하는 검정, 165 이상은 흰색으로
      const l = (d[i] + d[i + 1] + d[i + 2]) / 3, v = Math.max(0, Math.min(255, ((l - 75) / 90) * 255));
      d[i] = d[i + 1] = d[i + 2] = v;
    }
    sc.putImageData(id, 0, 0);
    COLS = ['255,252,247', '198,220,255', '255,238,196', '255,208,164'].map((c) => ({ c, dot: dotSprite(c) }));
    WB = softSprite('rgb(105,160,235)'); WP = softSprite('rgb(220,235,255)');
    build(); measureName(); ready = true;
    tc = Math.max(0, moonPath().touch - FIRST_TOUCH);
    if (reduceMotion && walker) { wk.state = 'stand'; wk.standT = 1; walker.classList.add('is-on'); updateWalker(0); }
    setTimeout(measureName, 2600); // 글자가 다 떠오른 뒤 다시 잼
    draw(performance.now() / 1000);
    updateWalker(0); // 첫 화면부터 캐릭터가 제자리에 있도록
    hero.classList.add('is-ready');
    start();
  };
  img.src = window.NIGHT_IMG || hero.dataset.src; // 스크립트에 담긴 그림을 우선 사용 (파일로 열어도 동작)

  new IntersectionObserver((e) => { visible = e[0].isIntersecting; visible ? start() : stop(); }).observe(hero);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  let rt;
  window.addEventListener('resize', () => {
    // 휴대폰에서 스크롤할 때 주소창이 숨거나 나타나며 화면 높이만 바뀌는 경우는 무시 → 그림·캐릭터 위치가 튀지 않음
    if (window.innerWidth === lockedW) return;
    clearTimeout(rt);
    rt = setTimeout(() => { lockHeight(); if (ready) { build(); measureName(); draw(performance.now() / 1000); } }, 150);
  }, { passive: true });

  /* ---------- scroll: scene drifts slower than the page, nav stays dark over the night ---------- */
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const y = window.scrollY, hh = hero.offsetHeight;
      if (!reduceMotion && y < hh) {
        sceneEl.style.transform = `translate3d(0, ${y * 0.3}px, 0)`;
        if (dim) dim.style.opacity = String(Math.min(1, y / (hh * 0.85)) * 0.85); // 내려갈수록 밤이 깊어지며 다음 섹션으로
      }
      if (nav) nav.classList.toggle('is-dark', y < hh - nav.offsetHeight && !hero.classList.contains('is-day'));
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Day | Night 토글 (반으로 나뉜 버튼) ---------- */
  // 지금 장면 쪽이 밝게 표시되고, 다른 쪽을 누르면 그 장면으로 바뀜. 자동으로 밤낮이 바뀌어도 표시가 따라감
  const toggle = hero.querySelector('[data-daynight]');
  let shownMode = '';
  function updateToggle() {
    if (!toggle) return;
    const cur = cyc; // 'day' | 'night'
    if (cur === shownMode) return;
    shownMode = cur;
    toggle.dataset.cur = cur;
    toggle.querySelectorAll('[data-go]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.go === cur)));
  }
  const goDay = () => {
    if (!ready || cyc === 'day') return;
    killMoon = true; fadeMoon = 1;
    cyc = 'day'; sunT = -VANISH; sunTouched = false; duskT = 1e9; // 달이 사라진 뒤 해가 떠오름
    updateToggle();
  };
  const goNight = () => {
    if (!ready || cyc === 'night') return;
    killSun = true; fadeSun = 1;
    duskFrom = DAY; duskT = 0;
    cyc = 'night'; tc = -VANISH; touched = false; // 해가 사라진 뒤 달이 떠오름
    updateToggle();
  };
  if (toggle) toggle.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => (b.dataset.go === 'day' ? goDay() : goNight())));
})();
