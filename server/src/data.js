export const CLASSES = {
  vanguard: { name: 'Vanguard', role: 'Tank / Melee', baseHp: 140, baseAtk: 11, abilityName: 'Bulwark Smash', abilityMult: 2.1 },
  phasecaller: { name: 'Phasecaller', role: 'Arcane DPS', baseHp: 88, baseAtk: 19, abilityName: 'Rift Bolt', abilityMult: 2.3 },
  wraithhunter: { name: 'Wraithhunter', role: 'Ranged Rogue', baseHp: 104, baseAtk: 15, abilityName: 'Twin Strike', abilityMult: 2.0 },
};

export const MONSTERS = [
  { name: 'Glitch Hound', hpMul: 0.85, atkMul: 0.8, xpMul: 1.0, shardMul: 1.0 },
  { name: 'Static Wisp', hpMul: 0.7, atkMul: 1.15, xpMul: 1.1, shardMul: 1.1 },
  { name: 'Null Serpent', hpMul: 1.1, atkMul: 0.9, xpMul: 1.2, shardMul: 1.05 },
  { name: 'Echo Wraith', hpMul: 1.0, atkMul: 1.0, xpMul: 1.15, shardMul: 1.2 },
  { name: 'Corrupted Sentinel', hpMul: 1.5, atkMul: 1.25, xpMul: 1.7, shardMul: 1.6 },
];

export function xpFor(level) {
  return Math.round(40 * Math.pow(level, 1.55));
}

export function rollVariance(base) {
  return Math.max(1, Math.round(base * (0.8 + Math.random() * 0.4)));
}

export function randCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 4; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export function newCharacter(callsign, cls, model) {
  const def = CLASSES[cls];
  return {
    callsign,
    class: cls,
    model,
    level: 1,
    xp: 0,
    xpToNext: xpFor(1),
    maxHp: def.baseHp,
    hp: def.baseHp,
    atk: def.baseAtk,
    shards: 40,
    abilityCooldown: 0,
    forgeHpBuys: 0,
    forgeAtkBuys: 0,
  };
}

// Mutates character in place, returns { leveled }
export function grantXp(character, amount) {
  character.xp += amount;
  let leveled = false;
  while (character.xp >= character.xpToNext) {
    character.xp -= character.xpToNext;
    character.level += 1;
    character.xpToNext = xpFor(character.level);
    character.maxHp += 12;
    character.atk += 2;
    character.hp = character.maxHp;
    leveled = true;
  }
  return leveled;
}

export function spawnEnemy(level) {
  const t = MONSTERS[Math.floor(Math.random() * MONSTERS.length)];
  const maxHp = Math.round((28 + level * 13) * t.hpMul);
  return {
    name: t.name,
    maxHp,
    hp: maxHp,
    atk: Math.round((6 + level * 2.6) * t.atkMul),
    xpReward: Math.round((18 + level * 9) * t.xpMul),
    shardReward: Math.round((7 + level * 3.4) * t.shardMul),
  };
}
