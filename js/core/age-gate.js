(() => {
  if (!window.__AGE_GATE_ENABLED__) {
    const wraps = document.querySelectorAll('.site-wrap');
    const wrap = wraps && wraps.length ? wraps[0] : null;
    if (!wrap) return;
    wrap.classList.remove('locked');
    return;
  }
  // 19+ AGE GATE LOGIC
  (function () {
    /* ===============================
       ✅ Google Search Console 인증 파일 예외 (HTML 파일 인증용)
       이 파일은 '콘텐츠 페이지'가 아니라 소유권 확인용이므로
       연령 확인/오버레이/리다이렉트가 걸리면 인증이 실패합니다.
       =============================== */
    if (location.pathname === "/google07546e3047e63bb0.html") {
      // 인증 파일은 팝업/스크롤락 없이 그대로 노출
      return;
    }
    const gate = document.getElementById("ageGate");
    const wraps = document.querySelectorAll(".site-wrap");
    const wrap = wraps && wraps.length ? wraps[0] : null;
    if (!gate || !wrap) return;

    // navigation type: 'navigate' | 'reload' | 'back_forward' | 'prerender'
    const navEntry =
      performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
    const navType = navEntry
      ? navEntry.type
      : performance.navigation && performance.navigation.type === 1
        ? "reload"
        : "navigate";

    const ref = document.referrer || "";
    let refOrigin = "";
    try {
      refOrigin = ref ? new URL(ref).origin : "";
    } catch (e) {
      refOrigin = "";
    }

    const isInternal = refOrigin && refOrigin === location.origin;
    const shouldShow = navType === "reload" || !isInternal; // 새로고침이면 무조건, 외부/직접 진입이면 표시

    function show() {
      gate.classList.add("show");
      document.body.classList.add("no-scroll");
      wrap.classList.add("locked");
      // 포커스
      gate.focus({ preventScroll: true });
    }
    function hide() {
      gate.classList.remove("show");
      document.body.classList.remove("no-scroll");
      wrap.classList.remove("locked");

      if (typeof window.loadGA4 === "function") window.loadGA4();

      // ✅ GA4: 성인 인증 통과 (세션 1회)
      try {
        // ✅ GA4: 성인 인증 통과 (누락 최소화 버전)
        try {
          if (!sessionStorage.getItem("jg_age_event_sent")) {
            if (typeof window.loadGA4 === "function") window.loadGA4();

            setTimeout(() => {
              if (typeof window.gtag === "function") {
                window.gtag("event", "age_gate_passed", {
                  page: location.pathname,
                });
                sessionStorage.setItem("jg_age_event_sent", "1");
              }
            }, 200);
          }
        } catch (e) {}
      } catch (e) {}

      sessionStorage.setItem("jg_age_ok", "1");
    }

    // 버튼
    gate.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-age]");
      if (!btn) return;

      const action = btn.getAttribute("data-age");
      if (action === "enter") {
        hide();
      } else {
        // 나가기: 이전 페이지가 있으면 back, 없으면 빈 페이지로
        if (ref) {
          history.back();
        } else {
          location.replace("about:blank");
        }
      }
    });

    // ESC 방지(필요하면 나중에 풀어도 됨)
    document.addEventListener(
      "keydown",
      (e) => {
        if (!gate.classList.contains("show")) return;
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
        }
      },
      true
    );

    // 표시/비표시 결정
    if (shouldShow) {
      show();
    } else {
      // 내부 이동이면 바로 콘텐츠 노출
      wrap.classList.remove("locked");
      if (typeof window.loadGA4 === "function") window.loadGA4();
    }
  })();
})();
