// tools/reviews/render.js
// JEJU GUIDE / 제주똑똑이 - Reviews Auto Generator (GitHub Actions)

const fs = require("fs");
const path = require("path");

const REVIEWS_HTML = path.join("pages", "reviews.html");

function run(result) {
  if (!result || !result.next || !result.id) return;

  fs.writeFileSync(REVIEWS_HTML, result.next, "utf8");
  console.log("[OK] Appended:", result.id);
}

module.exports = run;
