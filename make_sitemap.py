#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generate sitemap.xml for JEJU GUIDE / 제주똑똑이 (static HTML).
- Scans for *.html under repo (excluding backups/.git)
- Outputs sitemap.xml at repo root
Run (PowerShell):
  python make_sitemap.py
"""
from pathlib import Path
import re

BASE_URL = "https://www.jejutoktokyi.com".rstrip("/")

def should_skip(p: Path) -> bool:
    s = p.as_posix()
    if "/.git/" in s or s.startswith(".git/"):
        return True
    # skip backup-ish folders (adjust if needed)
    for bad in ["_seo_backup_", "백업", "그냥 자료들", "경쟁업체 참고", "tools"]:
        if bad in s:
            return True
    return False

def main():
    root = Path(".")
    urls = []
    for p in sorted(root.rglob("*.html")):
        if should_skip(p):
            continue
        rel = p.as_posix().lstrip("./")
        url = f"{BASE_URL}/{rel}"
        # index.html -> /
        if url.endswith("/index.html"):
            url = url[:-10]
        urls.append(url)

    # Ensure blog hub ends with /
    # (If you prefer index.html, remove this block)
    urls = [u if not u.endswith("/pages/blog/index.html") else u[:-10] for u in urls]

    # Dedupe
    seen=set()
    out=[]
    for u in urls:
        u = re.sub(r"^http://", "https://", u)
        if u not in seen:
            seen.add(u); out.append(u)

    xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    for u in out:
        xml += f"  <url><loc>{u}</loc></url>\n"
    xml += '</urlset>\n'
    Path("sitemap.xml").write_text(xml, encoding="utf-8", newline="\n")
    print(f"[OK] sitemap.xml generated: {len(out)} urls")

if __name__ == "__main__":
    main()
