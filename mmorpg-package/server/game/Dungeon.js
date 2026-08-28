const { v4: uuid } = require('uuid');
const Mob = require('./Mob');
const DUNGEON_DEFS = require('./data/dungeons.json');

class DungeonInstance {
  constructor(dungeonKey, partyId) {
    const def = DUNGEON_DEFS[dungeonKey];
    if (!def) throw new Error(`Unknown dungeon: ${dungeonKey}`);
    this.id = `dungeon_${uuid()}`;
    this.dungeonKey = dungeonKey;
    this.def = def;
    this.partyId = partyId;
    this.waveIndex = -1;
    this.mobs = [];
    this.status = 'starting'; // starting | wave | cleared_wave | boss | complete | failed
    this.startedAt = Date.now();
    this.completedAt = null;
    this.spawnPoint = { x: 100, y: def.height / 2 };
    this._advanceWave();
  }

  _spawnGroup(mobType, count) {
    const spawned = [];
    for (let i = 0; i < count; i++) {
      const x = this.def.width * 0.6 + (Math.random() - 0.5) * 300;
      const y = this.def.height * 0.5 + (Math.random() - 0.5) * 300;
      const mob = new Mob(mobType, x, y, this.id);
      this.mobs.push(mob);
      spawned.push(mob);
    }
    return spawned;
  }

  _advanceWave() {
    this.waveIndex += 1;
    if (this.waveIndex < this.def.waves.length) {
      const wave = this.def.waves[this.waveIndex];
      this._spawnGroup(wave.mobType, wave.count);
      this.status = 'wave';
    } else if (this.status !== 'boss' && this.status !== 'complete') {
      this._spawnGroup(this.def.boss.mobType, this.def.boss.count);
      this.status = 'boss';
    }
  }

  update(dtSec, players) {
    const events = [];
    const alivePlayers = players.filter(p => p.zone === this.id);
    for (const mob of this.mobs) {
      const evt = mob.update(dtSec, alivePlayers);
      if (evt) events.push(evt);
    }

    const aliveMobs = this.mobs.filter(m => m.state !== 'dead');
    if (aliveMobs.length === 0 && this.status !== 'complete') {
      if (this.status === 'boss') {
        this.status = 'complete';
        this.completedAt = Date.now();
        events.push({ type: 'dungeon_complete', dungeonId: this.id, rewardTable: this.def.rewardTable });
      } else if (this.status === 'wave') {
        this.mobs = [];
        this._advanceWave();
        events.push({ type: 'wave_cleared', dungeonId: this.id, nextWave: this.waveIndex });
      }
    }
    return events;
  }

  serialize() {
    return {
      id: this.id,
      dungeonKey: this.dungeonKey,
      name: this.def.name,
      status: this.status,
      waveIndex: this.waveIndex,
      totalWaves: this.def.waves.length,
      mobs: this.mobs.filter(m => m.state !== 'dead').map(m => m.serialize()),
      width: this.def.width,
      height: this.def.height,
      spawnPoint: this.spawnPoint
    };
  }
}

class DungeonManager {
  constructor() {
    this.instances = new Map();
  }

  create(dungeonKey, partyId) {
    const instance = new DungeonInstance(dungeonKey, partyId);
    this.instances.set(instance.id, instance);
    return instance;
  }

  get(id) {
    return this.instances.get(id);
  }

  remove(id) {
    this.instances.delete(id);
  }

  list() {
    return Object.keys(DUNGEON_DEFS).map(key => ({ key, ...DUNGEON_DEFS[key] }));
  }
}

module.exports = { DungeonManager, DungeonInstance };
