'use strict';
// У Илем 4.0 — автономный локальный сервер.
// Все игровые файлы находятся рядом с этим сервером.
const http = require('http');
const fs = require('fs');
const path = require('path');

const HOST = '127.0.0.1';
const PORT = Number(process.env.UILEM_PORT || 4320);
const ROOT = __dirname;
const MAIN_HTML = path.join(ROOT, 'U_Ilem_4_0.html');
const LIGHTING_JS = 'U_Ilem_4_0_lighting.js';
const INTERIORS_JS = 'U_Ilem_4_0_interiors.js';
const MODEL = 'qwen3:4b';
const OLLAMA = 'http://127.0.0.1:11434';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

function sendJson(res, status, body) {
  const data = Buffer.from(JSON.stringify(body));
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': data.length,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(data);
}

function readBody(req, maxBytes = 2 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error('Request is too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function getOllamaTags() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1800);
  try {
    const response = await fetch(OLLAMA + '/api/tags', {
      signal: controller.signal,
      cache: 'no-store'
    });
    if (!response.ok) throw new Error('Ollama HTTP ' + response.status);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function handleChat(req, res) {
  let raw;
  try {
    raw = await readBody(req);
  } catch (error) {
    return sendJson(res, 413, { error: error.message || 'Cannot read request' });
  }

  let payload;
  try {
    payload = JSON.parse(raw || '{}');
  } catch {
    return sendJson(res, 400, { error: 'Invalid JSON request' });
  }

  payload.model = MODEL;
  payload.stream = false;
  payload.keep_alive = '90s';
  payload.options = {
    temperature: 0.1,
    num_ctx: 4096,
    num_predict: 520,
    ...(payload.options || {})
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 240000);
  try {
    const response = await fetch(OLLAMA + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    const body = await response.text();
    res.writeHead(response.status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    });
    res.end(body);
  } catch (error) {
    const message = error.name === 'AbortError'
      ? 'Ollama did not respond within four minutes.'
      : 'Cannot connect to Ollama. Start the Ollama application first.';
    sendJson(res, 503, { error: message, detail: error.message });
  } finally {
    clearTimeout(timer);
  }
}

function safeStaticPath(pathname) {
  const resolved = path.resolve(ROOT, '.' + pathname);
  const relative = path.relative(ROOT, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return null;
  return resolved;
}

async function handler(req, res) {
  let url;
  try {
    url = new URL(req.url, 'http://' + HOST + ':' + PORT);
  } catch {
    return sendJson(res, 400, { error: 'Invalid URL' });
  }

  if (req.method === 'GET' && url.pathname === '/api/health') {
    try {
      const data = await getOllamaTags();
      const models = (data.models || []).map(item => item.name || item.model).filter(Boolean);
      return sendJson(res, 200, {
        ok: true,
        ollama: true,
        model: MODEL,
        models,
        modelInstalled: models.some(name => name === MODEL || name.startsWith(MODEL + ':'))
      });
    } catch (error) {
      return sendJson(res, 200, {
        ok: true,
        ollama: false,
        model: MODEL,
        models: [],
        error: error.message
      });
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/ollama/chat') {
    return handleChat(req, res);
  }
  if (req.method === 'GET' && url.pathname === '/api/ollama/tags') {
    try {
      return sendJson(res, 200, await getOllamaTags());
    } catch (error) {
      return sendJson(res, 503, { error: 'Ollama is unavailable', detail: error.message });
    }
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return sendJson(res, 400, { error: 'Invalid path encoding' });
  }

  const isMain = pathname === '/' || pathname === '/U_Ilem_4_0.html';
  const filePath = isMain ? MAIN_HTML : safeStaticPath(pathname);
  if (!filePath) return sendJson(res, 403, { error: 'Path is not allowed' });

  fs.stat(filePath, (statError, stat) => {
    if (statError || !stat.isFile()) {
      return sendJson(res, 404, { error: 'File not found' });
    }

    const type = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';

    if (isMain) {
      fs.readFile(MAIN_HTML, (readError, buffer) => {
        if (readError) return sendJson(res, 500, { error: 'Cannot read main game file' });
        let html = buffer.toString('utf8');

        // 3.2 is kept as the source file; the served game is version 4.0.
        html = html.replace('<title>У Илем 3.2 | Живая усадьба</title>',
          '<title>У Илем 4.0 | Живая усадьба</title>');
        html = html.replace('<span style="color:#e5bd70">3.0</span>',
          '<span style="color:#e5bd70">4.0</span>');

        // Read a 3.x save as migration input once; all subsequent writes use uilem4save.
        html = html.replace(
          "G=JSON.parse(localStorage.getItem('uilem3save'))||fresh()",
          "G=JSON.parse(localStorage.getItem('uilem4save'))||JSON.parse(localStorage.getItem('uilem3save'))||fresh()"
        );
        html = html.split("localStorage.setItem('uilem3save'")
          .join("localStorage.setItem('uilem4save'");

        const moduleTags = [
          '<script src="/' + LIGHTING_JS + '"></script>',
          '<script src="/' + INTERIORS_JS + '"></script>'
        ];
        for (const tag of moduleTags) {
          if (!html.includes(tag)) {
            const bodyIndex = html.lastIndexOf('</body>');
            if (bodyIndex >= 0) html = html.slice(0, bodyIndex) + tag + html.slice(bodyIndex);
            else html += tag;
          }
        }
        const iconTag = '<link rel="icon" href="/U_Ilem_4_0.ico" type="image/x-icon">';
        if (!/rel=["']icon["']/i.test(html) && /<\/head\s*>/i.test(html)) {
          html = html.replace(/<\/head\s*>/i, iconTag + '</head>');
        }
        const output = Buffer.from(html, 'utf8');
        res.writeHead(200, {
          'Content-Type': MIME['.html'],
          'Content-Length': output.length,
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
          'Referrer-Policy': 'no-referrer'
        });
        if (req.method === 'HEAD') return res.end();
        res.end(output);
      });
      return;
    }

    res.writeHead(200, {
      'Content-Type': type,
      'Content-Length': stat.size,
      'Cache-Control': 'public, max-age=300',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer'
    });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(filePath).pipe(res);
  });
}

const server = http.createServer(handler);
server.on('error', error => {
  if (error.code === 'EADDRINUSE') {
    console.error('Port ' + PORT + ' is already in use.');
  } else {
    console.error('Local game server error:', error);
  }
  process.exitCode = 1;
});

server.listen(PORT, HOST, () => {
  console.log('========================================');
  console.log('  У Илем 4.0 — локальный игровой сервер');
  console.log('  Game: http://' + HOST + ':' + PORT);
  console.log('  Optional AI: ' + MODEL + ' via local Ollama');
  console.log('  Server is available only on this PC.');
  console.log('========================================');
});
