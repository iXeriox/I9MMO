const { v4: uuid } = require('uuid');
const Player = require('./Player');
const Mob = require('./Mob');
const { ResourceNode } = require('./ResourceNode');
const { PartyManager } = require('./Party');
const { DungeonManager } = require('./Dungeon');
const { rollLoot, LootDrop } = require('./Loot');
const ITEMS = require('./data/items.json');

const TICK_RATE = 20; // server ticks per second
const WORLD = { width: 3000, height: 2000 };

class GameServer {
  constructor(io) {
    this.io = io;
    this.players = new Map();      // playerId -> Player
    this.socketToPlayer = new Map(); // socketId -> playerId
    this.mobs = new Map();          // mobId -> Mob (world zone only)
    this.resourceNodes = new Map(); // nodeId -> ResourceNode
    this.lootDrops = new Map();     // dropId -> LootDrop
    this.partyManager = new PartyManager();
    this.dungeonManager = new DungeonManager();

    this._seedWorld();
    this._bindSockets();
    this._startLoop();
  }

  _seedWorld() {
    const mobSpawns = [
      ...Array(10).fill('slime'),
      ...Array(8).fill('wolf'),
      ...Array(5).fill('bandit')
    ];
    for (const type of mobSpawns) {
      const x = Math.random() * WORLD.width;
      const y = Math.random() * WORLD.height;
      const mob = new Mob(type, x, y, 'world');
      this.mobs.set(mob.id, mob);
    }

    const nodeSpawns = [
      ...Array(15).fill('tree'),
      ...Array(10).fill('ore_vein'),
      ...Array(10).fill('herb_patch')
    ];
    for (const type of nodeSpawns) {
      const x = Math.random() * WORLD.width;
      const y = Math.random() * WORLD.height;
      const node = new ResourceNode(type, x, y, 'world');
      this.resourceNodes.set(node.id, node);
    }
  }

  _bindSockets() {
    this.io.on('connection', (socket) => {
      socket.on('create_character', (payload) => this._onCreateCharacter(socket, payload));
      socket.on('move', (payload) => this._onMove(socket, payload));
      socket.on('attack_mob', (payload) => this._onAttackMob(socket, payload));
      socket.on('gather_start', (payload) => this._onGatherStart(socket, payload));
      socket.on('gather_cancel', (payload) => this._onGatherCancel(socket, payload));
      socket.on('loot_pickup', (payload) => this._onLootPickup(socket, payload));
      socket.on('equip_item', (payload) => this._onEquip(socket, payload));

      socket.on('party_create', () => this._onPartyCreate(socket));
      socket.on('party_invite', (payload) => this._onPartyInvite(socket, payload));
      socket.on('party_accept', (payload) => this._onPartyAccept(socket, payload));
      socket.on('party_leave', () => this._onPartyLeave(socket));

      socket.on('dungeon_list', () => {
        socket.emit('dungeon_list', this.dungeonManager.list());
      });
      socket.on('dungeon_enter', (payload) => this._onDungeonEnter(socket, payload));
      socket.on('dungeon_leave', () => this._onDungeonLeave(socket));

      socket.on('chat', (payload) => this._onChat(socket, payload));

      socket.on('disconnect', () => this._onDisconnect(socket));
    });
  }

  _getPlayer(socket) {
    const pid = this.socketToPlayer.get(socket.id);
    return pid ? this.players.get(pid) : null;
  }

  // ---------- Character ----------
  _onCreateCharacter(socket, payload = {}) {
    const player = new Player(socket.id, payload);
    this.players.set(player.id, player);
    this.socketToPlayer.set(socket.id, player.id);
    socket.join('world');
    socket.emit('character_created', {
      player: player.serializePrivate(),
      items: ITEMS,
      world: WORLD
    });
  }

  // ---------- Movement ----------
  _onMove(socket, { x, y, dir }) {
    const player = this._getPlayer(socket);
    if (!player || !player.alive) return;
    const bounds = player.zone === 'world'
      ? WORLD
      : (this.dungeonManager.get(player.zone)?.def || WORLD);
    player.x = Math.max(0, Math.min(bounds.width, x));
    player.y = Math.max(0, Math.min(bounds.height, y));
    if (dir) player.dir = dir;
    player.lastInputAt = Date.now();
  }

