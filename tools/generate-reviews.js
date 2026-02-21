// tools/generate-reviews.js
// JEJU GUIDE / 제주똑똑이 - Reviews Auto Generator (GitHub Actions)

const generate = require("./reviews/generate");
const render = require("./reviews/render");

const result = generate();
render(result);
