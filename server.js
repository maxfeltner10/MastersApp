const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const RAPIDAPI_HOST = 'golf-leaderboard-data.p.rapidapi.com';
const RAPIDAPI_KEY = process.env.GOLF_RAPIDAPI_KEY || '';
const MASTERS_FIXTURE_ID = Number(process.env.MASTERS_FIXTURE_ID || 837);
const HTML_PATH = path.join(__dirname, 'masters_tracker_v2.html');

function send(res, statusCode, body, headers = {}) {
  res.writeHead(statusCode, {
    'Cache-Control': 'no-store',
    ...headers,
  });
  res.end(body);
}

function sendJson(res, statusCode, payload, headers = {}) {
  send(res, statusCode, JSON.stringify(payload), {
    'Content-Type': 'application/json; charset=utf-8',
    ...headers,
  });
}

function serveHtml(res) {
  try {
    const html = fs.readFileSync(HTML_PATH, 'utf8');
    send(res, 200, html, { 'Content-Type': 'text/html; charset=utf-8' });
  } catch (error) {
    send(res, 500, `Failed to read ${HTML_PATH}: ${error.message}`, {
      'Content-Type': 'text/plain; charset=utf-8',
    });
  }
}

async function proxyMasters(res) {
  if (!RAPIDAPI_KEY) {
    sendJson(res, 500, {
      error: 'Missing RapidAPI key. Set GOLF_RAPIDAPI_KEY before starting the proxy.',
    });
    return;
  }

  try {
    const upstream = await fetch(
      `https://${RAPIDAPI_HOST}/leaderboard/${MASTERS_FIXTURE_ID}`,
      {
        headers: {
          'x-rapidapi-host': RAPIDAPI_HOST,
          'x-rapidapi-key': RAPIDAPI_KEY,
        },
      }
    );
    const text = await upstream.text();

    send(res, upstream.status, text, {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
      'X-Quota-Limit': upstream.headers.get('x-ratelimit-requests-limit') || '',
      'X-Quota-Remaining': upstream.headers.get('x-ratelimit-requests-remaining') || '',
      'X-Quota-Reset': upstream.headers.get('x-ratelimit-requests-reset') || '',
      'X-RapidAPI-Target': `leaderboard/${MASTERS_FIXTURE_ID}`,
    });
  } catch (error) {
    sendJson(res, 502, {
      error: `RapidAPI request failed: ${error.message}`,
    });
  }
}

const server = http.createServer((req, res) => {
  const { method, url } = req;

  if (method === 'OPTIONS') {
    send(res, 204, '', {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return;
  }

  if (method === 'GET' && (url === '/' || url === '/masters_tracker_v2.html')) {
    serveHtml(res);
    return;
  }

  if (method === 'GET' && url === '/api/masters') {
    proxyMasters(res);
    return;
  }

  if (method === 'GET' && url === '/health') {
    sendJson(res, 200, { ok: true, fixtureId: MASTERS_FIXTURE_ID });
    return;
  }

  if (method === 'GET' && url === '/favicon.ico') {
    send(res, 204, '');
    return;
  }

  sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, HOST, () => {
  console.log(`Masters tracker proxy running at http://${HOST}:${PORT}`);
  console.log(`Proxy target: https://${RAPIDAPI_HOST}/leaderboard/${MASTERS_FIXTURE_ID}`);
});
