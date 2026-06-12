/* =========================================================================
 *  geo.js — 현재 위치 + 그 위치의 하늘 상태(날씨)
 *    · 위치: 브라우저 GPS (키 없음, https에서 동작)
 *    · 날씨: Open-Meteo (키 없음, CORS 허용) → 하늘 상태로 변환
 *    · 지명: BigDataCloud 역지오코딩 (키 없음)
 * ========================================================================= */

const Geo = (() => {

  // 브라우저 GPS로 현재 좌표
  function getPosition() {
    return new Promise((res, rej) => {
      if (!navigator.geolocation) return rej(new Error("이 기기는 위치를 지원하지 않아요"));
      navigator.geolocation.getCurrentPosition(
        p => res({ lat: p.coords.latitude, lon: p.coords.longitude }),
        e => rej(new Error(e.code === 1 ? "위치 권한을 허용해 주세요" : "위치를 찾지 못했어요")),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });
  }

  // 좌표 → 지명(예: "서울특별시 동작구")
  async function reverseGeocode(lat, lon) {
    try {
      const r = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=ko`);
      const d = await r.json();
      const parts = [d.principalSubdivision, d.locality || d.city].filter(Boolean);
      return [...new Set(parts)].join(" ");   // 중복 지명 제거
    } catch { return ""; }
  }

  // 날씨 코드/구름양 → 하늘 상태 (Journal.SKY 값과 일치)
  function skyFrom(code, cloud) {
    if (code >= 45 && code <= 48) return "흐림";      // 안개
    if (code >= 51) return "비";                       // 이슬비·비·소나기·뇌우·눈 등 강수
    if (cloud == null) return code <= 1 ? "맑음" : code === 2 ? "구름 조금" : "흐림";
    if (cloud < 20) return "맑음";
    if (cloud < 50) return "구름 조금";
    if (cloud < 85) return "구름 많음";
    return "흐림";
  }

  // 현재 위치의 하늘 상태
  async function currentSky(lat, lon) {
    try {
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=weather_code,cloud_cover`);
      const d = await r.json();
      const c = d.current || {};
      return skyFrom(c.weather_code, c.cloud_cover);
    } catch { return ""; }
  }

  return { getPosition, reverseGeocode, skyFrom, currentSky };
})();
