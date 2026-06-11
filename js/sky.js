/* =========================================================================
 *  sky.js — 살아있는 밤하늘 배경 (반짝이는 별 + 가끔 별똥별)
 *  화면 맨 뒤에 캔버스를 깔고 부드럽게 그립니다. 로직과는 분리되어 있어요.
 *  (모션을 끄는 설정을 쓰는 사람은 존중해서 정지 상태로 둡니다)
 * ========================================================================= */

(() => {
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  function start() {
    const canvas = document.createElement("canvas");
    canvas.id = "skyCanvas";
    Object.assign(canvas.style, {
      position: "fixed", inset: "0", width: "100%", height: "100%",
      zIndex: "-1", pointerEvents: "none"
    });
    document.body.appendChild(canvas);
    const ctx = canvas.getContext("2d");

    let W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    let stars = [], shooting = null, nextShoot = 0;

    function resize() {
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // 화면 크기에 맞춰 별 개수 (너무 많지 않게)
      const count = Math.min(140, Math.round(W * H / 9000));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        r: Math.random() * 1.4 + 0.4,
        base: Math.random() * 0.5 + 0.3,        // 기본 밝기
        amp: Math.random() * 0.4 + 0.1,         // 반짝임 폭
        spd: Math.random() * 1.6 + 0.4,         // 반짝임 속도
        ph: Math.random() * Math.PI * 2
      }));
    }

    function spawnShoot() {
      const fromLeft = Math.random() < 0.5;
      const x = fromLeft ? Math.random() * W * 0.4 : W * (0.6 + Math.random() * 0.4);
      shooting = {
        x, y: Math.random() * H * 0.4,
        vx: (fromLeft ? 1 : -1) * (5 + Math.random() * 3),
        vy: 3 + Math.random() * 2,
        life: 0, max: 60 + Math.random() * 20
      };
    }

    function frame(t) {
      const sec = t / 1000;
      ctx.clearRect(0, 0, W, H);

      // 별 반짝임
      for (const s of stars) {
        const a = Math.max(0, Math.min(1, s.base + s.amp * Math.sin(sec * s.spd + s.ph)));
        ctx.globalAlpha = a;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // 가끔 별똥별
      if (!shooting && t > nextShoot) { spawnShoot(); nextShoot = t + 3500 + Math.random() * 5000; }
      if (shooting) {
        const s = shooting; s.life++;
        const px = s.x - s.vx * 6, py = s.y - s.vy * 6;
        const grad = ctx.createLinearGradient(px, py, s.x, s.y);
        grad.addColorStop(0, "rgba(255,255,255,0)");
        grad.addColorStop(1, "rgba(255,255,255,0.9)");
        ctx.strokeStyle = grad; ctx.lineWidth = 2; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(s.x, s.y); ctx.stroke();
        s.x += s.vx; s.y += s.vy;
        if (s.life > s.max || s.x < -50 || s.x > W + 50 || s.y > H + 50) shooting = null;
      }

      requestAnimationFrame(frame);
    }

    function drawStatic() {  // 모션 끔 설정일 때: 한 번만 그림
      ctx.clearRect(0, 0, W, H);
      for (const s of stars) {
        ctx.globalAlpha = s.base + s.amp;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    window.addEventListener("resize", () => { resize(); drawStatic(); });
    resize();
    drawStatic();                         // 로드 즉시 별을 한 번 그려 빈 화면 깜빡임 방지
    if (!reduce) requestAnimationFrame(frame);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
