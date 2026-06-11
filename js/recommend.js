/* =========================================================================
 *  recommend.js — "볼만한 현상" 추천 엔진
 *
 *  앱을 열자마자 "오늘/이번 달에 진짜 볼 게 있네!"를 느끼게 하는 핵심.
 *  현상마다 '볼만함 점수'를 매겨서 → 대표 이벤트(히어로)와 추천 배지를 만듭니다.
 *  (점수 기준은 1차 버전의 단순 규칙이며 언제든 조정 가능)
 * ========================================================================= */

const Recommend = (() => {

  // 유성우 이름 속 "ZHR=100" 같은 숫자(시간당 유성 수) 뽑기
  function zhr(text) {
    const m = text.match(/ZHR\s*=\s*(\d+)/);
    return m ? Number(m[1]) : 0;
  }

  // 현상 하나를 평가 → { score, tier, reason, icon }
  function evaluate(ev) {
    const t = (ev.event || "") + " " + (ev.remarks || "");

    // 한국에서 볼 수 없으면 추천에서 제외
    if (/관측\s*불가|볼 수 없|국외|미관측|보이지 않/.test(t)) {
      return { score: 0, tier: null, reason: "한국에서는 볼 수 없어요", icon: "🚫" };
    }

    let s = 0, reason = "", icon = "✨";

    if (/유성우/.test(t)) {
      const z = zhr(t);
      s = 60 + Math.min(z, 150) / 3;                 // ZHR 클수록 가산 (최대 +50)
      reason = z ? `별똥별이 시간당 최대 ${z}개` : "별똥별이 쏟아져요";
      icon = "☄️";
    } else if (/개기월식|개기일식/.test(t)) {
      s = 90; reason = "해·달이 가려지는 장관"; icon = "🌑";
    } else if (/부분월식|부분일식/.test(t)) {
      s = 55; reason = "해·달의 일부가 가려져요"; icon = "🌒";
    } else if (/충/.test(t)) {
      s = 58; reason = "행성을 가장 잘 보는 날"; icon = "🪐";
    } else if (/망|보름/.test(t)) {
      s = 42; reason = "둥근 보름달"; icon = "🌕";
      if (/한가위|추석/.test(t)) { s += 20; reason = "한가위 보름달"; }
    } else if (/금성.*최대이각/.test(t)) {
      s = 48; reason = "금성을 보기 가장 좋은 때"; icon = "🔭";
    } else if (/최대이각/.test(t)) {
      s = 32; reason = "행성을 보기 좋은 때"; icon = "🔭";
    } else if (/근접|접근/.test(t)) {
      s = 26; reason = "두 천체가 나란히 보여요"; icon = "🌙";
      if (/금성|목성|토성|화성/.test(t)) s += 6;     // 밝은 행성이면 가산
    } else if (/상현|하현|반달/.test(t)) {
      s = 18; reason = "반달"; icon = "🌓";
    } else if (/하지|동지|춘분|추분/.test(t)) {
      s = 12; reason = "계절의 절기"; icon = "📅";
    } else {
      s = 5;
    }

    // 맨눈으로 보기 쉬우면 약간 가산
    if (AstroData.difficulty(ev) === "easy") s += 5;

    s = Math.round(s);
    const tier = s >= 70 ? "must" : s >= 38 ? "good" : null;  // must=강력추천, good=추천
    return { score: s, tier, reason, icon };
  }

  function isHighlight(ev) { return !!evaluate(ev).tier; }

  // 현상 이름에서 행성 뽑기
  function planetIn(t) {
    const m = t.match(/(수성|금성|화성|목성|토성|천왕성|해왕성)/);
    return m ? m[1] : "행성";
  }
  // 정식 이름을 보기 좋게: "(IMO 기준)" "(ZHR=..)" "극대기" 등 정리
  function cleanName(name) {
    return (name || "")
      .replace(/\((?:IMO|NASA)[^)]*\)/g, "")
      .replace(/\(ZHR[^)]*\)/g, "")
      .replace(/극대기/g, "극대")
      .replace(/\s+/g, " ").trim();
  }

  /* ---------- 히어로/카드에 보여줄 "설득 문구" ----------
   * headline(친근한 제목) · hook(한 줄 후킹) · tip(관측 꿀팁)
   */
  function present(ev) {
    const t = (ev.event || "") + " " + (ev.remarks || "");
    const e = evaluate(ev);
    let headline = cleanName(ev.event);
    let hook = e.reason;
    let tipOverride = null;

    if (/유성우/.test(t)) {
      const z = zhr(t);
      const m = ev.event.match(/(.+?유성우)/);
      headline = m ? m[1] : "유성우";
      hook = z >= 100 ? `밤하늘에 별똥별이 쏟아져요 — 1시간에 최대 ${z}개!`
           : z        ? `별똥별 보며 소원 빌기 좋은 밤 (1시간 최대 ${z}개)`
           :            "별똥별이 여러 개 떨어지는 밤이에요";
      // 유성우는 맨눈이 정답 (쌍안경은 시야가 좁아 불리), 관측 적기는 보통 새벽
      tipOverride = "맨눈으로 보세요 · 어두운 곳에서 · 새벽이 관측 적기";
    } else if (/개기월식/.test(t)) {
      headline = "개기월식"; hook = "달이 붉게 물드는 밤! 맨눈으로 볼 수 있어요";
    } else if (/개기일식/.test(t)) {
      headline = "개기일식"; hook = "한낮이 깜깜해지는 우주쇼";
    } else if (/충/.test(t)) {
      const p = planetIn(t); headline = `${p} 충`;
      hook = `${p}이 1년 중 가장 크고 밝게 보이는 날!`;
    } else if (/망|보름/.test(t)) {
      headline = /한가위|추석/.test(t) ? "한가위 보름달" : "보름달";
      hook = "둥근 보름달이 밤하늘을 환하게 밝혀요";
    } else if (/금성.*최대이각/.test(t)) {
      headline = "금성 최대이각"; hook = "초저녁 서쪽 하늘, 금성이 가장 또렷하게 빛나요";
    } else if (/최대이각/.test(t)) {
      const p = planetIn(t); headline = `${p} 최대이각`;
      hook = `${p}을(를) 관측하기 가장 좋은 때예요`;
    } else if (/근접|접근/.test(t)) {
      hook = "두 천체가 하늘에서 나란히 — 예쁜 한 컷이에요";
    }

    // 관측 꿀팁: 장비 + 시간대
    const d = AstroData.difficulty(ev);
    const hour = ev.time ? Number(ev.time.split(":")[0]) : null;
    const when = (hour !== null && hour >= 0 && hour <= 5) ? "새벽에 잘 보여요"
               : (hour !== null && hour >= 18) ? "초저녁~밤에 보여요" : "";
    const gear = d === "easy" ? "맨눈으로 OK"
               : d === "medium" ? "쌍안경 있으면 더 좋아요"
               : "망원경/어두운 하늘이 필요해요";
    const tip = tipOverride || [gear, when].filter(Boolean).join(" · ");

    return { icon: e.icon, headline, hook, tip };
  }

  // 다가오는 N일 안에서 가장 볼만한 현상 1개 (대표 이벤트)
  function hero(fromDate, days) {
    const up = AstroData.upcoming(fromDate, days)
      .map(e => ({ ev: e, ...evaluate(e) }))
      .filter(x => x.tier);
    if (!up.length) return null;
    up.sort((a, b) => b.score - a.score || a.ev.date.localeCompare(b.ev.date));
    return up[0];
  }

  return { evaluate, isHighlight, hero, present };
})();
