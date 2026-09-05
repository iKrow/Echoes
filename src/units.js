/**
 * Unit data and progression.
 *
 * Everything here is data a designer edits. No combat logic lives in this file.
 */

// Points buy this much of each stat. These conversion rates decide whether the
// node paths are competitive with each other — the main balance dial.
export const PER_POINT = {
  hp: 14, atk: 1.4, armor: 1.1, ward: 1.1,
  resolve: 0.30, spd: 0.075, critRate: 0.00035,
};

export const BASE_STATS = {
  hp: 10000, atk: 1000, armor: 600, ward: 600, resolve: 100,
  spd: 100, critRate: 0.15, critDmg: 1.75, effectAcc: 0,
};

/** Star rank caps how many of the 1000 earned points can be spent. */
export const RANK_CAP = { 3: 400, 4: 600, 5: 800, 6: 1000 };

export function applyAllocation(base, alloc) {
  const s = { ...base };
  for (const [stat, pts] of Object.entries(alloc)) {
    if (PER_POINT[stat]) s[stat] += pts * PER_POINT[stat];
  }
  return s;
}

export function allocationTotal(alloc) {
  return Object.values(alloc).reduce((a, b) => a + b, 0);
}

// --- statuses ---------------------------------------------------------------

export const STATUS = {
  burn:   { name: "Burn",   turns: 3, dotMaxHp: 0.03, maxStacks: 5 },
  sunder: { name: "Sunder", turns: 2, mods: { armor: 0.85 }, maxStacks: 3 },
  slow:   { name: "Slow",   turns: 2, mods: { spd: 0.80 }, maxStacks: 2 },
  bind:   { name: "Bind",   turns: 1, mods: { spd: 0.90 }, maxStacks: 1 },
  guard:  { name: "Guard",  turns: 2, mods: { armor: 1.30, ward: 1.30 } },
};

// --- units ------------------------------------------------------------------
// Each has three skills: basic (no cooldown), skill, ultimate (momentum cost).
// `fork` marks which skill has the +3 branching choice.

