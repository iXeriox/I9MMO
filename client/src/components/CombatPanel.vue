<template>
  <div class="overlay">
    <div class="panel box">
      <div class="head">
        <div>
          <div class="mono label">RIFT ENCOUNTER</div>
          <div class="display" style="font-size:19px;">{{ enemy.name }}</div>
        </div>
        <div class="mono" style="font-size:12px; color:var(--text-dim);">{{ enemy.hp }}/{{ enemy.maxHp }} HP</div>
      </div>
      <div class="bar-track" style="margin-bottom:14px;"><div class="bar-fill boss" :style="{ width: pct(enemy.hp, enemy.maxHp) + '%' }"></div></div>

      <div class="bar-row">
        <div class="bar-label"><span>{{ character.callsign }}</span><span>{{ character.hp }}/{{ character.maxHp }}</span></div>
        <div class="bar-track"><div class="bar-fill hp" :style="{ width: pct(character.hp, character.maxHp) + '%' }"></div></div>
      </div>

      <div class="log">
        <div v-for="(l,i) in [...log].reverse()" :key="i" class="entry" :class="l.type">{{ l.msg }}</div>
      </div>

      <div class="btn-row" style="margin-top:12px;" v-if="!over">
        <button class="btn btn-primary" @click="$emit('action','attack')">Attack</button>
        <button class="btn" :disabled="character.abilityCooldown > 0" @click="$emit('action','ability')">
          Ability <span v-if="character.abilityCooldown > 0">({{ character.abilityCooldown }})</span>
        </button>
        <button class="btn btn-ghost" @click="$emit('action','flee')">Flee</button>
      </div>
      <div class="btn-row" style="margin-top:12px;" v-else>
        <button class="btn btn-primary" v-if="character.hp > 0" @click="$emit('again')">Push Deeper</button>
        <button class="btn" @click="$emit('close')">Return to Hub</button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({ character: Object, enemy: Object, log: Array, over: Boolean });
defineEmits(['action', 'again', 'close']);
function pct(v, max) { if (!max) return 0; return Math.max(0, Math.min(100, Math.round((v / max) * 100))); }
</script>

<style scoped>
.overlay { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(5,6,10,0.55); z-index: 20; }
.box { width: 420px; max-width: 92vw; }
.head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
.label { font-size: 10.5px; color: var(--text-faint); letter-spacing: 0.12em; }
.log { background: var(--bg-grid); border: 1px solid var(--border); border-radius: 10px; padding: 10px 12px; height: 120px; overflow-y: auto; display: flex; flex-direction: column-reverse; font-family: 'JetBrains Mono', monospace; font-size: 12px; margin-top: 12px; }
.entry { padding: 3px 0; color: var(--text-dim); border-bottom: 1px dashed var(--border-soft); }
.entry:first-child { border-bottom: none; }
.entry.hit { color: var(--accent); }
.entry.taken { color: var(--danger); }
.entry.system { color: var(--gold); }
</style>
