/* =========================================================================
 *  quiz.js — 오늘/이번 달 현상으로 3문제 퀴즈 자동 만들기
 *  문제 유형: ① 현상 맞히기  ② 용어 뜻 맞히기  ③ 관측 난이도 맞히기
 * ========================================================================= */

const Quiz = (() => {

  const STORE_KEY = "tonight.quiz.v1";

  /* ---------- 작은 도우미 ---------- */
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function sample(arr, n) {
    return shuffle(arr).slice(0, n);
  }
  // 정답 + 가짜보기들을 섞고, 정답 위치를 알려줌
  function makeChoices(correct, distractors, n = 4) {
    const wrong = sample(distractors.filter(d => d !== correct), n - 1);
    const choices = shuffle([correct, ...wrong]);
    return { choices, answerIndex: choices.indexOf(correct) };
  }

  // 가짜 보기로 쓸 "그럴듯하지만 오늘은 아닌" 현상 이름들
  const FAKE_EVENTS = [
    "개기월식", "부분일식", "토성 충", "목성 충",
    "화성 접근", "수성 서방최대이각", "사분의자리 유성우 극대",
    "쌍둥이자리 유성우 극대", "금성 동방최대이각", "달과 목성 근접"
  ];

  /* ---------- 문제 만들기 ---------- */

  // ① 현상 맞히기: 진짜 현상 1개 vs 가짜 현상들
  function qEvent(events) {
    const ev = sample(events, 1)[0];
    const realNames = events.map(e => e.event);
    const distractors = FAKE_EVENTS.filter(f => !realNames.includes(f));
    const { choices, answerIndex } = makeChoices(ev.event, distractors);
    return {
      kind: "event",
      q: `${AstroData.pretty(ev.date)} 즈음, 실제로 볼 수 있는 천문현상은 무엇일까요?`,
      choices, answerIndex,
      explain: `정답은 "${ev.event}" 입니다. (${ev.remarks || "이번 달 천문현상"})`
    };
  }

  // ② 용어 뜻 맞히기
  function qTerm(events) {
    // 이번 달 현상에 들어있는 용어 우선, 없으면 사전에서 아무거나
    let g = null;
    for (const e of shuffle(events)) {
      const found = AstroData.explain(e.event + " " + e.remarks);
      if (found) { g = found; break; }
    }
    if (!g) g = sample(AstroData.GLOSSARY, 1)[0];

    const distractors = AstroData.GLOSSARY.map(x => x.easy);
    const { choices, answerIndex } = makeChoices(g.easy, distractors);
    return {
      kind: "term",
      q: `'${g.term}'은(는) 무슨 뜻일까요?`,
      choices, answerIndex,
      explain: `'${g.term}' = ${g.easy}`
    };
  }

  // ③ 관측 난이도 맞히기
  function qDifficulty(events) {
    const ev = sample(events, 1)[0];
    const diff = AstroData.difficulty(ev);
    const L = AstroData.DIFFICULTY_LABEL;
    const correct = `${L[diff].emoji} ${L[diff].text}`;
    const choices = ["easy", "medium", "hard"].map(k => `${L[k].emoji} ${L[k].text}`);
    return {
      kind: "difficulty",
      q: `"${ev.event}"의 관측 난이도는 어느 정도일까요?`,
      choices,
      answerIndex: choices.indexOf(correct),
      explain: `"${ev.event}"은(는) ${correct} — ${L[diff].tip}`
    };
  }

  /* ---------- 3문제 세트 만들기 ----------
   * 이번 달 현상을 재료로 씁니다. 현상이 너무 적으면 용어 문제로 채웁니다.
   */
  function build(fromDate) {
    const ym = AstroData.ymOf(fromDate);
    let events = AstroData.inMonth(ym);
    if (events.length < 2) events = AstroData.sortedAll(); // 이번 달이 비면 전체에서

    const questions = [];
    if (events.length >= 1) {
      questions.push(qEvent(events));
      questions.push(qDifficulty(events));
    }
    questions.push(qTerm(events.length ? events : AstroData.sortedAll()));

    // 항상 3문제가 되도록 보충
    while (questions.length < 3) {
      questions.push(qTerm(AstroData.sortedAll()));
    }
    return questions.slice(0, 3);
  }

  /* ---------- 점수/기록 저장 ---------- */
  const DAILY_LIMIT = 10;                 // 하루 최대 풀이 횟수
  const DEFAULTS = { correct: 0, best: 0, plays: 0, day: "", playsToday: 0 };

  function load() {
    try { return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem(STORE_KEY)) || {}); }
    catch { return Object.assign({}, DEFAULTS); }
  }
  function save(s) { localStorage.setItem(STORE_KEY, JSON.stringify(s)); }

  // 오늘 푼 횟수 / 남은 횟수
  function playsToday() {
    const s = load();
    return s.day === AstroData.today() ? (s.playsToday || 0) : 0;
  }
  function remainingToday() { return Math.max(0, DAILY_LIMIT - playsToday()); }
  function canPlay() { return remainingToday() > 0; }

  function recordResult(score, total) {
    const s = load();
    const today = AstroData.today();
    if (s.day !== today) { s.day = today; s.playsToday = 0; }  // 날짜 바뀌면 리셋
    s.playsToday += 1;
    s.plays += 1;
    s.correct = (s.correct || 0) + score;     // 맞춘 문제 누적 (성공 횟수)
    s.best = Math.max(s.best || 0, score);
    s.at = today;
    save(s);
    return s;
  }

  return { build, load, recordResult, DAILY_LIMIT, playsToday, remainingToday, canPlay };
})();
