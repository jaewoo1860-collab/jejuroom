document.addEventListener("DOMContentLoaded", function () {
  const container = document.getElementById("post-list");
  const dataPath = container.getAttribute("data-source");

  fetch(dataPath)
    .then(response => response.json())
    .then(data => {
      data.forEach(item => {
        const div = document.createElement("div");
        div.innerHTML = `
          <h3><a href="${item.url}">${item.title}</a></h3>
          <p>${item.description}</p>
          <hr>
        `;
        container.appendChild(div);
      });
    })
    .catch(error => {
      console.error("목록 로딩 오류:", error);
    });
});


<script src="/pages/common/footer-loader.js"></script>
