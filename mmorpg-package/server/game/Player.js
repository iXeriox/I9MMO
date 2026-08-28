const { v4: uuid } = require('uuid');
const Inventory = require('./Inventory');
const ITEMS = require('./data/items.json');

const CLASS_BASE = {
  warrior:  { hp: 140, mp: 20,  atk: 12, def: 8, speed: 150 },
  mage:     { hp: 80,  mp: 140, atk: 16, def: 3, speed: 145 },
  ranger:   { hp: 105, mp: 60,  atk: 13, def: 5, speed: 165 },
  cleric:   { hp: 100, mp: 120, atk: 8,  def: 6, speed: 150 }
};

class Player {
  constructor(socketId, { name, appearance, className }) {
    this.id = uuid();
    this.socketId = socketId;
    this.name = (name || 'Adventurer').slice(0, 20);
    this.className = CLASS_BASE[className] ? className : 'warrior';

    // Unique, creatable character appearance — free-form so any front-end
    // character creator can drive it (colors, body type, face, gear skin...)
    this.appearance = Object.assign({
      bodyColor: '#e0b088',
      hairColor: '#3a2a1a',
      outfitColor: '#3355aa',
      hairStyle: 'short',
      face: 'default',
      accessory: 'none'
    }, appearance || {});

    const base = CLASS_BASE[this.className];
    this.level = 1;
    this.xp = 0;
    this.xpToNext = 100;
    this.maxHp = base.hp;
    this.hp = base.hp;
    this.maxMp = base.mp;
    this.mp = base.mp;
    this.baseAtk = base.atk;
    this.baseDef = base.def;
    this.speed = base.speed;

    this.x = 400 + Math.random() * 100;
    this.y = 400 + Math.random() * 100;
    this.dir = 'down';
    this.zone = 'world'; // 'world' or a dungeon instance id

    this.inventory = new Inventory(30);
    this.inventory.addItem('starter_sword', 1);
    this.equipped = { mainHand: 'starter_sword' };

    this.partyId = null;
    this.lastAttackAt = 0;
    this.attackCooldownMs = 700;
    this.gatherSkills = { woodcutting: 1, mining: 1, herbalism: 1 };
    this.alive = true;
    this.lastInputAt = Date.now();
  }

  get attack() {
    const weapon = this.equipped.mainHand ? ITEMS[this.equipped.mainHand] : null;
    return this.baseAtk + (weapon ? weapon.damage : 0);
  }

  get defense() {
    return this.baseDef;
  }

  gainXp(amount) {
    if (!this.alive) return;
    this.xp += amount;
    const events = [];
    while (this.xp >= this.xpToNext) {
      this.xp -= this.xpToNext;
      this.level += 1;
      this.xpToNext = Math.floor(this.xpToNext * 1.35);
      this.maxHp += 18;
      this.maxMp += 10;
      this.baseAtk += 2;
      this.baseDef += 1;
      this.hp = this.maxHp;
      this.mp = this.maxMp;
      events.push({ type: 'levelup', level: this.level });
    }
    return events;
  }

  takeDamage(amount) {
    if (!this.alive) return;
    this.hp = Math.max(0, this.hp - Math.max(1, amount - this.defense * 0.5));
    if (this.hp <= 0) {
      this.alive = false;
    }
  }

  respawn(x, y) {
    this.alive = true;
    this.hp = this.maxHp;
    this.mp = this.maxMp;
    this.x = x;
    this.y = y;
  }

  equip(itemId) {
    const def = ITEMS[itemId];
    if (!def || !def.slot) return false;
    if (this.inventory.count(itemId) < 1) return false;
    this.equipped[def.slot] = itemId;
    return true;
  }

  serialize() {
    return {
      id: this.id,
      name: this.name,
      className: this.className,
      appearance: this.appearance,
      level: this.level,
      xp: this.xp,
      xpToNext: this.xpToNext,
      hp: this.hp,
      maxHp: this.maxHp,
      mp: this.mp,
      maxMp: this.maxMp,
      x: this.x,
      y: this.y,
      dir: this.dir,
      zone: this.zone,
      partyId: this.partyId,
      alive: this.alive,
      equipped: this.equipped
    };
  }

  serializePrivate() {
    return {
      ...this.serialize(),
      inventory: this.inventory.serialize(),
      gatherSkills: this.gatherSkills
    };
  }
}

module.exports = Player;
