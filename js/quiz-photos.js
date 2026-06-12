/* =========================================================================
 *  quiz-photos.js — 사진 맞추기 퀴즈용 이미지 목록
 *  · 행성·달·우주 = 실제 사진(NASA/허블, 위키미디어 공용)
 *  · 별자리 = 공식 별자리 그림(IAU 차트)  ← 실사진은 구분이 어려워서
 *  이미지는 위키미디어 Special:FilePath로 불러옵니다(공개 자료).
 * ========================================================================= */

window.QUIZ_PHOTOS = (function () {
  const F = f => "https://commons.wikimedia.org/wiki/Special:FilePath/" + encodeURIComponent(f) + "?width=480";
  return [
    // 행성 + 달 (실사진)
    { name: "수성",   cat: "행성", url: F("Mercury in color - Prockter07-edit1.jpg") },
    { name: "금성",   cat: "행성", url: F("Venus-real color.jpg") },
    { name: "지구",   cat: "행성", url: F("The Earth seen from Apollo 17.jpg") },
    { name: "화성",   cat: "행성", url: F("OSIRIS Mars true color.jpg") },
    { name: "목성",   cat: "행성", url: F("Jupiter by Cassini-Huygens.jpg") },
    { name: "토성",   cat: "행성", url: F("Saturn during Equinox.jpg") },
    { name: "천왕성", cat: "행성", url: F("Uranus2.jpg") },
    { name: "해왕성", cat: "행성", url: F("Neptune Full.jpg") },
    { name: "달",     cat: "행성", url: F("FullMoon2010.jpg") },
    // 우주 (실사진)
    { name: "안드로메다은하", cat: "우주", url: F("Andromeda Galaxy (with h-alpha).jpg") },
    { name: "오리온 대성운",  cat: "우주", url: F("Orion Nebula - Hubble 2006 mosaic 18000.jpg") },
    { name: "게 성운",        cat: "우주", url: F("Crab Nebula.jpg") },
    // 별자리 (공식 IAU 차트)
    { name: "오리온자리",     cat: "별자리", url: F("Orion IAU.svg") },
    { name: "큰곰자리",       cat: "별자리", url: F("Ursa Major IAU.svg") },
    { name: "카시오페이아자리", cat: "별자리", url: F("Cassiopeia IAU.svg") },
    { name: "전갈자리",       cat: "별자리", url: F("Scorpius IAU.svg") },
    { name: "사자자리",       cat: "별자리", url: F("Leo IAU.svg") },
    { name: "백조자리",       cat: "별자리", url: F("Cygnus IAU.svg") },
    { name: "염소자리",       cat: "별자리", url: F("Capricornus IAU.svg") }
  ];
})();
