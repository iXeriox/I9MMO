function rollLoot(lootTable) {
  const drops = [];
  for (const entry of lootTable) {
    if (Math.random() <= entry.chance) {
      const qty = Math.floor(Math.random() * (entry.max - entry.min + 1)) + entry.min;
      drops.push({ itemId: entry.itemId, qty });
    }
  }
  return drops;
}

class LootDrop {
  constructor(id, x, y, items, ownerPartyIds = null) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.items = items; // [{itemId, qty}]
    this.ownerPartyIds = ownerPartyIds; // restrict pickup for a short window (kill credit)
    this.createdAt = Date.now();
    this.expiresAt = Date.now() + 90_000;
  }

  canLoot(playerId, partyMemberIds) {
    if (!this.ownerPartyIds) return true;
    if (Date.now() > this.createdAt + 15_000) return true; // opens to everyone after 15s
    return this.ownerPartyIds.includes(playerId) ||
      this.ownerPartyIds.some(id => partyMemberIds.includes(id));
  }

  serialize() {
    return { id: this.id, x: this.x, y: this.y, items: this.items };
  }
}

module.exports = { rollLoot, LootDrop };
