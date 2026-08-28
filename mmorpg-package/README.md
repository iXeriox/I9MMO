# MMORPG Package

Drop-in canvas MMO: Node.js/Socket.IO backend + a single-file client SDK.

## Features
- Player grouping (parties: invite/accept/leave, shared XP, party HUD)
- Dungeons (instanced, wave-based, boss, loot rewards, party-gated entry)
- Looting (per-kill drop tables, timed kill-credit, party loot windows)
- Material farming (tree/ore/herb nodes, gather timers, respawns, skill leveling)
- Mobs (aggro/chase/attack/reset AI, per-type stats via `data/mobs.json`)
- Unique creatable players (class, name, and free-form appearance JSON — bring your own character creator UI)
- Node.js backend with SSL (HTTPS via real certs or `npm run gen-cert` for local dev, HTTP fallback + optional redirect)
- Chat (zone/party channels), leveling, equipment, respawn-on-death

## Run it

```bash
npm install
npm run gen-cert     # optional, for local HTTPS
npm start
```

Open `https://localhost:8443/example/index.html` (or `http://localhost:8080/example/index.html` if no certs).

## Production SSL

Drop your real certificate files in:
```
server/ssl/fullchain.pem
server/ssl/privkey.pem
```
or point `SSL_KEY_PATH` / `SSL_CERT_PATH` env vars elsewhere (e.g. Let's Encrypt paths).

## Embed in any site

```html
<script src="https://your-server/socket.io/socket.io.js"></script>
<script src="https://your-server/mmorpg-client.js"></script>
<script>
  const game = new MMORPGClient({ canvas: myCanvasEl, serverUrl: 'https://your-server' });
  game.on('character_creation_needed', () => game.createCharacter({ name: 'Rin', className: 'ranger' }));
  game.connect();
</script>
```

Listen to events (`level_up`, `mob_died`, `loot_dropped`, `party_update`, `dungeon_event`, `chat_message`, etc.) to drive your own UI — see `example/index.html` for a full reference implementation.

## Extend
- Add mobs/items/dungeons by editing the JSON files in `server/game/data/`.
- Swap in a database by persisting `Player` objects in `GameServer` (currently in-memory).
- Add more zones/maps by extending `WORLD` bounds or spawning more dungeon-like instances.
