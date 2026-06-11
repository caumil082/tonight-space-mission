/* =========================================================================
 *  backup.js — 데이터 백업/복원 (사진 포함)
 *
 *  기록·사진은 이 브라우저(localStorage)에만 저장됩니다.
 *  → 파일 하나로 통째로 내보내고(백업), 다시 불러오면(복원) 안전합니다.
 *  사진은 이미 data URL(글자) 형태라 JSON 안에 그대로 담깁니다.
 * ========================================================================= */

const Backup = (() => {

  const PREFIX = "tonight.";

  // tonight. 으로 시작하는 모든 저장값 모으기
  function collect() {
    const store = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) store[k] = localStorage.getItem(k);
    }
    return store;
  }

  function exportJSON() {
    return JSON.stringify({
      app: "tonight",
      version: 1,
      exportedAt: AstroData.today(),
      store: collect()
    }, null, 2);
  }

  // 백업 파일 다운로드
  function download() {
    const blob = new Blob([exportJSON()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tonight-backup-${AstroData.today()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // 백업 파일 내용으로 복원
  function importJSON(text) {
    let data;
    try { data = JSON.parse(text); }
    catch { return { ok: false, error: "파일을 읽을 수 없어요 (JSON 형식이 아니에요)." }; }

    if (!data || data.app !== "tonight" || !data.store) {
      return { ok: false, error: "Tonight 백업 파일이 아니에요." };
    }
    try {
      Object.entries(data.store).forEach(([k, v]) => {
        if (k.startsWith(PREFIX) && typeof v === "string") localStorage.setItem(k, v);
      });
    } catch (e) {
      return { ok: false, error: "저장 공간이 부족해 복원하지 못했어요." };
    }
    return { ok: true, exportedAt: data.exportedAt };
  }

  // 현재 저장 상태 요약 (기록 개수 · 대략 용량)
  function stats() {
    const store = collect();
    let bytes = 0;
    Object.entries(store).forEach(([k, v]) => { bytes += k.length + (v ? v.length : 0); });
    let records = 0;
    try { records = JSON.parse(store["tonight.journal.v1"] || "[]").length; } catch {}
    return { records, kb: Math.max(1, Math.round(bytes / 1024)) };
  }

  return { exportJSON, download, importJSON, stats };
})();
