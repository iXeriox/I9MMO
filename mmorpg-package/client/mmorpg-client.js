/*!
 * MMORPGClient - drop-in canvas MMO client SDK
 * Usage:
 *   <script src="/socket.io/socket.io.js"></script>
 *   <script src="mmorpg-client.js"></script>
 *   <script>
 *     const game = new MMORPGClient({ canvas: document.getElementById('game'), serverUrl: 'https://localhost:8443' });
 *     game.on('character_creation_needed', () => game.createCharacter({ name: 'Rin', className: 'ranger' }));
 *     game.connect();
 *   </script>
 */
(function (global, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else global.MMORPGClient = factory();
})(typeof window !== 'undefined' ? window : this, function () {
  'use strict';

  class EventBus {
    constructor() { this._listeners = {}; }
    on(evt, fn) { (this._listeners[evt] = this._listeners[evt] || []).push(fn); return this; }
    off(evt, fn) {
      if (!this._listeners[evt]) return;
      this._listeners[evt] = this._listeners[evt].filter(f => f !== fn);
    }
    emit(evt, payload) {
      (this._listeners[evt] || []).forEach(fn => {
        try { fn(payload); } catch (e) { console.error(`[MMORPGClient] listener error on "${evt}"`, e); }
      });
    }
  }

  const CLASS_COLORS = {
    warrior: '#c0392b', mage: '#8e44ad', ranger: '#27ae60', cleric: '#f1c40f'
  };

  class MMORPGClient extends EventBus {
    constructor(opts = {}) {
      super();
      this.canvas = opts.canvas;
      this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
      this.serverUrl = opts.serverUrl || window.location.origin;
      this.socket = null;

      this.state = {
        connected: false,
        characterCreated: false,
        me: null,           // my private player object (includes inventory)
        players: new Map(), // playerId -> serialized player
        mobs: new Map(),
        nodes: new Map(),
        loot: new Map(),
        party: null,
        zone: 'world',
        chatLog: [],
        items: {},
        world: { width: 3000, height: 2000 }
      };

      this.camera = { x: 0, y: 0 };
      this.keys = {};
      this.input = { targetX: null, targetY: null };
      this._raf = null;

      if (this.canvas) this._bindInput();
    }

    // ---------------- Connection ----------------
    connect() {
      if (typeof io === 'undefined') {
        throw new Error('[MMORPGClient] socket.io-client global "io" not found. Include socket.io.js before this script.');
      }
      this.socket = io(this.serverUrl, { transports: ['websocket', 'polling'] });
      this._bindSocketEvents();
    }

    createCharacter({ name, className, appearance }) {
      if (!this.socket) throw new Error('[MMORPGClient] call connect() before createCharacter()');
      this.socket.emit('create_character', { name, className, appearance });
    }

    // ---------------- Actions ----------------
    moveTo(x, y) {
      this.input.targetX = x;
      this.input.targetY = y;
    }

    attackMob(mobId) {
      this.socket.emit('attack_mob', { mobId });
    }

    gatherStart(nodeId) {
      this.socket.emit('gather_start', { nodeId });
    }

    gatherCancel(nodeId) {
      this.socket.emit('gather_cancel', { nodeId });
    }

    lootPickup(dropId) {
      this.socket.emit('loot_pickup', { dropId });
    }

    equipItem(itemId) {
      this.socket.emit('equip_item', { itemId });
    }

    partyCreate() { this.socket.emit('party_create'); }
    partyInvite(targetPlayerId) { this.socket.emit('party_invite', { targetPlayerId }); }
    partyAccept(partyId) { this.socket.emit('party_accept', { partyId }); }
    partyLeave() { this.socket.emit('party_leave'); }

    listDungeons() { this.socket.emit('dungeon_list'); }
    enterDungeon(dungeonKey) { this.socket.emit('dungeon_enter', { dungeonKey }); }
    leaveDungeon() { this.socket.emit('dungeon_leave'); }

    sendChat(message, channel = 'zone') { this.socket.emit('chat', { message, channel }); }

    // ---------------- Socket wiring ----------------
    _bindSocketEvents() {
      const s = this.socket;

      s.on('connect', () => {
        this.state.connected = true;
        this.emit('connected');
        this.emit('character_creation_needed');
      });

      s.on('disconnect', () => {
        this.state.connected = false;
        this.emit('disconnected');
      });

      s.on('character_created', ({ player, items, world }) => {
        this.state.characterCreated = true;
        this.state.me = player;
        this.state.items = items;
        this.state.world = world;
        this.state.zone = player.zone;
        this._startRenderLoop();
        this.emit('character_created', player);
      });

      s.on('world_state', (payload) => this._applyZoneState(payload));
      s.on('zone_state', (payload) => this._applyZoneState(payload));

      s.on('mob_spawned', (mob) => this.state.mobs.set(mob.id, mob));
      s.on('mob_died', ({ mobId }) => {
        this.state.mobs.delete(mobId);
        this.emit('mob_died', { mobId });
      });

      s.on('node_update', (node) => {
        this.state.nodes.set(node.id, node);
        this.emit('node_update', node);
      });

      s.on('loot_dropped', (drop) => {
        this.state.loot.set(drop.id, drop);
        this.emit('loot_dropped', drop);
      });
      s.on('loot_removed', ({ dropId }) => this.state.loot.delete(dropId));

      s.on('combat_event', (evt) => this.emit('combat_event', evt));

      s.on('xp_gain', ({ amount, player }) => {
        if (this.state.me) Object.assign(this.state.me, player);
        this.emit('xp_gain', { amount });
      });
      s.on('level_up', (payload) => this.emit('level_up', payload));

      s.on('player_died', () => this.emit('player_died'));
      s.on('player_respawned', (player) => {
        this.state.me = player;
        this.state.zone = player.zone;
        this.emit('player_respawned', player);
      });
      s.on('player_left', ({ playerId }) => this.state.players.delete(playerId));

      s.on('inventory_update', (inv) => {
        if (this.state.me) this.state.me.inventory = inv;
        this.emit('inventory_update', inv);
      });
      s.on('player_update', (player) => {
        this.state.me = player;
        this.emit('player_update', player);
      });

      s.on('party_update', (party) => {
        this.state.party = party;
        this.emit('party_update', party);
      });
      s.on('party_invite', (payload) => this.emit('party_invite', payload));

      s.on('dungeon_list', (list) => this.emit('dungeon_list', list));
      s.on('dungeon_entered', (instance) => {
        this.state.zone = instance.id;
        this.state.world = { width: instance.width, height: instance.height };
        this.emit('dungeon_entered', instance);
      });
      s.on('dungeon_event', (evt) => this.emit('dungeon_event', evt));
      s.on('dungeon_reward', (payload) => this.emit('dungeon_reward', payload));
      s.on('zone_changed', ({ zone }) => {
        this.state.zone = zone;
        this.state.world = { width: 3000, height: 2000 };
        this.emit('zone_changed', { zone });
      });

      s.on('chat_message', (msg) => {
        this.state.chatLog.push(msg);
        if (this.state.chatLog.length > 100) this.state.chatLog.shift();
        this.emit('chat_message', msg);
      });

      s.on('error_message', (msg) => this.emit('error_message', msg));
    }

    _applyZoneState(payload) {
      this.state.players.clear();
      for (const p of payload.players) {
        this.state.players.set(p.id, p);
        if (this.state.me && p.id === this.state.me.id) {
          Object.assign(this.state.me, p);
        }
      }
      this.state.mobs.clear();
      for (const m of payload.mobs) this.state.mobs.set(m.id, m);
      if (payload.loot) {
        this.state.loot.clear();
        for (const l of payload.loot) this.state.loot.set(l.id, l);
      }
      this.emit('zone_update', payload);
    }

    // ---------------- Input ----------------
    _bindInput() {
      this.canvas.addEventListener('click', (e) => {
        const rect = this.canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left + this.camera.x;
        const clickY = e.clientY - rect.top + this.camera.y;

        // check mob click (attack)
        for (const mob of this.state.mobs.values()) {
          if (Math.hypot(mob.x - clickX, mob.y - clickY) <= (mob.size || 16) + 6) {
            this.attackMob(mob.id);
            this.emit('mob_clicked', mob);
            return;
          }
        }
        // check resource node click (gather)
        for (const node of this.state.nodes.values()) {
          if (node.depleted) continue;
          if (Math.hypot(node.x - clickX, node.y - clickY) <= (node.size || 16) + 6) {
            this.gatherStart(node.id);
            this.emit('node_clicked', node);
            return;
          }
        }
        // check loot click (pickup)
        for (const drop of this.state.loot.values()) {
          if (Math.hypot(drop.x - clickX, drop.y - clickY) <= 20) {
            this.lootPickup(drop.id);
            this.emit('loot_clicked', drop);
            return;
          }
        }
        // otherwise move
        this.moveTo(clickX, clickY);
      });

      window.addEventListener('keydown', (e) => { this.keys[e.key.toLowerCase()] = true; });
      window.addEventListener('keyup', (e) => { this.keys[e.key.toLowerCase()] = false; });
    }

    _handleKeyboardMovement(dtSec) {
      if (!this.state.me || !this.state.me.alive) return;
      let dx = 0, dy = 0;
      if (this.keys['w'] || this.keys['arrowup']) dy -= 1;
      if (this.keys['s'] || this.keys['arrowdown']) dy += 1;
      if (this.keys['a'] || this.keys['arrowleft']) dx -= 1;
      if (this.keys['d'] || this.keys['arrowright']) dx += 1;
      if (dx === 0 && dy === 0) return;
      const len = Math.hypot(dx, dy) || 1;
      const speed = 180;
      const nx = this.state.me.x + (dx / len) * speed * dtSec;
      const ny = this.state.me.y + (dy / len) * speed * dtSec;
      this.state.me.x = nx;
      this.state.me.y = ny;
      this.state.me.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      this.input.targetX = null;
      this.input.targetY = null;
      this.socket.emit('move', { x: nx, y: ny, dir: this.state.me.dir });
    }

    _handleClickMovement(dtSec) {
      if (this.input.targetX == null || !this.state.me || !this.state.me.alive) return;
      const speed = 180;
      const dx = this.input.targetX - this.state.me.x;
      const dy = this.input.targetY - this.state.me.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 4) { this.input.targetX = null; return; }
      const step = Math.min(dist, speed * dtSec);
      const nx = this.state.me.x + (dx / dist) * step;
      const ny = this.state.me.y + (dy / dist) * step;
      this.state.me.x = nx;
      this.state.me.y = ny;
      this.state.me.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
      this.socket.emit('move', { x: nx, y: ny, dir: this.state.me.dir });
    }

    // ---------------- Render loop ----------------
    _startRenderLoop() {
      let last = performance.now();
      const loop = (now) => {
        const dtSec = Math.min(0.05, (now - last) / 1000);
        last = now;
        this._handleKeyboardMovement(dtSec);
        this._handleClickMovement(dtSec);
        if (this.ctx) this._render();
        this._raf = requestAnimationFrame(loop);
      };
      this._raf = requestAnimationFrame(loop);
    }

    stop() {
      if (this._raf) cancelAnimationFrame(this._raf);
      if (this.socket) this.socket.disconnect();
    }

    _render() {
      const ctx = this.ctx;
      const canvas = this.canvas;
      const me = this.state.me;
      if (me) {
        this.camera.x = me.x - canvas.width / 2;
        this.camera.y = me.y - canvas.height / 2;
      }

      ctx.fillStyle = '#1b2a1f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(-this.camera.x, -this.camera.y);

      this._drawGrid();
      this.state.nodes.forEach(n => this._drawNode(n));
      this.state.loot.forEach(l => this._drawLoot(l));
      this.state.mobs.forEach(m => this._drawMob(m));
      this.state.players.forEach(p => this._drawPlayer(p, p.id === (me && me.id)));
      if (me && !this.state.players.has(me.id)) this._drawPlayer(me, true);

      ctx.restore();
      this._drawHUD();
    }

    _drawGrid() {
      const ctx = this.ctx;
      const size = 100;
      const w = this.state.world.width, h = this.state.world.height;
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= w; x += size) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y <= h; y += size) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.strokeRect(0, 0, w, h);
    }

    _drawNode(node) {
      const ctx = this.ctx;
      ctx.globalAlpha = node.depleted ? 0.25 : 1;
      ctx.fillStyle = node.color || '#5a8f4a';
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.size || 14, 0, Math.PI * 2);
      ctx.fill();
      if (node.beingGathered) {
        ctx.strokeStyle = '#ffd54a';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    _drawLoot(drop) {
      const ctx = this.ctx;
      ctx.fillStyle = '#f4d35e';
      ctx.beginPath();
      ctx.moveTo(drop.x, drop.y - 8);
      ctx.lineTo(drop.x + 8, drop.y);
      ctx.lineTo(drop.x, drop.y + 8);
      ctx.lineTo(drop.x - 8, drop.y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#8a6d1a';
      ctx.stroke();
    }

    _drawMob(mob) {
      const ctx = this.ctx;
      const size = mob.size || 16;
      ctx.fillStyle = mob.color || '#aa4444';
      ctx.beginPath();
      ctx.arc(mob.x, mob.y, size, 0, Math.PI * 2);
      ctx.fill();
      if (mob.isBoss) {
        ctx.strokeStyle = '#ffcc00';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      // hp bar
      const barW = size * 2.2;
      ctx.fillStyle = '#000';
      ctx.fillRect(mob.x - barW / 2, mob.y - size - 12, barW, 5);
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(mob.x - barW / 2, mob.y - size - 12, barW * (mob.hp / mob.maxHp), 5);
      ctx.fillStyle = '#fff';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${mob.name} Lv${mob.level}`, mob.x, mob.y - size - 16);
    }

    _drawPlayer(p, isMe) {
      const ctx = this.ctx;
      const appearance = p.appearance || {};
      const color = appearance.bodyColor || CLASS_COLORS[p.className] || '#3355aa';
      const size = 16;

      ctx.fillStyle = p.alive === false ? 'rgba(120,120,120,0.4)' : color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = appearance.outfitColor || '#222';
      ctx.fillRect(p.x - size, p.y + size * 0.4, size * 2, size * 0.6);

      if (isMe) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // hp bar
      const barW = size * 2.4;
      ctx.fillStyle = '#000';
      ctx.fillRect(p.x - barW / 2, p.y - size - 14, barW, 5);
      ctx.fillStyle = '#2ecc71';
      ctx.fillRect(p.x - barW / 2, p.y - size - 14, barW * Math.max(0, p.hp / p.maxHp), 5);

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${p.name} Lv${p.level}`, p.x, p.y - size - 18);
    }

    _drawHUD() {
      const ctx = this.ctx;
      const me = this.state.me;
      if (!me) return;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(10, 10, 220, 60);
      ctx.fillStyle = '#fff';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${me.name}  Lv ${me.level}  (${me.className})`, 20, 28);
      ctx.fillText(`HP ${Math.round(me.hp)}/${me.maxHp}`, 20, 46);
      ctx.fillText(`XP ${me.xp}/${me.xpToNext}`, 20, 62);
    }
  }

  return MMORPGClient;
});
