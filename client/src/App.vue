<template>
  <CharacterCreate v-if="!character" :error="createError" @confirm="handleCreate" />

  <template v-else>
    <div ref="sceneContainer" class="scene"></div>

    <HUD
        :character="character"
        :connected="connected"
        :active-portal="activePortal"
        :chat="chat"
        :leaderboard="leaderboard"
        :show-leaderboard="overlay === 'leaderboard-pin'"
        @open-solo="openSolo"
        @open-room="overlay = 'room'"
        @open-forge="overlay = 'forge'"
        @toggle-leaderboard="toggleLeaderboard"
        @send-chat="sendChat"
    />

    <CombatPanel
        v-if="overlay === 'combat' && enemy"
        :character="character"
        :enemy="enemy"
        :log="combatLog"
        :over="combatOver"
        @action="soloAction"
        @again="combatTraining ? openTraining() : openSolo()"
        @close="closeCombat"
    />

    <RoomPanel
        v-if="overlay === 'room'"
        :room="room"
        :busy="roomBusy"
        :error="roomError"
        :cooldown="attackCooldown"
        :claimed="rewardClaimed"
        @create="createRoom"
        @join="joinRoom"
        @leave="leaveRoom"
        @attack="roomAttack"
        @claim="claimReward"
        @close="overlay = null"
    />

    <ForgePanel
        v-if="overlay === 'forge'"
        :character="character"
        @buy="forgeBuy"
        @customize="customizeCharacter"
        @close="overlay = null"
    />

    <ArcadePanel v-if="overlay === 'arcade'" @close="overlay = null" />
    <BattleshipPanel v-if="overlay === 'battleship'" @close="overlay = null" />
  </template>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, nextTick, watch } from 'vue';
import CharacterCreate from './components/CharacterCreate.vue';
import HUD from './components/HUD.vue';
import CombatPanel from './components/CombatPanel.vue';
import RoomPanel from './components/RoomPanel.vue';
import ForgePanel from './components/ForgePanel.vue';
import ArcadePanel from './components/ArcadePanel.vue';
import BattleshipPanel from './components/BattleshipPanel.vue';
import { createGameSocket } from './net/socket.js';
import { createRiftScene } from './three/scene.js';

const character = ref(null);
const createError = ref('');
const connected = ref(false);
const activePortal = ref(null);
const overlay = ref(null); // null | 'combat' | 'room' | 'forge'
const chat = ref([]);
const leaderboard = ref([]);

const enemy = ref(null);
const combatLog = ref([]);
const combatOver = ref(false);
const combatTraining = ref(false);

const room = ref(null);
const roomBusy = ref(false);
const roomError = ref('');
const attackCooldown = ref(0);
const rewardClaimed = ref(false);
let cooldownTimer = null;

const sceneContainer = ref(null);
let scene = null;
let socket = null;
const IDENTITY_KEY = 'infini9.identity.v1';
let identity = loadIdentity();
let pendingCreate = identity;

function loadIdentity() {
  try {
    const saved = JSON.parse(localStorage.getItem(IDENTITY_KEY));
    return saved?.callsign && saved?.class ? saved : null;
  } catch {
    return null;
  }
}

function connectSocket() {
  socket = createGameSocket();

  socket.on('_open', () => {
    connected.value = true;
    const login = pendingCreate || identity;
    if (login) socket.send('hello', login);
    pendingCreate = null;
  });
  socket.on('_close', () => { connected.value = false; });

  socket.on('welcome', ({ character: c, leaderboard: lb }) => {
    character.value = c;
    identity = { callsign: c.callsign, class: c.class, model: c.model || identity?.model || 'character-female-a', accent: c.accent || identity?.accent, sigil: c.sigil || identity?.sigil, hairColor: c.hairColor || identity?.hairColor, clothingColor: c.clothingColor || identity?.clothingColor, item: c.item || identity?.item };
    localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
    leaderboard.value = lb || [];
    createError.value = '';
    nextTick(mountScene);
  });

  socket.on('error', ({ message }) => {
    if (!character.value) createError.value = message;
    else roomError.value = message;
  });

  socket.on('world_state', (players) => {
    if (scene) scene.syncRemotePlayers(players, character.value?.callsign);
  });

  socket.on('solo_state', ({ character: c, enemy: e, log, over }) => {
    character.value = c;
    enemy.value = e;
    if (log) combatLog.value.push(...log);
    if (over !== undefined) combatOver.value = over;
  });

  socket.on('character_state', ({ character: c }) => {
    character.value = c;
  });

  socket.on('room_state', (r) => {
    room.value = r;
    rewardClaimed.value = !!(r.rewardClaimed && character.value && r.rewardClaimed[character.value.callsign]);
  });

  socket.on('chat', (m) => {
    chat.value.push(m);
    if (chat.value.length > 60) chat.value = chat.value.slice(-60);
  });

  socket.on('emote', ({ callsign, emote }) => {
    if (callsign && callsign !== character.value?.callsign) scene?.playRemoteEmote(callsign, emote);
  });
}