  // ---------- Combat ----------
  _getMobPool(zone) {
    if (zone === 'world') return this.mobs;
    const instance = this.dungeonManager.get(zone);
    if (!instance) return new Map();
    return new Map(instance.mobs.map(m => [m.id, m]));
  }

  _onAttackMob(socket, { mobId }) {
    const player = this._getPlayer(socket);
    if (!player || !player.alive) return;
    const now = Date.now();
    if (now - player.lastAttackAt < player.attackCooldownMs) return;

    const pool = this._getMobPool(player.zone);
    const mob = pool.get(mobId);
    if (!mob || mob.state === 'dead') return;
    if (mob.distanceTo(player.x, player.y) > (mob.def.attackRange + 40)) return;

    player.lastAttackAt = now;
    const dmg = Math.max(1, player.attack - Math.floor(mob.def.hp * 0.01));
    mob.takeDamage(dmg, player.id);

    this.io.to(player.zone).emit('combat_event', {
      type: 'player_attack', attackerId: player.id, mobId: mob.id, damage: dmg, mobHp: mob.hp
    });

    if (mob.state === 'dead') {
      this._handleMobDeath(mob, player);
    }
  }

  _handleMobDeath(mob, killer) {
    // XP split across party members present in the same zone
    const party = this.partyManager.getPartyOf(killer.id, this.players);
    const recipients = party
      ? party.memberIds.map(id => this.players.get(id)).filter(p => p && p.zone === killer.zone && p.alive)
      : [killer];

    const xpEach = Math.max(1, Math.floor(mob.def.xp / recipients.length));
    for (const p of recipients) {
      const events = p.gainXp(xpEach);
      this._emitToSocket(p, 'xp_gain', { amount: xpEach, player: p.serializePrivate() });
      if (events && events.length) {
        this._emitToSocket(p, 'level_up', { level: p.level });
      }
    }

    const drops = rollLoot(mob.def.lootTable);
    if (drops.length) {
      const drop = new LootDrop(uuid(), mob.x, mob.y, drops, recipients.map(p => p.id));
      this.lootDrops.set(drop.id, drop);
      this.io.to(killer.zone).emit('loot_dropped', drop.serialize());
    }

    this.io.to(killer.zone).emit('mob_died', { mobId: mob.id, killedBy: killer.id });

    if (killer.zone === 'world') {
      setTimeout(() => {
        const respawn = new Mob(mob.mobType, mob.homeX, mob.homeY, 'world');
        this.mobs.delete(mob.id);
        this.mobs.set(respawn.id, respawn);
        this.io.to('world').emit('mob_spawned', respawn.serialize());
      }, 15000);
    }
  }

  // ---------- Gathering / material farming ----------
  _onGatherStart(socket, { nodeId }) {
    const player = this._getPlayer(socket);
    if (!player || !player.alive) return;
    const node = this.resourceNodes.get(nodeId);
    if (!node || node.zone !== player.zone) return;
    if (Math.hypot(node.x - player.x, node.y - player.y) > 60) return;
    node.startGather(player.id);
    this.io.to(player.zone).emit('node_update', node.serialize());
  }

  _onGatherCancel(socket, { nodeId }) {
    const player = this._getPlayer(socket);
    if (!player) return;
    const node = this.resourceNodes.get(nodeId);
    if (!node) return;
    node.cancelGather(player.id);
    this.io.to(player.zone).emit('node_update', node.serialize());
  }

  _onLootPickup(socket, { dropId }) {
    const player = this._getPlayer(socket);
    if (!player || !player.alive) return;
    const drop = this.lootDrops.get(dropId);
    if (!drop) return;
    if (Math.hypot(drop.x - player.x, drop.y - player.y) > 60) return;
    const party = this.partyManager.getPartyOf(player.id, this.players);
    const partyMemberIds = party ? party.memberIds : [];
    if (!drop.canLoot(player.id, partyMemberIds)) return;

    for (const item of drop.items) {
      player.inventory.addItem(item.itemId, item.qty);
    }
    this.lootDrops.delete(dropId);
    this._emitToSocket(player, 'inventory_update', player.inventory.serialize());
    this.io.to(player.zone).emit('loot_removed', { dropId });
  }

  _onEquip(socket, { itemId }) {
    const player = this._getPlayer(socket);
    if (!player) return;
    if (player.equip(itemId)) {
      this._emitToSocket(player, 'player_update', player.serializePrivate());
    }
  }

