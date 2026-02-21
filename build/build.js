const fs = require('fs');
const path = require('path');

/*
 LOCK RULE:
 - build_output is the ONLY allowed write target.
 - Production overwrite must be manual and one-file-at-a-time.
*/

function isSubpath(childPath, parentPath) {
  const relative = path.relative(parentPath, childPath);
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function assertSafeOutputPath(outputPath, repoRoot) {
  const resolvedOutput = path.resolve(outputPath);

  const forbiddenDirs = ['pages', 'templates', 'css', 'js'];
  for (const dir of forbiddenDirs) {
    const resolvedForbidden = path.resolve(repoRoot, dir);
    if (isSubpath(resolvedOutput, resolvedForbidden) || resolvedOutput === resolvedForbidden) {
      if (dir === 'pages') {
        process.stderr.write('[build] Production path detected. Overwrite blocked.\n');
        process.exit(1);
      }

      const rel = path
        .relative(repoRoot, resolvedOutput)
        .split(path.sep)
        .join('/');
      process.stderr.write(`[build] Forbidden write target detected: ${rel}\n`);
      process.exit(1);
    }
  }

  const resolvedBuildOutput = path.resolve(repoRoot, 'build_output');
  if (!(isSubpath(resolvedOutput, resolvedBuildOutput) || resolvedOutput === resolvedBuildOutput)) {
    const rel = path
      .relative(repoRoot, resolvedOutput)
      .split(path.sep)
      .join('/');
    process.stderr.write(`[build] Forbidden write target (outside build_output): ${rel}\n`);
    process.exit(1);
  }
}

function verifyHeadInjection(label, html) {
  const canonicalCount = (html.match(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi) || []).length;
  const robotsCount = (html.match(/<meta\b[^>]*name=["']robots["'][^>]*>/gi) || []).length;
  const jsonLdCount = (
    html.match(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>/gi) || []
  ).length;
  const mainCssCount = (html.match(/<link\b[^>]*href=["']\/css\/main\.css["'][^>]*>/gi) || []).length;
  const particlesCssCount = (
    html.match(/<link\b[^>]*href=["']\/css\/particles\.css["'][^>]*>/gi) || []
  ).length;

  const ga4Present = /gtag\/js\?id=/i.test(html);
  const metaPixelPresent = /connect\.facebook\.net/i.test(html) || /fbq\(\s*['"]init['"]/i.test(html);

  const reasons = [];
  if (canonicalCount !== 1) reasons.push(`canonical=${canonicalCount}`);
  if (robotsCount !== 1) reasons.push(`robots=${robotsCount}`);
  if (jsonLdCount !== 1) reasons.push(`jsonld=${jsonLdCount}`);
  if (mainCssCount !== 1) reasons.push(`maincss=${mainCssCount}`);
  if (particlesCssCount !== 1) reasons.push(`particlescss=${particlesCssCount}`);

  const pass = reasons.length === 0;
  const details = `canonical=${canonicalCount} robots=${robotsCount} jsonld=${jsonLdCount} maincss=${mainCssCount} particlescss=${particlesCssCount} ga4=${ga4Present ? 'Y' : 'N'} pixel=${metaPixelPresent ? 'Y' : 'N'}`;

  if (pass) {
    process.stdout.write(`[verify] ${label}: PASS (${details})\n`);
  } else {
    process.stdout.write(`[verify] ${label}: FAIL (${reasons.join(' ')})\n`);
  }

  return pass;
}

function readUtf8(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function writeUtf8(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf8');
}

function applyPlaceholders(template, vars) {
  return template
    .split('{{TITLE}}').join(vars.TITLE)
    .split('{{CANONICAL}}').join(vars.CANONICAL)
    .split('{{ROBOTS}}').join(vars.ROBOTS)
    .split('{{JSON_LD}}').join(vars.JSON_LD)
    .split('{{HEAD_SCRIPTS}}').join(vars.HEAD_SCRIPTS || '');
}

function sanitizeHeadScripts(input) {
  if (!input) return '';

  const trimmed = String(input).trim();
  if (!trimmed) return '';

  const allowTags = new Set(['script', 'noscript', 'meta', 'link']);

  if (/<\s*[!?]/.test(trimmed)) {
    process.stderr.write('[pageMeta] globalHeadScripts contains disallowed tags; skipping injection\n');
    return '';
  }

  const tags = trimmed.match(/<\s*\/?\s*[a-zA-Z][a-zA-Z0-9-]*\b[^>]*>/g) || [];
  let noscriptDepth = 0;

  for (const tag of tags) {
    const isClosing = /^<\s*\//.test(tag);
    const match = tag.match(/^<\s*\/?\s*([a-zA-Z][a-zA-Z0-9-]*)\b/i);
    const tagName = match ? match[1].toLowerCase() : '';

    if (tagName === 'noscript') {
      if (isClosing) {
        if (noscriptDepth > 0) noscriptDepth--;
      } else {
        noscriptDepth++;
      }
      continue;
    }

    if (tagName === 'img') {
      if (noscriptDepth > 0) continue;
      process.stderr.write('[pageMeta] globalHeadScripts contains disallowed tags; skipping injection\n');
      return '';
    }

    if (!allowTags.has(tagName)) {
      process.stderr.write('[pageMeta] globalHeadScripts contains disallowed tags; skipping injection\n');
      return '';
    }
  }

  return trimmed;
}

function renderArticleJsonLd(jsonLdObject) {
  let json;
  try {
    json = JSON.stringify(jsonLdObject, null, 2);
  } catch (err) {
    process.stderr.write('[jsonLd] Failed to stringify jsonLd object\n');
    process.stderr.write(`${err && err.message ? err.message : String(err)}\n`);
    process.exit(1);
  }

  return ['<script type="application/ld+json">', json, '</script>'].join('\n');
}

function stripScrollControllerFromFooter(footerHtml) {
  return footerHtml.replace(
    /\r?\n\s*<script src="\/js\/core\/scroll-controller-pc\.js" defer><\/script>\r?\n/,
    '\n'
  );
}

function loadPageMetaConfig(repoRoot) {
  const configPath = path.join(repoRoot, 'build', 'pageMeta.config.json');

  let raw;
  try {
    raw = fs.readFileSync(configPath, 'utf8');
  } catch (err) {
    process.stderr.write(`[pageMeta] Failed to read config file: ${configPath}\n`);
    process.stderr.write(`${err && err.message ? err.message : String(err)}\n`);
    process.exit(1);
  }

  if (raw.length > 0 && raw.charCodeAt(0) === 0xfeff) {
    raw = raw.slice(1);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    process.stderr.write(`[pageMeta] Failed to parse JSON: ${configPath}\n`);
    process.stderr.write(`${err && err.message ? err.message : String(err)}\n`);
    process.exit(1);
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    process.stderr.write(`[pageMeta] Invalid config: expected an object at root: ${configPath}\n`);
    process.exit(1);
  }

  if (!Array.isArray(parsed.blogPosts)) {
    process.stderr.write(`[pageMeta] Invalid config: blogPosts must be an array\n`);
    process.exit(1);
  }

  if (
    Object.prototype.hasOwnProperty.call(parsed, 'globalHeadScripts') &&
    typeof parsed.globalHeadScripts !== 'string'
  ) {
    process.stderr.write('[pageMeta] Invalid config: globalHeadScripts must be a string\n');
    process.exit(1);
  }

  for (let i = 0; i < parsed.blogPosts.length; i++) {
    const item = parsed.blogPosts[i];
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      process.stderr.write(`[pageMeta] Invalid blogPosts at index ${i}: expected an object\n`);
      process.exit(1);
    }

    for (const key of ['slug', 'title', 'robots', 'canonical']) {
      const value = item[key];
      if (typeof value !== 'string' || value.trim().length === 0) {
        process.stderr.write(
          `[pageMeta] Invalid blogPosts at index ${i}: ${key} must be a non-empty string\n`
        );
        process.exit(1);
      }
    }

    if (!item.jsonLd || typeof item.jsonLd !== 'object' || Array.isArray(item.jsonLd)) {
      process.stderr.write(`[pageMeta] Invalid blogPosts at index ${i}: jsonLd must be an object\n`);
      process.exit(1);
    }
  }

  return parsed;
}

function main() {
  const repoRoot = path.resolve(__dirname, '..');

  let anyVerifyFail = false;

  const pageMeta = loadPageMetaConfig(repoRoot);
  const globalHeadScripts = sanitizeHeadScripts(pageMeta.globalHeadScripts || '');

  const headPath = path.join(repoRoot, 'templates', 'head.html');
  const headerPath = path.join(repoRoot, 'templates', 'header.html');
  const footerPath = path.join(repoRoot, 'templates', 'footer.html');

  const sampleBodyPath = path.join(repoRoot, 'pages', 'blog', 'posts', 'sample.body.html');
  const outputPath = path.join(repoRoot, 'build_output', 'sample.generated.html');

  const head = readUtf8(headPath);
  const header = readUtf8(headerPath);
  const footer = readUtf8(footerPath);
  const bodyFragment = readUtf8(sampleBodyPath);

  const vars = {
    TITLE: '샘플 생성 페이지 | 블로그 | 제주똑똑이',
    CANONICAL: 'https://www.jejutoktokyi.com/build_output/sample.generated.html',
    ROBOTS: 'index,follow',
    HEAD_SCRIPTS: globalHeadScripts,
    JSON_LD: [
      '<script type="application/ld+json">',
      '{',
      '  "@context": "https://schema.org",',
      '  "@type": "Article",',
      '  "headline": "샘플 생성 페이지 | 블로그 | 제주똑똑이",',
      '  "mainEntityOfPage": {',
      '    "@type": "WebPage",',
      '    "@id": "https://www.jejutoktokyi.com/build_output/sample.generated.html"',
      '  },',
      '  "author": {',
      '    "@type": "Organization",',
      '    "name": "제주똑똑이"',
      '  },',
      '  "publisher": {',
      '    "@type": "Organization",',
      '    "name": "제주똑똑이"',
      '  }',
      '}',
      '</script>'
    ].join('\n'),
  };

  vars.ROBOTS = 'noindex,follow';

  const renderedHead = applyPlaceholders(head, vars);

  const html = renderedHead + header + bodyFragment + footer;
  assertSafeOutputPath(outputPath, repoRoot);
  writeUtf8(outputPath, html);

  process.stdout.write(`Generated: ${path.relative(repoRoot, outputPath)}\n`);
  if (!verifyHeadInjection('sample', html)) anyVerifyFail = true;

  const blogPosts = pageMeta.blogPosts;

  for (const post of blogPosts) {
    const bodyPath = path.join(repoRoot, 'pages', 'blog', 'posts', `${post.slug}.body.html`);
    const outputPath = path.join(repoRoot, 'build_output', `${post.slug}.generated.html`);
    const canonical = post.canonical;

    if (!fs.existsSync(bodyPath)) {
      const relativeBodyPath = path
        .relative(repoRoot, bodyPath)
        .split(path.sep)
        .join('/');
      process.stderr.write(`[build] Missing body fragment: ${relativeBodyPath}\n`);
      process.stderr.write(`[build] Expected: pages/blog/posts/${post.slug}.body.html\n`);
      process.stdout.write(`FAIL ${post.slug} (missing body fragment)\n`);
      process.stdout.write(`[verify] ${post.slug}: FAIL (missing body fragment)\n`);
      anyVerifyFail = true;
      continue;
    }

    const body = readUtf8(bodyPath);
    const vars = {
      TITLE: post.title,
      CANONICAL: canonical,
      ROBOTS: post.robots,
      HEAD_SCRIPTS: globalHeadScripts,
      JSON_LD: renderArticleJsonLd(post.jsonLd),
    };

    const renderedHead = applyPlaceholders(head, vars);
    const safeFooter = stripScrollControllerFromFooter(footer);
    const html = renderedHead + header + body + safeFooter;

    assertSafeOutputPath(outputPath, repoRoot);
    writeUtf8(outputPath, html);
    process.stdout.write(`Generated: ${path.relative(repoRoot, outputPath)}\n`);

    if (!verifyHeadInjection(post.slug, html)) anyVerifyFail = true;

    const canonicalTags = html.match(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi) || [];
    const canonicalCount = canonicalTags.length;
    const canonicalValue = canonicalCount
      ? ((canonicalTags[0].match(/href=["']([^"']+)["']/i) || [])[1] || '')
      : '';

    const robotsTags = html.match(/<meta\b[^>]*name=["']robots["'][^>]*>/gi) || [];
    const robotsCount = robotsTags.length;
    const robotsValue = robotsCount
      ? ((robotsTags[0].match(/content=["']([^"']+)["']/i) || [])[1] || '')
      : '';

    const mainCssCount = (html.match(/<link\b[^>]*href=["']\/css\/main\.css["'][^>]*>/gi) || []).length;
    const particlesCssCount = (html.match(/<link\b[^>]*href=["']\/css\/particles\.css["'][^>]*>/gi) || []).length;
    const jsonldPresent = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>/i.test(html);
    const jsonldArticleTypePresent = /"@type"\s*:\s*"Article"/i.test(html);
    const scrollControllerPresent = /\/js\/core\/scroll-controller-pc\.js/i.test(html);

    process.stdout.write(`canonical_count ${canonicalCount}\n`);
    process.stdout.write(`canonical_value ${canonicalValue}\n`);
    process.stdout.write(`robots_count ${robotsCount}\n`);
    process.stdout.write(`robots_value ${robotsValue}\n`);
    process.stdout.write(`main_css_count ${mainCssCount}\n`);
    process.stdout.write(`particles_css_count ${particlesCssCount}\n`);
    process.stdout.write(`jsonld_present ${jsonldPresent}\n`);
    process.stdout.write(`jsonld_article_type_present ${jsonldArticleTypePresent}\n`);
    process.stdout.write(`scroll_controller_present ${scrollControllerPresent ? 'YES' : 'NO'}\n`);

    const pass =
      canonicalCount === 1 &&
      canonicalValue === canonical &&
      robotsCount === 1 &&
      robotsValue === post.robots &&
      mainCssCount === 1 &&
      particlesCssCount === 1 &&
      jsonldPresent === true &&
      jsonldArticleTypePresent === true &&
      scrollControllerPresent === false;

    process.stdout.write(`${pass ? 'PASS' : 'FAIL'} ${post.slug}\n`);
  }

  if (anyVerifyFail) process.exitCode = 1;
}

main();
