/**
 * Engine adapter — Project Echo
 *
 * Implements the BattleUIAdapter contract from engine-contract.ts, backed by
 * the real combat engine (combat.js) rather than the placeholder simulator in
 * state.js.
 *
 * What this changes versus the prototype's mock:
 *   - Damage runs through the real formula: scaling stat x multiplier x
 *     defence mitigation x type advantage x crit, instead of power * 420.
 *   - Three defences are live: Armor blocks physical, Ward blocks magical,
 *     Resolve resists debuffs.
 *   - The five-type cycle applies advantage and disadvantage.
 *   - Momentum accrues per unit of TIME rather than per turn, so fast units
 *     take many weak turns and slow units take few heavy ones.
 *   - Cooldowns are authored in turns and tick on the action-value clock.
 *   - Frenzy escalates on a stalling match.
 *
 * The UI does not need to change. Swap the import in battle-ui.js from
 * './state.js' to './engine-adapter.js'.
 */

import { Battle, TUNING, cooldownTurns, cooldownAv } from "./combat.js";
import { buildUnit, UNITS } from "./units.js";
import { assets } from "./data.js";

const ALLY_TEAM = ["vesper", "aurex", "thaleia", "sesha"];
const ENEMY_TEAM = ["nyra", "pyre", "draven", "cairn"];

/* The UI expects four skill slots; the engine has three. Fork Alt is the
   alternate branch of the second skill, which is how the fork system is
   meant to read: one choice, two versions, never both. */
const KINDS = ["basic", "skill", "forkAlt", "ultimate"];

function skillForKind(unitDef, kind) {
  const s = unitDef.skills;
  if (kind === "basic") return s[0];
  if (kind === "ultimate") return s[2];
  return s[1]; // both "skill" and "forkAlt" map to the second skill
}

function iconFor(id, kind) {
  const set = assets[id] && assets[id].icons;
  if (!set) return "";
  return set[KINDS.indexOf(kind)] || set[0];
}

function targetTypeOf(skill) {
  if (skill.targets === "all") return "allEnemies";
  if (skill.targets === "allAllies" || skill.targets === "lowestAlly") return "allies";
  return "singleEnemy";
}

