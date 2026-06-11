/* =========================================================================
 *  favorites.js — 관심 이벤트 저장 (☆)
 *  아이들이 보고 싶은 천문현상을 ☆로 저장하고 메모를 남깁니다.
 *  저장 위치: 브라우저 localStorage (회원가입 없음)
 * ========================================================================= */

const Favorites = (() => {

  const STORE_KEY = "tonight.favorites.v1";

  // 형태: { "2026-06-29|보름달(망)": { date, event, memo, at } }
  function load() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }
    catch { return {}; }
  }
  function save(obj) { localStorage.setItem(STORE_KEY, JSON.stringify(obj)); }

  function isFav(ev) { return !!load()[AstroData.keyOf(ev)]; }

  // ☆ 눌렀을 때: 켜기/끄기 토글
  function toggle(ev) {
    const map = load();
    const key = AstroData.keyOf(ev);
    if (map[key]) {
      delete map[key];
    } else {
      map[key] = { date: ev.date, event: ev.event, memo: "", at: AstroData.today() };
    }
    save(map);
    return !!map[key];
  }

  function setMemo(ev, memo) {
    const map = load();
    const key = AstroData.keyOf(ev);
    if (map[key]) { map[key].memo = memo; save(map); }
  }

  // 저장된 관심 목록 (날짜순)
  function all() {
    return Object.entries(load())
      .map(([key, v]) => ({ key, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  function count() { return Object.keys(load()).length; }

  return { isFav, toggle, setMemo, all, count };
})();
