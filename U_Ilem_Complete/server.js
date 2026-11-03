'use strict';
// Локальный сервер запуска игры и безопасный мост к Ollama.
// Слушает только localhost: удалённый доступ из сети не открывается.
const http = require('http');
const fs = require('fs');
const path = require('path');

const HOST = '127.0.0.1';
const PORT = Number(process.env.UILEM_PORT || 4317);
const ROOT = __dirname;
const MODEL = 'qwen3:4b';
const OLLAMA = 'http://127.0.0.1:11434';
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.ico': 'image/x-icon', '.png': 'image/png',
  '.json': 'application/json; charset=utf-8', '.txt': 'text/plain; charset=utf-8'
};

function json(res, status, body) {
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
        reject(new Error('Слишком большой запрос'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function fetchOllamaTags() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1800);
  try {
    const r = await fetch(`${OLLAMA}/api/tags`, { signal: controller.signal, cache: 'no-store' });
    if (!r.ok) throw new Error(`Ollama вернула HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(timer);
  }
}

async function handleChat(req, res) {
  let raw;
  try {
    raw = await readBody(req);
  } catch (e) {
    return json(res, 413, { error: e.message || 'Не удалось прочитать запрос' });
  }
  let payload;
  try {
    payload = JSON.parse(raw || '{}');
  } catch {
    return json(res, 400, { error: 'Некорректный JSON-запрос' });
  }
  // Игра работает с заранее установленной моделью, произвольные модели через мост не запускаются.
  payload.model = MODEL;
  payload.stream = false;
  payload.keep_alive = '90s';
  payload.options = { temperature: 0.1, num_ctx: 4096, num_predict: 520, ...(payload.options || {}) };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 240000);
  try {
    const r = await fetch(`${OLLAMA}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    const text = await r.text();
    res.writeHead(r.status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    });
    res.end(text);
  } catch (e) {
    const message = e.name === 'AbortError'
      ? 'Ollama не ответила за 4 минуты. Попробуйте ещё раз.'
      : 'Не удалось подключиться к Ollama. Убедитесь, что приложение Ollama запущено.';
    json(res, 503, { error: message, detail: e.message });
  } finally {
    clearTimeout(timer);
  }
}

async function handler(req, res) {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  if (req.method === 'GET' && url.pathname === '/api/health') {
    try {
      const data = await fetchOllamaTags();
      const models = (data.models || []).map(x => x.name || x.model).filter(Boolean);
      return json(res, 200, { ok: true, ollama: true, model: MODEL, models, modelInstalled: models.some(x => x === MODEL || x.startsWith(`${MODEL}:`)) });
    } catch (e) {
      return json(res, 200, { ok: true, ollama: false, model: MODEL, models: [], error: e.message });
    }
  }
  if (req.method === 'POST' && url.pathname === '/api/ollama/chat') return handleChat(req, res);
  if (req.method === 'GET' && url.pathname === '/api/ollama/tags') {
    try { return json(res, 200, await fetchOllamaTags()); }
    catch (e) { return json(res, 503, { error: 'Ollama недоступна', detail: e.message }); }
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { error: 'Метод не поддерживается' });

  let pathname;
  try { pathname = decodeURIComponent(url.pathname); }
  catch { return json(res, 400, { error: 'Некорректный путь' }); }
  if (pathname === '/') pathname = '/U_Ilem.html';
  // Главная игра берётся из проверенной версии 3.2 в корне репозитория.
  // Её карта и исходный HTML не переписываются. Новые системы подключаются отдельными модулями.
  const isMainGame = pathname === '/U_Ilem.html';
  const filePath = isMainGame
    ? path.resolve(ROOT, '../U_Ilem_3_2.html')
    : path.resolve(ROOT, `.${pathname}`);
  if (!isMainGame && !filePath.startsWith(ROOT + path.sep)) return json(res, 403, { error: 'Доступ запрещён' });
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) return json(res, 404, { error: 'Файл не найден' });
    const type = isMainGame ? MIME['.html'] : (MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream');
    res.writeHead(200, {
      'Content-Type': type,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer'
    });
    if (req.method === 'HEAD') {
      res.setHeader('Content-Length', stat.size + (isMainGame ? 39 : 0));
      return res.end();
    }
    if (isMainGame) {
      fs.readFile(filePath, (readErr, data) => {
        if (readErr) return json(res, 500, { error: 'Не удалось открыть основной файл игры' });
        const source = data.toString('utf8');
        const injected = source.replace('</body>', '<script src="/lighting.js"></script></body>');
        const body = Buffer.from(injected, 'utf8');
        res.setHeader('Content-Length', body.length);
        res.end(body);
      });
      return;
    }
    res.setHeader('Content-Length', stat.size);
    fs.createReadStream(filePath).pipe(res);
  });
}

const server = http.createServer(handler);
server.on('error', e => {
  if (e.code === 'EADDRINUSE') {
    console.error(`Порт ${PORT} уже занят. Возможно, игра уже запущена.`);
  } else {
    console.error('Ошибка локального сервера:', e);
  }
  process.exitCode = 1;
});
server.listen(PORT, HOST, () => {
  console.log('============================================');
  console.log('  У Илем · локальный игровой сервер');
  console.log(`  Игра:   http://${HOST}:${PORT}`);
  console.log(`  ИИ:     ${MODEL} через локальную Ollama`);
  console.log('  Сервер доступен только на этом компьютере.');
  console.log('============================================');
});
