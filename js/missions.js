/* =========================================================================
 *  missions.js — 우주 미션 "만들기"
 *
 *  이제 미션의 결과/점수는 journal.js(관측 일지)가 맡습니다.
 *  이 파일은 "어떤 미션을 보여줄지"만 정합니다.
 *  (미션을 수행하면 그 결과가 관측 일지 한 줄로 저장됩니다.)
 * ========================================================================= */

const Missions = (() => {

  /* ---------- 이벤트 → 미션 만들기 ----------
   * 현상 종류에 맞는 미션을 자동으로 골라줍니다.
   */
  function missionFor(ev) {
    const t = (ev.event || "") + " " + (ev.remarks || "");
    const id = AstroData.keyOf(ev);
    const diff = AstroData.difficulty(ev);

    let title, desc, icon;

    if (/(보름|망)/.test(t)) {
      icon = "🌕"; title = "보름달 스케치 미션";
      desc = "오늘 보름달을 보고 모양을 그림으로 그려보세요. 크레이터(달의 무늬)도 찾아봐요.";
    } else if (/(상현|하현|반달)/.test(t)) {
      icon = "🌗"; title = "반달 관찰 미션";
      desc = "반달의 밝은 쪽과 어두운 쪽 경계선을 자세히 살펴보세요. 울퉁불퉁 보이나요?";
    } else if (/유성우/.test(t)) {
      icon = "☄️"; title = "별똥별 세기 미션";
      desc = "어두운 곳에서 하늘을 보며 30분 동안 별똥별이 몇 개 떨어지는지 세어보세요.";
    } else if (/(이각|근접|접근|합|충|행성|수성|금성|화성|목성|토성)/.test(t)) {
      icon = "🪐"; title = "행성 찾기 미션";
      desc = "별자리 앱과 함께 오늘의 행성을 찾아보세요. 별과 달리 반짝이지 않고 또렷하면 행성!";
    } else if (/(일식|월식)/.test(t)) {
      icon = "🌒"; title = "식(蝕) 관찰 미션";
      desc = "해/달이 가려지는 모습을 안전하게 관찰하고, 시작과 끝 시간을 적어보세요.";
    } else {
      icon = "📣"; title = "가족에게 1분 설명 미션";
      desc = `오늘의 천문현상 "${ev.event}"을(를) 가족에게 1분 동안 쉽게 설명해 주세요.`;
    }

    return { id, ev, icon, title, desc, difficulty: diff };
  }

  // 오늘 + 다가오는 며칠의 미션들
  function build(fromDate, days) {
    return AstroData.upcoming(fromDate, days).map(missionFor);
  }

  return { missionFor, build };
})();
