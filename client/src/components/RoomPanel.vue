<template>
  <div class="overlay">
    <div class="panel box">
      <!-- lobby: no room joined yet -->
      <div v-if="!room">
        <div class="mono label">SHARED INSTANCE</div>
        <div class="display" style="font-size:19px; margin-bottom:14px;">Tune into a Warden fight</div>
        <button class="btn btn-primary btn-block" :disabled="busy" @click="$emit('create')">Create New Room</button>
        <div class="mono" style="font-size:11px; color:var(--text-faint); margin:16px 0 8px;">— or join by code —</div>
        <input type="text" class="code" v-model="code" maxlength="4" placeholder="AB3X" />
        <button class="btn btn-primary btn-block" style="margin-top:10px;" :disabled="code.trim().length!==4 || busy" @click="$emit('join', code.trim().toUpperCase())">Tune In</button>
        <div v-if="error" class="mono" style="color:var(--danger); font-size:12px; margin-top:10px;">{{ error }}</div>
        <button class="btn" style="margin-top:16px;" @click="$emit('close')">← Back</button>
      </div>

      <!-- active room -->
      <div v-else>
        <div class="head">
          <div>
            <div class="mono label">FREQUENCY</div>
            <div class="display" style="font-size:19px; letter-spacing:0.12em;">{{ room.code }}</div>
          </div>
          <button class="btn btn-ghost" @click="$emit('leave')">Leave</button>
        </div>

        <div style="display:flex; justify-content:space-between; margin: 10px 0 4px;">
          <b>{{ room.bossName }}</b>
          <span class="mono" style="font-size:12px; color:var(--text-dim);">{{ room.bossHp }}/{{ room.bossMaxHp }}</span>
        </div>
        <div class="bar-track" style="margin-bottom:14px;"><div class="bar-fill boss" :style="{ width: pct(room.bossHp, room.bossMaxHp) + '%' }"></div></div>

        <div v-if="room.status === 'active'">
          <button class="btn btn-primary btn-block" :disabled="cooldown > 0 || busy" @click="$emit('attack')">
            Attack Boss <span v-if="cooldown > 0">({{ cooldown }}s)</span>
          </button>
        </div>
        <div v-else style="text-align:center; padding:8px 0;">
          <div style="color:var(--accent); font-family:'Space Grotesk',sans-serif;">The Warden has fallen.</div>
          <button class="btn btn-primary" style="margin-top:8px;" v-if="!claimed" @click="$emit('claim')">Claim Victory Reward</button>
          <div v-else class="mono" style="color:var(--text-dim); font-size:12px;">Reward claimed.</div>
        </div>

        <div class="mono label" style="margin-top:16px;">WAYFINDERS</div>
        <div v-for="(m, cs) in room.members" :key="cs" class="member">
          <span><b>{{ cs }}</b> <span style="color:var(--text-faint);">LV{{ m.level }}</span></span>
          <span class="mono">{{ m.dmgDealt || 0 }} dmg</span>
        </div>

        <div class="mono label" style="margin-top:16px;">RAID LOG</div>
        <div class="log">
          <div v-for="(l,i) in [...room.log].reverse()" :key="i" class="entry" :class="l.type||''">{{ l.msg }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
defineProps({ room: Object, busy: Boolean, error: String, cooldown: Number, claimed: Boolean });
defineEmits(['create', 'join', 'leave', 'attack', 'claim', 'close']);
const code = ref('');
function pct(v, max) { if (!max) return 0; return Math.max(0, Math.min(100, Math.round((v / max) * 100))); }
</script>

<style scoped>
.overlay { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(5,6,10,0.55); z-index: 20; }
.box { width: 440px; max-width: 92vw; max-height: 86vh; overflow-y: auto; }
.head { display: flex; justify-content: space-between; align-items: flex-start; }
.label { font-size: 10.5px; color: var(--text-faint); letter-spacing: 0.12em; }
.code { text-transform: uppercase; letter-spacing: 0.3em; text-align: center; font-size: 18px; }
.member { display: flex; justify-content: space-between; padding: 8px 10px; background: var(--bg-grid); border: 1px solid var(--border-soft); border-radius: 8px; margin-bottom: 6px; font-size: 12.5px; }
.log { background: var(--bg-grid); border: 1px solid var(--border); border-radius: 10px; padding: 10px 12px; height: 100px; overflow-y: auto; display: flex; flex-direction: column-reverse; font-family: 'JetBrains Mono', monospace; font-size: 11.5px; }
.entry { padding: 3px 0; color: var(--text-dim); border-bottom: 1px dashed var(--border-soft); }
.entry:first-child { border-bottom: none; }
.entry.hit { color: var(--accent); }
.entry.system { color: var(--gold); }
</style>
