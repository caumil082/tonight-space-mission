/* =========================================================================
 *  wiki.js — 천체 이름 검색 → 위키백과 정보 가져오기
 *  · 한국어 위키백과 우선, 없으면 영어 위키백과
 *  · 공개 API(키 없음, CORS 허용): 검색으로 제목 찾고 → 요약 가져오기
 * ========================================================================= */

const Wiki = (() => {

  async function searchTitle(lang, q) {
    const u = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&srlimit=1&format=json&origin=*`;
    const r = await fetch(u);
    const d = await r.json();
    const hit = d && d.query && d.query.search && d.query.search[0];
    return hit ? hit.title : null;
  }

  async function summary(lang, title) {
    const u = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
    const r = await fetch(u);
    if (!r.ok) return null;
    const d = await r.json();
    if (d.type === "disambiguation") return null;     // 동음이의어 페이지는 건너뜀
    return {
      title: d.title || title,
      description: d.description || "",
      extract: d.extract || "",
      thumb: (d.thumbnail && d.thumbnail.source) || "",
      url: (d.content_urls && d.content_urls.desktop && d.content_urls.desktop.page) || "",
      lang
    };
  }

  // 검색: 한국어 → (없으면) 영어
  async function search(q) {
    for (const lang of ["ko", "en"]) {
      try {
        const title = await searchTitle(lang, q);
        if (!title) continue;
        const s = await summary(lang, title);
        if (s && s.extract) return s;
      } catch (e) { /* 다음 언어로 */ }
    }
    return null;
  }

  return { search };
})();
