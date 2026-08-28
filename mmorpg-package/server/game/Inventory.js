const ITEMS = require('./data/items.json');

class Inventory {
  constructor(capacity = 30) {
    this.capacity = capacity;
    this.slots = []; // { itemId, qty }
  }

  addItem(itemId, qty = 1) {
    const def = ITEMS[itemId];
    if (!def) return false;
    const stackMax = def.stack || 1;

    if (stackMax > 1) {
      const existing = this.slots.find(s => s.itemId === itemId && s.qty < stackMax);
      if (existing) {
        const space = stackMax - existing.qty;
        const toAdd = Math.min(space, qty);
        existing.qty += toAdd;
        qty -= toAdd;
      }
    }
    while (qty > 0) {
      if (this.slots.length >= this.capacity) return false; // inventory full
      const toAdd = Math.min(stackMax, qty);
      this.slots.push({ itemId, qty: toAdd });
      qty -= toAdd;
    }
    return true;
  }

  removeItem(itemId, qty = 1) {
    let remaining = qty;
    for (let i = this.slots.length - 1; i >= 0 && remaining > 0; i--) {
      const s = this.slots[i];
      if (s.itemId !== itemId) continue;
      const take = Math.min(s.qty, remaining);
      s.qty -= take;
      remaining -= take;
      if (s.qty <= 0) this.slots.splice(i, 1);
    }
    return remaining === 0;
  }

  count(itemId) {
    return this.slots.filter(s => s.itemId === itemId).reduce((a, s) => a + s.qty, 0);
  }

  serialize() {
    return this.slots.map(s => ({ ...s, def: ITEMS[s.itemId] }));
  }
}

module.exports = Inventory;
