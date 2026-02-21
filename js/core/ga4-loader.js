(() => {
  // GA4 (JEJU GUIDE) - load only after age-gate confirm
  window.__GA4_ID__ = "G-5861XGW6LD";
  window.__ga4Loaded__ = false;

  function __gaDebugModeEnabled__() {
    try {
      const sp = new URLSearchParams(location.search);
      return sp.get("debug_mode") === "true" || sp.get("debug") === "1";
    } catch (e) {
      return false;
    }
  }

  // ✅ DebugView/Realtime에서 잘 보이게: 명시적 page_view 발화
  window.firePageView = function () {
    if (typeof window.gtag !== "function") return;
    window.gtag("event", "page_view", {
      page_location: location.href,
      page_path: location.pathname + location.search,
      page_title: document.title,
    });
  };

  window.loadGA4 = function () {
    if (window.__ga4Loaded__) return;
    window.__ga4Loaded__ = true;

    // 1) Load gtag.js
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + window.__GA4_ID__;
    document.head.appendChild(s);

    // 2) Init dataLayer + config (queue OK)
    window.dataLayer = window.dataLayer || [];
    function gtag() {
      dataLayer.push(arguments);
    }
    window.gtag = gtag;

    const debugMode = __gaDebugModeEnabled__();

    gtag("js", new Date());
    gtag("config", window.__GA4_ID__, {
      anonymize_ip: true,
      debug_mode: debugMode,
    });

    // ✅ 디버그 테스트 이벤트 1방 (DebugView에 거의 무조건 뜸)
    gtag("event", "debug_test", { source: "age_gate" });

    // ✅ page_view도 명시적으로 1방
    window.firePageView();
  };
})();
