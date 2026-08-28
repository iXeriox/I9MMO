const { v4: uuid } = require('uuid');
const MOB_DEFS = require('./data/mobs.json');

class Mob {
  constructor(mobType, x, y, zone = 'world') {
    const def = MOB_DEFS[mobType];
    if (!def) throw new Error(`Unknown mob type: ${mobType}`);
    this.id = uuid();
    this.mobType = mobType;
    this.def = def;
    this.name = def.name;
    this.zone = zone;
    this.homeX = x;
    this.homeY = y;
    this.x = x;
    this.y = y;
    this.hp = def.hp;
    this.maxHp = def.hp;
    this.state = 'idle'; // idle | chase | attack | dead | reset
    this.targetId = null;
    this.lastAttackAt = 0;
    this.attackCooldownMs = 1200;
    this.deadAt = null;
    this.recentDamage = new Map(); // playerId -> damage dealt (for kill credit/party xp split)
  }

  distanceTo(x, y) {
    return Math.hypot(this.x - x, this.y - y);
  }

  takeDamage(amount, byPlayerId) {
    if (this.state === 'dead') return;
    this.hp = Math.max(0, this.hp - amount);
    if (byPlayerId) {
      this.recentDamage.set(byPlayerId, (this.recentDamage.get(byPlayerId) || 0) + amount);
    }
    if (this.hp <= 0) {
      this.state = 'dead';
      this.deadAt = Date.now();
    }
  }

  update(dtSec, players) {
    if (this.state === 'dead') return;

    const nearbyPlayers = players.filter(p =>
      p.zone === this.zone && p.alive && this.distanceTo(p.x, p.y) <= this.def.aggroRange
    );

    if (this.state === 'idle') {
      if (nearbyPlayers.length > 0) {
        nearbyPlayers.sort((a, b) => this.distanceTo(a.x, a.y) - this.distanceTo(b.x, b.y));
        this.targetId = nearbyPlayers[0].id;
        this.state = 'chase';
      } else {
        return;
      }
    }

    const target = players.find(p => p.id === this.targetId && p.alive && p.zone === this.zone);
    if (!target) {
      this.state = 'reset';
    }

    if (this.state === 'reset') {
      this._moveToward(this.homeX, this.homeY, dtSec);
      if (this.distanceTo(this.homeX, this.homeY) < 5) {
        this.state = 'idle';
        this.hp = this.maxHp;
      }
      return;
    }

    if (this.state === 'chase' || this.state === 'attack') {
      const dist = this.distanceTo(target.x, target.y);
      if (dist > this.def.aggroRange * 1.6) {
        this.state = 'reset';
        this.targetId = null;
        return;
      }
      if (dist <= this.def.attackRange) {
        this.state = 'attack';
        const now = Date.now();
        if (now - this.lastAttackAt >= this.attackCooldownMs) {
          this.lastAttackAt = now;
          target.takeDamage(this.def.damage);
          return { type: 'mob_attack', mobId: this.id, targetId: target.id, damage: this.def.damage };
        }
      } else {
        this.state = 'chase';
        this._moveToward(target.x, target.y, dtSec);
      }
    }
  }

  _moveToward(tx, ty, dtSec) {
    const dx = tx - this.x, dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) return;
    const speed = this.def.moveSpeed * dtSec;
    this.x += (dx / dist) * Math.min(speed, dist);
    this.y += (dy / dist) * Math.min(speed, dist);
  }

  topDamager() {
    let best = null, bestDmg = -1;
    for (const [pid, dmg] of this.recentDamage.entries()) {
      if (dmg > bestDmg) { best = pid; bestDmg = dmg; }
    }
    return best;
  }

  serialize() {
    return {
      id: this.id,
      mobType: this.mobType,
      name: this.name,
      x: this.x,
      y: this.y,
      hp: this.hp,
      maxHp: this.maxHp,
      state: this.state,
      color: this.def.color,
      size: this.def.size,
      level: this.def.level,
      isBoss: !!this.def.isBoss
    };
  }
}

module.exports = Mob;
