(() => {
  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  }

  function ensureCanonical(head) {
    const existing = document.querySelector('link[rel="canonical"]');
    if (existing) return existing;

    const el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    el.setAttribute("href", location.origin + location.pathname);
    head.appendChild(el);
    return el;
  }

  function canonicalHrefFromEl(canonicalEl) {
    if (!canonicalEl) return location.origin + location.pathname;

    const raw = canonicalEl.getAttribute("href");
    if (raw) {
      try {
        return new URL(raw, location.href).href;
      } catch (_) {
        // fall through
      }
    }

    return canonicalEl.href || location.origin + location.pathname;
  }

  function ensureOgUrl(head, canonicalHref) {
    const existing = document.querySelectorAll(
      'meta[property="og:url"], meta[name="og:url"]',
    );

    const hasMatching = Array.from(existing).some(
      (m) => (m.getAttribute("content") || "") === canonicalHref,
    );
    if (hasMatching) return;

    const meta = document.createElement("meta");
    meta.setAttribute("property", "og:url");
    meta.setAttribute("content", canonicalHref);
    head.appendChild(meta);
  }

  function ensureRobots(head) {
    const existing = document.querySelector('meta[name="robots"]');
    if (existing) return;

    const meta = document.createElement("meta");
    meta.setAttribute("name", "robots");
    meta.setAttribute("content", "index,follow");
    head.appendChild(meta);
  }

  onReady(() => {
    const head = document.head || document.getElementsByTagName("head")[0];
    if (!head) return;

    const canonicalEl = ensureCanonical(head);
    const canonicalHref = canonicalHrefFromEl(canonicalEl);

    ensureOgUrl(head, canonicalHref);
    ensureRobots(head);
  });
})();
