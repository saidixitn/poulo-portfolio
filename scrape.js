const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const BASE_URL = 'https://www.poulo.site';
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const ROUTES = [
  '/',
  '/work/ai-agentic/billdr',
  '/work/ai-agentic/chloe',
  '/work/ai-agentic/otera',
  '/work/saas/qpage',
  '/work/saas/weldica',
  '/work/website/nexscale-website'
];

const OUTPUT_DIR = path.join(__dirname, 'public');
const RSC_DIR = path.join(__dirname, 'rsc_data');

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function urlToLocalPath(u, contentType = '') {
  try {
    const parsed = new URL(u, BASE_URL);
    let pathname = decodeURIComponent(parsed.pathname);

    // Handle query params for Next.js image optimization
    if (pathname === '/_next/image') {
      const imgUrl = parsed.searchParams.get('url');
      const w = parsed.searchParams.get('w') || 'auto';
      const q = parsed.searchParams.get('q') || '75';
      if (imgUrl) {
        const cleanImg = imgUrl.replace(/^\//, '').replace(/[^a-zA-Z0-9._-]/g, '_');
        return path.join(OUTPUT_DIR, '_next', 'image_cache', `${cleanImg}_w${w}_q${q}.webp`);
      }
    }

    if (pathname.endsWith('/') || pathname === '') {
      pathname = path.join(pathname, 'index.html');
    } else if (!path.extname(pathname) || contentType.includes('text/html')) {
      pathname = path.join(pathname, 'index.html');
    }

    return path.join(OUTPUT_DIR, pathname.startsWith('/') ? pathname.slice(1) : pathname);
  } catch (err) {
    return null;
  }
}

async function run() {
  console.log('Launching Chrome with puppeteer-core...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  const savedUrls = new Set();

  page.on('response', async (res) => {
    try {
      const resUrl = res.url();
      if (!resUrl.startsWith(BASE_URL)) return;
      if (savedUrls.has(resUrl)) return;

      const status = res.status();
      if (status >= 200 && status < 300) {
        const headers = res.headers();
        const contentType = headers['content-type'] || '';
        const localPath = urlToLocalPath(resUrl, contentType);
        if (localPath) {
          const buffer = await res.buffer();
          ensureDir(localPath);
          fs.writeFileSync(localPath, buffer);
          savedUrls.add(resUrl);
        }
      }
    } catch (err) {
      // ignore
    }
  });

  console.log('Navigating to homepage to pass security challenge...');
  await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 });

  // Extract sitemap images
  console.log('Fetching sitemap for complete asset inventory...');
  const sitemapXml = await page.evaluate(async () => {
    try {
      const r = await fetch('/sitemap.xml');
      return await r.text();
    } catch (e) {
      return '';
    }
  });

  const sitemapImages = [];
  const imgMatches = sitemapXml.matchAll(/<image:loc>([^<]+)<\/image:loc>/g);
  for (const m of imgMatches) {
    sitemapImages.push(m[1]);
  }
  console.log(`Found ${sitemapImages.length} images in sitemap.xml`);

  // Visit every route and scroll/interact
  for (const route of ROUTES) {
    console.log(`\n--- Visiting route: ${route} ---`);
    await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle2', timeout: 30000 });

    // Smooth scroll down to bottom to trigger lazy loading
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 400;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 80);
      });
    });

    await new Promise(r => setTimeout(r, 800));

    // Scroll back to top
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise(r => setTimeout(r, 400));

    // Homepage specific interactions
    if (route === '/') {
      console.log('Interacting with filter buttons...');
      const filterLabels = ['Show all', 'AI and Agentics', 'Websites', 'SaaS', 'MobileApp', 'Design System'];
      for (const label of filterLabels) {
        await page.evaluate((btnLabel) => {
          const btns = Array.from(document.querySelectorAll('button'));
          const target = btns.find(b => b.innerText && b.innerText.includes(btnLabel));
          if (target) target.click();
        }, label);
        await new Promise(r => setTimeout(r, 300));
      }
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const target = btns.find(b => b.innerText && b.innerText.includes('Show all'));
        if (target) target.click();
      });

      // Toggle theme
      console.log('Testing theme toggle...');
      await page.evaluate(() => {
        const themeBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.includes('Switch between light and dark mode'));
        if (themeBtn) {
          themeBtn.click();
          setTimeout(() => themeBtn.click(), 400);
        }
      });
      await new Promise(r => setTimeout(r, 600));
    }

    // Save exact route HTML
    console.log(`Saving clean HTML for ${route}...`);
    const routeHtml = await page.evaluate(async (r) => {
      const res = await fetch(r, {
        headers: { 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' }
      });
      return await res.text();
    }, route);

    const htmlDest = route === '/'
      ? path.join(OUTPUT_DIR, 'index.html')
      : path.join(OUTPUT_DIR, route.slice(1), 'index.html');

    ensureDir(htmlDest);
    fs.writeFileSync(htmlDest, routeHtml, 'utf8');

    // Fetch and save RSC flight data
    console.log(`Saving RSC flight data for ${route}...`);
    const rscData = await page.evaluate(async (r) => {
      try {
        const res = await fetch(`${r}?_rsc=1`, {
          headers: {
            'RSC': '1',
            'Next-Router-State-Tree': '%5B%22%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%5D%7D%2Cnull%2Cnull%2Ctrue%5D'
          }
        });
        if (res.ok) {
          return await res.text();
        }
      } catch (e) {}
      return null;
    }, route);

    if (rscData) {
      const rscKey = route === '/' ? 'index' : route.slice(1).replace(/\//g, '_');
      const rscDest = path.join(RSC_DIR, `${rscKey}.rsc`);
      ensureDir(rscDest);
      fs.writeFileSync(rscDest, rscData, 'utf8');
    }
  }

  // Fetch all sitemap images
  console.log('\n--- Downloading all sitemap images ---');
  for (let i = 0; i < sitemapImages.length; i++) {
    const imgUrl = sitemapImages[i];
    try {
      const parsed = new URL(imgUrl);
      const localPath = path.join(OUTPUT_DIR, parsed.pathname.slice(1));
      if (!fs.existsSync(localPath)) {
        process.stdout.write(`\r[${i + 1}/${sitemapImages.length}] Fetching ${parsed.pathname}...`);
        const b64 = await page.evaluate(async (u) => {
          const r = await fetch(u);
          if (!r.ok) return null;
          const blob = await r.blob();
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.readAsDataURL(blob);
          });
        }, imgUrl);

        if (b64) {
          ensureDir(localPath);
          fs.writeFileSync(localPath, Buffer.from(b64, 'base64'));
        }
      }
    } catch (e) {}
  }
  console.log('\nSitemap images downloaded.');

  // Fetch sitemap.xml, robots.txt, favicon, icons, og images
  console.log('Fetching robots.txt, sitemap.xml, og images...');
  const extraAssets = [
    '/robots.txt',
    '/sitemap.xml',
    '/favicon.ico',
    '/icon.png',
    '/og/pouya-portfolio.png'
  ];

  for (const extra of extraAssets) {
    try {
      const b64 = await page.evaluate(async (u) => {
        const r = await fetch(u);
        if (!r.ok) return null;
        const blob = await r.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result.split(',')[1]);
          reader.readAsDataURL(blob);
        });
      }, extra);
      if (b64) {
        const p = path.join(OUTPUT_DIR, extra.slice(1));
        ensureDir(p);
        fs.writeFileSync(p, Buffer.from(b64, 'base64'));
      }
    } catch (e) {}
  }

  // Check all referenced static assets across all HTML files
  console.log('Scanning for all referenced static assets in HTML...');
  const allSavedHtmlFiles = [];
  function collectHtml(dir) {
    for (const f of fs.readdirSync(dir)) {
      const full = path.join(dir, f);
      if (fs.statSync(full).isDirectory()) collectHtml(full);
      else if (f.endsWith('.html')) allSavedHtmlFiles.push(full);
    }
  }
  collectHtml(OUTPUT_DIR);

  const referencedUrls = new Set();
  for (const htmlPath of allSavedHtmlFiles) {
    const content = fs.readFileSync(htmlPath, 'utf8');
    const matches = content.matchAll(/(?:\/_next\/static\/[^"'()\s]+|\/work\/[^"'()\s]+|\/logos\/[^"'()\s]+|\/work-gallery\/[^"'()\s]+|\/og\/[^"'()\s]+)/g);
    for (const m of matches) {
      let clean = m[0].split(/[?#]/)[0];
      referencedUrls.add(clean);
    }
  }

  console.log(`Found ${referencedUrls.size} referenced static assets in HTML. Checking downloads...`);
  for (const ref of referencedUrls) {
    const local = path.join(OUTPUT_DIR, ref.startsWith('/') ? ref.slice(1) : ref);
    if (!fs.existsSync(local)) {
      console.log(`Downloading missing asset: ${ref}`);
      try {
        const b64 = await page.evaluate(async (u) => {
          const r = await fetch(u);
          if (!r.ok) return null;
          const blob = await r.blob();
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.readAsDataURL(blob);
          });
        }, ref);
        if (b64) {
          ensureDir(local);
          fs.writeFileSync(local, Buffer.from(b64, 'base64'));
        }
      } catch (e) {}
    }
  }

  // Also check CSS files for fonts or images (e.g. url(...))
  console.log('Scanning CSS files for font files / assets...');
  const cssDir = path.join(OUTPUT_DIR, '_next', 'static', 'chunks');
  if (fs.existsSync(cssDir)) {
    for (const file of fs.readdirSync(cssDir)) {
      if (file.endsWith('.css')) {
        const cssContent = fs.readFileSync(path.join(cssDir, file), 'utf8');
        const urlMatches = cssContent.matchAll(/url\((['"]?)([^'")]+)\1\)/g);
        for (const um of urlMatches) {
          let assetUrl = um[2];
          if (!assetUrl.startsWith('http') && !assetUrl.startsWith('data:')) {
            const local = path.join(OUTPUT_DIR, assetUrl.startsWith('/') ? assetUrl.slice(1) : assetUrl);
            if (!fs.existsSync(local)) {
              console.log(`Downloading CSS asset: ${assetUrl}`);
              try {
                const b64 = await page.evaluate(async (u) => {
                  const r = await fetch(u);
                  if (!r.ok) return null;
                  const blob = await r.blob();
                  return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result.split(',')[1]);
                    reader.readAsDataURL(blob);
                  });
                }, assetUrl);
                if (b64) {
                  ensureDir(local);
                  fs.writeFileSync(local, Buffer.from(b64, 'base64'));
                }
              } catch (e) {}
            }
          }
        }
      }
    }
  }

  await browser.close();
  console.log('\nAll pages, chunks, RSC payloads, and assets captured successfully!');
}

run().catch(err => {
  console.error('Scraping error:', err);
  process.exit(1);
});