  // ---------- Party / grouping ----------
  _onPartyCreate(socket) {
    const player = this._getPlayer(socket);
    if (!player || player.partyId) return;
    const party = this.partyManager.createParty(player.id);
    player.partyId = party.id;
    this._emitToSocket(player, 'party_update', party.serialize(this.players));
  }

  _onPartyInvite(socket, { targetPlayerId }) {
    const player = this._getPlayer(socket);
    if (!player) return;
    let party = this.partyManager.getPartyOf(player.id, this.players);
    if (!party) {
      party = this.partyManager.createParty(player.id);
      player.partyId = party.id;
    }
    if (party.leaderId !== player.id) return;
    const target = this.players.get(targetPlayerId);
    if (!target) return;
    if (party.invite(targetPlayerId)) {
      this._emitToSocket(target, 'party_invite', { partyId: party.id, fromName: player.name });
      this._broadcastParty(party);
    }
  }

  _onPartyAccept(socket, { partyId }) {
    const player = this._getPlayer(socket);
    if (!player) return;
    const party = this.partyManager.parties.get(partyId);
    if (!party) return;
    if (party.accept(player.id)) {
      player.partyId = party.id;
      this._broadcastParty(party);
    }
  }

  _onPartyLeave(socket) {
    const player = this._getPlayer(socket);
    if (!player || !player.partyId) return;
    const party = this.partyManager.parties.get(player.partyId);
    this.partyManager.removePlayerEverywhere(player.id);
    player.partyId = null;
    this._emitToSocket(player, 'party_update', null);
    if (party) this._broadcastParty(party);
  }

  _broadcastParty(party) {
    const payload = party.serialize(this.players);
    for (const id of party.memberIds) {
      const p = this.players.get(id);
      if (p) this._emitToSocket(p, 'party_update', payload);
    }
  }

  // ---------- Dungeons ----------
  _onDungeonEnter(socket, { dungeonKey }) {
    const player = this._getPlayer(socket);
    if (!player) return;
    const party = this.partyManager.getPartyOf(player.id, this.players);
    const partyId = party ? party.id : null;

    if (party && party.leaderId !== player.id) {
      this._emitToSocket(player, 'error_message', 'Only the party leader can start the dungeon.');
      return;
    }

    const instance = this.dungeonManager.create(dungeonKey, partyId);
    const members = party ? party.memberIds.map(id => this.players.get(id)).filter(Boolean) : [player];

    for (const p of members) {
      const prevZone = p.zone;
      p.zone = instance.id;
      p.x = instance.spawnPoint.x;
      p.y = instance.spawnPoint.y;
      this._leaveSocketRoom(p, prevZone);
      this._joinSocketRoom(p, instance.id);
      this._emitToSocket(p, 'dungeon_entered', instance.serialize());
    }
  }

  _onDungeonLeave(socket) {
    const player = this._getPlayer(socket);
    if (!player) return;
    const wasZone = player.zone;
    player.zone = 'world';
    player.x = 400; player.y = 400;
    this._leaveSocketRoom(player, wasZone);
    this._joinSocketRoom(player, 'world');
    this._emitToSocket(player, 'zone_changed', { zone: 'world' });

    const instance = this.dungeonManager.get(wasZone);
    if (instance) {
      const stillInside = [...this.players.values()].some(p => p.zone === wasZone);
      if (!stillInside) this.dungeonManager.remove(wasZone);
    }
  }

  // ---------- Chat ----------
  _onChat(socket, { message, channel }) {
    const player = this._getPlayer(socket);
    if (!player || !message) return;
    const clean = String(message).slice(0, 240);
    const room = channel === 'party' && player.partyId ? `party:${player.partyId}` : player.zone;
    this.io.to(room).emit('chat_message', { from: player.name, message: clean, channel: channel || 'zone' });
  }

  // ---------- Disconnect ----------
  _onDisconnect(socket) {
    const pid = this.socketToPlayer.get(socket.id);
    if (!pid) return;
    const player = this.players.get(pid);
    if (player) {
      this.partyManager.removePlayerEverywhere(pid);
      this.io.to(player.zone).emit('player_left', { playerId: pid });
    }
    this.players.delete(pid);
    this.socketToPlayer.delete(socket.id);
  }

