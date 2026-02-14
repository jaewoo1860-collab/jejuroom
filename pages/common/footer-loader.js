document.addEventListener("DOMContentLoaded", function () {
  fetch("/pages/common/site-footer.html")
    .then(res => res.text())
    .then(html => {
      document.body.insertAdjacentHTML("beforeend", html);
    })
    .catch(err => console.error("Footer load error:", err));
});
