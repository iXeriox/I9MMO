# Infini9 Server

Node.js WebSocket + Express server. Authoritative for characters, combat, and
shared instance (co-op boss) rooms. Talks to the Vue3 + Three.js client over
`wss://` (or `ws://` in local dev without certs).

## Install & run

```bash
cd server
cp .env.example .env
npm install
npm run dev        # auto-restarts on file changes
# or: npm start
```

By default it looks for a cert at `./certs/dev-key.pem` / `./certs/dev-cert.pem`.
If they're not found it falls back to plain HTTP so you can develop without TLS.

## Local dev certificate (self-signed)

```bash
mkdir -p certs
openssl req -x509 -newkey rsa:2048 -nodes \
  -keyout certs/dev-key.pem -out certs/dev-cert.pem \
  -days 365 -subj "/CN=localhost"
```

Your browser will warn about the self-signed cert on `https://localhost:8443` —
that's expected in dev, click through it once. The client's WebSocket URL
(`VITE_WS_URL`) must use `wss://` to match.

## Production certificate

Point `SSL_KEY_PATH` / `SSL_CERT_PATH` (and `SSL_CA_PATH` if your CA needs it)
at real certificate files — e.g. from Let's Encrypt / certbot:

```bash
SSL_KEY_PATH=/etc/letsencrypt/live/yourdomain/privkey.pem
SSL_CERT_PATH=/etc/letsencrypt/live/yourdomain/fullchain.pem
```

Then run behind a process manager (pm2, systemd) or a reverse proxy
(nginx/Caddy) that forwards to this Node process, or terminate TLS at the
proxy and point the server at plain HTTP internally — either works, just
keep the client's `VITE_WS_URL` consistent with whichever layer ends TLS.

## Data

Characters persist to `server/data/characters.json` (created automatically).
This is a simple file-backed store meant to get you running fast — swap
`src/store.js` for Postgres/Mongo/Redis when you outgrow it; nothing else in
the server needs to change since all reads/writes go through that module.

## Protocol

WebSocket messages are `{ type, payload }` JSON. See `src/index.js` for the
full list of message types (`hello`, `move`, `enter_solo`, `solo_action`,
`forge`, `create_room`, `join_room`, `room_attack`, `claim_reward`, `chat`)
and what the server broadcasts back (`welcome`, `world_state`, `solo_state`,
`character_state`, `room_state`, `chat`, `error`).