function handleCreate({ callsign, cls, model, accent, sigil, hairColor, clothingColor }) {
  const payload = { callsign, class: cls, model, accent, sigil, hairColor, clothingColor };
  identity = payload;
  if (connected.value) socket.send('hello', payload);
  else pendingCreate = payload;
}

function mountScene() {
  if (!sceneContainer.value || scene) return;
  scene = createRiftScene(sceneContainer.value, {
    onPortalChange: (p) => { activePortal.value = p; },
    onInteract: (area) => {
      if (area === 'training') openTraining();
      if (area === 'arcade') overlay.value = 'arcade';
      if (area === 'battleship') overlay.value = 'battleship';
    },
  });
  scene.setLocalPlayer({ ...character.value, cls: character.value.class, model: character.value.model || identity?.model });
  scene.onMove((pos) => socket.send('move', pos));
  scene.onEmote((emote) => socket.send('emote', { emote }));
}

// ---------- solo rift ----------
function openSolo() {
  combatTraining.value = false;
  combatLog.value = [];
  combatOver.value = false;
  overlay.value = 'combat';
  socket.send('enter_solo');
}
function openTraining() {
  combatTraining.value = true;
  combatLog.value = [];
  combatOver.value = false;
  overlay.value = 'combat';
  socket.send('enter_training');
}
function soloAction(action) {
  socket.send('solo_action', { action });
}
function closeCombat() {
  overlay.value = null;
  enemy.value = null;
  combatTraining.value = false;
}

// ---------- forge ----------
function forgeBuy(kind) {
  socket.send('forge', { kind });
}
function customizeCharacter(patch) {
  character.value = { ...character.value, ...patch };
  identity = { ...identity, ...patch };
  localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
  socket.send('customize', patch);
  scene?.setLocalPlayer({ ...character.value, cls: character.value.class });
}

// ---------- room ----------
function createRoom() {
  roomBusy.value = true; roomError.value = '';
  socket.send('create_room');
  roomBusy.value = false;
}
function joinRoom(code) {
  roomBusy.value = true; roomError.value = '';
  socket.send('join_room', { code });
  roomBusy.value = false;
}
function leaveRoom() {
  socket.send('leave_room');
  room.value = null;
  clearInterval(cooldownTimer);
  attackCooldown.value = 0;
}
function roomAttack() {
  if (attackCooldown.value > 0) return;
  socket.send('room_attack');
  attackCooldown.value = 2;
  clearInterval(cooldownTimer);
  cooldownTimer = setInterval(() => {
    if (attackCooldown.value > 0) attackCooldown.value--;
    else clearInterval(cooldownTimer);
  }, 1000);
}
function claimReward() {
  socket.send('claim_reward');
}

// ---------- chat / leaderboard ----------
function sendChat(msg) {
  socket.send('chat', { msg });
}
function toggleLeaderboard() {
  overlay.value = overlay.value === 'leaderboard-pin' ? null : 'leaderboard-pin';
}

onMounted(connectSocket);
watch(overlay, (value) => scene?.setControlsEnabled(!value));
watch(() => character.value?.level, (level, previous) => {
  if (scene && previous !== undefined && level !== previous) {
    scene.setLocalPlayer({ ...character.value, cls: character.value.class });
  }
});
onBeforeUnmount(() => {
  socket?.close();
  scene?.dispose();
  clearInterval(cooldownTimer);
});
</script>

<style scoped>
.scene { position: fixed; inset: 0; }
</style>
