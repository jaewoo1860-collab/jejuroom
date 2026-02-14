document.addEventListener("DOMContentLoaded", function () {
  fetch("./data.json")
    .then(response => response.json())
    .then(data => {
      const container = document.getElementById("bar-list");
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
