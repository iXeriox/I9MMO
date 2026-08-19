<template>
  <div class="wrap">
    <div class="scanlines"></div>
    <main class="creator">
      <header>
        <div class="eyebrow mono">IDENTITY UPLINK // FIRST LAUNCH</div>
        <div class="display logo">INFINI<span>9</span></div>
        <p>Choose the signal you will carry between the nine. Your identity and progress will be remembered on this device.</p>
      </header>

      <section class="panel identity-panel">
        <div class="step mono"><b>01</b> SELECT YOUR VESSEL</div>
        <div class="character-grid" role="radiogroup" aria-label="Character appearance">
          <button v-for="avatar in avatars" :key="avatar.id" type="button" class="avatar-card"
            :class="{ selected: model === avatar.id }" :aria-checked="model === avatar.id" role="radio"
            @click="model = avatar.id">
            <img :src="`/assets/characters/previews/${avatar.id}.png`" :alt="avatar.label" />
            <span class="mono">{{ avatar.label }}</span>
          </button>
        </div>

        <div class="custom-grid">
          <div>
            <div class="step mono"><b>02</b> TUNE YOUR SIGNAL</div>
            <div class="swatches" role="radiogroup" aria-label="Signal colour">
              <button v-for="color in colors" :key="color.value" type="button" class="swatch"
                :class="{ selected: accent === color.value }" :style="{ '--swatch': color.value }"
                :aria-label="color.name" :aria-checked="accent === color.value" role="radio" @click="accent = color.value" />
            </div>
          </div>
          <div>
            <div class="step mono"><b>03</b> CHOOSE YOUR GLYPH</div>
            <div class="glyphs" role="radiogroup" aria-label="Personal glyph">
              <button v-for="glyph in glyphs" :key="glyph" type="button" class="glyph mono"
                :class="{ selected: sigil === glyph }" :aria-checked="sigil === glyph" role="radio" @click="sigil = glyph">{{ glyph }}</button>
            </div>
          </div>
        </div>

        <div class="details-grid">
          <div>
            <div class="step mono"><b>04</b> NAME YOUR SIGNAL</div>
            <input type="text" v-model="name" maxlength="16" placeholder="CALLSIGN" aria-label="Callsign" @keyup.enter="confirm" />
          </div>
          <div>
            <div class="step mono"><b>05</b> CHOOSE YOUR PATH</div>
            <div class="class-grid">
              <button v-for="(c, key) in classes" :key="key" type="button" class="class-card"
                :class="{ selected: cls === key }" :style="{ '--card-accent': c.color }" @click="cls = key">
                <span><b>{{ c.name }}</b><small>{{ c.role }}</small></span>
                <span class="mono stats">{{ c.baseHp }} HP<br>{{ c.baseAtk }} ATK</span>
              </button>
            </div>
          </div>
        </div>

        <button class="btn btn-primary btn-block enter" :disabled="!name.trim() || !cls || !model" @click="confirm">
          Bind identity &amp; enter the rift <span>→</span>
        </button>
        <div v-if="error" class="error mono">{{ error }}</div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue';

defineProps({ error: { type: String, default: '' } });
const emit = defineEmits(['confirm']);

const avatars = ['female-a', 'female-b', 'female-c', 'female-d', 'female-e', 'female-f', 'male-a', 'male-b', 'male-c', 'male-d', 'male-e', 'male-f']
  .map((name, i) => ({ id: `character-${name}`, label: `Vessel ${String(i + 1).padStart(2, '0')}` }));
const classes = {
  vanguard: { name: 'Vanguard', role: 'Tank / Melee', baseHp: 140, baseAtk: 11, color: '#B26CFF' },
  phasecaller: { name: 'Phasecaller', role: 'Arcane DPS', baseHp: 88, baseAtk: 19, color: '#4FE3C1' },
  wraithhunter: { name: 'Wraithhunter', role: 'Ranged Rogue', baseHp: 104, baseAtk: 15, color: '#F4C868' },
};
const name = ref('');
const cls = ref('');
const model = ref('character-female-a');
const accent = ref('#4FE3C1');
const sigil = ref('IX');
const colors = [
  { name: 'Ion mint', value: '#4FE3C1' }, { name: 'Nebula violet', value: '#B26CFF' },
  { name: 'Solar gold', value: '#F4C868' }, { name: 'Nova coral', value: '#FF6B8A' },
  { name: 'Void blue', value: '#5A8CFF' }, { name: 'Plasma white', value: '#E9EAF4' },
];
const glyphs = ['IX', '∆', 'Ø', 'Ψ', '⌁', '◇'];

