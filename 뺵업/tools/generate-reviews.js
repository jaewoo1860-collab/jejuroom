/**
 * tools/generate-reviews.js
 *
 * 자동 후기 생성 + SEO용 리뷰 스키마(JSON-LD) 갱신
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const REVIEWS_HTML = path.join(ROOT, "pages", "reviews.html");

const START = "<!-- AUTO_REVIEWS_START -->";
const END = "<!-- AUTO_REVIEWS_END -->";
const SCHEMA_START = "<!-- AUTO_SCHEMA_START -->";
const SCHEMA_END = "<!-- AUTO_SCHEMA_END -->";

/* =========================
   설정
   ========================= */
const MAX_PER_DAY = 10;
const ALLOWED_HOURS_KST = [0, 2, 5, 7, 10, 12, 15, 17, 20, 22];
const SLOT_BASE_MINUTES = [5, 20, 35, 50];
const JITTER_MINUTES = 7;
const SCHEMA_MAX_REVIEWS = 20;
const SITE_URL = "__SITE_URL__"; // 도메인 연결 후 변경

/* =========================
   시간 유틸 (KST)
   ========================= */
function kstDate() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000);
}
function pad(n) {
  return String(n).padStart(2, "0");
}
function ymd() {
  const d = kstDate();
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}
function hour() {
  return kstDate().getUTCHours();
}
function minute() {
  return kstDate().getUTCMinutes();
}
function hhmm() {
  const d = kstDate();
  return `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}`;
}

/* =========================
   기타 유틸
   ========================= */
function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}
function clamp(s, n) {
  return s.length <= n ? s : s.slice(0, n);
}

/* =========================
   해시 (시간대별 분 슬롯 고정)
   ========================= */
function hash32(str) {
  let h = 2166136261;
  for (let c of str) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function slotMinute(day, h) {
  const idx = hash32(`${day}-${h}`) % SLOT_BASE_MINUTES.length;
  return SLOT_BASE_MINUTES[idx];
}

/* =========================
   SEO 키워드 (요청 반영)
   ========================= */
const KEYWORDS = [
  // 제주
  "제주 유흥",
  "제주 노래방",
  "제주 가라오케",
  "제주 술",
  "제주 파티",

  // 서귀포
  "서귀포 유흥",
  "서귀포 노래방",
  "서귀포 가라오케",
  "서귀포 술",
  "서귀포 파티",
];

/* =========================
   문장 템플릿
   ========================= */
const TITLES = [
  "분위기 깔끔해서 만족했어요",
  "가볍게 즐기기 좋았어요",
  "처음인데도 부담 없었어요",
  "정리 잘 된 가이드 느낌",
  "친구들이랑 무난하게 다녀옴",
  "응대가 차분해서 좋았어요",
  "정보가 깔끔해서 참고하기 좋음",
  "후기 보고 선택했는데 만족",
];

const BODY_A = [
  "정리 방식이 깔끔해서",
  "정보가 과하지 않아서",
  "동선 설명이 이해하기 쉬워서",
  "처음 이용하는 입장에서도",
  "후기 내용이 담백해서",
];

const BODY_B = [
  "부담 없이 참고하기 좋았습니다.",
  "전체적으로 무난했어요.",
  "시간 낭비 없이 도움 됐어요.",
  "가볍게 보기 괜찮았습니다.",
  "다음에도 참고할 것 같아요.",
];

/* =========================
   기존 리뷰 파싱 (중복 방지)
   ========================= */
function parseExisting(block) {
  const titles = new Set();
  const bodies = new Set();
  const pairs = new Set();

  const trs = block.match(/<tr[^>]*data-id="auto-[^"]+"[\s\S]*?<\/tr>/g) || [];
  trs.forEach(tr => {
    const t = (tr.match(/class="col-title">([^<]+)/) || [])[1];
    const b = (tr.match(/class="col-preview">([^<]+)/) || [])[1];
    if (t) titles.add(t);
    if (b) bodies.add(b);
    if (t && b) pairs.add(`${t}||${b}`);
  });
  return { titles, bodies, pairs };
}

/* =========================
   리뷰 1개 생성
   ========================= */
function makeReview(existing) {
  for (let i = 0; i < 300; i++) {
    const title = pick(TITLES);
    const kws = shuffle(KEYWORDS).slice(0, 2 + Math.floor(Math.random() * 2));
    const body =
      clamp(`${pick(BODY_A)} ${pick(BODY_B)} (${kws.join(", ")} 참고)`, 100);

    if (
      existing.titles.has(title) ||
      existing.bodies.has(body) ||
      existing.pairs.has(`${title}||${body}`)
    ) continue;

    existing.titles.add(title);
    existing.bodies.add(body);
    existing.pairs.add(`${title}||${body}`);

    return { title, body };
  }
  return null;
}

/* =========================
   메인 실행
   ========================= */
(function run() {
  if (!fs.existsSync(REVIEWS_HTML)) return;

  let html = fs.readFileSync(REVIEWS_HTML, "utf8");
  const s = html.indexOf(START);
  const e = html.indexOf(END);
  if (s < 0 || e < 0) return;

  const day = ymd();
  const h = hour();
  const m = minute();

  if (!ALLOWED_HOURS_KST.includes(h)) return;

  if (new RegExp(`auto-${day}-${pad(h)}`).test(html)) return;
  if ((html.match(new RegExp(`auto-${day}-`, "g")) || []).length >= MAX_PER_DAY) return;

  const center = slotMinute(day, h);
  if (m < center - JITTER_MINUTES || m > center + JITTER_MINUTES) return;

  const block = html.slice(s + START.length, e);
  const existing = parseExisting(block);
  const one = makeReview(existing);
  if (!one) return;

  const id = `auto-${day}-${hhmm()}-${Math.random().toString(16).slice(2, 8)}`;
  const dateText = `${day.slice(0,4)}-${day.slice(4,6)}-${day.slice(6,8)}`;

  const row = `
<tr data-id="${id}">
  <td class="col-rating"><span class="stars">★★★★★</span></td>
  <td class="col-title">${escapeHtml(one.title)}</td>
  <td class="col-preview">${escapeHtml(one.body)}</td>
  <td class="col-date">${dateText}</td>
</tr>`;

  html = html.slice(0, e) + row + "\n" + html.slice(e);
  fs.writeFileSync(REVIEWS_HTML, html, "utf8");
})();
