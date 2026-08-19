import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const CHAR_FILE = path.join(DATA_DIR, 'characters.json');

let characters = {}; // callsign -> character
let saveQueued = false;

export async function loadStore() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const raw = await fs.readFile(CHAR_FILE, 'utf-8');
    characters = JSON.parse(raw);
  } catch (e) {
    characters = {};
  }
}

function queueSave() {
  if (saveQueued) return;
  saveQueued = true;
  setTimeout(async () => {
    saveQueued = false;
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(CHAR_FILE, JSON.stringify(characters, null, 2));
    } catch (e) {
      console.error('[store] failed to persist characters:', e.message);
    }
  }, 250);
}

export function getCharacter(callsign) {
  return characters[callsign] || null;
}

export function saveCharacter(character) {
  characters[character.callsign] = character;
  queueSave();
}

export function leaderboard(limit = 8) {
  return Object.values(characters)
    .sort((a, b) => b.level - a.level || b.shards - a.shards)
    .slice(0, limit)
    .map((c) => ({ callsign: c.callsign, class: c.class, level: c.level, shards: c.shards }));
}
