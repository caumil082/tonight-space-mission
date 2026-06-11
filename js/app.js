/* =========================================================================
 *  app.js — 화면 그리기 + 버튼 연결 (앱의 본체)
 *  탭: [오늘] [달력] [미션] [일지] [퀴즈]
 *
 *  버튼은 "이벤트 위임(delegation)" 방식으로 #view 한 곳에서 처리합니다.
 *  (화면을 다시 그려도 버튼 연결이 풀리지 않게 하려고요.)
 * ========================================================================= */

(() => {
  const $  = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const esc = s => String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  // 보안: 사진은 진짜 이미지 data URL일 때만 허용 (불러온 백업의 조작된 값 차단)
  function safePhotoSrc(p) {
    return (typeof p === "string" && /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(p)) ? p : "";
  }
  // 보안: 결과 값은 정해진 3가지만 (클래스 주입 방지)
  function safeResult(r) {
    return ["success", "partial", "fail"].includes(r) ? r : "success";
  }

  // 은하 마스터(Lv.8) 전용 형광그린 은하 아이콘 (이모지 대신 커스텀 SVG)
  const GALAXY_SVG = `<svg class="galaxy-icon" viewBox="0 0 32 32" aria-label="은하">
    <g fill="none" stroke="#39ff14" stroke-width="2.6" stroke-linecap="round">
      <path d="M16 5 C 25 7, 27 18, 16 20.5"/>
      <path d="M16 27 C 7 25, 5 14, 16 11.5"/>
    </g>
    <circle cx="16" cy="16" r="3.3" fill="#c6ffce"/>
  </svg>`;
  // 레벨 아이콘: Lv.8은 형광그린 은하 SVG, 그 외는 이모지
  function levelIcon(L) { return L.lv >= 8 ? GALAXY_SVG : L.emoji; }

  // 업로드한 사진을 작게 줄여서 data URL로 변환 (localStorage 용량 절약)
  function resizeImage(file, maxSize = 900, quality = 0.7) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > height && width > maxSize) { height = Math.round(height * maxSize / width); width = maxSize; }
          else if (height >= width && height > maxSize) { width = Math.round(width * maxSize / height); height = maxSize; }
          const c = document.createElement("canvas");
          c.width = width; c.height = height;
          c.getContext("2d").drawImage(img, 0, 0, width, height);
          resolve(c.toDataURL("image/jpeg", quality));
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  // 폼 안의 사진 입력에서 (선택됐다면) 압축된 data URL을 얻음
  async function readPhoto(scope) {
    const input = $(".ef-photo", scope);
    if (input && input.files && input.files[0]) {
      try { return await resizeImage(input.files[0]); } catch { return null; }
    }
    return null; // 선택 안 함
  }

  const TODAY = AstroData.today();
  const UPCOMING_DAYS = 30;

  // 화면 상태
  const ui = {
    tab: "today",
    cal: { ym: null, mode: "day", date: null }, // 달력 상태
    openForm: null,   // 펼쳐진 일지 입력폼의 entry id
    manualOpen: false // 일지 탭 '직접 기록' 폼 열림 여부
  };

  /* =====================================================================
   *  공통 조각
   * ===================================================================== */
  const reduceMotion = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  function renderHeader() {
    const xp = Journal.totalPoints();
    const L = Journal.level(xp);
    const st = Journal.streakGet().count;
    $("#badge").innerHTML = `${levelIcon(L)} Lv.${L.lv}`;
    $("#points").textContent = `${xp} XP`;
    const sc = $("#streak");
    if (st > 0) { sc.hidden = false; sc.textContent = `🔥 ${st}일`; } else { sc.hidden = true; }
  }

  /* ---------- 미션 성공 연출 (XP 촤르륵 + ✨꽃가루 + 레벨업) ---------- */
  function celebrate(gained, prevXp) {
    const chip = $("#points");
    const xp = Journal.totalPoints();
    const L = Journal.level(xp);
    const st = Journal.streakGet().count;
    $("#badge").innerHTML = `${levelIcon(L)} Lv.${L.lv}`;
    const sc = $("#streak");
    if (st > 0) { sc.hidden = false; sc.textContent = `🔥 ${st}일`; }
    countUp(chip, Math.max(0, xp - gained), xp, 700);
    floatPopup(chip, `✨ +${gained} XP`);
    confettiBurst(chip);
    if (prevXp != null && Journal.level(prevXp).lv < L.lv) levelUp(L);  // 레벨업!
  }
  function levelUp(L) {
    if (reduceMotion || document.hidden) return;
    const el = document.createElement("div");
    el.className = "levelup-toast";
    el.textContent = `🎉 Lv.${L.lv} ${L.title} 달성!`;
    document.body.appendChild(el);
    el.animate([{ opacity: 0, transform: "translate(-50%,12px)" }, { opacity: 1, transform: "translate(-50%,0)" },
      { opacity: 1, transform: "translate(-50%,0)" }, { opacity: 0, transform: "translate(-50%,-12px)" }],
      { duration: 2200, easing: "ease-out" }).onfinish = () => el.remove();
    confettiBurst($("#badge"));
  }
  function countUp(el, from, to, dur) {
    if (reduceMotion || document.hidden || from === to) { el.textContent = `${to} XP`; return; }
    const t0 = performance.now();
    (function step(now) {
      const k = Math.min(1, (now - t0) / dur);
      el.textContent = `${Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3)))} XP`;
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }
  function floatPopup(anchor, text) {
    if (reduceMotion || document.hidden) return;
    const r = anchor.getBoundingClientRect();
    const el = document.createElement("div");
    el.textContent = text;
    Object.assign(el.style, { position: "fixed", left: r.left + "px", top: r.top + "px",
      color: "#ffd66b", fontWeight: "800", fontSize: "1rem", zIndex: "9999",
      pointerEvents: "none", textShadow: "0 2px 6px #000" });
    document.body.appendChild(el);
    el.animate([{ transform: "translateY(0)", opacity: 1 }, { transform: "translateY(-36px)", opacity: 0 }],
      { duration: 1000, easing: "ease-out" }).onfinish = () => el.remove();
  }
  function confettiBurst(anchor) {
    if (reduceMotion || document.hidden) return;
    const r = anchor.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const colors = ["#ffd66b", "#6ba8ff", "#4ade80", "#f87171", "#c4b5fd"];
    for (let i = 0; i < 18; i++) {
      const p = document.createElement("div");
      const sz = 6 + Math.random() * 5;
      Object.assign(p.style, { position: "fixed", left: cx + "px", top: cy + "px",
        width: sz + "px", height: sz + "px", background: colors[i % colors.length],
        borderRadius: "2px", zIndex: "9999", pointerEvents: "none" });
      document.body.appendChild(p);
      const ang = Math.random() * Math.PI * 2, dist = 60 + Math.random() * 70;
      p.animate([{ transform: "translate(0,0) rotate(0deg)", opacity: 1 },
        { transform: `translate(${Math.cos(ang) * dist}px, ${Math.sin(ang) * dist + 40}px) rotate(${Math.random() * 540}deg)`, opacity: 0 }],
        { duration: 800 + Math.random() * 400, easing: "cubic-bezier(.2,.7,.3,1)" }).onfinish = () => p.remove();
    }
  }

  function diffBadge(ev) {
    const d = AstroData.difficulty(ev);
    const L = AstroData.DIFFICULTY_LABEL[d];
    return `<span class="diff diff-${d}">${L.emoji} ${L.text}</span>`;
  }

  function ddayText(dateStr) {
    const diff = AstroData.daysBetween(TODAY, dateStr);
    if (diff === 0) return "오늘";
    if (diff > 0)  return `D-${diff}`;
    return `${-diff}일 전`;
  }

  function starBtn(ev) {
    const on = Favorites.isFav(ev);
    return `<button class="star ${on ? "on" : ""}" data-action="star"
      data-date="${esc(ev.date)}" data-event="${esc(ev.event)}"
      title="관심 등록">${on ? "★" : "☆"}</button>`;
  }

  function recBadge(ev) {
    const r = Recommend.evaluate(ev);
    if (!r.tier) return "";
    return r.tier === "must"
      ? `<span class="rec rec-must">🌟 강력추천</span>`
      : `<span class="rec rec-good">⭐ 추천</span>`;
  }

  // 현상 종류별 아이콘 (접힌 카드에서 한눈에)
  const KIND_ICON = { meteor: "☄️", moon: "🌕", eclipse: "🌑", planet: "🪐", star: "✨" };

  // 접이식 카드: 평소엔 한 줄(아이콘·이름·난이도점·D-day·☆), 누르면 자세히
  function eventCard(ev) {
    const g = AstroData.explain(ev.event + " " + (ev.remarks || ""));
    const timeStr = ev.time ? ` · ${ev.time}` : "";
    const d = AstroData.difficulty(ev);
    const icon = KIND_ICON[heroKind(ev)] || "✨";
    return `
      <div class="card ev-card">
        <div class="card-head" data-action="card-toggle">
          <span class="ev-kind">${icon}</span>
          <span class="ev-name">${esc(ev.event)}</span>
          <span class="ev-head-right">
            <span class="diff-dot diff-${d}" title="관측 난이도"></span>
            <span class="dday">${ddayText(ev.date)}</span>
            ${starBtn(ev)}
            <span class="ev-caret">▾</span>
          </span>
        </div>
        <div class="card-detail">
          <div class="card-sub">${AstroData.pretty(ev.date)}${esc(timeStr)}</div>
          <div class="card-row">${recBadge(ev)} ${diffBadge(ev)}</div>
          ${ev.remarks ? `<div class="remarks">${esc(ev.remarks)}</div>` : ""}
          ${g ? `<div class="explain">💡 <b>${esc(g.term)}</b> — ${esc(g.easy)}</div>` : ""}
        </div>
      </div>`;
  }

  // 현상 종류 → 히어로 "움직이는 이미지" 테마
  function heroKind(ev) {
    const t = (ev.event || "") + " " + (ev.remarks || "");
    if (/유성우/.test(t)) return "meteor";
    if (/일식/.test(t)) return "eclipse";
    if (/월식|망|보름|상현|하현|반달|근지점|원지점/.test(t)) return "moon";
    if (/행성|수성|금성|화성|목성|토성|천왕성|해왕성|충|근접|접근|이각|합/.test(t)) return "planet";
    return "star";
  }

  // 중심 별자리(FEATURED=염소자리) SVG — 우하단 고정용
  function constellationSVG() {
    const Sky = window.Sky;
    if (!Sky) return "";
    const c = Sky.FEATURED || (Sky.CONSTS[Sky.season()] || [])[0];
    if (!c) return "";
    const P = c.stars;
    const lines = c.lines.map(([i, j]) =>
      `<line x1="${(P[i][0]*100).toFixed(1)}" y1="${(P[i][1]*100).toFixed(1)}" x2="${(P[j][0]*100).toFixed(1)}" y2="${(P[j][1]*100).toFixed(1)}"/>`).join("");
    const dots = P.map(([x, y]) => `<circle cx="${(x*100).toFixed(1)}" cy="${(y*100).toFixed(1)}" r="2.2"/>`).join("");
    return `<svg class="hero-const" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${lines}${dots}</svg>`;
  }

  // 중앙의 "현상에 맞는 움직이는 이미지"
  function heroCenter(kind) {
    if (kind === "meteor") {
      // 중앙을 가로질러 우하단(염소자리 쪽)으로 떨어지도록 위쪽에 넓게 배치
      const mets = [{ t: -14, l: 4, d: 0 }, { t: 4, l: 24, d: .5 }, { t: -20, l: 42, d: 1 }, { t: 16, l: 14, d: 1.5 }, { t: -4, l: 34, d: 2 }];
      return `<div class="c-meteors">${mets.map(m =>
        `<span class="h-meteor" style="top:${m.t}px;left:${m.l}%;animation-delay:${m.d}s"></span>`).join("")}</div>`;
    }
    if (kind === "moon")
      return `<div class="h-moon big"><i class="crater" style="top:14px;left:18px"></i><i class="crater" style="top:32px;left:38px"></i><i class="crater sm" style="top:40px;left:16px"></i></div>`;
    if (kind === "eclipse")
      return `<div class="h-moon big h-eclipse"></div>`;
    if (kind === "planet")
      return `<div class="h-planet big"><span class="h-ring"></span><span class="h-orbit"></span></div>`;
    return `<div class="h-twinkle">✦</div>`;
  }

  // 좌상단 아주 큰 달(1/4 파이조각) — 크레이터는 보이는 영역에 배치
  const MOONFACE = `<div class="moonface"><i style="top:100px;left:135px"></i><i style="top:140px;left:160px"></i><i class="sm" style="top:165px;left:130px"></i><i class="sm" style="top:75px;left:150px"></i></div>`;

  // 무대: 은하수, 좌상단 큰 달(1/4), 중앙→우하단 유성우, 우하단 염소자리(윗부분만), 걷는 염소🐐
  function heroStage(ev, ddayPill, todayClass) {
    const kind = heroKind(ev);
    return `
      <div class="hero-stage kind-${kind}">
        <div class="hero-milkyway"></div>
        <div class="moon-corner">${MOONFACE}</div>
        <div class="hero-center">${heroCenter(kind)}</div>
        <div class="const-br">${constellationSVG()}</div>
        <span class="goat-walker"><span class="goat" aria-hidden="true">🐐</span></span>
        <span class="hero-dday ${todayClass}">${ddayPill}</span>
      </div>`;
  }

  // 🌟 대표 이벤트 히어로 카드 — 움직이는 이미지 중심, 글자 최소
  function heroCard() {
    const h = Recommend.hero(TODAY, 90);
    if (!h) return "";
    const ev = h.ev;
    const p = Recommend.present(ev);
    const thisMonth = AstroData.ymOf(ev.date) === AstroData.ymOf(TODAY);
    const label = thisMonth ? "이달의 대표 이벤트" : "곧 있을 대표 이벤트";
    const dleft = AstroData.daysBetween(TODAY, ev.date);
    const ddayPill = `📅 ${dleft === 0 ? "오늘 밤!" : `D-${dleft}`}`;

    return `
      <div class="hero">
        <div class="hero-label">🌟 ${label}</div>
        ${heroStage(ev, ddayPill, dleft === 0 ? "is-today" : "")}
        <div class="hero-name">${esc(p.headline)}</div>
        <button class="btn-big sm hero-cta" data-action="goto-mission">이 현상으로 미션 하러 가기 🚀</button>
      </div>`;
  }

  function scoreBanner() {
    const xp = Journal.totalPoints();
    const L = Journal.level(xp);
    const st = Journal.streakGet().count;
    const pct = Math.round(L.progress * 100);
    return `
      <div class="score-banner">
        <div class="lvl-badge"><span class="lvl-emoji">${levelIcon(L)}</span><span class="lvl-num">Lv.${L.lv}</span></div>
        <div class="lvl-main">
          <div class="lvl-title">${L.title}${st > 0 ? ` <span class="streak-inline">🔥 ${st}일 연속</span>` : ""}</div>
          <div class="xpbar"><span style="width:${pct}%"></span></div>
          <div class="xp-text">${xp} XP${L.next ? ` · 다음 레벨까지 ${L.toNext}` : " · 최고 레벨!"}</div>
        </div>
      </div>`;
  }

  // 선택지 <option> 만들기
  function options(list, selected, asObj) {
    return list.map(it => {
      const val = asObj ? it.value : it;
      const lab = asObj ? it.label : it;
      return `<option value="${esc(val)}" ${val === selected ? "selected" : ""}>${esc(lab)}</option>`;
    }).join("");
  }

  /* =====================================================================
   *  탭 1: 오늘
   * ===================================================================== */
  function renderToday() {
    const favs = Favorites.all();
    const todays = AstroData.onDate(TODAY);
    const soon = AstroData.upcoming(TODAY, UPCOMING_DAYS).filter(e => e.date !== TODAY);

    let html = `<p class="date-line">📅 오늘은 <b>${AstroData.pretty(TODAY)}</b></p>`;

    // 🌟 대표 이벤트 (가장 먼저!)
    html += heroCard();

    // 관심 이벤트
    if (favs.length) {
      html += `<h2 class="sec">⭐ 내 관심 이벤트</h2>`;
      html += favs.map(f => {
        const ev = AstroData.byKey(f.key) || { date: f.date, event: f.event, remarks: "" };
        return eventCard(ev);
      }).join("");
    }

    // 오늘 밤
    html += `<h2 class="sec">오늘 밤</h2>`;
    html += todays.length
      ? todays.map(eventCard).join("")
      : `<div class="empty">오늘은 조용한 하늘이에요. 🌙<br>아래 '다가오는 현상'을 미리 살펴볼까요?</div>`;

    // 다가오는
    html += `<h2 class="sec">다가오는 현상 (앞으로 ${UPCOMING_DAYS}일)</h2>`;
    html += soon.length
      ? soon.map(eventCard).join("")
      : `<div class="empty">앞으로 ${UPCOMING_DAYS}일 안에는 예정된 현상이 없어요.</div>`;

    $("#view").innerHTML = html;
  }

  /* =====================================================================
   *  탭 2: 이번 달 달력
   * ===================================================================== */
  const WEEK_HEAD = ["일", "월", "화", "수", "목", "금", "토"];

  function clampYM(ym) {
    const months = AstroData.monthsAvailable();
    if (!months.length) return AstroData.ymOf(TODAY);
    if (months.includes(ym)) return ym;
    // 범위를 벗어나면 오늘 달 또는 가장 가까운 달
    return months.includes(AstroData.ymOf(TODAY)) ? AstroData.ymOf(TODAY) : months[0];
  }

  function renderCalendar() {
    if (!ui.cal.ym) ui.cal.ym = clampYM(AstroData.ymOf(TODAY));
    const ym = ui.cal.ym;
    const [y, m] = ym.split("-").map(Number);
    const months = AstroData.monthsAvailable();
    const idx = months.indexOf(ym);
    const hasPrev = idx > 0;
    const hasNext = idx >= 0 && idx < months.length - 1;

    // 날짜별 이벤트 묶기
    const monthEvents = AstroData.inMonth(ym);
    const byDay = {};
    monthEvents.forEach(e => { (byDay[e.date] ||= []).push(e); });

    // 기본 선택일
    if (!ui.cal.date || AstroData.ymOf(ui.cal.date) !== ym) {
      ui.cal.date = (AstroData.ymOf(TODAY) === ym) ? TODAY
                   : (monthEvents[0] ? monthEvents[0].date : `${ym}-01`);
    }

    // 달력 격자
    const firstDow = new Date(y, m - 1, 1).getDay();
    const daysInMonth = new Date(y, m, 0).getDate();
    let cells = "";
    for (let i = 0; i < firstDow; i++) cells += `<div class="cal-cell empty"></div>`;
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${ym}-${String(d).padStart(2, "0")}`;
      const has = byDay[ds]?.length;
      const isToday = ds === TODAY;
      const isSel = ds === ui.cal.date;
      const fav = has && byDay[ds].some(e => Favorites.isFav(e));   // 관심 등록된 현상이 있는 날
      cells += `
        <button class="cal-cell ${has ? "has" : ""} ${isToday ? "today" : ""} ${isSel ? "sel" : ""}"
                data-action="cal-day" data-date="${ds}" ${has ? "" : "disabled"}>
          <span class="cal-d">${d}</span>
          ${fav ? `<span class="cal-fav">★</span>` : ""}
          ${has ? `<span class="cal-dot">${has}</span>` : ""}
        </button>`;
    }

    // 아래 목록 (모드별)
    let list, listTitle;
    if (ui.cal.mode === "week") {
      list = AstroData.upcoming(TODAY, 6);
      listTitle = "이번 주 (오늘부터 7일)";
    } else if (ui.cal.mode === "month") {
      list = monthEvents;
      listTitle = `${m}월 전체`;
    } else {
      list = AstroData.onDate(ui.cal.date);
      listTitle = AstroData.pretty(ui.cal.date);
    }

    $("#view").innerHTML = `
      <div class="cal-nav">
        <button class="cal-arrow" data-action="cal-prev" ${hasPrev ? "" : "disabled"}>◀</button>
        <div class="cal-title">${y}년 ${m}월</div>
        <button class="cal-arrow" data-action="cal-next" ${hasNext ? "" : "disabled"}>▶</button>
      </div>
      <div class="cal-modes">
        <button class="chip ${ui.cal.mode === "day" ? "on" : ""}"   data-action="cal-mode" data-mode="day">오늘/선택일</button>
        <button class="chip ${ui.cal.mode === "week" ? "on" : ""}"  data-action="cal-mode" data-mode="week">이번 주</button>
        <button class="chip ${ui.cal.mode === "month" ? "on" : ""}" data-action="cal-mode" data-mode="month">이번 달 전체</button>
      </div>
      <div class="cal-grid-head">${WEEK_HEAD.map(w => `<div>${w}</div>`).join("")}</div>
      <div class="cal-grid">${cells}</div>
      <h2 class="sec">${listTitle}</h2>
      ${list.length ? list.map(eventCard).join("")
                    : `<div class="empty">이 기간에는 천문현상이 없어요.</div>`}
    `;
  }

  /* =====================================================================
   *  탭 3: 미션  (수행하면 관측 일지로 기록됨)
   * ===================================================================== */
  function renderMissions() {
    const missions = Missions.build(TODAY, UPCOMING_DAYS);
    let html = scoreBanner();
    html += `<p class="hint">🌟 미션을 수행하면 <b>관측 일지</b>에 자동으로 기록돼요.
             성공뿐 아니라 <b>'시도'만으로도 점수</b>를 받습니다! (날씨로 못 봐도 OK)</p>`;

    html += missions.length
      ? missions.map(missionCard).join("")
      : `<div class="empty">지금은 진행할 미션이 없어요. 다가오는 현상이 생기면 미션도 생겨요!</div>`;
    $("#view").innerHTML = html;
  }

  function missionCard(m) {
    const entry = Journal.forMission(m.id);
    const L = AstroData.DIFFICULTY_LABEL[m.difficulty];
    let body;

    if (entry && ui.openForm !== entry.id) {
      // 이미 기록됨 → 요약 보여주기
      const r = Journal.resultInfo(entry.result);
      const extra = [entry.sky && `하늘: ${entry.sky}`, entry.place && `장소: ${entry.place}`]
        .filter(Boolean).join(" · ");
      body = `
        <div class="mission-done">
          <span>${r.label} (+${r.points})${extra ? " · " + esc(extra) : ""}</span>
          <span class="row-btns">
            <button class="btn-clear" data-action="entry-edit" data-id="${esc(entry.id)}">기록 수정</button>
            <button class="btn-clear" data-action="entry-delete" data-id="${esc(entry.id)}">삭제</button>
          </span>
        </div>
        ${entry.note ? `<div class="entry-note">📝 ${esc(entry.note)}</div>` : ""}`;
    } else if (entry && ui.openForm === entry.id) {
      // 기록 상세 입력폼 (열린 상태)
      body = entryForm(entry, m);
    } else {
      // 아직 기록 안 함 → 결과 버튼
      body = `
        <div class="mission-actions">
          <button class="btn s-success" data-action="mission-result" data-status="success"
            data-mid="${esc(m.id)}" data-evdate="${esc(m.ev.date)}" data-evname="${esc(m.ev.event)}" data-mtitle="${esc(m.title)}">성공</button>
          <button class="btn s-partial" data-action="mission-result" data-status="partial"
            data-mid="${esc(m.id)}" data-evdate="${esc(m.ev.date)}" data-evname="${esc(m.ev.event)}" data-mtitle="${esc(m.title)}">일부</button>
          <button class="btn s-fail" data-action="mission-result" data-status="fail"
            data-mid="${esc(m.id)}" data-evdate="${esc(m.ev.date)}" data-evname="${esc(m.ev.event)}" data-mtitle="${esc(m.title)}">시도</button>
        </div>`;
    }

    return `
      <div class="card mission ${entry ? "is-done" : ""}">
        <div class="card-top">
          <span class="ev-name">${m.icon} ${esc(m.title)}</span>
          <span class="diff diff-${m.difficulty}">${L.emoji} ${L.text}</span>
        </div>
        <div class="card-sub">${AstroData.pretty(m.ev.date)} · ${esc(m.ev.event)}</div>
        <div class="mission-desc">${esc(m.desc)}</div>
        ${body}
      </div>`;
  }

  // 일지 상세 입력폼 (미션 안에서 펼쳐짐)
  function entryForm(entry, m) {
    return `
      <div class="entry-form" data-id="${esc(entry.id)}">
        <div class="ef-row">
          <label>관측 결과</label>
          <select class="ef-result">${options(Journal.RESULTS, entry.result, true)}</select>
        </div>
        <div class="ef-row">
          <label>하늘 상태</label>
          <select class="ef-sky">
            <option value="">선택 안 함</option>
            ${options(Journal.SKY, entry.sky)}
          </select>
        </div>
        <div class="ef-row">
          <label>관측 장소</label>
          <input class="ef-place" type="text" placeholder="집 앞, 학교 운동장 ..." value="${esc(entry.place)}">
        </div>
        <div class="ef-row">
          <label>느낀 점</label>
          <textarea class="ef-note" rows="2" placeholder="달이 생각보다 밝았다!">${esc(entry.note)}</textarea>
        </div>
        ${safePhotoSrc(entry.photo) ? `<div class="ef-photo-preview"><img src="${safePhotoSrc(entry.photo)}" alt="관측 사진"></div>` : ""}
        <div class="ef-row">
          <label>사진 ${entry.photo ? "바꾸기" : "추가"} (선택)</label>
          <input class="ef-photo" type="file" accept="image/*">
        </div>
        <div class="ef-actions">
          <button class="btn-big sm" data-action="entry-save" data-id="${esc(entry.id)}">저장 💾</button>
        </div>
      </div>`;
  }

  /* =====================================================================
   *  탭 4: 관측 일지
   * ===================================================================== */
  function renderJournal() {
    const entries = Journal.all();
    let html = scoreBanner();
    html += `<p class="hint">🔭 미션 결과가 여기에 모여요. 미션과 상관없는 관측도 직접 기록할 수 있어요.</p>`;

    // 직접 기록 버튼/폼
    html += ui.manualOpen ? manualForm()
      : `<button class="btn-big" data-action="journal-add-toggle">+ 직접 기록 추가</button>`;

    // 기록 목록
    html += `<h2 class="sec">내 관측 기록 (${entries.length})</h2>`;
    html += entries.length
      ? entries.map(journalCard).join("")
      : `<div class="empty">아직 기록이 없어요. 미션을 수행하거나 직접 기록을 추가해 보세요!</div>`;

    // 💾 백업/복원
    const s = Backup.stats();
    html += `
      <div class="backup">
        <div class="backup-title">💾 데이터 백업</div>
        <div class="backup-desc">
          기록과 사진은 이 브라우저에만 저장돼요. 파일로 백업해두면 컴퓨터를 바꿔도 안전해요.<br>
          현재 <b>기록 ${s.records}개 · 약 ${s.kb}KB</b>
        </div>
        <div class="backup-btns">
          <button class="btn-big sm" data-action="backup-export">📥 백업 파일 내보내기</button>
          <label class="btn-big sm backup-import">📤 백업 불러오기
            <input type="file" id="backup-file" accept="application/json,.json" hidden>
          </label>
        </div>
      </div>`;

    $("#view").innerHTML = html;
  }

  function manualForm() {
    return `
      <div class="card entry-form manual" data-id="new">
        <div class="ef-title">새 관측 기록</div>
        <div class="ef-row">
          <label>관측 날짜 (지난 날도 OK)</label>
          <input class="ef-date" type="date" value="${AstroData.today()}" max="${AstroData.today()}">
        </div>
        <div class="ef-row">
          <label>천문현상</label>
          <input class="ef-event" type="text" placeholder="예: 보름달, 페르세우스 유성우 ...">
        </div>
        <div class="ef-row">
          <label>관측 결과</label>
          <select class="ef-result">${options(Journal.RESULTS, "success", true)}</select>
        </div>
        <div class="ef-row">
          <label>하늘 상태</label>
          <select class="ef-sky"><option value="">선택 안 함</option>${options(Journal.SKY, "")}</select>
        </div>
        <div class="ef-row">
          <label>관측 장소</label>
          <input class="ef-place" type="text" placeholder="집 앞, 학교 운동장 ...">
        </div>
        <div class="ef-row">
          <label>느낀 점</label>
          <textarea class="ef-note" rows="2" placeholder="자유롭게 적어보세요"></textarea>
        </div>
        <div class="ef-row">
          <label>사진 추가 (선택)</label>
          <input class="ef-photo" type="file" accept="image/*">
        </div>
        <div class="ef-actions">
          <button class="btn-big sm" data-action="journal-add-save">저장 💾</button>
          <button class="btn-clear" data-action="journal-add-toggle">취소</button>
        </div>
      </div>`;
  }

  function journalCard(e) {
    const r = Journal.resultInfo(e.result);
    const tags = [
      e.source === "mission" ? `<span class="tag tag-mission">미션</span>` : "",
      e.sky ? `<span class="tag">🌤 ${esc(e.sky)}</span>` : "",
      e.place ? `<span class="tag">📍 ${esc(e.place)}</span>` : ""
    ].join("");
    return `
      <div class="card journal-card">
        <div class="card-top">
          <span class="ev-name">${esc(e.eventName || "관측 기록")}</span>
          <span class="result-badge result-${safeResult(e.result)}">${r.label}</span>
        </div>
        <div class="card-sub">관측일 ${AstroData.pretty(e.obsDate || e.at)}</div>
        ${tags ? `<div class="tags">${tags}</div>` : ""}
        ${safePhotoSrc(e.photo) ? `<div class="journal-photo"><img src="${safePhotoSrc(e.photo)}" alt="관측 사진"></div>` : ""}
        ${e.note ? `<div class="entry-note">📝 ${esc(e.note)}</div>` : ""}
        <div class="row-btns right">
          <button class="btn-clear" data-action="entry-delete" data-id="${esc(e.id)}">삭제</button>
        </div>
      </div>`;
  }

  /* =====================================================================
   *  탭 5: 퀴즈
   * ===================================================================== */
  let quizState = null;

  function renderQuiz() {
    if (!quizState) {
      const s = Quiz.load();
      $("#view").innerHTML = `
        <div class="quiz-intro">
          <div class="quiz-emoji">📝</div>
          <h2>오늘의 천문 퀴즈</h2>
          <p>오늘과 이번 달 천문현상으로 만든 <b>3문제</b>를 풀어봐요.</p>
          ${s.plays ? `<p class="hint">최고 점수: <b>${s.best} / 3</b> · 지금까지 ${s.plays}번 도전</p>` : ""}
          <button class="btn-big" data-action="quiz-start">퀴즈 시작 🚀</button>
        </div>`;
      return;
    }
    renderQuestion();
  }

  function startQuiz() {
    quizState = { questions: Quiz.build(TODAY), current: 0, score: 0, answered: false };
    renderQuestion();
  }

  function renderQuestion() {
    const st = quizState;
    const q = st.questions[st.current];
    const choicesHtml = q.choices.map((c, i) =>
      `<button class="choice" data-action="quiz-answer" data-i="${i}">${esc(c)}</button>`).join("");
    $("#view").innerHTML = `
      <div class="quiz-head">
        <span>문제 ${st.current + 1} / ${st.questions.length}</span>
        <span>점수 ${st.score}</span>
      </div>
      <div class="card quiz-card">
        <div class="q-text">${esc(q.q)}</div>
        <div class="choices">${choicesHtml}</div>
        <div class="q-feedback" id="q-feedback"></div>
        <button class="btn-big hidden" id="q-next" data-action="quiz-next"></button>
      </div>`;
  }

  function answerQuiz(i) {
    const st = quizState;
    if (st.answered) return;
    st.answered = true;
    const q = st.questions[st.current];
    const correct = i === q.answerIndex;
    if (correct) st.score++;
    $$(".choice").forEach((btn, idx) => {
      btn.disabled = true;
      if (idx === q.answerIndex) btn.classList.add("right");
      else if (idx === i) btn.classList.add("wrong");
    });
    $("#q-feedback").innerHTML =
      `<div class="${correct ? "fb-ok" : "fb-no"}">
         ${correct ? "⭕ 정답!" : "❌ 아쉬워요"}<br>
         <span class="fb-explain">${esc(q.explain)}</span>
       </div>`;
    const nextBtn = $("#q-next");
    nextBtn.classList.remove("hidden");
    nextBtn.textContent = st.current + 1 < st.questions.length ? "다음 ▶" : "결과 보기 🎯";
  }

  function nextQuiz() {
    const st = quizState;
    if (st.current + 1 < st.questions.length) {
      st.current++; st.answered = false; renderQuestion();
    } else {
      Quiz.recordResult(st.score, st.questions.length);
      const msg = st.score === 3 ? "완벽해요! 🌟" : st.score === 2 ? "잘했어요! 👍"
                : st.score === 1 ? "좋은 시작이에요 🙂" : "다음엔 더 잘할 수 있어요 💪";
      $("#view").innerHTML = `
        <div class="quiz-intro">
          <div class="quiz-emoji">🎯</div>
          <h2>${st.score} / ${st.questions.length} 점</h2>
          <p>${msg}</p>
          <button class="btn-big" data-action="quiz-start">다시 풀기 🔄</button>
        </div>`;
      quizState = null;
    }
  }

  /* =====================================================================
   *  버튼 처리 (이벤트 위임)
   * ===================================================================== */
  function efRead(scope) {
    return {
      result: $(".ef-result", scope)?.value,
      sky:    $(".ef-sky", scope)?.value || "",
      place:  $(".ef-place", scope)?.value.trim() || "",
      note:   $(".ef-note", scope)?.value.trim() || "",
      event:  $(".ef-event", scope)?.value.trim() || ""
    };
  }

  // 미션에 연결된 일지 항목 저장(수정) — 사진 포함
  async function saveMissionEntry(scope, id) {
    const v = efRead(scope);
    const patch = { result: v.result, sky: v.sky, place: v.place, note: v.note };
    const photo = await readPhoto(scope);
    if (photo) patch.photo = photo;            // 새 사진 골랐을 때만 교체
    if (Journal.update(id, patch) === null) {
      alert("저장하지 못했어요. 사진이 너무 크면 더 작은 사진으로 다시 해보세요.");
      return;
    }
    ui.openForm = null; renderHeader(); rerender();
  }

  // 직접 기록 저장 — 과거 날짜 + 사진 포함
  async function saveManualEntry(scope) {
    const v = efRead(scope);
    const obsDate = $(".ef-date", scope)?.value || AstroData.today();
    const photo = await readPhoto(scope);
    const ok = Journal.add({
      source: "manual", eventName: v.event || "관측 기록", eventDate: "",
      obsDate, result: v.result, sky: v.sky, place: v.place, note: v.note, photo: photo || ""
    });
    if (ok === null) {
      alert("저장 공간이 부족해요. 사진을 빼거나 더 작은 사진을 써보세요.");
      return;
    }
    ui.manualOpen = false; renderHeader(); renderJournal();
  }

  function onViewClick(e) {
    const t = e.target.closest("[data-action]");
    if (!t) return;
    const a = t.dataset.action;

    switch (a) {
      case "star": {
        Favorites.toggle({ date: t.dataset.date, event: t.dataset.event });
        rerender();
        break;
      }
      case "mission-result": {
        // 미션 결과 → 일지에 새 기록 만들고, 상세 입력폼 펼치기
        const prevXp = Journal.totalPoints();
        const entry = Journal.add({
          source: "mission",
          missionId: t.dataset.mid,
          missionTitle: t.dataset.mtitle,
          eventDate: t.dataset.evdate,
          eventName: t.dataset.evname,
          result: t.dataset.status
        });
        if (entry) {
          ui.openForm = entry.id;
          celebrate(Journal.resultInfo(t.dataset.status).points, prevXp); // XP·레벨업 연출
          renderMissions();
        }
        break;
      }
      case "entry-edit": {
        ui.openForm = t.dataset.id;
        renderMissions();
        break;
      }
      case "entry-save": {
        saveMissionEntry(t.closest(".entry-form"), t.dataset.id);
        break;
      }
      case "entry-delete": {
        Journal.remove(t.dataset.id);
        ui.openForm = null;
        renderHeader();
        rerender();
        break;
      }
      case "journal-add-toggle": {
        ui.manualOpen = !ui.manualOpen;
        renderJournal();
        break;
      }
      case "journal-add-save": {
        saveManualEntry(t.closest(".entry-form"));
        break;
      }
      case "cal-prev": case "cal-next": {
        const months = AstroData.monthsAvailable();
        const i = months.indexOf(ui.cal.ym);
        const ni = a === "cal-prev" ? i - 1 : i + 1;
        if (ni >= 0 && ni < months.length) { ui.cal.ym = months[ni]; ui.cal.date = null; renderCalendar(); }
        break;
      }
      case "cal-mode": {
        ui.cal.mode = t.dataset.mode;
        renderCalendar();
        break;
      }
      case "cal-day": {
        ui.cal.mode = "day";
        ui.cal.date = t.dataset.date;
        renderCalendar();
        break;
      }
      case "card-toggle": { const c = t.closest(".ev-card"); if (c) c.classList.toggle("open"); break; }
      case "backup-export": Backup.download(); break;
      case "goto-mission": switchTab("mission"); break;
      case "quiz-start":  startQuiz(); break;
      case "quiz-answer": answerQuiz(Number(t.dataset.i)); break;
      case "quiz-next":   nextQuiz(); break;
    }
  }

  // 백업 파일 선택 → 복원 (#view의 change 이벤트로 처리)
  function onViewChange(e) {
    const t = e.target;
    if (t.id !== "backup-file" || !t.files || !t.files[0]) return;
    const reader = new FileReader();
    reader.onload = () => {
      const ok = confirm("불러온 백업으로 지금 기록을 덮어쓸까요?\n(이 기기에 저장된 현재 내용이 바뀝니다)");
      if (ok) {
        const r = Backup.importJSON(reader.result);
        if (r.ok) {
          alert(`복원 완료! ${r.exportedAt ? "(" + r.exportedAt + " 백업)" : ""}`);
          renderHeader(); renderJournal();
        } else {
          alert(r.error);
        }
      }
      t.value = ""; // 같은 파일 다시 고를 수 있게 초기화
    };
    reader.onerror = () => { alert("파일을 읽지 못했어요."); t.value = ""; };
    reader.readAsText(t.files[0]);
  }

  /* =====================================================================
   *  탭 전환 + 시작
   * ===================================================================== */
  const TABS = {
    today: renderToday, calendar: renderCalendar,
    mission: renderMissions, journal: renderJournal, quiz: renderQuiz
  };

  function rerender() { TABS[ui.tab](); }

  function switchTab(name) {
    ui.tab = name;
    ui.openForm = null;
    ui.manualOpen = false;
    quizState = null;
    $$(".tab").forEach(t => t.classList.toggle("active", t.dataset.tab === name));
    rerender();
  }

  function renderDataNote() {
    const m = AstroData.meta();
    const note = $("#data-note");
    if (m.source === "api") {
      note.innerHTML = `✅ 실제 천문연구원 데이터 (${m.year}년${m.fetchedAt ? ", " + m.fetchedAt + " 받음" : ""})`;
      note.classList.remove("warn");
    } else {
      note.innerHTML = `⚠️ 지금은 <b>예시 데이터</b>예요. (실제 데이터는 tools/fetch-astro.mjs 로 교체)`;
      note.classList.add("warn");
    }
  }

  function init() {
    renderHeader();
    renderDataNote();
    $$(".tab").forEach(tab =>
      tab.addEventListener("click", () => switchTab(tab.dataset.tab)));
    $("#view").addEventListener("click", onViewClick);
    $("#view").addEventListener("change", onViewChange);
    switchTab("today");
  }

  document.addEventListener("DOMContentLoaded", init);
})();
