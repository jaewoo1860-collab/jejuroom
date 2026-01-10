// tools/generate-reviews.js
// 매일 2개 후기 생성 -> pages/reviews.html의 AUTO_REVIEWS_START/END 사이에 누적 삽입

const fs = require("fs");
const path = require("path");

const REVIEWS_HTML_PATH = path.join(__dirname, "..", "pages", "reviews.html");

// === 설정 ===
const PER_DAY = 2;        // 하루 2개
const MAX_LEN = 100;      // 한 개당 100자 이내(본문)
const TZ = "Asia/Seoul";  // 한국 시간 기준

// 노출 키워드(요청 반영)
const KEYWORDS = [
  "제주 유흥",
  "제주 노래방",
  "제주 가라오케",
  "제주 술",
  "제주 파티",
];

// 작성자 랜덤
const AUTHORS = ["김**", "이**", "박**", "최**", "정**", "강**", "조**", "윤**", "장**", "임**", "한**", "서**", "신**", "유**", "홍**"];

// 100자 이내로 자연스럽게 들어가도록 짧은 템플릿
// (키워드 2~3개만 섞어서 스팸 느낌 줄임)
const TEMPLATES = [
  (k1, k2) => `${k1} 검색하고 왔는데 분위기 좋고 응대 깔끔했어요. ${k2} 쪽도 만족!`,
  (k1, k2) => `${k1} 느낌 과하지 않고 고급스러웠어요. ${k2}도 자연스럽게 즐겼습니다.`,
  (k1, k2, k3) => `${k1} + ${k2} 조합으로 좋았고, ${k3} 분위기도 가볍게 즐기기 좋았어요.`,
  (k1, k2) => `처음엔 긴장했는데 ${k1} 분위기 괜찮았고 ${k2} 안내도 매끄러웠습니다.`,
];

// 유틸
function nowKSTParts() {
  const dt = new Date();
  const fmt = new Intl.DateTimeFormat("sv-SE", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  // "YYYY-MM-DD HH:mm"
  const s = fmt.format(dt).replace(" ", " ");
  const [date, time] = s.split(" ");
  return { date, time };
}

function randInt(n) {
  return Math.floor(Math.random() * n);
}

function pick(arr) {
  return arr[randInt(arr.length)];
}

function clamp100(text) {
  let t = String(text || "").trim();
  if (t.length > MAX_LEN) t = t.slice(0, MAX_LEN - 1).trimEnd() + "…";
  return t;
}

// 제목은 짧고 “후기 느낌”
function makeTitle(content) {
  // content 앞부분을 제목처럼 쓰되 너무 길면 자르기
  let t = content.replace(/\s+/g, " ").trim();
  if (t.length > 18) t = t.slice(0, 18).trimEnd() + "…";
  // 제목스러워 보이게 마침표 제거
  t = t.replace(/[.!?]$/g, "");
  return t || "만족 후기";
}

// 별점은 4~5
function makeStars() {
  const rating = 4 + randInt(2); // 4 or 5
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}

// 오늘 날짜에 이미 생성된 개수를 체크해서 “오늘 2개만” 보장
function countTodayInserted(html, todayDate) {
  const re = new RegExp(`data-auto-date="${todayDate}"`, "g");
  const m = html.match(re);
  return m ? m.length : 0;
}

// 실제 <tr> 생성 (미리보기는 content 그대로 써도 됨)
function makeRow({ id, title, preview, author, datetime, stars, autoDate }) {
  // XSS/속성 깨짐 방지 아주 간단 이스케이프
  const esc = (s) =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const safeTitle = esc(title);
  const safePreview = esc(preview);
  const safeContentAttr = esc(preview); // data-content에 넣을 값
  const safeAuthor = esc(author);
  const safeDatetime = esc(datetime);
  const safeStars = esc(stars);

  return `
<tr class="board__row" data-id="${id}" data-auto="1" data-auto-date="${autoDate}" data-content="${safeContentAttr}">
  <td class="cell-title">
    <button type="button" class="linkTitle" data-open="${id}">${safeTitle}</button>
    <div class="preview">${safePreview}</div>
  </td>
  <td class="cell-author">${safeAuthor}</td>
  <td class="cell-time">${safeDatetime}</td>
  <td class="cell-rate"><span class="stars" aria-label="별점">${safeStars}</span></td>
  <td class="cell-pass"><button type="button" class="miniBtn" data-edit="${id}">비밀번호</button></td>
</tr>`.trim();
}

function main() {
  if (!fs.existsSync(REVIEWS_HTML_PATH)) {
    console.error("Cannot find:", REVIEWS_HTML_PATH);
    process.exit(1);
  }

  const original = fs.readFileSync(REVIEWS_HTML_PATH, "utf8");
  const startMarker = "<!-- AUTO_REVIEWS_START -->";
  const endMarker = "<!-- AUTO_REVIEWS_END -->";

  const startIdx = original.indexOf(startMarker);
  const endIdx = original.indexOf(endMarker);

  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    console.error("Markers not found or invalid. Please add markers in <tbody>:");
    console.error(startMarker);
    console.error(endMarker);
    process.exit(1);
  }

  const { date, time } = nowKSTParts();
  const todayDate = date; // "YYYY-MM-DD"
  const datetime = `${date} ${time}`;

  // 이미 오늘 몇 개 들어갔는지 확인
  const already = countTodayInserted(original, todayDate);
  const need = Math.max(0, PER_DAY - already);

  if (need === 0) {
    console.log("Already inserted today:", PER_DAY);
    return;
  }

  // 마커 사이 내용 추출
  const before = original.slice(0, startIdx + startMarker.length);
  const middle = original.slice(startIdx + startMarker.length, endIdx);
  const after = original.slice(endIdx);

  // 오늘 추가할 행 생성 (맨 위에 쌓이게)
  const newRows = [];
  for (let i = 0; i < need; i++) {
    // 키워드 2~3개 조합
    const k1 = pick(KEYWORDS);
    let k2 = pick(KEYWORDS);
    while (k2 === k1) k2 = pick(KEYWORDS);
    let k3 = pick(KEYWORDS);
    while (k3 === k1 || k3 === k2) k3 = pick(KEYWORDS);

    const tpl = pick(TEMPLATES);
    const contentRaw = tpl.length >= 3 ? tpl(k1, k2, k3) : tpl(k1, k2);
    const content = clamp100(contentRaw);

    const title = makeTitle(content);
    const author = pick(AUTHORS);
    const stars = makeStars();

    // id는 날짜 기반 + 랜덤
    const id = `auto-${todayDate.replaceAll("-", "")}-${Date.now()}-${randInt(9999)}`;

    newRows.push(
      makeRow({
        id,
        title,
        preview: content,
        author,
        datetime,
        stars,
        autoDate: todayDate,
      })
    );
  }

  const insertedBlock = "\n" + newRows.join("\n") + "\n";

  // 새 후기를 middle 맨 앞에 추가
  const updated = before + insertedBlock + middle + after;

  fs.writeFileSync(REVIEWS_HTML_PATH, updated, "utf8");
  console.log(`Inserted ${need} review(s) for ${todayDate}.`);
}

main();
