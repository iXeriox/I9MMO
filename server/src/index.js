import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import http from 'http';
import https from 'https';
import express from 'express';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';

import { CLASSES, newCharacter, grantXp, spawnEnemy, rollVariance, randCode } from './data.js';
import { loadStore, getCharacter, saveCharacter, leaderboard } from './store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 8443;
const CLIENT_DIST = path.join(__dirname, '..', '..', 'client', 'dist');

const app = express();
app.use(express.json());
app.get('/health', (_req, res) => res.json({ ok: true, time: Date.now() }));

// Serve the built Vue client in production (single-origin deployment).
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get('*', (_req, res) => res.sendFile(path.join(CLIENT_DIST, 'index.html')));
}

// ---------- HTTPS / SSL ----------
// Provide SSL_KEY_PATH + SSL_CERT_PATH (and optional SSL_CA_PATH) to serve real TLS.
// Falls back to plain HTTP for local development if no certs are configured.
function createServer() {
  const keyPath = '/infini9/secure/_.infini9.net_private_key.key';
  const certPath = '/infini9/secure/infini9.net_ssl_certificate.cer';

  if (keyPath && certPath && fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    const options = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    };
    if (process.env.SSL_CA_PATH && fs.existsSync(process.env.SSL_CA_PATH)) {
      options.ca = fs.readFileSync(process.env.SSL_CA_PATH);
    }
    console.log('[server] starting with TLS (wss:// enabled)');
    return https.createServer(options, app);
  }

  console.warn('[server] SSL_KEY_PATH/SSL_CERT_PATH not set or not found — falling back to plain HTTP.');
  console.warn('[server] See server/README.md to generate a local dev certificate.');
  return http.createServer(app);
}

const server = createServer();
const wss = new WebSocketServer({ server });

// ---------- In-memory live game state ----------
const sockets = new Map(); // ws -> { callsign, character, x, z, rotY }
const rooms = new Map(); // code -> room state

function send(ws, type, payload) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type, payload }));
}

function broadcast(type, payload, exceptWs = null) {
  for (const ws of sockets.keys()) {
    if (ws !== exceptWs) send(ws, type, payload);
  }
}

function broadcastRoom(room) {
  for (const ws of sockets.keys()) {
    const conn = sockets.get(ws);
    if (conn && room.members[conn.callsign]) send(ws, 'room_state', room);
  }
}

function pushRoomLog(room, type, msg) {
  room.log.push({ type, msg });
  if (room.log.length > 25) room.log = room.log.slice(-25);
}

function worldSnapshot() {
  return [...sockets.values()]
      .filter((c) => c.character)
      .map((c) => ({
        callsign: c.callsign,
        class: c.character.class,
        model: c.character.model,
        accent: c.character.accent,
        sigil: c.character.sigil,
        hairColor: c.character.hairColor,
        clothingColor: c.character.clothingColor,
        item: c.character.item,
        level: c.character.level,
        x: c.x || 0,
        y: c.y || 0,
        z: c.z || 0,
        rotY: c.rotY || 0,
      }));
}

// Broadcast world (player position) snapshot at a fixed tick rate.
setInterval(() => {
  if (sockets.size === 0) return;
  broadcast('world_state', worldSnapshot());
}, 120);

