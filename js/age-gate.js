/* ===============================
   GLOBAL AGE GATE CONTROLLER
   =============================== */

/*
  🔥 컨트롤 스위치
  false → 완전 OFF (현재 상태)
  true  → 유흥 관련 페이지에서만 동작
*/
const AGE_GATE_ENABLED = false;

/*
  세션이 아니라 영구 저장
  브라우저에 한 번 확인하면 다시 안 뜸
*/
const AGE_GATE_STORAGE_KEY = "age_gate_confirmed_v1";

/* ===============================
   유흥 페이지 여부 판단
   필요 시 키워드 추가 가능
   =============================== */
function isAdultPage() {
  const path = location.pathname.toLowerCase();

  return (
    path.includes("jejusi") ||
    path.includes("seogwipo") ||
    path.includes("karaoke") ||
    path.includes("bar") ||
    path.includes("jeju-info")
  );
}

/* ===============================
   Overlay 생성
   =============================== */
function createAgeGate() {

  // 이미 생성되어 있으면 중복 방지
  if (document.getElementById("ageGateOverlay")) return;

  const overlay = document.createElement("div");
  overlay.id = "ageGateOverlay";

  overlay.innerHTML = `
    <div class="age-box">
      <h2>19세 이상 이용 가능합니다</h2>
      <p>
        본 페이지는 성인 대상 정보가 포함될 수 있습니다.<br>
        19세 이상만 이용 가능합니다.
      </p>
      <button id="ageConfirmBtn">확인 후 입장</button>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById("ageConfirmBtn").addEventListener("click", () => {
    localStorage.setItem(AGE_GATE_STORAGE_KEY, "true");
    overlay.remove();
  });
}

/* ===============================
   초기 실행
   =============================== */
document.addEventListener("DOMContentLoaded", function () {

  // 1️⃣ 완전 OFF 상태면 즉시 종료
  if (!AGE_GATE_ENABLED) return;

  // 2️⃣ 유흥 페이지 아니면 종료
  if (!isAdultPage()) return;

  // 3️⃣ 이미 확인한 사용자면 종료
  const confirmed = localStorage.getItem(AGE_GATE_STORAGE_KEY);
  if (confirmed === "true") return;

  // 4️⃣ 게이트 생성
  createAgeGate();
});