export const UNITS = {
  vesper: {
    id: "vesper", name: "Vesper", type: "arc", role: "Arcanist",
    rarity: "SSR", origin: "Construct",
    alloc: { spd: 420, resolve: 220, ward: 160 },
    skills: [
      { id: "tick", name: "Tick", multiplier: 0.9, scaling: "spd",
        damageType: "magical", cooldown: 0,
        applies: STATUS.bind, applyChance: 0.6 },
      { id: "yield", name: "Yield", multiplier: 1.8, scaling: "spd",
        damageType: "magical", cooldown: 3,
        applies: STATUS.slow, fork: ["Ally acts sooner", "Cooldowns tick twice"] },
      { id: "hour", name: "The Withheld Hour", multiplier: 2.4, scaling: "spd",
        damageType: "magical", cooldown: 7, targets: "all",
        momentumCost: 60, applies: STATUS.slow },
    ],
  },

  aurex: {
    id: "aurex", name: "Aurex", type: "radiant", role: "Vanguard",
    rarity: "Epic", origin: "Beastkin",
    alloc: { atk: 340, hp: 280, armor: 240, critRate: 140 },
    skills: [
      { id: "strike", name: "Radiant Strike", multiplier: 1.1, cooldown: 0 },
      { id: "shield", name: "Sunward Shield", multiplier: 1.4, cooldown: 3,
        buff: STATUS.guard, targets: "single",
        fork: ["Earthward Impact", "Sunward Shield"] },
      { id: "advance", name: "Lion's Advance", multiplier: 2.6, cooldown: 7,
        targets: "all", momentumCost: 60 },
    ],
  },

  thaleia: {
    id: "thaleia", name: "Thaleia", type: "root", role: "Warden",
    rarity: "Rare", origin: "Human",
    alloc: { armor: 400, hp: 320, ward: 180, resolve: 100 },
    skills: [
      { id: "thrust", name: "Root Thrust", multiplier: 1.5, scaling: "armor",
        cooldown: 0, applies: STATUS.sunder, applyChance: 0.5 },
      { id: "bastion", name: "Earthward Bastion", multiplier: 0, cooldown: 3,
        targets: "allAllies", buff: STATUS.guard,
        fork: ["Overgrown Advance", "Earthward Bastion"] },
      { id: "bulwark", name: "Verdant Bulwark", multiplier: 2.2, scaling: "armor",
        cooldown: 7, targets: "all", momentumCost: 60 },
    ],
  },

  nyra: {
    id: "nyra", name: "Nyra", type: "gale", role: "Slayer",
    rarity: "Epic", origin: "Beastkin",
    alloc: { spd: 380, atk: 360, critRate: 260 },
    skills: [
      { id: "slice", name: "Wind-Slice", multiplier: 1.2, cooldown: 0 },
      { id: "gust", name: "Shear Gust", multiplier: 2.3, cooldown: 3,
        fork: ["Raptor Dive", "Shear Gust"] },
      { id: "storm", name: "Eye of the Storm", multiplier: 3.0, cooldown: 7,
        targets: "all", momentumCost: 60 },
    ],
  },

  cairn: {
    id: "cairn", name: "Cairn", type: "umbral", role: "Warden",
    rarity: "Rare", origin: "Construct",
    alloc: { hp: 380, armor: 360, ward: 160, resolve: 100 },
    skills: [
      { id: "tusk", name: "Tusk Slam", multiplier: 1.4, scaling: "armor",
        cooldown: 0 },
      { id: "warding", name: "Warding Stance", multiplier: 0, cooldown: 3,
        targets: "allAllies", buff: STATUS.guard },
      { id: "unyielding", name: "Unyielding", multiplier: 2.0, scaling: "armor",
        cooldown: 7, targets: "all", momentumCost: 60 },
    ],
  },

  sesha: {
    id: "sesha", name: "Sesha", type: "tide", role: "Mystic",
    rarity: "SSR", origin: "Beastkin",
    alloc: { atk: 300, resolve: 300, hp: 240, spd: 160 },
    skills: [
      { id: "bolt", name: "Tidal Bolt", multiplier: 1.0, damageType: "magical",
        cooldown: 0 },
      { id: "veil", name: "Veil of Depths", multiplier: 0, cooldown: 3,
        targets: "lowestAlly", heal: 1.8,
        fork: ["Memory Tide", "Veil of Depths"] },
      { id: "sunken", name: "Sunken Revelation", multiplier: 2.1,
        damageType: "magical", cooldown: 7, targets: "all",
        momentumCost: 60, applies: STATUS.slow },
    ],
  },

  pyre: {
    id: "pyre", name: "Pyre", type: "pyre", role: "Vanguard",
    rarity: "SSR", origin: "Mythic",
    alloc: { atk: 380, hp: 300, armor: 200, critRate: 120 },
    skills: [
      { id: "maul", name: "Ashen Maul", multiplier: 1.3, cooldown: 0,
        applies: STATUS.burn, applyChance: 0.7 },
      { id: "consume", name: "Consume", multiplier: 2.2, cooldown: 3,
        applies: STATUS.burn, fork: ["Detonate burns", "Burn scales on Armor"] },
      { id: "rebirth", name: "Rebirth", multiplier: 2.8, cooldown: 7,
        targets: "all", momentumCost: 60, applies: STATUS.burn },
    ],
  },

  kaelith: {
    id: "kaelith", name: "Kaelith", type: "pyre", role: "Slayer",
    rarity: "Epic", origin: "Beastkin",
    alloc: { atk: 380, critRate: 280, spd: 240, hp: 100 },
    skills: [
      { id: "pierce", name: "Bloodpierce", multiplier: 1.3, cooldown: 0 },
      { id: "ascend", name: "Ascend", multiplier: 2.4, cooldown: 3,
        applies: STATUS.sunder,
        fork: ["Crimson Reach", "Ascend"] },
      { id: "dominate", name: "Dominate", multiplier: 3.0, cooldown: 7,
        targets: "all", momentumCost: 60 },
    ],
  },

  draven: {
    id: "draven", name: "Draven", type: "umbral", role: "Slayer",
    rarity: "Epic", origin: "Human",
    alloc: { atk: 400, critRate: 300, spd: 300 },
    skills: [
      { id: "hollow", name: "Hollow Cut", multiplier: 1.25, cooldown: 0 },
      { id: "lunge", name: "Shadow Lunge", multiplier: 2.5, cooldown: 3,
        fork: ["Crowned Mark", "Shadow Lunge"] },
      { id: "reign", name: "Reign of Null", multiplier: 3.1, cooldown: 7,
        targets: "all", momentumCost: 60 },
    ],
  },
};

/** Build a combat-ready definition from a unit plus its rank and allocation. */
export function buildUnit(unitId, { rank = 6, alloc = null } = {}) {
  const u = UNITS[unitId];
  const cap = RANK_CAP[rank];
  const use = alloc ?? u.alloc;
  const total = allocationTotal(use);

  // Scale down proportionally if the allocation exceeds the rank cap.
  const scaled = {};
  const factor = total > cap ? cap / total : 1;
  for (const [k, v] of Object.entries(use)) scaled[k] = Math.round(v * factor);

  return {
    ...u,
    rank,
    allocation: scaled,
    pointsUsed: allocationTotal(scaled),
    pointsCap: cap,
    stats: applyAllocation(BASE_STATS, scaled),
    skills: u.skills.map(s => ({ targets: "single", ...s })),
  };
}
