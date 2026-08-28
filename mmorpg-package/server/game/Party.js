const { v4: uuid } = require('uuid');

class Party {
  constructor(leaderId) {
    this.id = uuid();
    this.leaderId = leaderId;
    this.memberIds = [leaderId];
    this.invitedIds = new Set();
    this.maxSize = 5;
  }

  invite(playerId) {
    if (this.memberIds.includes(playerId)) return false;
    if (this.memberIds.length >= this.maxSize) return false;
    this.invitedIds.add(playerId);
    return true;
  }

  accept(playerId) {
    if (!this.invitedIds.has(playerId)) return false;
    if (this.memberIds.length >= this.maxSize) return false;
    this.invitedIds.delete(playerId);
    this.memberIds.push(playerId);
    return true;
  }

  leave(playerId) {
    this.memberIds = this.memberIds.filter(id => id !== playerId);
    if (this.leaderId === playerId && this.memberIds.length > 0) {
      this.leaderId = this.memberIds[0];
    }
  }

  isEmpty() {
    return this.memberIds.length === 0;
  }

  serialize(players) {
    return {
      id: this.id,
      leaderId: this.leaderId,
      members: this.memberIds
        .map(id => players.get(id))
        .filter(Boolean)
        .map(p => ({ id: p.id, name: p.name, level: p.level, hp: p.hp, maxHp: p.maxHp, className: p.className, zone: p.zone })),
      invited: Array.from(this.invitedIds)
    };
  }
}

class PartyManager {
  constructor() {
    this.parties = new Map(); // partyId -> Party
  }

  createParty(leaderId) {
    const party = new Party(leaderId);
    this.parties.set(party.id, party);
    return party;
  }

  getPartyOf(playerId, players) {
    const p = players.get(playerId);
    if (!p || !p.partyId) return null;
    return this.parties.get(p.partyId) || null;
  }

  disband(partyId) {
    this.parties.delete(partyId);
  }

  removePlayerEverywhere(playerId) {
    for (const [id, party] of this.parties.entries()) {
      party.leave(playerId);
      party.invitedIds.delete(playerId);
      if (party.isEmpty()) this.parties.delete(id);
    }
  }
}

module.exports = { Party, PartyManager };