function confirm() {
  if (!name.value.trim() || !cls.value || !model.value) return;
  emit('confirm', { callsign: name.value.trim(), cls: cls.value, model: model.value, accent: accent.value, sigil: sigil.value });
}
</script>

<style scoped>
.wrap { position: fixed; inset: 0; overflow-y: auto; padding: 42px 20px; background: radial-gradient(circle at 50% 0%, #17263a 0, #090b14 38%, #05060a 100%); }
.wrap::before { content:''; position:fixed; inset:0; opacity:.2; pointer-events:none; background-image: linear-gradient(rgba(79,227,193,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(79,227,193,.15) 1px, transparent 1px); background-size:48px 48px; mask-image:linear-gradient(to bottom, black, transparent 70%); }
.scanlines { position:fixed; inset:0; pointer-events:none; opacity:.08; background:repeating-linear-gradient(0deg, transparent 0 3px, #fff 4px); }
.creator { position:relative; width:min(940px, 100%); margin:auto; }
header { text-align:center; margin-bottom:24px; }
.eyebrow, .step { color:var(--accent); font-size:10px; letter-spacing:.2em; }
.logo { font-size:clamp(42px, 8vw, 72px); font-weight:700; line-height:1; letter-spacing:-.06em; margin:8px 0 10px; text-shadow:0 0 35px rgba(79,227,193,.18); }
.logo span { color:var(--accent); }
header p { color:var(--text-dim); font-size:13px; max-width:540px; line-height:1.6; margin:auto; }
.identity-panel { padding:22px; box-shadow:0 30px 90px #0009, inset 0 1px rgba(255,255,255,.03); }
.step { margin-bottom:12px; color:var(--text-dim); }
.step b { color:var(--accent); margin-right:8px; }
.character-grid { display:grid; grid-template-columns:repeat(12, 1fr); gap:6px; }
.avatar-card { min-width:0; padding:8px 3px 6px; border:1px solid var(--border); border-radius:8px; background:#090b13; color:var(--text-faint); cursor:pointer; transition:.18s ease; }
.avatar-card img { width:100%; height:82px; object-fit:contain; image-rendering:auto; filter:saturate(.8); }
.avatar-card span { display:block; font-size:7px; letter-spacing:.05em; white-space:nowrap; }
.avatar-card:hover { border-color:var(--text-dim); transform:translateY(-2px); }
.avatar-card.selected { color:var(--accent); border-color:var(--accent); background:linear-gradient(180deg, rgba(79,227,193,.12), rgba(79,227,193,.02)); box-shadow:0 0 18px rgba(79,227,193,.12); }
.details-grid { display:grid; grid-template-columns:.7fr 1.3fr; gap:24px; margin-top:24px; }
.custom-grid { display:grid; grid-template-columns:1fr 1fr; gap:24px; margin-top:24px; padding:16px; border:1px solid var(--border-soft); border-radius:10px; background:#080b14aa; }
.swatches, .glyphs { display:flex; gap:8px; flex-wrap:wrap; }
.swatch { width:32px; height:32px; padding:0; border:2px solid #151a2a; border-radius:50%; background:var(--swatch); cursor:pointer; box-shadow:0 0 14px color-mix(in srgb, var(--swatch) 30%, transparent); }
.swatch.selected { outline:2px solid white; outline-offset:2px; }
.glyph { width:36px; height:32px; border:1px solid var(--border); border-radius:6px; background:#090b13; color:var(--text-dim); cursor:pointer; }
.glyph.selected { border-color:var(--accent); color:var(--accent); background:rgba(79,227,193,.1); }
.class-grid { display:grid; gap:7px; }
.class-card { display:flex; justify-content:space-between; text-align:left; align-items:center; width:100%; padding:9px 12px; color:var(--text); border:1px solid var(--border); border-left:3px solid var(--card-accent); background:var(--bg-grid); border-radius:7px; cursor:pointer; }
.class-card small { display:block; color:var(--text-dim); margin-top:2px; font-size:10px; text-transform:uppercase; }
.class-card .stats { color:var(--text-faint); text-align:right; font-size:9px; line-height:1.5; }
.class-card.selected { border-color:var(--card-accent); background:color-mix(in srgb, var(--card-accent) 10%, var(--bg-grid)); }
.enter { margin-top:22px; padding:13px; text-transform:uppercase; letter-spacing:.08em; }
.enter span { margin-left:8px; font-size:17px; }
.error { color:var(--danger); font-size:11px; margin-top:10px; text-align:center; }
@media (max-width:760px) { .character-grid { grid-template-columns:repeat(6, 1fr); } .details-grid, .custom-grid { grid-template-columns:1fr; } .avatar-card img { height:64px; } }
@media (max-width:420px) { .character-grid { grid-template-columns:repeat(4, 1fr); } }
</style>
