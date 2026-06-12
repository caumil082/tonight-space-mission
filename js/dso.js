/* =========================================================================
 *  dso.js — 딥스카이 천체 목록 검색 (data/dso.js의 window.DSO 사용)
 *  · 이름/카탈로그 번호(M31, NGC 7000), 별자리, 등급 범위로 검색
 *  · 이미지: DSS(좌표 기반, hips2fits) 실사진
 *  데이터 출처: OpenNGC (자유 라이선스)
 * ========================================================================= */

const Dso = (() => {
  const norm = s => (s || "").toString().toLowerCase().replace(/\s+/g, "");
  function all() { return window.DSO || []; }

  // 목록에 있는 별자리(한글) 목록
  function constellations() {
    return [...new Set(all().map(o => o.k).filter(Boolean))].sort();
  }

  // 검색: {q 이름/번호, k 별자리, magMin, magMax}
  function search({ q, k, magMin, magMax } = {}) {
    const nq = norm(q);
    const res = all().filter(o => {
      if (k && o.k !== k) return false;
      if (magMin != null && (o.v == null || o.v < magMin)) return false;
      if (magMax != null && (o.v == null || o.v > magMax)) return false;
      if (nq) {
        const hay = norm(o.n) + norm(o.m) + norm(o.c);
        if (!hay.includes(nq)) return false;
      }
      return true;
    });
    return res.slice(0, 80);   // 너무 많지 않게
  }

  // DSS 실사진(좌표 기반)
  function imageUrl(o, fov = 0.6) {
    return `https://alasky.u-strasbg.fr/hips-image-services/hips2fits?hips=CDS/P/DSS2/color&ra=${o.r}&dec=${o.d}&fov=${fov}&width=400&height=400&projection=TAN&format=jpg`;
  }

  return { all, constellations, search, imageUrl };
})();
