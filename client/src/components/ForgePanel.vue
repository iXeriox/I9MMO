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
      <div class="mono sub palette-title">VESSEL</div>
      <div class="model-grid">
        <button v-for="avatar in avatars" :key="avatar" class="model-btn" :class="{ selected: character.model === avatar }" @click="$emit('customize', { model: avatar })">
          <img :src="`/assets/characters/previews/${avatar}.png`" alt="" /><span class="mono">{{ avatar.slice(-1).toUpperCase() }}</span>
        </button>
      </div>
      <div class="identity-row">
        <button v-for="color in colors" :key="color" class="swatch" :class="{ selected: character.accent === color }"
          :style="{ '--swatch': color }" :aria-label="`Set signal colour ${color}`" @click="$emit('customize', { accent: color })" />
        <input type="color" :value="character.accent" aria-label="Custom signal paint" @change="$emit('customize', { accent: $event.target.value })" />
      </div>
      <div class="mono sub palette-title">HEAD PAINT</div>
      <div class="identity-row"><button v-for="color in hairColors" :key="color" class="swatch" :class="{ selected: character.hairColor === color }" :style="{ '--swatch': color }" aria-label="Head paint" @click="$emit('customize', { hairColor: color })" /><input type="color" :value="character.hairColor" aria-label="Custom head paint" @change="$emit('customize', { hairColor: $event.target.value })" /></div>
      <div class="mono sub palette-title">BODY PAINT</div>
      <div class="identity-row"><button v-for="color in clothingColors" :key="color" class="swatch" :class="{ selected: character.clothingColor === color }" :style="{ '--swatch': color }" aria-label="Body paint" @click="$emit('customize', { clothingColor: color })" /><input type="color" :value="character.clothingColor" aria-label="Custom body paint" @change="$emit('customize', { clothingColor: $event.target.value })" /></div>
      <div class="mono label identity-label">HELD ITEM CREATOR</div>
      <div class="item-creator">
        <label class="mono">FORM<select v-model="item.type"><option value="none">Empty hands</option><option value="sword">Energy sword</option><option value="blaster">Pulse blaster</option><option value="shield">Rift shield</option></select></label>
        <label class="mono">PAINT<input v-model="item.color" type="color" /></label>
        <label class="mono">SCALE<input v-model.number="item.scale" type="range" min="0.5" max="1.5" step="0.1" /></label>
        <button class="btn btn-primary" @click="$emit('customize',{ item:{...item} })">Equip design</button>
      </div>
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
import { computed, reactive } from 'vue';
const props = defineProps({ character: Object });
defineEmits(['buy', 'customize', 'close']);
const colors = ['#4FE3C1', '#B26CFF', '#F4C868', '#FF6B8A', '#5A8CFF', '#E9EAF4'];
const sigils = ['IX', '∆', 'Ø', 'Ψ', '⌁', '◇'];
const hairColors = ['#171219', '#2B1A12', '#7B4426', '#D4AA67', '#B8C5D6', '#5B2D80'];
const clothingColors = ['#23324F', '#344D7A', '#70364D', '#37645A', '#7A6234', '#30323A'];
const avatars = ['female-a', 'female-b', 'female-c', 'female-d', 'female-e', 'female-f', 'male-a', 'male-b', 'male-c', 'male-d', 'male-e', 'male-f'].map((name) => `character-${name}`);
const item = reactive({ type: props.character.item?.type || 'none', color: props.character.item?.color || '#F4C868', scale: props.character.item?.scale || 1 });
const hpCost = computed(() => Math.round(15 * Math.pow(1.18, props.character.forgeHpBuys || 0)));
const atkCost = computed(() => Math.round(20 * Math.pow(1.2, props.character.forgeAtkBuys || 0)));
</script>

<style scoped>
.overlay { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(5,6,10,0.55); z-index: 20; }
.box { width: 460px; max-width: 92vw; max-height:90vh; overflow-y:auto; }
.label { font-size: 10.5px; color: var(--text-faint); letter-spacing: 0.12em; }
.row-card { display: flex; justify-content: space-between; align-items: center; background: var(--bg-grid); border: 1px solid var(--border-soft); border-radius: 10px; padding: 12px 14px; margin-bottom: 10px; }
.sub { font-size: 11px; color: var(--text-dim); margin-top: 2px; }
.identity-label { margin:16px 0 9px; }
.identity-row { display:flex; gap:8px; margin-bottom:9px; }
.swatch { width:30px; height:30px; padding:0; border:2px solid var(--border); border-radius:50%; background:var(--swatch); cursor:pointer; }
.swatch.selected, .glyph.selected { outline:2px solid var(--accent); outline-offset:2px; }
.glyph { min-width:36px; padding:6px; }
.palette-title { margin:10px 0 6px; letter-spacing:.12em; }
.identity-row input[type=color] { width:30px; height:30px; padding:2px; border:1px solid var(--border); border-radius:50%; background:transparent; }
.model-grid { display:grid; grid-template-columns:repeat(6,1fr); gap:5px; margin-bottom:12px; }
.model-btn { position:relative; height:54px; padding:2px; overflow:hidden; border:1px solid var(--border); border-radius:7px; background:#080a12; color:var(--text-faint); cursor:pointer; }
.model-btn img { width:100%; height:100%; object-fit:contain; }.model-btn span { position:absolute; right:3px; bottom:2px; font-size:7px; }.model-btn.selected { border-color:var(--accent); box-shadow:inset 0 0 14px rgba(79,227,193,.12); }
.item-creator{display:grid;grid-template-columns:1.4fr .7fr 1fr;gap:8px;align-items:end;padding:12px;margin-bottom:12px;border:1px solid var(--border);border-radius:9px;background:#080b14}.item-creator label{display:grid;gap:5px;font-size:9px;color:var(--text-dim)}.item-creator select{height:31px;background:#090b13;color:var(--text);border:1px solid var(--border);border-radius:6px}.item-creator input[type=color]{height:31px;width:100%}.item-creator .btn{grid-column:1/-1}
</style>
