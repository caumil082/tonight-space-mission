/* =========================================================================
 *  fetch-astro.mjs — 천문현상 데이터를 "딱 한 번" 받아서 앱에 넣어주는 스크립트
 *
 *  공공데이터포털: 한국천문연구원_천문현상 정보 (XML)
 *  하는 일: 1년치(월 12번) 호출 → XML을 합쳐서 → data/events.js 로 저장
 *           (앱은 이 파일만 읽으므로, 평소엔 인터넷·서버·비용이 필요 없음)
 *
 *  ── 사용법 ───────────────────────────────────────────────────────────
 *    node tools/fetch-astro.mjs --key=서비스키 --year=2026
 *
 *    · --key  : 공공데이터포털에서 받은 "일반 인증키(Decoding)" 를 추천
 *    · --year : 받을 연도 (기본값 2026)
 *
 *  ※ Node 18 이상이면 별도 설치 없이 동작합니다(내장 fetch 사용).
 * ========================================================================= */

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "data", "events.js");

const API_PATH = "/B090041/openapi/service/AstroEventInfoService/getAstroEventInfo";
// data.go.kr은 https가 막힐 때가 있어, 실패하면 http로도 시도합니다.
const HOSTS = ["https://apis.data.go.kr", "http://apis.data.go.kr"];

/* ---------- 1. 실행 옵션 읽기 ---------- */
function getArg(name, fallback) {
  const hit = process.argv.find(a => a.startsWith(`--${name}=`));
  return hit ? hit.split("=").slice(1).join("=") : fallback;
}
const KEY   = getArg("key", process.env.DATA_GO_KR_KEY || "");
const START = Number(getArg("year", "2026"));        // 시작 연도
const END   = Number(getArg("to", String(START)));   // 끝 연도 (없으면 시작 연도와 같음)

if (!KEY) {
  console.error("\n❌ 서비스키가 필요해요.\n   예) node tools/fetch-astro.mjs --key=여기에_서비스키 --year=2026 --to=2027\n");
  process.exit(1);
}
if (END < START) {
  console.error("\n❌ --to 는 --year 보다 같거나 커야 해요. (예: --year=2026 --to=2027)\n");
  process.exit(1);
}

/* ---------- 2. XML에서 값 하나 꺼내는 아주 작은 도우미 ----------
 * 정식 XML 파서 없이도 되도록, 태그 사이 글자만 뽑습니다.
 */
function tag(xmlBlock, name) {
  const m = xmlBlock.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  return m ? m[1].trim() : "";
}
// "20260611" -> "2026-06-11"
function fmtDate(yyyymmdd) {
  const s = String(yyyymmdd);
  return s.length === 8 ? `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}` : s;
}
// 줄바꿈/HTML 문자 등을 정리 (API에 &#xD; 같은 문자가 섞여 있음)
function clean(s) {
  return (s || "")
    .replace(/&#xD;|&#xA;|\r|\n/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/\s+/g, " ").trim();
}

/* ---------- 인증키 처리 ----------
 * 공공데이터포털은 "Encoding"과 "Decoding" 두 가지 키를 줍니다.
 * - Decoding 키: 특수문자가 그대로 (예: a+b/c==)  → 우리가 URL 인코딩해야 함
 * - Encoding 키: 이미 인코딩됨 (예: a%2Bb%2Fc%3D%3D) → 그대로 써야 함
 * %xx 패턴이 보이면 이미 인코딩된 것으로 보고 그대로, 아니면 인코딩합니다.
 */
function keyParam() {
  const looksEncoded = /%[0-9A-Fa-f]{2}/.test(KEY);
  return looksEncoded ? KEY : encodeURIComponent(KEY);
}

/* ---------- 3. 한 달치 가져오기 ---------- */
async function fetchMonth(year, month) {
  const mm = String(month).padStart(2, "0");
  const query = `?serviceKey=${keyParam()}&solYear=${year}&solMonth=${mm}&numOfRows=100`;

  let xml = "", lastErr = null;
  for (const host of HOSTS) {            // https 먼저, 안 되면 http
    try {
      const res = await fetch(host + API_PATH + query);
      xml = await res.text();
      if (xml) break;
    } catch (e) { lastErr = e; }
  }
  if (!xml) throw new Error(`네트워크 오류 (${year}-${mm}): ${lastErr?.message || "응답 없음"}`);

  // 공공데이터포털 인증/오류 응답 감지
  const errMsg = tag(xml, "returnAuthMsg") || tag(xml, "errMsg") || tag(xml, "cmmMsgHeader");
  if (errMsg || /SERVICE_KEY|SERVICE ERROR|등록되지 않은/.test(xml)) {
    throw new Error(`API 오류 (${year}-${mm}): ${errMsg || xml.slice(0, 200)}\n   → 키가 'Decoding' 키인지, 활용신청이 승인됐는지 확인하세요.`);
  }

  const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
  return items.map(block => ({
    date:    fmtDate(tag(block, "locdate")),
    time:    clean(tag(block, "astroTime")),
    event:   clean(tag(block, "astroEvent")),
    remarks: clean(tag(block, "remarks"))
  // 날짜가 온전한(YYYY-MM-DD) 행만 사용 — '월별 해설' 같은 요약 행은 제외
  })).filter(e => /^\d{4}-\d{2}-\d{2}$/.test(e.date));
}

/* ---------- 4. 데이터 모으기 (여러 해 가능) ---------- */
async function run() {
  const yearLabel = START === END ? `${START}` : `${START}~${END}`;
  const months = (END - START + 1) * 12;
  console.log(`\n📡 ${yearLabel}년 천문현상 데이터를 받는 중... (월 ${months}번 호출)`);

  const all = [];
  for (let y = START; y <= END; y++) {
    for (let m = 1; m <= 12; m++) {
      process.stdout.write(`  - ${y}-${String(m).padStart(2,"0")} ... `);
      const rows = await fetchMonth(y, m);
      all.push(...rows);
      console.log(`${rows.length}건`);
    }
  }

  all.sort((a, b) =>
    a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date));

  const today = new Date();
  const stamp = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;

  const fileText =
`/* 자동 생성됨 — tools/fetch-astro.mjs 로 ${yearLabel}년 데이터를 받아 저장한 파일입니다.
   직접 고치지 마세요. 갱신하려면 스크립트를 다시 실행하면 됩니다. */
window.ASTRO_DATA = ${JSON.stringify({ source: "api", year: yearLabel, fetchedAt: stamp, events: all }, null, 2)};
`;

  await writeFile(OUT, fileText, "utf8");
  console.log(`\n✅ 완료! 총 ${all.length}건 저장 → data/events.js`);
  console.log(`   이제 index.html 을 열면 실제 데이터로 보입니다.\n`);
}

run().catch(err => {
  console.error("\n❌ 실패:", err.message, "\n");
  process.exit(1);
});
