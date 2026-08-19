<template>
  <div class="wrap">
    <div class="panel" style="max-width: 560px; margin: 8vh auto;">
      <div style="text-align:center; margin-bottom: 6px;">
        <div class="display" style="font-size: 22px; font-weight:700;">INFINI<span style="color:var(--accent)">9</span></div>
        <div class="mono" style="font-size:10.5px; color:var(--text-faint); letter-spacing:0.12em;">RIFT NETWORK</div>
      </div>
      <p style="text-align:center; color:var(--text-dim); font-size:13px; max-width:420px; margin:14px auto 22px;">
        Nine rifts have torn open across Infini9. Pick a callsign and a class to step through.
      </p>

      <div class="bar-row">
        <div class="bar-label"><span>CALLSIGN</span></div>
        <input type="text" v-model="name" maxlength="16" placeholder="e.g. Ashvane, Kite-9, Null_Rae" @keyup.enter="confirm" />
      </div>

      <div class="mono" style="font-size:11px; color:var(--text-dim); text-transform:uppercase; letter-spacing:0.1em; margin: 18px 0 10px;">Choose a class</div>
      <div class="class-grid">
        <div v-for="(c, key) in classes" :key="key"
             class="class-card" :class="{ selected: cls === key }"
             :style="{ '--card-accent': c.color }"
             @click="cls = key">
          <h3 style="font-size:16px;">{{ c.name }}</h3>
          <div class="role">{{ c.role }}</div>
          <div class="stats mono">HP {{ c.baseHp }} &nbsp; ATK {{ c.baseAtk }}</div>
          <div class="ability"><b>{{ c.abilityName }}</b></div>
        </div>
      </div>

      <button class="btn btn-primary btn-block" style="margin-top:20px;" :disabled="!name.trim() || !cls" @click="confirm">
        Step Through the Rift →
      </button>
      <div v-if="error" class="mono" style="color:var(--danger); font-size:12px; margin-top:10px; text-align:center;">{{ error }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({ error: { type: String, default: '' } });
const emit = defineEmits(['confirm']);

const classes = {
  vanguard: { name: 'Vanguard', role: 'Tank / Melee', baseHp: 140, baseAtk: 11, abilityName: 'Bulwark Smash', color: '#B26CFF' },
  phasecaller: { name: 'Phasecaller', role: 'Arcane DPS', baseHp: 88, baseAtk: 19, abilityName: 'Rift Bolt', color: '#4FE3C1' },
  wraithhunter: { name: 'Wraithhunter', role: 'Ranged Rogue', baseHp: 104, baseAtk: 15, abilityName: 'Twin Strike', color: '#F4C868' },
};

const name = ref('');
const cls = ref('');

function confirm() {
  if (!name.value.trim() || !cls.value) return;
  emit('confirm', { callsign: name.value.trim(), cls: cls.value });
}
</script>

<style scoped>
.wrap { position: fixed; inset: 0; overflow-y: auto; padding: 20px; }
.class-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
.class-card {
  background: var(--bg-grid);
  border: 1.5px solid var(--border);
  border-radius: 12px;
  padding: 14px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.class-card:hover { border-color: var(--text-dim); }
.class-card.selected {
  border-color: var(--card-accent, var(--accent));
  background: linear-gradient(180deg, rgba(79,227,193,0.06), transparent);
}
.role { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--card-accent, var(--accent)); text-transform: uppercase; letter-spacing: 0.06em; margin: 2px 0 8px; }
.stats { font-size: 11px; color: var(--text-dim); margin-bottom: 8px; }
.ability { font-size: 12px; color: var(--text-dim); }
.ability b { color: var(--text); }
</style>
