const { exec } = require('child_process');

const PORT = process.env.PORT || 3000;
const URLS = [
  `http://localhost:${PORT}/`,
  `http://localhost:${PORT}/work/ai-agentic/billdr`,
  `http://localhost:${PORT}/work/ai-agentic/chloe`,
  `http://localhost:${PORT}/work/ai-agentic/otera`,
  `http://localhost:${PORT}/work/saas/qpage`,
  `http://localhost:${PORT}/work/saas/weldica`,
  `http://localhost:${PORT}/work/website/nexscale-website`
];

console.log('Opening all 7 pages in your browser...');
URLS.forEach((url, i) => {
  setTimeout(() => {
    console.log(`Opening: ${url}`);
    exec(`open "${url}"`);
  }, i * 300);
});
