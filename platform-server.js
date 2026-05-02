//Claude generated file to assist in website perfomance testing
// Minimal static file server for platform E2E/perf tests.
// Uses only Node built-ins — no extra packages needed.
// Serves the repo root (../../ relative to this file) on port 3334
// with no clean-URL rewrites, so query strings on .html pages are preserved.

const http = require('http');
const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname);
const PORT = 3334;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
  '.ttf':  'font/ttf',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.webm': 'video/webm',
  '.mp4':  'video/mp4',
};

http.createServer((req, res) => {
  const parsed = new URL(req.url, 'http://localhost');
    let pathname = decodeURIComponent(parsed.pathname);
  if (pathname === '/') pathname = '/index.html';

  const filePath = path.join(ROOT, pathname);

  // Prevent directory traversal outside ROOT
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found: ' + pathname);
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, '127.0.0.1', () => {
  console.log(`platform-server: serving ${ROOT} on http://localhost:${PORT}`);
});