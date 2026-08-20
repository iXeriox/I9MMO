<template>
  <div class="overlay"><div class="panel box">
    <div class="mono label">PHYSICAL ARCADE // BATTLE SHIPS</div>
    <h2>Fleet Command</h2>
    <div class="turn mono">{{ heading }}</div>
    <p>{{ phase === 'place' ? `Place ${shipNames[shipIndex]} (${ships[shipIndex]} cells), then pass the device.` : 'Select a coordinate on the enemy board to launch a bomb.' }}</p>
    <div class="toolbar" v-if="phase === 'place'"><button class="btn" @click="horizontal=!horizontal">{{ horizontal ? '↔ Horizontal' : '↕ Vertical' }}</button></div>
    <div class="board" :class="{ locked: waiting }">
      <button v-for="i in 100" :key="i" class="cell" :class="cellClass(i-1)" :aria-label="coordinate(i-1)" @click="select(i-1)">{{ mark(i-1) }}</button>
    </div>
    <div v-if="message" class="result mono">{{ message }}</div>
    <div class="btn-row"><button v-if="waiting" class="btn btn-primary" @click="continueTurn">Ready, show my board</button><button class="btn" @click="$emit('close')">Exit match</button></div>
  </div></div>
</template>

<script setup>
import { computed, ref } from 'vue';
defineEmits(['close']);
const ships=[3,2,2], shipNames=['Cruiser','Scout','Skiff'];
const players=[{ships:new Set(),shots:new Map()},{ships:new Set(),shots:new Map()}];
const player=ref(0), phase=ref('place'), shipIndex=ref(0), horizontal=ref(true), waiting=ref(false), message=ref('');
const heading=computed(()=>phase.value==='over'?message.value:`CAPTAIN ${player.value+1}'S ${phase.value==='place'?'DEPLOYMENT':'TURN'}`);
const coordinate=i=>`${String.fromCharCode(65+Math.floor(i/10))}${i%10+1}`;
function cellsFor(i,size){const r=Math.floor(i/10),c=i%10; if(horizontal.value&&c+size>10||!horizontal.value&&r+size>10)return []; return Array.from({length:size},(_,n)=>i+(horizontal.value?n:n*10));}
function select(i){
  if(waiting.value||phase.value==='over')return;
  const me=players[player.value];
  if(phase.value==='place'){
    const cells=cellsFor(i,ships[shipIndex.value]);
    if(!cells.length||cells.some(c=>me.ships.has(c))){message.value='INVALID PLACEMENT';return;}
    cells.forEach(c=>me.ships.add(c)); shipIndex.value++; message.value='SHIP LOCKED';
    if(shipIndex.value===ships.length){waiting.value=true;if(player.value===1)phase.value='fire';}
    return;
  }
  const enemy=players[1-player.value];
  if(me.shots.has(i)){message.value='COORDINATE ALREADY BOMBED';return;}
  const hit=enemy.ships.has(i); me.shots.set(i,hit?'hit':'miss'); message.value=`${coordinate(i)} // ${hit?'HIT!':'MISS'}`;
  if([...enemy.ships].every(c=>[...me.shots].some(([s,v])=>s===c&&v==='hit'))){phase.value='over';message.value=`CAPTAIN ${player.value+1} WINS`;return;}
  waiting.value=true;
}
function continueTurn(){waiting.value=false; message.value=''; if(phase.value==='place'){player.value=1;shipIndex.value=0;}else player.value=1-player.value;}
function mark(i){if(phase.value==='place')return players[player.value].ships.has(i)?'■':''; return players[player.value].shots.get(i)==='hit'?'✕':players[player.value].shots.get(i)==='miss'?'·':'';}
function cellClass(i){const v=phase.value==='place'?(players[player.value].ships.has(i)?'ship':''):players[player.value].shots.get(i); return v||'';}
</script>

<style scoped>
.overlay{position:fixed;inset:0;z-index:40;display:grid;place-items:center;background:#02050cd9;backdrop-filter:blur(10px)}.box{width:min(570px,94vw);max-height:94vh;overflow:auto;padding:26px}.label{color:var(--accent);font-size:10px;letter-spacing:.15em}h2{margin:7px 0}.turn{padding:10px;margin:14px 0;background:#0a1020;border-left:3px solid var(--gold);color:var(--gold)}p{color:var(--text-dim);font-size:13px}.toolbar{margin-bottom:8px}.board{display:grid;grid-template-columns:repeat(10,1fr);gap:3px;aspect-ratio:1;margin:14px 0}.cell{border:1px solid #2b4263;background:#0b1727;color:white;border-radius:3px;cursor:crosshair}.cell:hover{background:#173b54}.cell.ship{background:#786cff}.cell.hit{background:#ff4d6d}.cell.miss{background:#173047;color:#8bc9e8}.board.locked{filter:blur(8px);pointer-events:none}.result{min-height:28px;color:var(--gold)}
</style>
