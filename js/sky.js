/* =========================================================================
 *  sky.js — 살아있는 밤하늘 배경
 *    · 반짝이는 별 + 가끔 별똥별
 *    · 계절에 맞는 별자리가 가끔 떠올라 천천히 흐르다 사라짐 (이름표 포함)
 *  로직과 분리된 캔버스. 모션 끄기 설정은 존중(정지 상태로 표시).
 * ========================================================================= */

(() => {
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 계절별 대표 별자리 (좌표는 0~1, 알아보기 쉽게 단순화한 모양)
  const CONSTS = {
    spring: [
      { name: "사자자리", stars: [[0.16,0.18],[0.20,0.33],[0.28,0.45],[0.34,0.55],[0.56,0.50],[0.83,0.55],[0.68,0.70]],
        lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,4]] },
      { name: "북두칠성", stars: [[0.18,0.40],[0.36,0.34],[0.44,0.50],[0.26,0.56],[0.58,0.44],[0.73,0.50],[0.88,0.62]],
        lines: [[0,1],[1,2],[2,3],[3,0],[2,4],[4,5],[5,6]] }
    ],
    summer: [
      { name: "전갈자리", stars: [[0.18,0.16],[0.13,0.30],[0.22,0.40],[0.34,0.50],[0.46,0.62],[0.57,0.72],[0.66,0.83],[0.56,0.92]],
        lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7]] },
      { name: "백조자리", stars: [[0.50,0.12],[0.50,0.50],[0.50,0.90],[0.24,0.44],[0.78,0.52]],
        lines: [[0,1],[1,2],[3,1],[1,4]] }
    ],
    autumn: [
      { name: "카시오페이아", stars: [[0.10,0.32],[0.30,0.60],[0.50,0.36],[0.70,0.64],[0.90,0.32]],
        lines: [[0,1],[1,2],[2,3],[3,4]] }
    ],
    winter: [
      { name: "오리온자리", stars: [[0.22,0.15],[0.80,0.20],[0.42,0.50],[0.50,0.52],[0.58,0.55],[0.30,0.90],[0.76,0.88]],
        lines: [[0,1],[0,2],[1,4],[2,3],[3,4],[2,5],[4,6]] }
    ]
  };

  function season() {
    let m = 6;
    try { m = Number(AstroData.today().slice(5, 7)); } catch {}
    if (m >= 3 && m <= 5) return "spring";
    if (m >= 6 && m <= 8) return "summer";
    if (m >= 9 && m <= 11) return "autumn";
    return "winter";
  }

  function start() {
    const canvas = document.createElement("canvas");
    canvas.id = "skyCanvas";
    Object.assign(canvas.style, { position: "fixed", inset: "0", width: "100%", height: "100%", zIndex: "-1", pointerEvents: "none" });
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d");

    let W = 0, H = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let stars = [], shooting = null, nextShoot = 0;
    let scene = null, sceneIdx = 0, nextSceneAt = 1200;

    function resize() {
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(140, Math.round(W * H / 9000));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.4 + 0.4,
        base: Math.random() * 0.5 + 0.3, amp: Math.random() * 0.4 + 0.1,
        spd: Math.random() * 1.6 + 0.4, ph: Math.random() * Math.PI * 2
      }));
    }

    function newScene(t) {
      const list = CONSTS[season()] || CONSTS.summer;
      const c = list[sceneIdx % list.length]; sceneIdx++;
      const scale = Math.min(W, H) * 0.30;
      return { c, x: W * (0.12 + Math.random() * 0.5), y: H * (0.10 + Math.random() * 0.28),
        scale, vx: (Math.random() - 0.5) * 0.12, vy: (Math.random() - 0.5) * 0.06, start: t };
    }

    // 별자리 그리기 (a = 0~1 페이드)
    function drawConst(s, a) {
      const pts = s.c.stars.map(([sx, sy]) => [s.x + sx * s.scale, s.y + sy * s.scale]);
      ctx.strokeStyle = `rgba(150,180,255,${0.45 * a})`; ctx.lineWidth = 1;
      ctx.beginPath();
      for (const [i, j] of s.c.lines) { ctx.moveTo(pts[i][0], pts[i][1]); ctx.lineTo(pts[j][0], pts[j][1]); }
      ctx.stroke();
      for (const [px, py] of pts) {
        ctx.globalAlpha = 0.85 * a; ctx.fillStyle = "#cfe0ff";
        ctx.beginPath(); ctx.arc(px, py, 1.8, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.22 * a; ctx.beginPath(); ctx.arc(px, py, 4.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 0.85 * a; ctx.fillStyle = "#ffd66b";
      ctx.font = '600 13px "Malgun Gothic", sans-serif';
      ctx.fillText(s.c.name, s.x, s.y - 8);
      ctx.globalAlpha = 1;
    }

    // 페이드 인 → 유지 → 페이드 아웃 봉투
    const FIN = 1800, HOLD = 8000, FOUT = 1800;
    function envelope(age) {
      if (age < FIN) return age / FIN;
      if (age < FIN + HOLD) return 1;
      if (age < FIN + HOLD + FOUT) return 1 - (age - FIN - HOLD) / FOUT;
      return -1; // 끝
    }

    function frame(t) {
      const sec = t / 1000;
      ctx.clearRect(0, 0, W, H);

      for (const s of stars) {
        const a = Math.max(0, Math.min(1, s.base + s.amp * Math.sin(sec * s.spd + s.ph)));
        ctx.globalAlpha = a; ctx.fillStyle = "#ffffff";
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;

      // 계절 별자리
      if (!scene && t > nextSceneAt) scene = newScene(t);
      if (scene) {
        scene.x += scene.vx; scene.y += scene.vy;
        const a = envelope(t - scene.start);
        if (a < 0) { scene = null; nextSceneAt = t + 6000 + Math.random() * 5000; }
        else drawConst(scene, a * 0.75);
      }

      // 가끔 별똥별
      if (!shooting && t > nextShoot) { spawnShoot(); nextShoot = t + 3500 + Math.random() * 5000; }
      if (shooting) {
        const s = shooting; s.life++;
        const px = s.x - s.vx * 6, py = s.y - s.vy * 6;
        const grad = ctx.createLinearGradient(px, py, s.x, s.y);
        grad.addColorStop(0, "rgba(255,255,255,0)"); grad.addColorStop(1, "rgba(255,255,255,0.9)");
        ctx.strokeStyle = grad; ctx.lineWidth = 2; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(s.x, s.y); ctx.stroke();
        s.x += s.vx; s.y += s.vy;
        if (s.life > s.max || s.x < -50 || s.x > W + 50 || s.y > H + 50) shooting = null;
      }

      requestAnimationFrame(frame);
    }

    function spawnShoot() {
      const fromLeft = Math.random() < 0.5;
      const x = fromLeft ? Math.random() * W * 0.4 : W * (0.6 + Math.random() * 0.4);
      shooting = { x, y: Math.random() * H * 0.4, vx: (fromLeft ? 1 : -1) * (5 + Math.random() * 3),
        vy: 3 + Math.random() * 2, life: 0, max: 60 + Math.random() * 20 };
    }

    function drawStatic() {  // 로드 즉시 / 모션끄기: 별 + 계절 별자리 1개를 정지 상태로
      ctx.clearRect(0, 0, W, H);
      for (const s of stars) {
        ctx.globalAlpha = s.base + s.amp; ctx.fillStyle = "#ffffff";
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      const list = CONSTS[season()] || CONSTS.summer;
      drawConst({ c: list[0], x: W * 0.16, y: H * 0.16, scale: Math.min(W, H) * 0.30 }, 0.55);
    }

    window.addEventListener("resize", () => { resize(); drawStatic(); });
    resize();
    drawStatic();
    if (!reduce) requestAnimationFrame(frame);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
