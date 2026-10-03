// Base44 dev server for this project.
// The repo is a static HTML site (no build step, no dependencies), so this
// serves the cloned source directly and injects a tiny live-reload snippet
// that polls /__base44_version. Editing an HTML/CSS/JS file reloads the preview.
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT || 3000);
const DEFAULT_PAGE = 'dog_training_pdf.html';
const WATCH_EXT = new Set(['.html', '.htm', '.css', '.js', '.mjs', '.json', '.svg']);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

const RELOAD_SNIPPET = `<script>
(function () {
  var current = null;
  setInterval(function () {
    fetch('/__base44_version', { cache: 'no-store' })
      .then(function (r) { return r.text(); })
      .then(function (v) {
        if (current === null) current = v;
        else if (v !== current) location.reload();
      })
      .catch(function () {});
  }, 1000);
})();
</script>
`;

function walk(dir, out = []) {
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (WATCH_EXT.has(path.extname(entry.name).toLowerCase())) {
      try {
        const st = fs.statSync(full);
        out.push(entry.name + st.mtimeMs + st.size);
      } catch {}
    }
  }
  return out;
}

function version() {
  // Hash every watched file's name + mtime + size, so a change to ANY file
  // (not just the first one) changes the reload token.
  return crypto.createHash('sha1').update(walk(ROOT).sort().join('|')).digest('hex').slice(0, 16);
}

function resolveFile(pathname) {
  let rel = decodeURIComponent(pathname).replace(/^\/+/, '');
  let target = path.resolve(ROOT, rel);
  if (target !== ROOT && !target.startsWith(ROOT + path.sep)) return null;

  let stat = null;
  try {
    stat = fs.statSync(target);
  } catch {
    return null;
  }
  if (stat.isDirectory()) {
    for (const candidate of ['index.html', DEFAULT_PAGE]) {
      const file = path.join(target, candidate);
      if (fs.existsSync(file)) return file;
    }
    return null;
  }
  return target;
}

const server = http.createServer((req, res) => {
  const pathname = (req.url || '/').split('?')[0];

  if (pathname === '/__base44_version') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(version());
    return;
  }

  const file = resolveFile(pathname === '/' ? '/' + DEFAULT_PAGE : pathname);
  if (!file) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
    return;
  }

  const ext = path.extname(file).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';
  res.setHeader('Content-Type', type);
  res.setHeader('Cache-Control', 'no-store');

  if (type.startsWith('text/html')) {
    let html = fs.readFileSync(file, 'utf8');
    html = html.includes('</body>')
      ? html.replace('</body>', RELOAD_SNIPPET + '</body>')
      : html + RELOAD_SNIPPET;
    res.writeHead(200);
    res.end(html);
    return;
  }

  res.writeHead(200);
  fs.createReadStream(file).pipe(res);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[base44] serving ${ROOT} at http://0.0.0.0:${PORT}/ (${DEFAULT_PAGE})`);
});
