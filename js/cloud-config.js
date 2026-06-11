/* =========================================================================
 *  cloud-config.js — Firebase(사진 클라우드) 설정
 *
 *  ⚠️ 이 값들은 "비밀키"가 아니라 공개해도 되는 설정값입니다.
 *     (실제 보안은 Firebase 콘솔의 "Storage 보안 규칙"이 담당해요)
 *
 *  ✅ 켜는 방법 (5분, 무료):
 *   1) https://console.firebase.google.com 에서 프로젝트 생성
 *   2) 빌드 > Storage 시작하기 (지역 선택)
 *   3) 빌드 > Authentication > 로그인 방법 > "익명" 사용 설정
 *   4) 프로젝트 설정(⚙️) > 내 앱 > 웹앱 추가 → firebaseConfig 값 복사
 *   5) 아래 빈 칸에 붙여넣기
 *   6) Storage > 규칙(Rules)에 아래 규칙 붙여넣기:
 *
 *      rules_version = '2';
 *      service firebase.storage {
 *        match /b/{bucket}/o {
 *          match /photos/{file} {
 *            allow read: if true;
 *            allow write: if request.auth != null
 *                         && request.resource.size < 5 * 1024 * 1024
 *                         && request.resource.contentType.matches('image/.*');
 *          }
 *        }
 *      }
 *
 *  값이 비어 있으면 사진은 "이 기기에만" 저장됩니다(기존과 동일).
 * ========================================================================= */

window.FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};
