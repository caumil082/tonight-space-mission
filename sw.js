/* =========================================================================
 *  sw.js — 서비스워커 (네트워크 우선)
 *  · 인터넷이 있으면 항상 최신 파일을 받아옴 (캐시 스트레스 없음)
 *  · 인터넷이 없으면 마지막으로 받아둔 캐시로 동작 (오프라인 지원)
 *  · 외부 자원(위키미디어 사진, Firebase, 날씨 API 등)은 건드리지 않음
 * ========================================================================= */

const CACHE = "tonight-v1";

self.addEventListener("install", (e) => {
  self.skipWaiting();   // 새 워커 즉시 대기 해제
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))); // 옛 캐시 정리
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;  // 외부 도메인은 그대로(가로채지 않음)

  e.respondWith((async () => {
    try {
      // 네트워크 우선: 항상 최신 시도 + 성공 시 캐시에 저장
      const fresh = await fetch(req);
      const cache = await caches.open(CACHE);
      cache.put(req, fresh.clone());
      return fresh;
    } catch (err) {
      // 오프라인: 캐시 → (없으면) 페이지 이동은 index로 폴백
      const cached = await caches.match(req);
      if (cached) return cached;
      if (req.mode === "navigate") {
        const idx = await caches.match("./") || await caches.match("./index.html");
        if (idx) return idx;
      }
      throw err;
    }
  })());
});
