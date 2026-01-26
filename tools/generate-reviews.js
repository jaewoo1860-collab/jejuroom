// tools/generate-reviews.js
const fs = require("fs");

// ✅ 리뷰 페이지는 무조건 root/reviews.html
const REVIEWS_HTML = "reviews.html";

const START = "<!-- AUTO_REVIEWS_START -->";
const END = "<!-- AUTO_REVIEWS_END -->";

function pad(n) {
  return n.toString().padStart(2, "0");
}

function ymd() {
  const d = new Date();
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function hhmm() {
  const d = new Date();
  return `${pad(d.getHours())}${pad(d.getMinutes())}`;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// 데이터 풀
const AREAS = ["제주도", "서귀포"];
const KEYWORDS = ["유흥", "가라오케", "노래방", "퍼블릭", "노래주점"];
const AUTHORS = ["김**", "이**", "박**", "정**", "최**"];
const STARS = ["★★★★★", "★★★★☆", "★★★★☆", "★★★★★"];

function makeTitle() {
  return `${pick(AREAS)} ${pick(KEYWORDS)} 추천 후기`;
}

function makeContent() {
  return `${pick(AREAS)}에서 방문한 ${pick(KEYWORDS)} 관련 장소에 대한 후기입니다. 분위기와 접근성이 괜찮았고, 비즈니스나 여행 중 잠깐 들르기에도 무난했습니다.`;
}

(function run() {
  if (!fs.existsSync(REVIEWS_HTML)) {
    console.log("reviews.html not found");
    return;
  }

  let html = fs.readFileSync(REVIEWS_HTML, "utf8");

  const s = html.indexOf(START);
  const e = html.indexOf(END);
  if (s === -1 || e === -1) {
    console.log("AUTO_REVIEWS markers not found");
    return;
  }

  const today = ymd();

  // 하루 1개 제한
  if (new RegExp(`auto-${today}-`).test(html)) {
    console.log("Today review already exists");
    return;
  }

  const id = `auto-${today}-${hhmm()}-${Math.random().toString(16).slice(2, 8)}`;

  const row = `
<tr id="${id}">
  <td class="col-title">${makeTitle()}</td>
  <td class="col-author">${pick(AUTHORS)}</td>
  <td class="col-stars">${pick(STARS)}</td>
  <td class="col-date">${today}</td>
</tr>`;

  const before = html.slice(0, s + START.length);
  const middle = html.slice(s + START.length, e);
  const after = html.slice(e);

  const next = before + row + middle + after;

  fs.writeFileSync(REVIEWS_HTML, next, "utf8");
  console.log("Review appended:", id);
})();