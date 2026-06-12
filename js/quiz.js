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

  // ⭐ 사진 맞추기: 특정 이미지(item)로 문제 만들기 (보기는 같은 종류에서 우선)
  function qFor(item) {
    const all = window.QUIZ_PHOTOS || [];
    let distract = sample(all.filter(p => p.cat === item.cat && p.name !== item.name), 3).map(p => p.name);
    if (distract.length < 3) {
      const more = all.filter(p => p.name !== item.name && !distract.includes(p.name)).map(p => p.name);
      distract = distract.concat(sample(more, 3 - distract.length));
    }
    const { choices, answerIndex } = makeChoices(item.name, distract);
    const q = item.cat === "행성" ? "이 사진 속 천체는 무엇일까요?"
            : item.cat === "별자리" ? "이 별자리는 무엇일까요?"
            : "이 우주 사진은 무엇일까요?";
    return { kind: "photo", q, image: item.url, choices, answerIndex, explain: `정답은 "${item.name}" 입니다.` };
  }

  // 최근 출제 기록(반복 방지)
  const SEEN_KEY = "tonight.quizseen.v1";
  function loadSeen() { try { return JSON.parse(localStorage.getItem(SEEN_KEY)) || []; } catch { return []; } }
  function saveSeen(names) {
    const prev = loadSeen().filter(n => !names.includes(n));
    localStorage.setItem(SEEN_KEY, JSON.stringify([...names, ...prev].slice(0, 14)));
  }
  // 후보에서 1개 뽑기 (이미 고른 것·최근 출제 제외, 없으면 완화)
  function pickItem(list, seen, chosen) {
    const taken = new Set(chosen.map(c => c.name));
    let pool = list.filter(p => !taken.has(p.name) && !seen.includes(p.name));
    if (!pool.length) pool = list.filter(p => !taken.has(p.name));
    return pool.length ? sample(pool, 1)[0] : null;
  }

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
   * 기본: 사진 맞추기(행성·우주·별자리). 이미지 목록이 없으면 글자 퀴즈로 폴백.
   */
  function build(fromDate) {
    const photos = window.QUIZ_PHOTOS || [];
    if (photos.length >= 4) {
      const seen = loadSeen();
      const byCat = {};
      photos.forEach(p => (byCat[p.cat] = byCat[p.cat] || []).push(p));
      const cats = shuffle(Object.keys(byCat));   // 행성/우주/별자리 골고루
      const chosen = [];
      for (const c of cats) { if (chosen.length >= 3) break; const it = pickItem(byCat[c], seen, chosen); if (it) chosen.push(it); }
      while (chosen.length < 3) { const it = pickItem(photos, seen, chosen); if (!it) break; chosen.push(it); }
      saveSeen(chosen.map(c => c.name));
      return shuffle(chosen).map(qFor);
    }
    // 폴백(이미지 못 불러올 때): 기존 글자 퀴즈
    const ym = AstroData.ymOf(fromDate);
    let events = AstroData.inMonth(ym);
    if (events.length < 2) events = AstroData.sortedAll();
    const questions = [];
    if (events.length >= 1) questions.push(qEvent(events));
    questions.push(qTerm(events.length ? events : AstroData.sortedAll()));
    while (questions.length < 3) questions.push(qTerm(AstroData.sortedAll()));
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