  // ---------- Socket room helpers ----------
  _joinSocketRoom(player, room) {
    const socket = this.io.sockets.sockets.get(player.socketId);
    if (socket) socket.join(room);
  }
  _leaveSocketRoom(player, room) {
    const socket = this.io.sockets.sockets.get(player.socketId);
    if (socket) socket.leave(room);
  }
  _emitToSocket(player, event, payload) {
    this.io.to(player.socketId).emit(event, payload);
  }

  // ---------- Main loop ----------
  _startLoop() {
    let last = Date.now();
    setInterval(() => {
      const now = Date.now();
      const dtSec = (now - last) / 1000;
      last = now;
      this._tick(dtSec);
    }, 1000 / TICK_RATE);
  }

  _tick(dtSec) {
    // World mobs
    const worldPlayers = [...this.players.values()].filter(p => p.zone === 'world');
    for (const mob of this.mobs.values()) {
      const evt = mob.update(dtSec, worldPlayers);
      if (evt) this.io.to('world').emit('combat_event', evt);
    }

    // Dungeon instances
    for (const instance of this.dungeonManager.instances.values()) {
      const events = instance.update(dtSec, [...this.players.values()]);
      for (const evt of events) {
        this.io.to(instance.id).emit('dungeon_event', evt);
        if (evt.type === 'dungeon_complete') this._handleDungeonComplete(instance, evt);
      }
    }

    // Resource node respawns + gather completion
    for (const node of this.resourceNodes.values()) {
      node.update();
      if (node.checkComplete()) {
        const gathererId = node.gatheringBy;
        const result = node.harvest();
        const gatherer = this.players.get(gathererId);
        if (gatherer) {
          gatherer.inventory.addItem(result.itemId, result.qty);
          gatherer.gatherSkills[result.skill] = (gatherer.gatherSkills[result.skill] || 1) + 0.1;
          this._emitToSocket(gatherer, 'gather_complete', {
            itemId: result.itemId, qty: result.qty, inventory: gatherer.inventory.serialize()
          });
        }
        this.io.to(node.zone).emit('node_update', node.serialize());
      }
    }

    // Expire old loot drops
    const now = Date.now();
    for (const [id, drop] of this.lootDrops.entries()) {
      if (now > drop.expiresAt) {
        this.lootDrops.delete(id);
        this.io.to('world').emit('loot_removed', { dropId: id });
      }
    }

    // Handle deaths -> respawn timer
    for (const player of this.players.values()) {
      if (!player.alive && !player._respawnScheduled) {
        player._respawnScheduled = true;
        this._emitToSocket(player, 'player_died', {});
        setTimeout(() => {
          player.respawn(400 + Math.random() * 100, 400 + Math.random() * 100);
          player.zone = 'world';
          player._respawnScheduled = false;
          this._emitToSocket(player, 'player_respawned', player.serializePrivate());
        }, 5000);
      }
    }

    this._broadcastSnapshots();
  }

  _handleDungeonComplete(instance, evt) {
    const members = [...this.players.values()].filter(p => p.zone === instance.id);
    const drops = rollLoot(evt.rewardTable);
    for (const p of members) {
      for (const d of drops) p.inventory.addItem(d.itemId, d.qty);
      this._emitToSocket(p, 'inventory_update', p.inventory.serialize());
      this._emitToSocket(p, 'dungeon_reward', { drops });
    }
  }

  _broadcastSnapshots() {
    // World snapshot
    const worldPlayers = [...this.players.values()].filter(p => p.zone === 'world');
    this.io.to('world').emit('world_state', {
      players: worldPlayers.map(p => p.serialize()),
      mobs: [...this.mobs.values()].map(m => m.serialize()),
      loot: [...this.lootDrops.values()].filter(d => this._zoneOfDrop(d) === 'world').map(d => d.serialize())
    });

    // Per-dungeon snapshot
    for (const instance of this.dungeonManager.instances.values()) {
      const zonePlayers = [...this.players.values()].filter(p => p.zone === instance.id);
      this.io.to(instance.id).emit('zone_state', {
        zone: instance.id,
        players: zonePlayers.map(p => p.serialize()),
        mobs: instance.mobs.filter(m => m.state !== 'dead').map(m => m.serialize())
      });
    }
  }

  _zoneOfDrop() {
    return 'world'; // loot drops currently tracked per-zone via room emits at creation time
  }
}

module.exports = GameServer;
