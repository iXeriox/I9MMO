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

      <div class="mono label identity-label">SIGNAL IDENTITY</div>
      <div class="identity-row">
        <button v-for="color in colors" :key="color" class="swatch" :class="{ selected: character.accent === color }"
          :style="{ '--swatch': color }" :aria-label="`Set signal colour ${color}`" @click="$emit('customize', { accent: color })" />
      </div>
      <div class="mono sub palette-title">HAIR</div>
      <div class="identity-row"><button v-for="color in hairColors" :key="color" class="swatch" :class="{ selected: character.hairColor === color }" :style="{ '--swatch': color }" aria-label="Hair color" @click="$emit('customize', { hairColor: color })" /></div>
      <div class="mono sub palette-title">CLOTHING</div>
      <div class="identity-row"><button v-for="color in clothingColors" :key="color" class="swatch" :class="{ selected: character.clothingColor === color }" :style="{ '--swatch': color }" aria-label="Clothing color" @click="$emit('customize', { clothingColor: color })" /></div>
      <div class="identity-row">
        <button v-for="sigil in sigils" :key="sigil" class="btn glyph" :class="{ selected: character.sigil === sigil }"
          @click="$emit('customize', { sigil })">{{ sigil }}</button>
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
defineEmits(['buy', 'customize', 'close']);
const colors = ['#4FE3C1', '#B26CFF', '#F4C868', '#FF6B8A', '#5A8CFF', '#E9EAF4'];
const sigils = ['IX', '∆', 'Ø', 'Ψ', '⌁', '◇'];
const hairColors = ['#171219', '#2B1A12', '#7B4426', '#D4AA67', '#B8C5D6', '#5B2D80'];
const clothingColors = ['#23324F', '#344D7A', '#70364D', '#37645A', '#7A6234', '#30323A'];
const hpCost = computed(() => Math.round(15 * Math.pow(1.18, props.character.forgeHpBuys || 0)));
const atkCost = computed(() => Math.round(20 * Math.pow(1.2, props.character.forgeAtkBuys || 0)));
</script>

<style scoped>
.overlay { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(5,6,10,0.55); z-index: 20; }
.box { width: 380px; max-width: 92vw; }
.label { font-size: 10.5px; color: var(--text-faint); letter-spacing: 0.12em; }
.row-card { display: flex; justify-content: space-between; align-items: center; background: var(--bg-grid); border: 1px solid var(--border-soft); border-radius: 10px; padding: 12px 14px; margin-bottom: 10px; }
.sub { font-size: 11px; color: var(--text-dim); margin-top: 2px; }
.identity-label { margin:16px 0 9px; }
.identity-row { display:flex; gap:8px; margin-bottom:9px; }
.swatch { width:30px; height:30px; padding:0; border:2px solid var(--border); border-radius:50%; background:var(--swatch); cursor:pointer; }
.swatch.selected, .glyph.selected { outline:2px solid var(--accent); outline-offset:2px; }
.glyph { min-width:36px; padding:6px; }
.palette-title { margin:10px 0 6px; letter-spacing:.12em; }
</style>
