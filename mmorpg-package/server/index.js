const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const GameServer = require('./game/GameServer');

const PORT = process.env.PORT || 8443;
const HTTP_PORT = process.env.HTTP_PORT || 8080;

// SSL certs: drop real certs here for production
//   server/ssl/fullchain.pem
//   server/ssl/privkey.pem
// or run `npm run gen-cert` for a local self-signed pair.
const SSL_KEY_PATH = process.env.SSL_KEY_PATH || path.join(__dirname, 'ssl', 'privkey.pem');
const SSL_CERT_PATH = process.env.SSL_CERT_PATH || path.join(__dirname, 'ssl', 'fullchain.pem');

const app = express();
app.use(express.static(path.join(__dirname, '..', 'client')));
app.use('/example', express.static(path.join(__dirname, '..', 'example')));
app.get('/health', (req, res) => res.json({ ok: true, uptime: process.uptime() }));

const corsConfig = {
  cors: { origin: process.env.ALLOWED_ORIGIN || '*', methods: ['GET', 'POST'] }
};

let server;
let usingSSL = false;

if (fs.existsSync(SSL_KEY_PATH) && fs.existsSync(SSL_CERT_PATH)) {
  const options = {
    key: fs.readFileSync(SSL_KEY_PATH),
    cert: fs.readFileSync(SSL_CERT_PATH)
  };
  server = https.createServer(options, app);
  usingSSL = true;
} else {
  console.warn('[mmorpg] No SSL certs found at server/ssl/. Falling back to plain HTTP.');
  console.warn('[mmorpg] Run `npm run gen-cert` for a local self-signed cert, or set SSL_KEY_PATH / SSL_CERT_PATH.');
  server = http.createServer(app);
}

const io = new Server(server, corsConfig);
new GameServer(io);

const listenPort = usingSSL ? PORT : HTTP_PORT;
server.listen(listenPort, () => {
  console.log(`[mmorpg] ${usingSSL ? 'HTTPS' : 'HTTP'} server listening on port ${listenPort}`);
  console.log(`[mmorpg] Example client: ${usingSSL ? 'https' : 'http'}://localhost:${listenPort}/example/index.html`);
});

// Optional: redirect plain HTTP -> HTTPS when running SSL in production
if (usingSSL && process.env.HTTP_REDIRECT !== 'false') {
  const redirectApp = express();
  redirectApp.use((req, res) => {
    res.redirect(`https://${req.hostname}:${PORT}${req.url}`);
  });
  http.createServer(redirectApp).listen(HTTP_PORT, () => {
    console.log(`[mmorpg] HTTP->HTTPS redirect listening on port ${HTTP_PORT}`);
  });
}
