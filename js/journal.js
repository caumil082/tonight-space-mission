/* =========================================================================
 *  journal.js — 관측 일지 (탐구 기록)
 *
 *  핵심: "미션 결과"가 곧 "관측 일지 한 줄"이 됩니다.
 *   - 미션에서 성공/일부/시도를 누르면 여기에 기록이 만들어지고,
 *   - 하늘 상태·장소·느낀 점을 덧붙일 수 있습니다.
 *   - 미션과 상관없이 "직접 기록"도 추가할 수 있습니다.
 *
 *  점수·배지도 이 기록들을 기준으로 계산합니다.
 *  (성공만 점수 주지 않음 — "시도"도 점수! 날씨 실패가 많은 관측 특성 반영)
 * ========================================================================= */

const Journal = (() => {

  const STORE_KEY = "tonight.journal.v1";

  // 선택지(드롭다운용)
  const RESULTS = [
    { value: "success", label: "🎉 성공",     points: 30 },
    { value: "partial", label: "🌥 일부 관측", points: 20 },
    { value: "fail",    label: "🌧 시도(못 봄)", points: 10 }
  ];
  const SKY = ["맑음", "구름 조금", "구름 많음", "흐림", "비", "미세먼지"];

  function resultInfo(value) {
    return RESULTS.find(r => r.value === value) || RESULTS[0];
  }

  /* ---------- 저장소 ----------
   * entries: 배열. 각 항목:
   *  { id, at, eventDate, eventName, result, sky, place, note,
   *    source:"mission"|"manual", missionId, missionTitle }
   */
  function load() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; }
    catch { return []; }
  }
  // 저장. 용량 초과(사진이 너무 큼) 등으로 실패하면 false 를 돌려줍니다.
  function saveAll(arr) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(arr)); return true; }
    catch (e) { return false; }
  }

  // 간단한 id 만들기 (시간 함수 없이도 충돌 안 나게)
  function newId() {
    const arr = load();
    const max = arr.reduce((m, e) => Math.max(m, Number(e.id) || 0), 0);
    return String(max + 1);
  }

  function add(entry) {
    const arr = load();
    const full = {
      id: newId(),
      at: AstroData.today(),                       // 기록한 날 (자동)
      obsDate: entry.obsDate || AstroData.today(),  // 관측한 날 (과거 입력 가능)
      eventDate: entry.eventDate || "",
      eventName: entry.eventName || "",
      result: entry.result || "success",
      sky: entry.sky || "",
      place: entry.place || "",
      note: entry.note || "",
      photo: entry.photo || "",                     // 사진 (작게 압축한 data URL)
      source: entry.source || "manual",
      missionId: entry.missionId || "",
      missionTitle: entry.missionTitle || ""
    };
    arr.push(full);
    if (!saveAll(arr)) return null;                 // 용량 초과 시 저장 취소
    return full;
  }

  function update(id, patch) {
    const arr = load();
    const i = arr.findIndex(e => e.id === id);
    if (i < 0) return null;
    const backup = arr[i];
    arr[i] = { ...arr[i], ...patch };
    if (!saveAll(arr)) { arr[i] = backup; return null; } // 실패하면 되돌림
    return arr[i];
  }

  function remove(id) {
    saveAll(load().filter(e => e.id !== id));
  }

  function all() {
    // 관측 날짜가 최근인 순(같으면 최근 기록이 위로) — 과거 관측도 시간순으로 잘 섞임
    return load().slice().sort((a, b) => {
      const da = a.obsDate || a.at || "", db = b.obsDate || b.at || "";
      return db.localeCompare(da) || (Number(b.id) - Number(a.id));
    });
  }

  // 특정 미션에 연결된 기록 찾기
  function forMission(missionId) {
    return load().find(e => e.source === "mission" && e.missionId === missionId) || null;
  }

  /* ---------- 점수 / 배지 ---------- */
  function totalPoints() {
    return load().reduce((sum, e) => sum + resultInfo(e.result).points, 0);
  }
  function badge(points) {
    if (points >= 200) return { name: "우주 탐험가",   emoji: "🚀" };
    if (points >= 120) return { name: "별 사냥꾼",     emoji: "🔭" };
    if (points >= 60)  return { name: "달 관찰자",     emoji: "🌙" };
    if (points >= 20)  return { name: "새내기 관측가", emoji: "✨" };
    return { name: "관측 입문", emoji: "🌱" };
  }

  return {
    RESULTS, SKY, resultInfo,
    add, update, remove, all, forMission,
    totalPoints, badge
  };
})();
