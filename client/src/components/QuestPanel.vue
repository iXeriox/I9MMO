<template>
  <div class="overlay">
    <div class="panel box">
      <div class="mono label">QUEST BOARD</div>
      <div class="display" style="font-size:19px; margin-bottom:4px;">Archivist Kade's Postings</div>
      <div class="mono" style="font-size:11px; color:var(--text-faint); margin-bottom:14px;">
        Objectives track automatically as you play. Return here to turn them in.
      </div>

      <div v-if="active.length" class="mono section-label">ACTIVE</div>
      <div v-for="q in active" :key="'a-'+q.id" class="quest-card" :class="{ ready: q.readyToTurnIn }">
        <div class="quest-head">
          <b>{{ q.title }}</b>
          <span class="mono progress">{{ Math.min(q.progress, q.target) }}/{{ q.target }}</span>
        </div>
        <div class="sub">{{ q.description }}</div>
        <div class="bar-track" style="margin:8px 0;"><div class="bar-fill quest" :style="{ width: pct(q.progress, q.target) + '%' }"></div></div>
        <div class="quest-actions">
          <span class="mono reward">+{{ q.rewardXp }} XP · ◈{{ q.rewardShards }}</span>
          <button class="btn btn-primary" :disabled="!q.readyToTurnIn" @click="$emit('turn-in', q.id)">
            {{ q.readyToTurnIn ? 'Turn in' : 'In progress' }}
          </button>
        </div>
      </div>

      <div class="mono section-label">AVAILABLE</div>
      <div v-if="available.length===0" class="mono empty">No new postings — check back after levelling up or finishing what you've got.</div>
      <div v-for="q in available" :key="'v-'+q.id" class="quest-card">
        <div class="quest-head">
          <b>{{ q.title }}</b>
          <span v-if="q.repeatable" class="mono repeat-tag">REPEATABLE</span>
        </div>
        <div class="sub">{{ q.description }}</div>
        <div class="quest-actions">
          <span class="mono reward">+{{ q.rewardXp }} XP · ◈{{ q.rewardShards }}</span>
          <button class="btn" @click="$emit('accept', q.id)">Accept</button>
        </div>
      </div>

      <div v-if="completed.length" class="mono section-label">COMPLETED</div>
      <div v-if="completed.length" class="completed-row">
        <span v-for="c in completed" :key="c.id" class="mono completed-chip">{{ c.title }}<span v-if="c.count>1"> ×{{ c.count }}</span></span>
      </div>

      <button class="btn btn-block" style="margin-top:16px;" @click="$emit('close')">← Back</button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  available: { type: Array, default: () => [] },
  active: { type: Array, default: () => [] },
  completed: { type: Array, default: () => [] },
});
defineEmits(['accept', 'turn-in', 'close']);
function pct(v, max) { if (!max) return 0; return Math.max(0, Math.min(100, Math.round((v / max) * 100))); }
</script>

<style scoped>
.overlay { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(5,6,10,0.55); z-index: 20; }
.box { width: 480px; max-width: 92vw; max-height: 88vh; overflow-y: auto; }
.label { font-size: 10.5px; color: var(--text-faint); letter-spacing: 0.12em; }
.section-label { font-size: 10.5px; color: var(--text-faint); letter-spacing: 0.12em; margin: 16px 0 8px; }
.section-label:first-of-type { margin-top: 4px; }
.empty { font-size: 11.5px; color: var(--text-faint); padding: 6px 0 4px; }
.quest-card { background: var(--bg-grid); border: 1px solid var(--border-soft); border-radius: 10px; padding: 12px 14px; margin-bottom: 10px; }
.quest-card.ready { border-color: var(--accent); box-shadow: 0 0 0 1px rgba(79,227,193,0.15) inset; }
.quest-head { display: flex; justify-content: space-between; align-items: center; }
.progress { font-size: 11px; color: var(--text-dim); }
.sub { font-size: 12px; color: var(--text-dim); margin-top: 4px; line-height: 1.4; }
.quest-actions { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; }
.reward { font-size: 11px; color: var(--gold); }
.repeat-tag { font-size: 9px; color: var(--accent2); border: 1px solid var(--accent2); border-radius: 5px; padding: 1px 6px; }
.bar-fill.quest { background: linear-gradient(90deg, var(--accent), var(--accent2)); }
.completed-row { display: flex; flex-wrap: wrap; gap: 6px; }
.completed-chip { font-size: 10.5px; color: var(--text-dim); background: var(--bg-grid); border: 1px solid var(--border-soft); border-radius: 99px; padding: 4px 10px; }
</style>