export function createEngineAdapter(mode = "pvp") {
  let battle = null;
  let listeners = [];
  let paused = false;
  let selectedTargetId = null;
  let selectedSkillKind = null;
  let forkChoice = {}; // unitId -> "skill" | "forkAlt"

  function start() {
    battle = new Battle(
      ALLY_TEAM.map(id => buildUnit(id)),
      ENEMY_TEAM.map(id => buildUnit(id)),
      Math.floor(Math.random() * 100000) + 1
    );
    selectedTargetId = firstEnemyId();
    selectedSkillKind = null;
    emit();
  }

  function firstEnemyId() {
    const actor = battle.current;
    if (!actor) return null;
    const foes = battle.units.filter(u => u.team !== actor.team && u.alive);
    return foes.length ? foes[0].id : null;
  }

  function toUIUnit(u) {
    const def = u.def;
    const skills = {};
    for (const kind of KINDS) {
      const s = skillForKind(def, kind);
      skills[kind] = {
        id: kind === "forkAlt" ? s.id + "-alt" : s.id,
        name: kind === "forkAlt" && s.fork ? s.fork[0] : s.name,
        kind,
        icon: iconFor(def.id, kind),
        targetType: targetTypeOf(s),
        cooldownAV: cooldownAv(s),
        currentCooldownAV: u.cooldowns[s.id] || 0,
        cooldownTurns: cooldownTurns(u, s),
        momentumCost: s.momentumCost || 0,
        ready: u.skillReady(s),
        isFork: !!s.fork,
      };
    }
    const art = assets[def.id] || {};
    return {
      id: u.id,
      name: u.name,
      team: u.team === 0 ? "ally" : "enemy",
      origin: def.origin,
      role: def.role,
      affinity: def.type.charAt(0).toUpperCase() + def.type.slice(1),
      level: def.rank || 6,
      hp: Math.max(0, Math.round(u.hp)),
      maxHp: Math.round(u.maxHp),
      speed: Math.round(u.stat("spd")),
      momentum: Math.round(u.momentum),
      resolve: Math.round(u.stat("resolve")),
      armor: Math.round(u.stat("armor")),
      ward: Math.round(u.stat("ward")),
      nextAt: Math.round(u.av),
      portrait: art.portrait || "",
      battleModel: art.model || "",
      statuses: u.statuses.map((s, i) => ({
        id: `${s.name}-${i}`,
        name: s.name,
        kind: s.mods && Object.values(s.mods).some(v => v > 1) ? "buff" : "debuff",
        stacks: s.stacks,
        remainingAV: s.turns,
      })),
      skills,
    };
  }

  function getState() {
    if (!battle) start();
    const units = battle.units.map(toUIUnit);
    return {
      mode,
      round: Math.max(1, Math.ceil(battle.elapsedAv / (TUNING.AV_PER_TURN * 8))),
      clock: Math.round(battle.elapsedAv),
      frenzy: battle.frenzy,
      units,
      queue: battle.queue(8).map(q => ({
        unitId: q.unit.id,
        scheduledAt: q.unit.nextIn(),
      })),
      activeUnitId: battle.current ? battle.current.id : null,
      selectedTargetId,
      selectedSkillKind,
      battleStatus: battle.over ? "ended" : paused ? "paused" : "playing",
      winner: battle.over
        ? (battle.winner === 0 ? "ally" : battle.winner === 1 ? "enemy" : undefined)
        : undefined,
      log: battle.log.slice(-12),
    };
  }

  function emit() {
    const s = getState();
    listeners.forEach(fn => fn(s));
  }

  /** Enemy AI: strongest available skill on the weakest target. */
  function enemyTurn() {
    if (!battle || battle.over || paused) return;
    const actor = battle.current;
    if (!actor || actor.team !== 1) return;
    const ready = actor.def.skills.filter(s => actor.skillReady(s));
    const skill = ready.length
      ? ready.reduce((a, c) => (c.multiplier > a.multiplier ? c : a))
      : actor.def.skills[0];
    const targets = battle.validTargets(actor, skill);
    const target = targets.reduce((a, c) => (c.hpPct < a.hpPct ? c : a), targets[0]);
    battle.act(skill.id, target && target.id);
    selectedTargetId = firstEnemyId();
    emit();
    if (!battle.over && battle.current && battle.current.team === 1) {
      setTimeout(enemyTurn, 420);
    }
  }

  return {
    getState,

    subscribe(fn) {
      listeners.push(fn);
      fn(getState());
      return () => { listeners = listeners.filter(l => l !== fn); };
    },

    selectTarget(unitId) {
      const u = battle.units.find(x => x.id === unitId);
      if (!u || !u.alive) return;
      selectedTargetId = unitId;
      emit();
    },

    selectSkill(kind) {
      selectedSkillKind = kind;
      emit();
    },

    castSkill(kind) {
      if (!battle || battle.over || paused) return;
      const actor = battle.current;
      if (!actor || actor.team !== 0) return;

      const skill = skillForKind(actor.def, kind);
      if (!actor.skillReady(skill)) return;

      // remember which branch of the fork the player committed to
      if (kind === "skill" || kind === "forkAlt") forkChoice[actor.def.id] = kind;

      const ok = battle.act(skill.id, selectedTargetId);
      if (!ok) return;

      selectedSkillKind = null;
      selectedTargetId = firstEnemyId();
      emit();
      if (!battle.over) setTimeout(enemyTurn, 380);
    },

    togglePause() { paused = !paused; emit(); },

    reset() { paused = false; forkChoice = {}; start(); },

    setMode(next) { mode = next; },
  };
}
