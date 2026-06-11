/* =========================================================================
 *  cloud.js — 사진을 Firebase Storage에 올리고 주소(URL)를 돌려줌
 *
 *  · 설정(cloud-config.js)이 채워져 있을 때만 동작
 *  · Firebase SDK는 필요할 때만 불러옴(설정 안 했으면 아예 안 불러옴)
 *  · 업로드 실패/미설정이면 null → 앱은 기기 저장으로 자동 폴백
 * ========================================================================= */

const Cloud = (() => {
  let initPromise = null;
  const SDK = "https://www.gstatic.com/firebasejs/10.12.2/";

  function cfg() { return window.FIREBASE_CONFIG || {}; }
  function configured() {
    const c = cfg();
    return !!(c.apiKey && c.storageBucket && c.projectId);
  }

  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = src; s.onload = () => res(); s.onerror = () => rej(new Error("load " + src));
      document.head.appendChild(s);
    });
  }

  // 한 번만 초기화 (SDK 로드 + 익명 로그인)
  function init() {
    if (initPromise) return initPromise;
    initPromise = (async () => {
      if (!configured()) return false;
      try {
        if (typeof firebase === "undefined" || !firebase.storage) {
          await loadScript(SDK + "firebase-app-compat.js");
          await loadScript(SDK + "firebase-auth-compat.js");
          await loadScript(SDK + "firebase-storage-compat.js");
        }
        if (!firebase.apps.length) firebase.initializeApp(cfg());
        await firebase.auth().signInAnonymously();
        return true;
      } catch (e) {
        console.warn("[Cloud] 초기화 실패:", e.message);
        return false;
      }
    })();
    return initPromise;
  }

  // data URL → 클라우드 업로드 → 다운로드 URL 반환(실패 시 null)
  async function uploadDataUrl(dataUrl) {
    if (!dataUrl || !configured()) return null;
    if (!(await init())) return null;
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const path = `photos/${Date.now()}_${Math.floor(Math.random() * 1e6)}.jpg`;
      const ref = firebase.storage().ref(path);
      await ref.put(blob, { contentType: "image/jpeg" });
      return await ref.getDownloadURL();
    } catch (e) {
      console.warn("[Cloud] 업로드 실패:", e.message);
      return null;
    }
  }

  return { configured, init, uploadDataUrl };
})();
