/* =========================================================================
 *  quiz-photos.js — 사진 맞추기 퀴즈용 이미지 목록 (위키미디어 공개 자료)
 *  · 행성·달·태양·명왕성, 우주(은하·성운·성단) = 실제 사진
 *  · 별자리 = 공식 별자리 그림(IAU 차트)  ← 실사진은 구분이 어려워서
 *  모든 URL은 미리 로드 테스트로 검증함.
 * ========================================================================= */

window.QUIZ_PHOTOS = (function () {
  const F = f => "https://commons.wikimedia.org/wiki/Special:FilePath/" + encodeURIComponent(f) + "?width=480";
  return [
    // 🪐 행성·달·태양·명왕성 (실사진)
    { name: "수성",   cat: "행성", url: F("Mercury in color - Prockter07-edit1.jpg") },
    { name: "금성",   cat: "행성", url: F("Venus-real color.jpg") },
    { name: "지구",   cat: "행성", url: F("The Earth seen from Apollo 17.jpg") },
    { name: "화성",   cat: "행성", url: F("OSIRIS Mars true color.jpg") },
    { name: "목성",   cat: "행성", url: F("Jupiter by Cassini-Huygens.jpg") },
    { name: "토성",   cat: "행성", url: F("Saturn during Equinox.jpg") },
    { name: "천왕성", cat: "행성", url: F("Uranus2.jpg") },
    { name: "해왕성", cat: "행성", url: F("Neptune Full.jpg") },
    { name: "달",     cat: "행성", url: F("FullMoon2010.jpg") },
    { name: "태양",   cat: "행성", url: F("The Sun in white light.jpg") },
    { name: "명왕성", cat: "행성", url: F("Pluto in True Color - High-Res.jpg") },
    // 🌌 우주: 은하·성운·성단 (실사진)
    { name: "안드로메다은하", cat: "우주", url: F("Andromeda Galaxy (with h-alpha).jpg") },
    { name: "오리온 대성운",  cat: "우주", url: F("Orion Nebula - Hubble 2006 mosaic 18000.jpg") },
    { name: "게 성운",        cat: "우주", url: F("Crab Nebula.jpg") },
    { name: "소용돌이 은하",  cat: "우주", url: F("Messier51 sRGB.jpg") },
    { name: "솜브레로 은하",  cat: "우주", url: F("M104 ngc4594 sombrero galaxy hi-res.jpg") },
    { name: "고리 성운",      cat: "우주", url: F("M57 The Ring Nebula.JPG") },
    { name: "말머리 성운",    cat: "우주", url: F("Horsehead-Hubble.jpg") },
    { name: "플레이아데스 성단", cat: "우주", url: F("Pleiades large.jpg") },
    { name: "창조의 기둥",    cat: "우주", url: F("Eagle nebula pillars.jpg") },
    // ✨ 별자리 (공식 IAU 차트)
    { name: "오리온자리",       cat: "별자리", url: F("Orion IAU.svg") },
    { name: "큰곰자리",         cat: "별자리", url: F("Ursa Major IAU.svg") },
    { name: "작은곰자리",       cat: "별자리", url: F("Ursa Minor IAU.svg") },
    { name: "카시오페이아자리", cat: "별자리", url: F("Cassiopeia IAU.svg") },
    { name: "전갈자리",         cat: "별자리", url: F("Scorpius IAU.svg") },
    { name: "사자자리",         cat: "별자리", url: F("Leo IAU.svg") },
    { name: "백조자리",         cat: "별자리", url: F("Cygnus IAU.svg") },
    { name: "염소자리",         cat: "별자리", url: F("Capricornus IAU.svg") },
    { name: "쌍둥이자리",       cat: "별자리", url: F("Gemini IAU.svg") },
    { name: "황소자리",         cat: "별자리", url: F("Taurus IAU.svg") },
    { name: "안드로메다자리",   cat: "별자리", url: F("Andromeda IAU.svg") },
    { name: "페가수스자리",     cat: "별자리", url: F("Pegasus IAU.svg") },
    { name: "처녀자리",         cat: "별자리", url: F("Virgo IAU.svg") },
    { name: "사수자리",         cat: "별자리", url: F("Sagittarius IAU.svg") }
  ];
})();
