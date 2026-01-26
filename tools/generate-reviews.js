// tools/generate-reviews.js
// JEJU GUIDE / 제주똑똑이 - Reviews Auto Generator (GitHub Actions)
// 대상: pages/reviews.html (AUTO_REVIEWS_START/END 사이에 <tr class="board__row">를 누적 삽입)
// 규칙: 하루 1개(auto-YYYYMMDD-...)만 생성, 같은 날짜가 있으면 종료

const fs = require("fs");
const path = require("path");

const REVIEWS_HTML = path.join("pages", "reviews.html");

const START = "<!-- AUTO_REVIEWS_START -->";
const END = "<!-- AUTO_REVIEWS_END -->";

function kstNowParts() {
  // Node에서도 동작하는 KST 타임존 포맷 (Asia/Seoul)
  const dtf = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  // sv-SE => "YYYY-MM-DD HH:mm"
  const s = dtf.format(new Date()); 
  const [ymd, hm] = s.split(" ");
  const ymdCompact = ymd.replaceAll("-", "");
  return { ymd, hm, ymdCompact };
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randHex(len = 3) {
  return Math.floor(Math.random() * Math.pow(16, len))
    .toString(16)
    .padStart(len, "0");
}

function makeMaskedName() {
  const family = ["김", "이", "박", "정", "최", "강", "조", "윤", "장", "임"];
  return `${pick(family)}**`;
}

function makeStars() {
  // 가중치: 4점이 더 자주
  const pool = ["★★★★★", "★★★★☆", "★★★★☆", "★★★★☆", "★★★★★"];
  return pick(pool);
}

function makeTitle(area, kw1, kw2) {
  const templates = [
    `${area} ${kw1} + ${area} ${kw2} 조합 추천`,
    `${area} ${kw1} 분위기 깔끔했던 후기`,
    `${area} ${kw2} 자연스럽게 즐긴 후기`,
    `${area} ${kw1} 코스 만족했습니다`,
  ];
  return pick(templates);
}

function makeContent(area, kw1, kw2, kw3) {
  const templates = [
    `${area} ${kw1} + ${area} ${kw2} 조합으로 좋았고, ${area} ${kw3} 분위기도 가볍게 즐기기 좋았어요.`,
    `${area}에서 ${kw1} 쪽으로 찾다가 방문했는데 응대가 깔끔하고 분위기가 과하지 않아 편했습니다.`,
    `${area} ${kw2} 느낌이 생각보다 고급스럽고 진행도 자연스러워서 부담 없이 즐겼습니다.`,
    `${area}에서 일정 중 잠깐 들렀는데 분위기/응대가 무난했고 전체적으로 만족했어요.`,
  ];
  return pick(templates);
}

function buildRow({ id, autoDate, title, content, author, timeText, stars }) {
  // pages/reviews.html 구조에 맞춘 row
  // - class="board__row"
  // - data-auto="1", data-auto-date="YYYY-MM-DD"
  // - data-content="..."
  // - data-id="auto-YYYYMMDD-..."
  // - cell 구조/클래스 일치
  const safeContent = content.replaceAll('"', "&quot;"); // data-content 안전
  const safeTitle = title.replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  const safePreview = content.replaceAll("<", "&lt;").replaceAll(">", "&gt;");

  return `
<tr class="board__row" data-auto="1" data-auto-date="${autoDate}" data-content="${safeContent}" data-id="${id}">
  <td class="cell-title">
    <button class="linkTitle" data-open="${id}" type="button">${safeTitle}</button>
    <div class="preview">${safePreview}</div>
  </td>
  <td class="cell-author">${author}</td>
  <td class="cell-time">${timeText}</td>
  <td class="cell-rate"><span aria-label="별점" class="stars">${stars}</span></td>
  <td class="cell-pass"><button class="miniBtn" data-edit="${id}" type="button">비밀번호</button></td>
</tr>`;
}

function run() {
  if (!fs.existsSync(REVIEWS_HTML)) {
    console.log("[ERR] pages/reviews.html not found:", REVIEWS_HTML);
    process.exit(0);
  }

  let html = fs.readFileSync(REVIEWS_HTML, "utf8");

  const s = html.indexOf(START);
  const e = html.indexOf(END);
  if (s < 0 || e < 0 || e <= s) {
    console.log("[ERR] AUTO_REVIEWS markers not found or invalid.");
    process.exit(0);
  }

  const { ymd, hm, ymdCompact } = kstNowParts(); // KST 기준
  const todayIdPrefix = `auto-${ymdCompact}-`;

  // ✅ 하루 1개 제한: 같은 날짜 auto-YYYYMMDD- 존재하면 종료
  if (html.includes(todayIdPrefix)) {
    console.log("[SKIP] Today review already exists:", todayIdPrefix);
    process.exit(0);
  }

  const area = pick(["제주도", "서귀포"]);
  const kws = ["유흥", "가라오케", "노래방", "퍼블릭", "노래주점", "술"];
  const kw1 = pick(kws);
  const kw2 = pick(kws.filter(k => k !== kw1));
  const kw3 = pick(kws.filter(k => k !== kw1 && k !== kw2));

  const title = makeTitle(area, kw1, kw2);
  const content = makeContent(area, kw1, kw2, kw3);

  const id = `auto-${ymdCompact}-${Date.now()}-${randHex(3)}`;
  const author = makeMaskedName();
  const stars = makeStars();
  const timeText = `${ymd} ${hm}`; // "YYYY-MM-DD HH:mm"

  const row = buildRow({
    id,
    autoDate: ymd,
    title,
    content,
    author,
    timeText,
    stars,
  });

  const before = html.slice(0, s + START.length);
  const middle = html.slice(s + START.length, e);
  const after = html.slice(e);

  // START 바로 아래에 최신 글이 위로 쌓이게 삽입
  const next = before + row + middle + after;

  fs.writeFileSync(REVIEWS_HTML, next, "utf8");
  console.log("[OK] Appended:", id);
}

run();
