/* =========================================================================
 *  data.js — 데이터 다루는 도우미 (날짜 / 용어사전 / 난이도)
 *  앱의 "지식 엔진" 역할. 미션과 퀴즈가 이 파일을 사용합니다.
 * ========================================================================= */

const AstroData = (() => {

  /* ---------- 1. 오늘 날짜 ----------
   * 개발/시연 편의를 위해, 주소창에 ?today=2026-06-11 을 붙이면
   * 그 날짜를 "오늘"로 가정합니다. 없으면 진짜 오늘 날짜.
   */
  function today() {
    const params = new URLSearchParams(location.search);
    const fake = params.get("today");
    if (fake) return fake;
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mm}-${dd}`;
  }

  function ymOf(dateStr) {            // "2026-06-11" -> "2026-06"
    return dateStr.slice(0, 7);
  }

  // 날짜 보기 좋게: "2026-06-11" -> "6월 11일 (목)"
  const WEEK = ["일", "월", "화", "수", "목", "금", "토"];
  function pretty(dateStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const w = new Date(y, m - 1, d).getDay();
    return `${m}월 ${d}일 (${WEEK[w]})`;
  }

  // 두 날짜 차이(일). b - a
  function daysBetween(a, b) {
    const [ay, am, ad] = a.split("-").map(Number);
    const [by, bm, bd] = b.split("-").map(Number);
    const ta = Date.UTC(ay, am - 1, ad);
    const tb = Date.UTC(by, bm - 1, bd);
    return Math.round((tb - ta) / 86400000);
  }

  /* ---------- 2. 용어 사전 ----------
   * 어려운 천문 용어를 중학생 눈높이로 풀어줍니다.
   * 미션/퀴즈에서 이 설명을 가져다 씁니다.
   */
  const GLOSSARY = [
    { term: "합삭",          alias: ["삭"],         easy: "달이 태양과 같은 방향에 있어 거의 보이지 않는 날이에요." },
    { term: "보름달",        alias: ["망", "보름"], easy: "달이 가장 둥글고 밝게 보이는 시기예요." },
    { term: "상현달",        alias: ["상현"],       easy: "오른쪽이 밝은 반달이에요. 초저녁에 잘 보여요." },
    { term: "하현달",        alias: ["하현"],       easy: "왼쪽이 밝은 반달이에요. 새벽에 잘 보여요." },
    { term: "최대이각",      alias: [],             easy: "행성이 태양에서 가장 멀리 떨어져 보여서, 관측하기 가장 좋은 때예요." },
    { term: "동방최대이각",  alias: [],             easy: "행성이 태양의 동쪽으로 가장 멀어진 때. 해 진 뒤 서쪽 하늘에서 보여요." },
    { term: "서방최대이각",  alias: [],             easy: "행성이 태양의 서쪽으로 가장 멀어진 때. 해 뜨기 전 동쪽 하늘에서 보여요." },
    { term: "근일점",        alias: [],             easy: "지구가 태양에 가장 가까워지는 지점이에요." },
    { term: "원일점",        alias: [],             easy: "지구가 태양에서 가장 멀어지는 지점이에요." },
    { term: "근지점",        alias: [],             easy: "달이 지구에 가장 가까워지는 때. 달이 평소보다 조금 커 보여요." },
    { term: "원지점",        alias: [],             easy: "달이 지구에서 가장 멀어지는 때. 달이 평소보다 조금 작아 보여요." },
    { term: "충",            alias: [],             easy: "행성이 태양 반대쪽에 와서 밤새 잘 보이는, 관측하기 좋은 때예요." },
    { term: "외합",          alias: [],             easy: "행성이 태양 너머 반대편에 있어, 한동안 보기 어려운 때예요." },
    { term: "내합",          alias: [],             easy: "수성·금성이 지구와 태양 사이에 들어와, 보기 어려운 때예요." },
    { term: "합",            alias: [],             easy: "두 천체가 하늘에서 아주 가까이 붙어 보이는 때예요." },
    { term: "유성우",        alias: [],             easy: "짧은 시간에 별똥별(유성)이 여러 개 떨어지는 현상이에요." },
    { term: "개기일식",      alias: [],             easy: "달이 태양을 완전히 가려서 한낮에 어두워지는 현상이에요." },
    { term: "금환일식",      alias: ["금환식"],     easy: "달이 태양 가운데를 가려, 가장자리만 반지처럼 빛나는 일식이에요." },
    { term: "부분일식",      alias: [],             easy: "달이 태양의 일부만 가리는 현상이에요." },
    { term: "월식",          alias: ["개기월식", "부분월식"], easy: "지구 그림자가 달을 가려 달이 어두워지거나 붉어지는 현상이에요." },
    { term: "근접",          alias: ["접근"],       easy: "두 천체가 하늘에서 서로 가까이 보이는 때예요." },
    { term: "춘분",          alias: [],             easy: "낮과 밤의 길이가 거의 같아지는 봄의 절기예요." },
    { term: "추분",          alias: [],             easy: "낮과 밤의 길이가 거의 같아지는 가을의 절기예요." },
    { term: "하지",          alias: [],             easy: "1년 중 낮이 가장 긴 날이에요." },
    { term: "동지",          alias: [],             easy: "1년 중 밤이 가장 긴 날이에요." }
  ];

  // 현상 이름(또는 비고) 안에 들어있는 용어를 찾아 설명을 돌려줌
  function explain(text) {
    if (!text) return null;
    for (const g of GLOSSARY) {
      const keys = [g.term, ...g.alias];
      if (keys.some(k => text.includes(k))) return g;
    }
    return null;
  }

  /* ---------- 3. 관측 난이도 ----------
   * 현상 이름/시간/비고를 보고 "보기 쉬움 / 보통 / 어려움"을 추정합니다.
   * (1차 버전의 단순 규칙. 날씨·지역은 아직 고려하지 않음)
   */
  function difficulty(ev) {
    const t = (ev.event || "") + " " + (ev.remarks || "");

    // 한국에서 볼 수 없는 현상이면 어려움 (예: "금환일식(국내 관측 불가)")
    if (/관측\s*불가|볼 수 없|국외|해외|보이지 않|미관측/.test(t)) return "hard";

    // 망원경/특수 조건이 명시되면 어려움
    if (/망원경|육안.?(불가|어려)/.test(t)) return "hard";

    // 보름달·반달·일식·월식 등 크고 눈에 띄는 것은 쉬움
    if (/(보름|망|상현|하현|반달|개기일식|금환일식|개기월식|부분월식|월식)/.test(t)) {
      return "easy";
    }

    // 새벽 시간대(00~05시)면 한 단계 어렵게
    const hour = ev.time ? Number(ev.time.split(":")[0]) : null;
    const isDawn = hour !== null && hour >= 0 && hour <= 5;

    // 행성/유성우/이각/근접류는 보통, 새벽이면 어려움
    if (/(행성|수성|금성|화성|목성|토성|천왕성|해왕성|유성우|이각|근접|접근|합|충)/.test(t)) {
      return isDawn ? "hard" : "medium";
    }

    return "medium";
  }

  const DIFFICULTY_LABEL = {
    easy:   { text: "보기 쉬움", emoji: "🟢", tip: "맨눈으로도 볼 수 있어요." },
    medium: { text: "보통",     emoji: "🟡", tip: "쌍안경이 있으면 더 좋아요." },
    hard:   { text: "어려움",   emoji: "🔴", tip: "망원경이나 어두운 하늘이 필요할 수 있어요." }
  };

  /* ---------- 4. 이벤트 가져오기 ----------- */
  function all() {
    const list = (window.ASTRO_DATA && window.ASTRO_DATA.events) || [];
    // 날짜가 온전한(YYYY-MM-DD) 현상만 사용 (혹시 모를 요약 행 방어)
    return list.filter(e => /^\d{4}-\d{2}-\d{2}$/.test(e.date));
  }
  function sortedAll() {
    return all().slice().sort((a, b) =>
      a.date === b.date ? (a.time || "").localeCompare(b.time || "")
                        : a.date.localeCompare(b.date));
  }
  function onDate(dateStr) {
    return sortedAll().filter(e => e.date === dateStr);
  }
  function inMonth(ym) {
    return sortedAll().filter(e => ymOf(e.date) === ym);
  }
  // 오늘부터 N일 이내(앞으로) 다가오는 현상
  function upcoming(fromDate, days) {
    return sortedAll().filter(e => {
      const diff = daysBetween(fromDate, e.date);
      return diff >= 0 && diff <= days;
    });
  }
  function meta() {
    return window.ASTRO_DATA || { source: "sample", year: 2026 };
  }

  // 이벤트를 가리키는 고유 키 (관심·일지·미션이 공통으로 사용)
  function keyOf(ev) { return `${ev.date}|${ev.event}`; }
  function byKey(key) { return all().find(e => keyOf(e) === key) || null; }

  // 데이터에 들어있는 "연-월" 목록 (달력 이동 범위)
  function monthsAvailable() {
    return [...new Set(all().map(e => ymOf(e.date)))].sort();
  }

  return {
    today, ymOf, pretty, daysBetween,
    GLOSSARY, explain,
    difficulty, DIFFICULTY_LABEL,
    all, sortedAll, onDate, inMonth, upcoming, meta,
    keyOf, byKey, monthsAvailable
  };
})();