wss.on('connection', (ws) => {
  sockets.set(ws, { callsign: null, character: null, x: 0, z: 0, rotY: 0 });

  ws.on('message', async (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return send(ws, 'error', { message: 'Malformed message.' });
    }
    const conn = sockets.get(ws);
    if (!conn) return;

    try {
      switch (msg.type) {
        case 'hello': {
          const callsign = String(msg.payload?.callsign || '').trim().slice(0, 16);
          const cls = msg.payload?.class;
          const requestedModel = String(msg.payload?.model || 'character-female-a');
          const model = /^character-(female|male)-[a-f]$/.test(requestedModel) ? requestedModel : 'character-female-a';
          const requestedAccent = String(msg.payload?.accent || '#4FE3C1');
          const accent = /^#[0-9A-Fa-f]{6}$/.test(requestedAccent) ? requestedAccent : '#4FE3C1';
          const allowedSigils = ['IX', '∆', 'Ø', 'Ψ', '⌁', '◇'];
          const sigil = allowedSigils.includes(msg.payload?.sigil) ? msg.payload.sigil : 'IX';
          const colorOr = (value, fallback) => /^#[0-9A-Fa-f]{6}$/.test(String(value || '')) ? String(value) : fallback;
          const hairColor = colorOr(msg.payload?.hairColor, '#2B1A12');
          const clothingColor = colorOr(msg.payload?.clothingColor, '#344D7A');
          if (!callsign || !CLASSES[cls] && !getCharacter(callsign)) {
            return send(ws, 'error', { message: 'Invalid callsign or class.' });
          }
          let character = getCharacter(callsign);
          if (!character) {
            character = newCharacter(callsign, cls, model, accent, sigil, hairColor, clothingColor);
            saveCharacter(character);
          } else if (!character.model) {
            character.model = model;
            saveCharacter(character);
          }
          if (!character.accent) character.accent = accent;
          if (!character.sigil) character.sigil = sigil;
          if (!character.hairColor) character.hairColor = hairColor;
          if (!character.clothingColor) character.clothingColor = clothingColor;
          saveCharacter(character);
          conn.callsign = callsign;
          conn.character = character;
          send(ws, 'welcome', { character, leaderboard: leaderboard() });
          broadcast('chat', { from: 'network', msg: `${callsign} tuned into Infini9.` }, ws);
          break;
        }

        case 'move': {
          if (!conn.character) return;
          conn.x = Number(msg.payload?.x) || 0;
          conn.y = Number(msg.payload?.y) || 0;
          conn.z = Number(msg.payload?.z) || 0;
          conn.rotY = Number(msg.payload?.rotY) || 0;
          break;
        }

        case 'enter_solo': {
          if (!conn.character) return;
          conn.training = false;
          if (conn.character.hp <= 0) conn.character.hp = Math.ceil(conn.character.maxHp * 0.5);
          conn.enemy = spawnEnemy(conn.character.level);
          send(ws, 'solo_state', { character: conn.character, enemy: conn.enemy, log: [{ type: 'system', msg: `A ${conn.enemy.name} tears through the fracture.` }] });
          break;
        }

        case 'enter_training': {
          if (!conn.character) return;
          conn.training = true;
          conn.trainingStartHp = conn.character.hp;
          conn.character.hp = conn.character.maxHp;
          conn.enemy = { name: 'VX-9 Training Drone', maxHp: 90 + conn.character.level * 15, hp: 90 + conn.character.level * 15, atk: 4 + conn.character.level, xpReward: 0, shardReward: 0 };
          send(ws, 'solo_state', { character: conn.character, enemy: conn.enemy, log: [{ type: 'system', msg: 'Combat simulator online. Damage and resources are safely virtualised.' }] });
          break;
        }

        case 'solo_action': {
          if (!conn.character || !conn.enemy) return;
          const action = msg.payload?.action;
          const character = conn.character;
          const enemy = conn.enemy;
          const log = [];
          let over = false;

          if (action === 'attack' || action === 'ability') {
            if (action === 'ability' && character.abilityCooldown > 0) {
              return send(ws, 'error', { message: 'Ability on cooldown.' });
            }
            const def = CLASSES[character.class];
            const dmg = action === 'ability'
                ? rollVariance(character.atk * def.abilityMult)
                : rollVariance(character.atk);
            enemy.hp = Math.max(0, enemy.hp - dmg);
            log.push({ type: 'hit', msg: action === 'ability' ? `${def.abilityName} lands for ${dmg}!` : `You strike ${enemy.name} for ${dmg}.` });
            if (action === 'ability') character.abilityCooldown = 3;
            else if (character.abilityCooldown > 0) character.abilityCooldown--;

            if (enemy.hp <= 0) {
              log.push({ type: 'hit', msg: `${enemy.name} destabilizes and collapses.` });
              if (conn.training) {
                character.hp = conn.trainingStartHp;
                log.push({ type: 'system', msg: 'Simulation complete. Live combat telemetry recorded; health restored.' });
              } else {
                character.shards += enemy.shardReward;
                const leveled = grantXp(character, enemy.xpReward);
                log.push({ type: 'system', msg: `+${enemy.xpReward} XP, +${enemy.shardReward} shards.` });
                if (leveled) log.push({ type: 'system', msg: `Level up! You are now level ${character.level}.` });
              }
              over = true;
            } else {
              const edmg = rollVariance(enemy.atk);
              character.hp = Math.max(0, character.hp - edmg);
              log.push({ type: 'taken', msg: `${enemy.name} hits you for ${edmg}.` });
              if (character.hp <= 0) {
                log.push({ type: 'taken', msg: 'You are overwhelmed and pulled back through the rift.' });
                const lost = conn.training ? 0 : Math.min(character.shards, Math.round(character.shards * 0.1));
                character.shards -= lost;
                if (lost > 0) log.push({ type: 'taken', msg: `Lost ${lost} shards in the retreat.` });
                if (conn.training) character.hp = conn.trainingStartHp;
                over = true;
              }
            }
          } else if (action === 'flee') {
            if (Math.random() < 0.7) {
              log.push({ type: 'system', msg: 'You slip back through the fracture.' });
              over = true;
            } else {
              log.push({ type: 'system', msg: 'No opening to flee!' });
              const edmg = rollVariance(enemy.atk);
              character.hp = Math.max(0, character.hp - edmg);
              log.push({ type: 'taken', msg: `${enemy.name} hits you for ${edmg}.` });
              if (character.hp <= 0) over = true;
            }
          }

          if (over && conn.training) character.hp = conn.trainingStartHp;
          if (over) saveCharacter(character);
          send(ws, 'solo_state', { character, enemy, log, over });
          break;
        }

        case 'forge': {
          if (!conn.character) return;
          const character = conn.character;
          const kind = msg.payload?.kind;
          if (kind === 'hp') {
            const cost = Math.round(15 * Math.pow(1.18, character.forgeHpBuys || 0));
            if (character.shards < cost) return send(ws, 'error', { message: 'Not enough shards.' });
            character.shards -= cost;
            character.maxHp += 10;
            character.hp += 10;
            character.forgeHpBuys = (character.forgeHpBuys || 0) + 1;
          } else if (kind === 'atk') {
            const cost = Math.round(20 * Math.pow(1.2, character.forgeAtkBuys || 0));
            if (character.shards < cost) return send(ws, 'error', { message: 'Not enough shards.' });
            character.shards -= cost;
            character.atk += 2;
            character.forgeAtkBuys = (character.forgeAtkBuys || 0) + 1;
          }
          saveCharacter(character);
          send(ws, 'character_state', { character });
          break;
        }

        case 'customize': {
          if (!conn.character) return;
          const accent = String(msg.payload?.accent || '');
          const model = String(msg.payload?.model || '');
          const allowedSigils = ['IX', '∆', 'Ø', 'Ψ', '⌁', '◇'];
          if (/^#[0-9A-Fa-f]{6}$/.test(accent)) conn.character.accent = accent;
          if (/^character-(female|male)-[a-f]$/.test(model)) conn.character.model = model;
          if (allowedSigils.includes(msg.payload?.sigil)) conn.character.sigil = msg.payload.sigil;
          if (/^#[0-9A-Fa-f]{6}$/.test(String(msg.payload?.hairColor || ''))) conn.character.hairColor = msg.payload.hairColor;
          if (/^#[0-9A-Fa-f]{6}$/.test(String(msg.payload?.clothingColor || ''))) conn.character.clothingColor = msg.payload.clothingColor;
          const item = msg.payload?.item;
          if (item && ['none','sword','blaster','shield'].includes(item.type) && /^#[0-9A-Fa-f]{6}$/.test(String(item.color)) && Number(item.scale) >= .5 && Number(item.scale) <= 1.5) {
            conn.character.item = { type:item.type, color:item.color, scale:Number(item.scale) };
          }
          saveCharacter(conn.character);
          send(ws, 'character_state', { character: conn.character });
          break;
        }

        case 'create_room': {
          if (!conn.character) return;
          const code = randCode();
          const bossMaxHp = 260 + conn.character.level * 45;
          const room = {
            code,
            bossName: 'The Nine-Eyed Warden',
            bossMaxHp,
            bossHp: bossMaxHp,
            status: 'active',
            members: { [conn.callsign]: { class: conn.character.class, level: conn.character.level, dmgDealt: 0 } },
            log: [{ type: 'system', msg: `${conn.callsign} opened the instance.` }],
            rewardClaimed: {},
          };
          rooms.set(code, room);
          conn.room = code;
          send(ws, 'room_state', room);
          break;
        }

        case 'join_room': {
          if (!conn.character) return;
          const code = String(msg.payload?.code || '').toUpperCase();
          const room = rooms.get(code);
          if (!room) return send(ws, 'error', { message: 'No signal on that frequency.' });
          if (!room.members[conn.callsign]) {
            room.members[conn.callsign] = { class: conn.character.class, level: conn.character.level, dmgDealt: 0 };
            pushRoomLog(room, 'system', `${conn.callsign} tuned in.`);
          }
          conn.room = code;
          broadcastRoom(room);
          break;
        }

        case 'leave_room': {
          if (conn.room) {
            conn.room = null;
          }
          break;
        }

        case 'room_attack': {
          if (!conn.character || !conn.room) return;
          const room = rooms.get(conn.room);
          if (!room || room.status !== 'active') return;
          const dmg = rollVariance(conn.character.atk * 1.3);
          room.bossHp = Math.max(0, room.bossHp - dmg);
          if (!room.members[conn.callsign]) room.members[conn.callsign] = { class: conn.character.class, level: conn.character.level, dmgDealt: 0 };
          room.members[conn.callsign].dmgDealt += dmg;
          pushRoomLog(room, 'hit', `${conn.callsign} hits the Warden for ${dmg}.`);
          if (room.bossHp <= 0) {
            room.status = 'defeated';
            pushRoomLog(room, 'system', 'The Warden collapses! Claim your reward.');
          }
          broadcastRoom(room);
          break;
        }

        case 'claim_reward': {
          if (!conn.character || !conn.room) return;
          const room = rooms.get(conn.room);
          if (!room || room.status !== 'defeated') return;
          if (room.rewardClaimed[conn.callsign]) return;
          const gainedXp = 180 + room.bossMaxHp;
          const gainedShards = 70 + Math.round(room.bossMaxHp / 4);
          conn.character.shards += gainedShards;
          const leveled = grantXp(conn.character, gainedXp);
          saveCharacter(conn.character);
          room.rewardClaimed[conn.callsign] = true;
          pushRoomLog(room, 'system', `${conn.callsign} claimed the reward (+${gainedXp} XP, +${gainedShards} shards).`);
          broadcastRoom(room);
          send(ws, 'character_state', { character: conn.character, leveled });
          break;
        }

        case 'chat': {
          if (!conn.callsign) return;
          const text = String(msg.payload?.msg || '').slice(0, 240);
          if (!text) return;
          broadcast('chat', { from: conn.callsign, msg: text });
          break;
        }

        case 'emote': {
          if (!conn.callsign) return;
          const allowedEmotes = ['emote-yes', 'emote-no'];
          const emote = msg.payload?.emote;
          if (!allowedEmotes.includes(emote)) return;
          broadcast('emote', { callsign: conn.callsign, emote }, ws);
          break;
        }

        default:
          send(ws, 'error', { message: `Unknown message type: ${msg.type}` });
      }
    } catch (e) {
      console.error('[ws] handler error:', e);
      send(ws, 'error', { message: 'Server error handling that action.' });
    }
  });

  ws.on('close', () => {
    const conn = sockets.get(ws);
    sockets.delete(ws);
    if (conn?.callsign) broadcast('chat', { from: 'network', msg: `${conn.callsign} dropped signal.` });
  });
});

await loadStore();
server.listen(8443, '0.0.0.0', () => {
  console.log('Server listening on 0.0.0.0:8443');
});
