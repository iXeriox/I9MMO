<template>
  <div class="hud">
    <!-- top-left: character card -->
    <div class="panel card">
      <div style="display:flex; align-items:center; gap:10px;">
        <div class="badge" :style="{ '--card-accent': classColor }">{{ character.callsign.slice(0,2).toUpperCase() }}</div>
        <div style="flex-grow:1;">
          <div style="display:flex; align-items:center; gap:6px;">
            <b style="font-size:14px;">{{ character.callsign }}</b>
            <span class="lvl mono">LV{{ character.level }}</span>
          </div>
          <div class="mono" style="font-size:10.5px; color:var(--text-dim);">{{ className }}</div>
        </div>
        <div style="text-align:right;">
          <div class="mono" style="font-size:14px; color:var(--gold);">◈{{ character.shards }}</div>
          <button class="btn forge-btn" @click="$emit('open-forge')">Forge</button>
        </div>
      </div>
      <div class="bar-row" style="margin-top:10px;">
        <div class="bar-label"><span>HP</span><span>{{ character.hp }}/{{ character.maxHp }}</span></div>
        <div class="bar-track"><div class="bar-fill hp" :style="{ width: pct(character.hp, character.maxHp) + '%' }"></div></div>
      </div>
      <div class="bar-row">
        <div class="bar-label"><span>XP</span><span>{{ character.xp }}/{{ character.xpToNext }}</span></div>
        <div class="bar-track"><div class="bar-fill xp" :style="{ width: pct(character.xp, character.xpToNext) + '%' }"></div></div>
      </div>
    </div>

    <!-- top-right: connection + leaderboard -->
    <div class="top-right">
      <div class="panel pill mono">
        <span class="dot" :class="{ off: !connected }"></span>{{ connected ? 'signal locked' : 'reconnecting…' }}
      </div>
      <button class="btn panel-btn" @click="$emit('toggle-leaderboard')">Standings</button>
    </div>

    <div v-if="showLeaderboard" class="panel leaderboard">
      <div class="mono label">TOP WAYFINDERS</div>
      <div v-if="leaderboard.length===0" class="mono empty">No signal yet.</div>
      <div v-for="(row,i) in leaderboard" :key="row.callsign" class="row">
        <span><span class="rank mono">#{{ i+1 }}</span> <b>{{ row.callsign }}</b></span>
        <span class="mono">LV{{ row.level }}</span>
      </div>
    </div>

    <!-- portal prompt -->
    <div v-if="activePortal" class="portal-prompt panel">
      <span class="mono">{{ portalMeta.label }}</span>
      <button class="btn btn-primary" @click="activatePortal">
        {{ portalMeta.action }}
      </button>
    </div>

    <!-- movement hint -->
    <div class="hint mono">WASD move · SPACE jump · mouse orbit · F interact</div>

    <!-- chat -->
    <div class="chat panel">
      <div class="chat-log" ref="chatLogEl">
        <div v-for="(m,i) in chat" :key="i" class="chat-line">
          <span :style="{ color: m.from === 'network' ? 'var(--gold)' : 'var(--accent)' }">{{ m.from }}</span>: {{ m.msg }}
        </div>
      </div>
      <input type="text" v-model="chatDraft" placeholder="Say something…" @keyup.enter="sendChat" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch } from 'vue';

const props = defineProps({
  character: { type: Object, required: true },
  connected: { type: Boolean, default: false },
  activePortal: { type: String, default: null },
  chat: { type: Array, default: () => [] },
  leaderboard: { type: Array, default: () => [] },
  showLeaderboard: { type: Boolean, default: false },
});
const emit = defineEmits(['open-solo', 'open-room', 'toggle-leaderboard', 'send-chat', 'open-forge']);
const portalMeta = computed(() => ({
  solo: { label: 'SOLO RIFT', action: 'Enter rift' },
  room: { label: 'INSTANCE ROOM', action: 'Open room' },
  training: { label: 'COMBAT SIMULATOR', action: 'Press F nearby' },
  arcade: { label: 'ORBITAL ARCADE', action: 'Press F nearby' },
}[props.activePortal] || { label: '', action: '' }));
function activatePortal() {
  if (props.activePortal === 'solo') emit('open-solo');
  if (props.activePortal === 'room') emit('open-room');
}

const CLASS_META = {
  vanguard: { name: 'Vanguard', color: '#B26CFF' },
  phasecaller: { name: 'Phasecaller', color: '#4FE3C1' },
  wraithhunter: { name: 'Wraithhunter', color: '#F4C868' },
};
const className = computed(() => CLASS_META[props.character.class]?.name || props.character.class);
const classColor = computed(() => CLASS_META[props.character.class]?.color || '#4FE3C1');

function pct(v, max) { if (!max) return 0; return Math.max(0, Math.min(100, Math.round((v / max) * 100))); }

const chatDraft = ref('');
const chatLogEl = ref(null);
function sendChat() {
  if (!chatDraft.value.trim()) return;
  emit('send-chat', chatDraft.value.trim());
  chatDraft.value = '';
}
watch(() => props.chat.length, () => {
  nextTick(() => { if (chatLogEl.value) chatLogEl.value.scrollTop = chatLogEl.value.scrollHeight; });
});
</script>

<style scoped>
.hud { position: fixed; inset: 0; pointer-events: none; font-family: 'Inter', sans-serif; }
.hud .panel, .hud button, .hud input { pointer-events: auto; }
.card { position: absolute; top: 16px; left: 16px; width: 260px; padding: 14px; }
.badge {
  width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 14px;
  background: linear-gradient(135deg, var(--card-accent), transparent);
  border: 1px solid var(--border);
}
.lvl { font-size: 10px; background: var(--gold); color: var(--bg); padding: 1px 6px; border-radius: 5px; font-weight: 700; }
.forge-btn { font-size: 10px; padding: 3px 9px; margin-top: 4px; }

.top-right { position: absolute; top: 16px; right: 16px; display: flex; flex-direction: column; gap: 8px; align-items: flex-end; }
.pill { display: flex; align-items: center; gap: 7px; font-size: 11px; padding: 8px 12px; border-radius: 99px; color: var(--text-dim); }
.dot { width: 7px; height: 7px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 8px var(--accent); }
.dot.off { background: var(--danger); box-shadow: 0 0 8px var(--danger); }
.panel-btn { padding: 8px 14px; font-size: 12px; }

.leaderboard { position: absolute; top: 66px; right: 16px; width: 230px; padding: 12px 14px; }
.leaderboard .label { font-size: 10px; color: var(--text-dim); letter-spacing: 0.1em; margin-bottom: 8px; }
.leaderboard .row { display: flex; justify-content: space-between; font-size: 12px; padding: 5px 0; border-bottom: 1px solid var(--border-soft); }
.leaderboard .row:last-child { border-bottom: none; }
.leaderboard .rank { color: var(--text-faint); margin-right: 4px; }
.leaderboard .empty { font-size: 11px; color: var(--text-faint); }

.portal-prompt {
  position: absolute; bottom: 130px; left: 50%; transform: translateX(-50%);
  display: flex; align-items: center; gap: 12px; padding: 10px 14px;
}

.hint {
  position: absolute; bottom: 100px; left: 50%; transform: translateX(-50%);
  font-size: 10.5px; color: var(--text-faint);
}

.chat { position: absolute; bottom: 16px; left: 16px; width: 320px; padding: 10px; }
.chat-log { height: 90px; overflow-y: auto; font-size: 11.5px; color: var(--text-dim); margin-bottom: 8px; font-family: 'JetBrains Mono', monospace; }
.chat-line { padding: 2px 0; }
</style>
