(() => {
  // ✅ GA4: 협력업체 클릭 추적 (누락 최소화)
  (function () {
    document.addEventListener(
      "click",
      function (e) {
        const a = e.target.closest && e.target.closest("a[href]");
        if (!a) return;

        const href = a.getAttribute("href") || "";
        const m = href.match(/pages\/shops\/ads1\/(ads1-\d{2})\.html$/);
        if (!m) return;

        if (typeof window.loadGA4 === "function") window.loadGA4();
        if (typeof window.gtag !== "function") return;

        const go = () => {
          location.href = a.href;
        };

        window.gtag("event", "partner_click", {
          partner_id: m[1],
          page: location.pathname,
          event_callback: go,
          event_timeout: 2000,
        });

        if (!a.target) {
          e.preventDefault();
          setTimeout(go, 2200);
        }
      },
      true
    );
  })();
})();
