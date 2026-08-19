<template>
  <div class="overlay">
    <div class="panel box">
      <div class="mono label">ORBITAL ARCADE // SIGNAL ALIGNMENT</div>
      <h2>{{ mode === 'pulse' ? 'Pulse Lock' : 'Star Cipher' }}</h2>
      <div class="mode-tabs"><button class="btn" :class="{ active: mode === 'pulse' }" @click="mode = 'pulse'">Pulse Lock</button><button class="btn" :class="{ active: mode === 'cipher' }" @click="mode = 'cipher'">Star Cipher</button></div>
      <p v-if="mode === 'pulse'">Stop the scanner inside the calibration zone. Three accurate locks complete a run.</p>
      <p v-else>Repeat the navigation sequence to safely plot the shuttle's jump vector.</p>
      <template v-if="mode === 'pulse'">
      <div class="scanner">
        <div class="zone" :style="{ left: `${zone}%` }"></div>
        <div class="needle" :style="{ left: `${needle}%` }"></div>
      </div>
      <div class="readout mono"><span>LOCKS {{ score }}/3</span><span>ATTEMPTS {{ attempts }}</span></div>
      </template>
      <template v-else>
        <div class="sequence mono">{{ cipher.join(' · ') }}</div>
        <div class="cipher-grid"><button v-for="symbol in symbols" :key="symbol" class="btn cipher-key" @click="chooseSymbol(symbol)">{{ symbol }}</button></div>
        <div class="readout mono"><span>VECTOR {{ cipherCursor }}/{{ cipher.length }}</span><span>RUNS {{ cipherWins }}</span></div>
      </template>
      <div v-if="message" class="message mono">{{ message }}</div>
      <div class="btn-row">
        <button v-if="mode === 'pulse'" class="btn btn-primary" :disabled="score >= 3" @click="lock">Lock pulse <span class="mono">[SPACE]</span></button>
        <button class="btn" @click="$emit('close')">Exit arcade</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';

defineEmits(['close']);
const needle = ref(0);
const zone = ref(62);
const score = ref(0);
const attempts = ref(0);
const message = ref('Synchronise when the pulse crosses the zone.');
const mode = ref('pulse');
const symbols = ['△', '○', '◇', '□'];
const cipher = ref(makeCipher());
const cipherCursor = ref(0);
const cipherWins = ref(0);
let direction = 1;
let raf;
let previous = 0;

function animate(time) {
  const delta = Math.min(32, time - previous || 16);
  previous = time;
  needle.value += direction * delta * 0.055;
  if (needle.value >= 100 || needle.value <= 0) direction *= -1;
  needle.value = Math.max(0, Math.min(100, needle.value));
  raf = requestAnimationFrame(animate);
}
function lock() {
  if (score.value >= 3) return;
  attempts.value++;
  if (Math.abs(needle.value - zone.value) <= 7) {
    score.value++;
    message.value = score.value === 3 ? 'CALIBRATION COMPLETE // PERFECT SIGNAL' : 'LOCK CONFIRMED';
    zone.value = 12 + Math.random() * 76;
  } else message.value = 'SIGNAL MISSED // RECALIBRATE';
}
function makeCipher() { return Array.from({ length: 4 }, () => symbols[Math.floor(Math.random() * symbols.length)]); }
function chooseSymbol(symbol) {
  if (symbol !== cipher.value[cipherCursor.value]) {
    cipherCursor.value = 0;
    message.value = 'VECTOR LOST // START SEQUENCE AGAIN';
    return;
  }
  cipherCursor.value++;
  message.value = 'COORDINATE ACCEPTED';
  if (cipherCursor.value === cipher.value.length) {
    cipherWins.value++;
    cipherCursor.value = 0;
    cipher.value = makeCipher();
    message.value = 'JUMP VECTOR LOCKED';
  }
}
function onKey(event) { if (event.code === 'Space' && mode.value === 'pulse') { event.preventDefault(); lock(); } }
onMounted(() => { raf = requestAnimationFrame(animate); window.addEventListener('keydown', onKey); });
onBeforeUnmount(() => { cancelAnimationFrame(raf); window.removeEventListener('keydown', onKey); });
</script>

<style scoped>
.overlay { position:fixed; inset:0; z-index:30; display:grid; place-items:center; background:rgba(2,5,12,.76); backdrop-filter:blur(10px); }
.box { width:min(560px,92vw); padding:28px; box-shadow:0 30px 100px #000; }
.label { color:var(--accent); font-size:10px; letter-spacing:.16em; }
h2 { margin:8px 0; font-size:28px; } p { color:var(--text-dim); line-height:1.6; }
.scanner { position:relative; height:84px; margin:24px 0 12px; overflow:hidden; border:1px solid var(--border); border-radius:8px; background:repeating-linear-gradient(90deg,#080b15 0 19px,#111629 20px); }
.zone { position:absolute; top:0; bottom:0; width:14%; transform:translateX(-50%); background:rgba(79,227,193,.16); border-inline:1px solid var(--accent); box-shadow:0 0 28px rgba(79,227,193,.24); }
.needle { position:absolute; top:8px; bottom:8px; width:3px; background:white; box-shadow:0 0 14px white; }
.readout { display:flex; justify-content:space-between; color:var(--text-dim); font-size:11px; }
.message { height:36px; margin-top:20px; color:var(--gold); font-size:11px; }
.mode-tabs { display:flex; gap:8px; margin:18px 0 8px; }.mode-tabs .active { border-color:var(--accent); color:var(--accent); }
.sequence { padding:24px; margin:20px 0 12px; text-align:center; font-size:24px; letter-spacing:.2em; border:1px solid var(--border); background:#080b15; }
.cipher-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:14px; }.cipher-key { font-size:22px; }
</style>
