<template>
  <div class="overlay">
    <div class="panel box">
      <div class="mono label">THE FORGE</div>
      <div class="display" style="font-size:19px; margin-bottom:4px;">Permanent Upgrades</div>
      <div class="mono" style="font-size:12px; color:var(--gold); margin-bottom:16px;">◈ {{ character.shards }} shards</div>

      <div class="row-card">
        <div>
          <b>+10 Max HP</b>
          <div class="mono sub">current: {{ character.maxHp }}</div>
        </div>
        <button class="btn btn-primary" :disabled="character.shards < hpCost" @click="$emit('buy','hp')">◈{{ hpCost }}</button>
      </div>
      <div class="row-card">
        <div>
          <b>+2 ATK</b>
          <div class="mono sub">current: {{ character.atk }}</div>
        </div>
        <button class="btn btn-primary" :disabled="character.shards < atkCost" @click="$emit('buy','atk')">◈{{ atkCost }}</button>
      </div>

      <button class="btn btn-block" style="margin-top:16px;" @click="$emit('close')">← Back</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
const props = defineProps({ character: Object });
defineEmits(['buy', 'close']);
const hpCost = computed(() => Math.round(15 * Math.pow(1.18, props.character.forgeHpBuys || 0)));
const atkCost = computed(() => Math.round(20 * Math.pow(1.2, props.character.forgeAtkBuys || 0)));
</script>

<style scoped>
.overlay { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(5,6,10,0.55); z-index: 20; }
.box { width: 380px; max-width: 92vw; }
.label { font-size: 10.5px; color: var(--text-faint); letter-spacing: 0.12em; }
.row-card { display: flex; justify-content: space-between; align-items: center; background: var(--bg-grid); border: 1px solid var(--border-soft); border-radius: 10px; padding: 12px 14px; margin-bottom: 10px; }
.sub { font-size: 11px; color: var(--text-dim); margin-top: 2px; }
</style>
