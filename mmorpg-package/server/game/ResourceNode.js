const { v4: uuid } = require('uuid');

const NODE_TYPES = {
  tree: { itemId: 'wood_log', skill: 'woodcutting', gatherMs: 2000, minQty: 1, maxQty: 3, respawnMs: 20000, color: '#2f7a3d', size: 20 },
  ore_vein: { itemId: 'iron_ore', skill: 'mining', gatherMs: 2800, minQty: 1, maxQty: 2, respawnMs: 30000, color: '#7d7d8a', size: 18 },
  herb_patch: { itemId: 'herb_sprig', skill: 'herbalism', gatherMs: 1500, minQty: 1, maxQty: 4, respawnMs: 15000, color: '#8fce4f', size: 14 }
};

class ResourceNode {
  constructor(nodeType, x, y, zone = 'world') {
    const def = NODE_TYPES[nodeType];
    if (!def) throw new Error(`Unknown node type: ${nodeType}`);
    this.id = uuid();
    this.nodeType = nodeType;
    this.def = def;
    this.x = x;
    this.y = y;
    this.zone = zone;
    this.depleted = false;
    this.respawnAt = null;
    this.gatheringBy = null; // playerId currently gathering
    this.gatherStartedAt = null;
  }

  startGather(playerId) {
    if (this.depleted || this.gatheringBy) return false;
    this.gatheringBy = playerId;
    this.gatherStartedAt = Date.now();
    return true;
  }

  cancelGather(playerId) {
    if (this.gatheringBy === playerId) {
      this.gatheringBy = null;
      this.gatherStartedAt = null;
    }
  }

  checkComplete() {
    if (!this.gatheringBy) return false;
    return Date.now() - this.gatherStartedAt >= this.def.gatherMs;
  }

  harvest() {
    const qty = Math.floor(Math.random() * (this.def.maxQty - this.def.minQty + 1)) + this.def.minQty;
    this.depleted = true;
    this.respawnAt = Date.now() + this.def.respawnMs;
    const gatherer = this.gatheringBy;
    this.gatheringBy = null;
    this.gatherStartedAt = null;
    return { itemId: this.def.itemId, qty, skill: this.def.skill, gatherer };
  }

  update() {
    if (this.depleted && Date.now() >= this.respawnAt) {
      this.depleted = false;
      this.respawnAt = null;
    }
  }

  serialize() {
    return {
      id: this.id,
      nodeType: this.nodeType,
      x: this.x,
      y: this.y,
      depleted: this.depleted,
      color: this.def.color,
      size: this.def.size,
      beingGathered: !!this.gatheringBy
    };
  }
}

module.exports = { ResourceNode, NODE_TYPES };
