(() => {
  // ✅ 최신 후기: reviews.html에서 AUTO 후기 파싱 후, 센터 포커스 캐러셀 렌더
  (async function loadLatestReviewsCarousel() {
    const track = document.getElementById("latestTrack");
    if (!track) return;

    function escapeHtml(s) {
      return String(s ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }

    // 가운데에 가장 가까운 슬라이드가 active가 되도록 설정
    function updateActive() {
      const slides = Array.from(track.querySelectorAll(".latestSlide"));
      if (slides.length === 0) return;

      const rect = track.getBoundingClientRect();
      const center = rect.left + rect.width / 2;

      let best = null;
      let bestDist = Infinity;

      for (const s of slides) {
        const r = s.getBoundingClientRect();
        const c = r.left + r.width / 2;
        const d = Math.abs(c - center);
        if (d < bestDist) {
          bestDist = d;
          best = s;
        }
      }

      slides.forEach((s) => s.classList.remove("is-active", "is-side"));
      if (best) {
        best.classList.add("is-active");
        const idx = slides.indexOf(best);
        if (slides[idx - 1]) slides[idx - 1].classList.add("is-side");
        if (slides[idx + 1]) slides[idx + 1].classList.add("is-side");
      }
    }

    // 특정 슬라이드를 센터로 스냅
    function scrollSlideToCenter(slide) {
      const sRect = slide.getBoundingClientRect();
      const tRect = track.getBoundingClientRect();
      const delta =
        sRect.left + sRect.width / 2 - (tRect.left + tRect.width / 2);
      track.scrollBy({ left: delta, behavior: "smooth" });
    }

    try {
      const res = await fetch("./pages/reviews.html", { cache: "no-store" });
      const html = await res.text();

      const start = html.indexOf("<!-- AUTO_REVIEWS_START -->");
      const end = html.indexOf("<!-- AUTO_REVIEWS_END -->");
      const slice =
        start !== -1 && end !== -1 && end > start ? html.slice(start, end) : html;

      // tr.board__row 기반 파싱 (현재 reviews.html 구조와 호환)
      const rows = [...slice.matchAll(/<tr[^>]*class="[^"]*board__row[^"]*"[^>]*>[\s\S]*?<\/tr>/g)]
        .map((m) => m[0])
        .slice(0, 8);

      // fallback: class 없는 경우도 일부 잡아주기(안전)
      const rows2 = rows.length
        ? rows
        : [...slice.matchAll(/<tr[^>]*data-id="(auto-[^"]+)"[^>]*>[\s\S]*?<\/tr>/g)]
            .map((m) => m[0])
            .slice(0, 8);

      const pick = (re, row, fallback = "") => {
        const m = row.match(re);
        return m ? m[1] : fallback;
      };

      const reviews = rows2
        .map((row) => {
          const title =
            pick(
              /<button[^>]*class="[^"]*linkTitle[^"]*"[^>]*>([\s\S]*?)<\/button>/,
              row,
              ""
            ).trim() ||
            pick(/data-open="[^"]*"[^>]*>([\s\S]*?)<\/[^>]+>/, row, "").trim();
          const author = pick(/<td class="cell-author">([\s\S]*?)<\/td>/, row, "").trim();
          const time = pick(/<td class="cell-time">([\s\S]*?)<\/td>/, row, "").trim();
          const preview = pick(/<div class="preview">([\s\S]*?)<\/div>/, row, "").trim();

          return {
            title,
            author: author || "익명",
            time: time || "",
            content: preview || "",
          };
        })
        .filter((r) => r.title && r.content);

      if (reviews.length === 0) {
        track.innerHTML = `
            <div class="latestSlide is-active">
              <div class="latestCard">
                <div class="latestTop">
                  <div class="latestStars">★★★★★</div>
                  <div class="latestTime">방금</div>
                </div>
                <p class="latestTitleLine">최신 후기를 준비 중이에요</p>
                <p class="latestContentLine">자동 후기가 곧 표시됩니다. 잠시 후 다시 확인해 주세요.</p>
                <div class="latestBottom">
                  <span class="latestAuthor">시스템</span>
                  <span class="latestAuto">자동후기</span>
                </div>
              </div>
            </div>
          `;
        return;
      }

      // 3개 미만이면 캐러셀 느낌을 위해 복제
      let list = reviews.slice(0, 6);
      if (list.length === 1) list = [list[0], list[0], list[0]];
      if (list.length === 2) list = [list[0], list[1], list[0]];

      track.innerHTML = list
        .map((r, i) => {
          return `
            <div class="latestSlide" data-i="${i}">
              <div class="latestCard">
                <div class="latestTop">
                  <div class="latestStars" aria-label="별점 5점">★★★★★</div>
                  <div class="latestTime">${escapeHtml(r.time)}</div>
                </div>
                <p class="latestTitleLine">${escapeHtml(r.title)}</p>
                <p class="latestContentLine">${escapeHtml(r.content)}</p>
                <div class="latestBottom">
                  <span class="latestAuthor">${escapeHtml(r.author)}</span>
                  <span class="latestAuto" aria-hidden="true">자동후기</span>
                </div>
              </div>
            </div>
          `;
        })
        .join("");

      // 초기 active 설정
      requestAnimationFrame(() => {
        updateActive();
        // 첫 active를 중앙으로
        const active =
          track.querySelector(".latestSlide.is-active") || track.querySelector(".latestSlide");
        if (active) scrollSlideToCenter(active);
      });

      // 스크롤 시 active 업데이트(디바운스)
      let t = null;
      track.addEventListener(
        "scroll",
        () => {
          clearTimeout(t);
          t = setTimeout(updateActive, 80);
        },
        { passive: true }
      );

      // ✅ 자동으로 천천히 다음 카드로 넘어가게 (원하면 나중에 끌 수 있음)
      let auto = setInterval(() => {
        const slides = Array.from(track.querySelectorAll(".latestSlide"));
        if (slides.length <= 1) return;

        const active = track.querySelector(".latestSlide.is-active") || slides[0];
        const idx = slides.indexOf(active);
        const next = slides[idx + 1] || slides[0];
        scrollSlideToCenter(next);
      }, 4200);

      // 사용자가 터치/마우스 조작하면 자동 넘김 멈춤
      ["pointerdown", "touchstart", "mouseenter", "focusin"].forEach((ev) => {
        track.addEventListener(
          ev,
          () => {
            clearInterval(auto);
          },
          { passive: true }
        );
      });
    } catch (e) {
      track.innerHTML = `
          <div class="latestSlide is-active">
            <div class="latestCard">
              <div class="latestTop">
                <div class="latestStars">★★★★★</div>
                <div class="latestTime">-</div>
              </div>
              <p class="latestTitleLine">최신 후기를 불러오지 못했어요</p>
              <p class="latestContentLine">고객후기 페이지에서 확인해 주세요.</p>
              <div class="latestBottom">
                <span class="latestAuthor">시스템</span>
                <span class="latestAuto">안내</span>
              </div>
            </div>
          </div>
        `;
    }
  })();
})();
