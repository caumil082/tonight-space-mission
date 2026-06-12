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

  const clean = s => (s || "").replace(/\s+/g, " ").trim();

  // 인포박스(관측 데이터·특성 표) 파싱 → [{type:'header',label} | {type:'row',label,value}]
  async function infobox(lang, title) {
    const u = `https://${lang}.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=text&section=0&format=json&redirects=1&origin=*`;
    const r = await fetch(u);
    const d = await r.json();
    const html = d && d.parse && d.parse.text && d.parse.text["*"];
    if (!html) return [];
    const doc = new DOMParser().parseFromString(html, "text/html");
    const box = doc.querySelector(".infobox");
    if (!box) return [];
    box.querySelectorAll("sup, .reference, style, .mw-editsection, .noprint").forEach(e => e.remove());

    const rows = [];
    box.querySelectorAll("tr").forEach(tr => {
      const ths = tr.querySelectorAll(":scope > th");
      const tds = tr.querySelectorAll(":scope > td");
      // 섹션 헤더: th 하나만(값 없음)
      if (ths.length === 1 && tds.length === 0) {
        const cls = ths[0].className || "";
        if (/infobox-above|infobox-image|infobox-subheader/.test(cls)) return; // 제목/이미지 줄 제외
        const label = clean(ths[0].textContent);
        if (label && label.length < 40) rows.push({ type: "header", label });
        return;
      }
      // 라벨=값: (th+td) 또는 (td+td)
      let label = "", value = "";
      if (ths.length >= 1 && tds.length >= 1) { label = clean(ths[0].textContent); value = clean(tds[tds.length - 1].textContent); }
      else if (tds.length >= 2) { label = clean(tds[0].textContent); value = clean(tds[1].textContent); }
      if (label && value && label.length < 40 && value.length < 200) rows.push({ type: "row", label, value });
    });
    return rows.slice(0, 26);
  }

  // 검색: 한국어 → (없으면) 영어. 요약 + 인포박스 함께 반환
  async function search(q) {
    for (const lang of ["ko", "en"]) {
      try {
        const title = await searchTitle(lang, q);
        if (!title) continue;
        const s = await summary(lang, title);
        if (s && s.extract) {
          s.info = await infobox(lang, s.title).catch(() => []);
          return s;
        }
      } catch (e) { /* 다음 언어로 */ }
    }
    return null;
  }

  return { search, infobox };
})();
