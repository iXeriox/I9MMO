// Quest engine — self-contained module, mirrors the style of data.js.
// Character quest state lives at character.quests = { active: { [id]: { progress, startedAt } }, completed: { [id]: count } }.
// `completed` maps id -> times turned in, so repeatable quests can be told apart from one-shots.

export const QUESTS = [
  {
    id: 'first_signal',
    title: 'First Signal',
    giver: 'Archivist Kade',
    description: 'Defeat 3 creatures in the Solo Rift to prove your signal is stable.',
    type: 'kill',
    filter: null,
    target: 3,
    minLevel: 1,
    requires: [],
    rewardXp: 60,
    rewardShards: 30,
    repeatable: false,
  },
  {
    id: 'steady_hand',
    title: 'Steady Hand',
    giver: 'Archivist Kade',
    description: 'Clear a bout in the Combat Simulator without losing your footing.',
    type: 'training_win',
    filter: null,
    target: 1,
    minLevel: 1,
    requires: [],
    rewardXp: 40,
    rewardShards: 15,
    repeatable: false,
  },
  {
    id: 'forge_adept',
    title: 'Forge Adept',
    giver: 'Archivist Kade',
    description: 'Purchase 3 permanent upgrades at the Forge.',
    type: 'forge',
    filter: null,
    target: 3,
    minLevel: 1,
    requires: [],
    rewardXp: 70,
    rewardShards: 40,
    repeatable: false,
  },
  {
    id: 'hound_hunter',
    title: 'Hound Hunter',
    giver: 'Archivist Kade',
    description: 'Thin the Glitch Hound packs bleeding through the fracture — defeat 5.',
    type: 'kill',
    filter: 'Glitch Hound',
    target: 5,
    minLevel: 2,
    requires: ['first_signal'],
    rewardXp: 110,
    rewardShards: 55,
    repeatable: false,
  },
  {
    id: 'rising_wayfinder',
    title: 'Rising Wayfinder',
    giver: 'Archivist Kade',
    description: 'Reach level 5. Growth is its own signal.',
    type: 'level',
    filter: null,
    target: 5,
    minLevel: 1,
    requires: [],
    rewardXp: 0,
    rewardShards: 90,
    repeatable: false,
  },
  {
    id: 'warden_challenger',
    title: 'Warden Challenger',
    giver: 'Archivist Kade',
    description: 'Join a Wayfinder crew and bring down the Nine-Eyed Warden.',
    type: 'boss',
    filter: null,
    target: 1,
    minLevel: 3,
    requires: [],
    rewardXp: 220,
    rewardShards: 120,
    repeatable: false,
  },
  {
    id: 'null_serpent_cull',
    title: 'Null Serpent Cull',
    giver: 'Archivist Kade',
    description: 'Null Serpents are learning the rift too fast. Defeat 4.',
    type: 'kill',
    filter: 'Null Serpent',
    target: 4,
    minLevel: 4,
    requires: ['hound_hunter'],
    rewardXp: 150,
    rewardShards: 75,
    repeatable: false,
  },
  {
    id: 'rift_sweep',
    title: 'Rift Sweep',
    giver: 'Archivist Kade',
    description: 'Standing bounty: defeat 8 creatures in the Solo Rift. Resets on turn-in.',
    type: 'kill',
    filter: null,
    target: 8,
    minLevel: 1,
    requires: ['first_signal'],
    rewardXp: 100,
    rewardShards: 60,
    repeatable: true,
  },
];

const BY_ID = Object.fromEntries(QUESTS.map((q) => [q.id, q]));

export function initQuestState() {
  return { active: {}, completed: {} };
}

// Adds a fresh quests block to older saved characters that predate this system.
export function ensureQuestState(character) {
  if (!character.quests || typeof character.quests !== 'object') {
    character.quests = initQuestState();
  }
  if (!character.quests.active) character.quests.active = {};
  if (!character.quests.completed) character.quests.completed = {};
}

function isCompleted(character, id) {
  return !!character.quests.completed[id];
}

export function isAvailable(character, quest) {
  if (character.quests.active[quest.id]) return false;
  if (isCompleted(character, quest.id) && !quest.repeatable) return false;
  if ((character.level || 1) < quest.minLevel) return false;
  return quest.requires.every((reqId) => isCompleted(character, reqId));
}

export function getQuestLog(character) {
  ensureQuestState(character);
  const available = QUESTS.filter((q) => isAvailable(character, q)).map((q) => ({ ...q }));
  const active = Object.entries(character.quests.active).map(([id, state]) => ({
    ...BY_ID[id],
    progress: state.progress,
    readyToTurnIn: state.progress >= BY_ID[id].target,
  }));
  const completed = Object.entries(character.quests.completed).map(([id, count]) => ({
    id,
    title: BY_ID[id]?.title || id,
    count,
  }));
  return { available, active, completed };
}

export function acceptQuest(character, questId) {
  ensureQuestState(character);
  const quest = BY_ID[questId];
  if (!quest) return { ok: false, message: 'Unknown quest.' };
  if (!isAvailable(character, quest)) return { ok: false, message: 'That quest is not available to you right now.' };
  character.quests.active[questId] = { progress: 0, startedAt: Date.now() };
  return { ok: true };
}

export function abandonQuest(character, questId) {
  ensureQuestState(character);
  if (!character.quests.active[questId]) return { ok: false, message: 'Quest is not active.' };
  delete character.quests.active[questId];
  return { ok: true };
}

// Called on gameplay events. eventType: 'kill' | 'training_win' | 'forge' | 'boss' | 'level'.
// Returns the list of quest ids whose objective just became ready to turn in.
export function progressQuests(character, eventType, payload = {}) {
  ensureQuestState(character);
  const justReady = [];
  for (const [id, state] of Object.entries(character.quests.active)) {
    const quest = BY_ID[id];
    if (!quest || quest.type !== eventType) continue;
    if (quest.filter && payload.monster !== quest.filter) continue;
    const wasReady = state.progress >= quest.target;
    if (eventType === 'level') {
      state.progress = Math.max(state.progress, Math.min(character.level, quest.target));
    } else {
      state.progress = Math.min(quest.target, state.progress + 1);
    }
    if (!wasReady && state.progress >= quest.target) justReady.push(id);
  }
  return justReady;
}

// Grants rewards, moves the quest to `completed`, clears it from `active`.
// Returns { ok, rewardXp, rewardShards } — caller is responsible for calling grantXp.
export function turnInQuest(character, questId) {
  ensureQuestState(character);
  const quest = BY_ID[questId];
  const state = character.quests.active[questId];
  if (!quest || !state) return { ok: false, message: 'Quest is not active.' };
  if (state.progress < quest.target) return { ok: false, message: 'Objective is not complete yet.' };
  delete character.quests.active[questId];
  character.quests.completed[questId] = (character.quests.completed[questId] || 0) + 1;
  return { ok: true, rewardXp: quest.rewardXp, rewardShards: quest.rewardShards, title: quest.title };
}
