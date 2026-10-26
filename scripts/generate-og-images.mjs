// Regenerate per-post Open Graph images into assets/og/.
// Not part of the Netlify build. Needs local Chrome and puppeteer-core:
//   npm install --prefix /tmp/ogtools puppeteer-core
//   NODE_PATH=/tmp/ogtools/node_modules node scripts/generate-og-images.mjs
// Images are committed so the site stays a static publish.

import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const chrome = process.env.CHROME_PATH || '/usr/local/bin/google-chrome';
const origin = process.env.OG_ORIGIN || 'http://127.0.0.1:8765';

const attr = (html, name) => {
  const re = new RegExp(`<meta\\s+property="${name}"\\s+content="([^"]*)"`, 'i');
  const named = new RegExp(`<meta\\s+name="${name}"\\s+content="([^"]*)"`, 'i');
  const m = html.match(re) || html.match(named);
  return m ? m[1].replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"') : '';
};

function cardHtml({ kicker, title, dek }) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
@font-face{font-family:'Bricolage Grotesque';font-weight:400 800;font-display:block;src:url('${origin}/assets/fonts/bricolage-grotesque-latin.woff2') format('woff2')}
@font-face{font-family:'IBM Plex Mono';font-weight:500;font-display:block;src:url('${origin}/assets/fonts/ibm-plex-mono-500-latin.woff2') format('woff2')}
@font-face{font-family:'IBM Plex Sans';font-weight:400 500;font-display:block;src:url('${origin}/assets/fonts/ibm-plex-sans-latin.woff2') format('woff2')}
*{box-sizing:border-box}
html,body{margin:0;width:1200px;height:630px;overflow:hidden}
body{
  background:#0B1B2B;
  color:#fff;
  font-family:'IBM Plex Sans',sans-serif;
  padding:72px 80px 64px;
  display:flex;
  flex-direction:column;
  background-image:
    radial-gradient(circle, rgba(140,165,255,0.28) 1.2px, transparent 1.4px),
    radial-gradient(circle at 108% 120%, transparent 180px, rgba(140,165,255,0.18) 181px, rgba(140,165,255,0.18) 182px, transparent 183px),
    radial-gradient(circle at 108% 120%, transparent 260px, rgba(140,165,255,0.14) 261px, rgba(140,165,255,0.14) 262px, transparent 263px);
  background-size:22px 22px, 100% 100%, 100% 100%;
}
.badge{width:72px;height:72px;border-radius:16px;background:#2D5BFF;display:flex;align-items:center;justify-content:center;position:relative;font-family:'Bricolage Grotesque',sans-serif;font-weight:700;font-size:26px;letter-spacing:0.02em}
.badge i{position:absolute;right:-4px;top:-4px;width:16px;height:16px;border-radius:50%;background:#FFB020;border:3px solid #0B1B2B}
.kicker{margin-top:36px;font-family:'IBM Plex Mono',monospace;font-size:18px;font-weight:500;letter-spacing:0.12em;text-transform:uppercase;color:#FFB020}
h1{margin:18px 0 0;max-width:980px;font-family:'Bricolage Grotesque',sans-serif;font-weight:800;font-size:58px;line-height:1.05;letter-spacing:-0.03em}
p{margin:22px 0 0;max-width:860px;font-size:26px;line-height:1.35;color:#B8C3D3;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.foot{margin-top:auto;display:flex;align-items:center;gap:16px;font-family:'IBM Plex Mono',monospace;font-size:18px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:#FFB020}
.foot b{width:36px;height:3px;background:#FFB020;border-radius:2px}
</style>
</head>
<body>
<div class="badge">AA<i></i></div>
<div class="kicker">${kicker}</div>
<h1>${title}</h1>
<p>${dek}</p>
<div class="foot"><b></b> Ali Ahmed Awan</div>
</body>
</html>`;
}

const escapeHtml = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

const posts = [];
for (const name of await readdir(path.join(root, 'blog'))) {
  if (!name.endsWith('.html') || name === 'index.html') continue;
  const html = await readFile(path.join(root, 'blog', name), 'utf8');
  const slug = name.replace(/\.html$/, '');
  const date = attr(html, 'article:published_time');
  const section = attr(html, 'article:section') || 'Blog';
  const when = date
    ? new Date(date + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
    : '';
  posts.push({
    slug,
    title: attr(html, 'og:title'),
    dek: attr(html, 'og:description'),
    kicker: [section, when].filter(Boolean).join('  ·  '),
  });
}
posts.push({
  slug: 'ai-training',
  title: 'AI training for teams',
  dek: 'Hands-on workshops for business teams, including AI for Managers and Leaders.',
  kicker: 'Workshops  ·  Lahore',
});

await mkdir(path.join(root, 'assets', 'og'), { recursive: true });
const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'],
});
for (const post of posts) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
  await page.setContent(cardHtml({
    kicker: escapeHtml(post.kicker),
    title: escapeHtml(post.title),
    dek: escapeHtml(post.dek),
  }), { waitUntil: 'networkidle0' });
  await page.evaluate(async () => { await document.fonts.ready; });
  const file = path.join(root, 'assets', 'og', `${post.slug}.png`);
  await page.screenshot({ path: file, clip: { x: 0, y: 0, width: 1200, height: 630 } });
  await page.close();
  console.log('wrote', path.relative(root, file));
}
await browser.close();
