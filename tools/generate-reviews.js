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

function makeAnonIdRaw() {
  // 실제 계정이 아닌 '익명 닉네임(자동)' 형태
  const koPool = [
    "알라마쓰","감귤러버","밤바다","새벽바람","돌하르방","제주산책","바람결",
    "한라산뷰","제주여행러","파도소리","오름러","제주초보","제주단골","귤향가득"
  ];
  const enSyll = ["jeju","mango","blue","night","wave","stone","hallasan","toktok","guide","room"];
  const enTail = ["01","02","07","09","11","18","23","77","88"];
  const r = Math.random();
  if (r < 0.55) {
    // 영문/숫자 아이디
    const a = pick(enSyll);
    const b = pick(enSyll.filter(x => x !== a));
    const sep = pick(["","_","-"]);
    const num = Math.random() < 0.6 ? pick(enTail) : "";
    return (a + sep + b + num).toLowerCase();
  } else if (r < 0.85) {
    // 한글 닉네임 + 숫자 옵션
    const base = pick(koPool);
    const num = Math.random() < 0.4 ? pick(enTail) : "";
    return base + num;
  }
  // 짧은 랜덤 영문
  const chars = "abcdefghijklmnopqrstuvwxyz";
  const len = 6 + Math.floor(Math.random()*3);
  let out = "";
  for(let i=0;i<len;i++) out += chars[Math.floor(Math.random()*chars.length)];
  return out + (Math.random()<0.5 ? pick(enTail) : "");
}

function maskAnonId(raw) {
  const s = String(raw || "").trim();
  if (!s) return "익명";
  // 한글이면 마지막 1글자만 노출: **지
  if (/[가-힣]/.test(s)) {
    const last = s.slice(-1);
    return `**${last}`;
  }
  // 그 외(영문/숫자)는 마지막 2글자 노출: **ft
  const last2 = s.slice(-2);
  return `**${last2}`;
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
    // 상황형
    `일정 끝나고 ${area}에서 ${kw1} 쪽으로 찾다가 들렀어요. 응대가 깔끔했고 분위기도 과하지 않아 편하게 즐겼습니다.`,
    // 포인트형
    `${area} ${kw2} 분위기 좋았던 포인트 3개: ① 응대가 자연스러움 ② 진행이 빠르고 깔끔 ③ 전체 분위기가 정돈되어 있음. 다음에도 비슷한 코스로 이용해볼 듯해요.`,
    // 감성형
    `${area}에서 ${kw3} 느낌으로 가볍게 즐기려고 방문했는데, 분위기가 차분해서 대화하기 좋았습니다. 전체적으로 만족도가 높았어요.`,
    // 간단 총평형
    `${area} ${kw1} 코스로 이용했는데 진행이 자연스러워서 부담 없이 즐겼습니다. ${kw2} 쪽 찾는 분들께도 무난하게 추천할 만해요.`,
    // 키워드 조합형
    `${area} ${kw1} + ${area} ${kw2} 조합으로 갔고, ${kw3} 분위기도 가볍게 즐기기 좋았습니다. 전반적으로 만족했습니다.`,
    // 300자 이내 길게
    `${area}에서 일정 중 잠깐 들렀는데 생각보다 응대가 빠르고 깔끔해서 좋았어요. 대기 없이 진행된 편이라 흐름이 끊기지 않았고, 분위기도 과하지 않아 편안했습니다. ${kw1}/${kw2} 쪽으로 찾는 분들이라면 무난하게 이용하기 좋은 코스라고 느꼈습니다.`
  ];
  return pick(templates);
}


function buildRow({ id, autoDate, title, content, author, authorRaw, timeText, stars }) {
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
<tr class="board__row" data-auto="1" data-auto-date="${autoDate}" data-content="${safeContent}" data-id="${id}" data-author-raw="${authorRaw.replaceAll('"', "&quot;")}">
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
  const authorRaw = makeAnonIdRaw();
  const author = maskAnonId(authorRaw);
  const stars = makeStars();
  const timeText = `${ymd} ${hm}`; // "YYYY-MM-DD HH:mm"

  const row = buildRow({
    id,
    autoDate: ymd,
    title,
    content,
    author,
    authorRaw,
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
