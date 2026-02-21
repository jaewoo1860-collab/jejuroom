# Copilot / AI Agent Instructions for JEJU GUIDE (제주똑똑이) 🔧

Quick, actionable guide so an AI coding agent can be immediately productive in this repo.

## Project overview
- Static, mobile-first HTML site (no build step). Root pages: `index.html` and `pages/*`.
- Client-side features (e.g., blog) are implemented with small JS modules that run in-browser (no backend).
- Content is stored as plain HTML files under `pages/` and static assets under `css/` and `photo/`.

## Key files & patterns (where to look first) 📁
- `index.html` — site shell, GA4 + age gate, mobile "phone" framing, global includes.
- `pages/` — all site pages. Many pages share header/footer markup patterns and mobile framing.
- `pages/blog/blog.js` + `pages/blog/posts/` — client-side blog app:
  - `posts/index.json` is the hub list (array of objects with `title`, `date`, `ts`, `file`, `excerpt`, `img`).
  - Blog posts are static HTML files in `pages/blog/posts/` and must be referenced in `index.json`.
  - New posts are commonly created via the in-browser compose (downloads files) and then added to repo.
- `pages/reviews.html` + `tools/generate-reviews.js` — reviews auto-generator:
  - HTML contains markers: `<!-- AUTO_REVIEWS_START -->` and `<!-- AUTO_REVIEWS_END -->`.
  - `tools/generate-reviews.js` inserts `<tr class="board__row">` rows between markers.
  - Workflow `.github/workflows/daily-reviews.yml` runs the script daily and commits if there are changes.
- `make_sitemap.py` — generate `sitemap.xml` from all `*.html`. Run manually: `python make_sitemap.py` (PowerShell recommended).
- `robots.txt` — explicitly disallows some crawlers (e.g., `GPTBot`, `ClaudeBot`); respect it when scraping.

## How to preview & run things locally ▶️
- Quick preview: open `index.html` in a browser (works for static pages).
- Prefer serving the site to avoid path issues: `python -m http.server 8000` from repo root and open `http://localhost:8000`.
- Test review generation locally: `node tools/generate-reviews.js` (requires Node 20+ matching action).
- Regenerate sitemap: `python make_sitemap.py` (requires Python 3.x).

## Repo-specific conventions and gotchas ⚠️
- Mobile "phone" framing: pages mirror `index.html` structure (header, `.stage`, `.phone`) — keep consistent when adding pages.
- Blog metadata: `ts` (epoch ms) is required for sorting in `blog.js`. Date format used in UI is `YYYY-MM-DD HH:mm`.
- `pages/reviews.html` auto-inserted rows must preserve the START/END markers — modifying those breaks automation.
- `make_sitemap.py` special-cases `pages/blog/index.html` to ensure hub URL ends with `/` (sitemap uses trailing slash for hub).
- Some credentials appear in client JS (e.g., `ADMIN_ID`/`ADMIN_PW` in `pages/blog/blog.js`) — these are local convenience, not secure.
- CSS split: `css/base.css`, `css/theme.css`, `css/page.css`, plus page-specific CSS (e.g., `css/blog.css`); follow existing naming and scoping.

## CI / Automation notes 🔁
- Daily reviews: `.github/workflows/daily-reviews.yml` runs `tools/generate-reviews.js` and commits changes back to `main`.
- Commits by GitHub Actions use `git pull --rebase origin main` before pushing — watch for rebase conflicts when testing commits.
- Sitemap generation is manual (no workflow) — run `python make_sitemap.py` when adding/removing many pages.

## Implementation examples (copyable) ✂️
- Example blog `index.json` item:
```
{
  "title": "제주도 유흥 정보 정리",
  "date": "2026-01-29 19:14",
  "ts": 1706610840000,
  "file": "20260129-1914-제주도-유흥-정보-...html",
  "excerpt": "간단한 요약...",
  "img": "/photo/blog/20260129-1914.jpg"
}
```
- Inserted review row format (tool generates this HTML): look for `class="board__row"` with attributes `data-auto`/`data-auto-date`/`data-id`.

## Behavioral guidelines for agents 🤖
- Prefer editing existing HTML/CSS/JS patterns; new pages should follow the `index.html` structure (header, nav, `.stage`, `.phone`).
- When changing `pages/reviews.html`, preserve AUTO markers and the surrounding cell structure.
- When adding blog posts programmatically, update `pages/blog/posts/index.json` and ensure `file` points to a committed `.html` file.
- Respect `robots.txt`—do not produce tooling that crawls disallowed paths or disallowed user-agents.

---
If you'd like, I can: add small templates (new page, blog post JSON entry), or expand examples for common edits (e.g., adding a new shop page). Want me to add those? ✅