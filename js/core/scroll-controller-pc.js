(function () {

  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  const initialPhone = document.querySelector(".phone");
  const initialContent = document.querySelector(".content");
  if (!initialPhone || !initialContent) return;

  function getScrollableContent() {
    const phone = document.querySelector(".phone");
    if (!phone) return null;
    return phone.querySelector(".content");
  }

  document.addEventListener("wheel", function (e) {

    const content = getScrollableContent();
    if (!content) return;

    if (content.contains(e.target)) return;

    content.scrollBy({
      top: e.deltaY,
      behavior: "auto"
    });

  }, { passive: true });

})();
