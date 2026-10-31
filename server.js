const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const RSC_DIR = path.join(__dirname, 'rsc_data');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.mp4': 'video/mp4',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.rsc': 'text/x-component; charset=utf-8'
};

const ROUTES = {
  '/': { html: 'index.html', rsc: 'index.rsc' },
  '/work/ai-agentic/billdr': { html: 'work/ai-agentic/billdr/index.html', rsc: 'work_ai-agentic_billdr.rsc' },
  '/work/ai-agentic/chloe': { html: 'work/ai-agentic/chloe/index.html', rsc: 'work_ai-agentic_chloe.rsc' },
  '/work/ai-agentic/otera': { html: 'work/ai-agentic/otera/index.html', rsc: 'work_ai-agentic_otera.rsc' },
  '/work/saas/qpage': { html: 'work/saas/qpage/index.html', rsc: 'work_saas_qpage.rsc' },
  '/work/saas/weldica': { html: 'work/saas/weldica/index.html', rsc: 'work_saas_weldica.rsc' },
  '/work/website/nexscale-website': { html: 'work/website/nexscale-website/index.html', rsc: 'work_website_nexscale-website.rsc' }
};

// Stream range request helper for video playback
function serveVideo(req, res, filePath) {
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
      'Accept-Ranges': 'bytes',
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
}

const server = http.createServer((req, res) => {
  // CORS & local access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // Normalize trailing slash (except root)
  if (pathname.length > 1 && pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1);
  }

  // 1. Handle Next.js Image Optimization
  if (pathname === '/_next/image') {
    const imgUrl = parsedUrl.searchParams.get('url');
    const w = parsedUrl.searchParams.get('w') || 'auto';
    const q = parsedUrl.searchParams.get('q') || '75';

    if (imgUrl) {
      const clean = imgUrl.replace(/^\//, '').replace(/[^a-zA-Z0-9._-]/g, '_');
      const cachedFile = path.join(PUBLIC_DIR, '_next', 'image_cache', `${clean}_w${w}_q${q}.webp`);
      if (fs.existsSync(cachedFile)) {
        res.writeHead(200, { 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=31536000' });
        return fs.createReadStream(cachedFile).pipe(res);
      }

      // Fallback to original unoptimized file in public/
      const origFile = path.join(PUBLIC_DIR, imgUrl.startsWith('/') ? imgUrl.slice(1) : imgUrl);
      if (fs.existsSync(origFile) && fs.statSync(origFile).isFile()) {
        const ext = path.extname(origFile).toLowerCase();
        const mime = MIME_TYPES[ext] || 'image/jpeg';
        res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'public, max-age=31536000' });
        return fs.createReadStream(origFile).pipe(res);
      }
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('Image not found');
  }

  // 2. Handle Interactive Chat API
  if (pathname === '/api/chat' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      let question = 'your work';
      try {
        const parsed = JSON.parse(body);
        if (parsed.messages && parsed.messages.length > 0) {
          question = parsed.messages[parsed.messages.length - 1].content || question;
        }
      } catch (e) {}

      res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache'
      });

      const responseText = `Hi! You asked: "${question}". I am Pouya's portfolio assistant running locally with full interactivity! Pouya is a technical product designer and front-end engineer specializing in AI agentics (Billdr, Chloe, Otera), modern SaaS platforms (QPage, Weldica), and brand websites (Nexscale). Explore all the case studies and experiments right here!`;

      // Stream words
      const words = responseText.split(' ');
      let idx = 0;
      const interval = setInterval(() => {
        if (idx < words.length) {
          const chunkWord = words.slice(idx, idx + 3).join(' ') + ' ';
          res.write(JSON.stringify({ type: 'text', text: chunkWord }) + '\n');
          idx += 3;
        } else {
          clearInterval(interval);
          res.write(JSON.stringify({ type: 'done' }) + '\n');
          res.end();
        }
      }, 50);
    });
    return;
  }

  // 3. Handle Vercel Analytics and other API endpoints gracefully
  if (pathname.startsWith('/_vercel/') || pathname.startsWith('/api/')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok' }));
  }

  // 4. Handle React Server Component flight data (_rsc)
  const isRsc = parsedUrl.searchParams.has('_rsc') || req.headers['rsc'] === '1' || (req.headers['accept'] && req.headers['accept'].includes('text/x-component'));
  if (isRsc && ROUTES[pathname]) {
    const rscPath = path.join(RSC_DIR, ROUTES[pathname].rsc);
    if (fs.existsSync(rscPath)) {
      res.writeHead(200, {
        'Content-Type': 'text/x-component; charset=utf-8',
        'Vary': 'RSC, Next-Router-State-Tree, Next-Router-Prefetch',
        'Cache-Control': 'no-cache'
      });
      return fs.createReadStream(rscPath).pipe(res);
    }
  }

  // 5. Handle Known Routes -> Serve clean HTML
  if (ROUTES[pathname]) {
    const htmlPath = path.join(PUBLIC_DIR, ROUTES[pathname].html);
    if (fs.existsSync(htmlPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return fs.createReadStream(htmlPath).pipe(res);
    }
  }

  // 6. Handle Static Files from public directory
  const filePath = path.join(PUBLIC_DIR, pathname.startsWith('/') ? pathname.slice(1) : pathname);

  if (fs.existsSync(filePath)) {
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      const indexFile = path.join(filePath, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return fs.createReadStream(indexFile).pipe(res);
      }
    } else {
      const ext = path.extname(filePath).toLowerCase();
      if (ext === '.mp4') {
        return serveVideo(req, res, filePath);
      }
      const mime = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': mime,
        'Content-Length': stat.size,
        'Cache-Control': ext.match(/\.(js|css|woff2|png|jpg|webp|svg)$/) ? 'public, max-age=31536000' : 'no-cache'
      });
      return fs.createReadStream(filePath).pipe(res);
    }
  }

  // 404 fallback
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`\n=================================================`);
  console.log(`🚀 Poulo Portfolio running locally!`);
  console.log(`👉 Home:       http://localhost:${PORT}/`);
  console.log(`👉 Billdr AI:  http://localhost:${PORT}/work/ai-agentic/billdr`);
  console.log(`👉 Chloe AI:   http://localhost:${PORT}/work/ai-agentic/chloe`);
  console.log(`👉 Otera AI:   http://localhost:${PORT}/work/ai-agentic/otera`);
  console.log(`👉 QPage SaaS: http://localhost:${PORT}/work/saas/qpage`);
  console.log(`👉 Weldica:    http://localhost:${PORT}/work/saas/weldica`);
  console.log(`👉 Nexscale:   http://localhost:${PORT}/work/website/nexscale-website`);
  console.log(`=================================================\n`);
});
