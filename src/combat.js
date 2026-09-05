/**
 * Combat core — Project Echo
 *
 * Pure logic, no rendering, no DOM. This is the piece that ports to Godot or
 * Unity later, so nothing in here may reference the browser.
 *
 * Design rules implemented:
 *   - Action-value turn order: next turn arrives at BASE_AV / SPD
 *   - Momentum accrues per unit of TIME, not per turn, so fast units take many
 *     weak turns and slow units take few heavy ones (the speed tax)
 *   - Cooldowns tick on the action-value clock, so speed doesn't also buy
 *     faster cooldowns
 *   - Three defences: Armor (physical), Ward (magical), Resolve (debuffs)
 *   - Five-type cycle, each beating exactly one other
 */

export const TUNING = {
  BASE_AV: 10000,
  /* One turn at reference speed costs BASE_AV / REFERENCE_SPD action value.
     Skill cooldowns are authored in TURNS and converted with this, so a
     "3 turn" cooldown means the same thing regardless of the unit's speed. */
  AV_PER_TURN: 100,
  DEF_K: 750,          // defence softening; sweep this when balancing
  ADVANTAGE_DMG: 0.15,
  ADVANTAGE_ACC: 0.15,
  MOMENTUM_CAP: 100,
  MOMENTUM_BASE: 55,
  REFERENCE_SPD: 100,
  OPENING_ULT_LOCK: 0,   // no opening lock — momentum cost already gates ultimates

  /* Frenzy — the anti-stall rule, borrowed from Epic Seven's Battle Frenzy.
     Rather than ending a long match on a timer, escalating stages make every
     unit hit harder and heal worse until someone dies. Triggered on elapsed
     action value so it scales with the speed system rather than turn count. */
  FRENZY_START_AV: 2200,   // normal matches finish around 1550 AV, so this
  FRENZY_STAGE_AV: 500,    // only bites when a match is genuinely stalling
  FRENZY_DMG_PER_STAGE: 0.30,
  FRENZY_HEAL_PER_STAGE: -0.25,
  FRENZY_MAXHP_PER_STAGE: -0.15,
  FRENZY_MAX_STAGE: 3,
};

const CYCLE = ["tide", "pyre", "root", "gale", "arc"];
const MUTUAL = { radiant: "umbral", umbral: "radiant" };

export function beats(a, b) {
  if (MUTUAL[a]) return MUTUAL[a] === b;
  const i = CYCLE.indexOf(a);
  if (i === -1 || CYCLE.indexOf(b) === -1) return false;
  return CYCLE[(i + 1) % CYCLE.length] === b;
}

export function advantage(attacker, defender) {
  if (beats(attacker, defender)) return 1;
  if (beats(defender, attacker)) return -1;
  return 0;
}

// --- RNG --------------------------------------------------------------------
// Seeded so battles are reproducible. Server-authoritative combat later needs
// determinism, so no Math.random anywhere in this file.

export function makeRng(seed = 1) {
  let s = seed >>> 0 || 1;
  return function next() {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;  s >>>= 0;
    return s / 4294967296;
  };
}

/** A skill's cooldown in action-value units, from its authored turn count. */
export function cooldownAv(skill) {
  return (skill.cooldown || 0) * TUNING.AV_PER_TURN;
}

/** Turns remaining on a skill for this unit, for display. */
export function cooldownTurns(unit, skill) {
  const remaining = unit.cooldowns[skill.id] || 0;
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / (TUNING.BASE_AV / Math.max(unit.stat("spd"), 1)));
}

// --- unit -------------------------------------------------------------------

export class Unit {
  constructor(def, team, index) {
    this.id = `${team}-${index}`;
    this.name = def.name;
    this.type = def.type;
    this.role = def.role;
    this.team = team;
    this.def = def;

    this.stats = { ...def.stats };
    this.hp = this.stats.hp;
    this.maxHp = this.stats.hp;
    this.momentum = 0;
    this.statuses = [];
    this.cooldowns = {};

    for (const skill of def.skills) {
      this.cooldowns[skill.id] =
        cooldownAv(skill) * TUNING.OPENING_ULT_LOCK;
    }

    this.av = TUNING.BASE_AV / Math.max(this.stats.spd, 1);
  }

  get alive() { return this.hp > 0; }
  get hpPct() { return Math.max(0, this.hp / this.maxHp); }

  /** Stat after status modifiers. */
  stat(name) {
    let v = this.stats[name] ?? 0;
    for (const st of this.statuses) {
      const m = st.mods?.[name];
      if (m != null) v *= Math.pow(m, st.stacks);
    }
    return v;
  }

  /**
   * The speed tax. A unit at double reference speed banks roughly 70% as much
   * momentum per turn, so extra turns don't translate directly into extra
   * output.
   */
  momentumGain() {
    const ratio = TUNING.REFERENCE_SPD / Math.max(this.stat("spd"), 1);
    return TUNING.MOMENTUM_BASE * Math.sqrt(ratio);
  }

  tickClock(delta) {
    this.av -= delta;
    for (const id in this.cooldowns) {
      this.cooldowns[id] = Math.max(0, this.cooldowns[id] - delta);
    }
  }

  resetAv() {
    this.av = TUNING.BASE_AV / Math.max(this.stat("spd"), 1);
  }

  /** Action value until this unit's next turn — shown in the UI. */
  nextIn() { return Math.round(this.av); }

  skillReady(skill) {
    return (this.cooldowns[skill.id] ?? 0) <= 0 &&
           this.momentum >= (skill.momentumCost ?? 0);
  }

  addStatus(status, attackerAcc, rng, log) {
    const resist = this.stat("resolve") / 1000;
    const chance = Math.max(0.05, Math.min(0.95, 1 + attackerAcc - resist));
    if (rng() >= chance) {
      log(`${this.name} resists ${status.name}`);
      return false;
    }
    const existing = this.statuses.find(s => s.name === status.name);
    if (existing) {
      existing.stacks = Math.min(existing.stacks + 1, status.maxStacks ?? 5);
      existing.turns = Math.max(existing.turns, status.turns);
    } else {
      this.statuses.push({ ...status, stacks: 1 });
    }
    log(`${this.name} gains ${status.name}`);
    return true;
  }

  tickStatuses(log) {
    const expired = [];
    for (const st of this.statuses) {
      if (st.dotMaxHp) {
        const dmg = this.maxHp * st.dotMaxHp * st.stacks;
        this.hp -= dmg;
        log(`${this.name} takes ${Math.round(dmg)} from ${st.name}`);
      }
      st.turns -= 1;
      if (st.turns <= 0) expired.push(st);
    }
    this.statuses = this.statuses.filter(s => !expired.includes(s));
  }
}

// --- damage -----------------------------------------------------------------

export function computeDamage(attacker, defender, skill, rng) {
  const scale = attacker.stat(skill.scaling ?? "atk");
  const raw = scale * skill.multiplier;

  const defStat = skill.damageType === "magical" ? "ward" : "armor";
  const d = defender.stat(defStat);
  const mitigation = 1 - d / (d + TUNING.DEF_K);

  const adv = advantage(attacker.type, defender.type);
  const advMult = 1 + TUNING.ADVANTAGE_DMG * adv;

  const crit = rng() < attacker.stat("critRate");
  const critMult = crit ? attacker.stat("critDmg") : 1;

  return { amount: raw * mitigation * advMult * critMult, crit, adv };
}

// --- battle -----------------------------------------------------------------

export class Battle {
  constructor(teamA, teamB, seed = 1) {
    this.units = [
      ...teamA.map((d, i) => new Unit(d, 0, i)),
      ...teamB.map((d, i) => new Unit(d, 1, i)),
    ];
    this.rng = makeRng(seed);
    this.log = [];
    this.turnCount = 0;
    this.elapsedAv = 0;
    this.frenzy = 0;
    this.over = false;
    this.winner = null;
    this.current = null;
    this.advanceToNextActor();
  }

  push(msg) { this.log.push(msg); }

  living(team) { return this.units.filter(u => u.team === team && u.alive); }
  allies(u) { return this.living(u.team); }
  enemies(u) { return this.living(1 - u.team); }

  /** Turn order preview for the queue UI. */
  queue(depth = 6) {
    const sim = this.units.filter(u => u.alive)
      .map(u => ({ unit: u, av: u.av }));
    const out = [];
    for (let i = 0; i < depth && sim.length; i++) {
      sim.sort((a, b) => a.av - b.av);
      const next = sim[0];
      const delta = next.av;
      for (const s of sim) s.av -= delta;
      out.push({ unit: next.unit, at: Math.round(this.elapsed(next.unit, i)) });
      next.av = TUNING.BASE_AV / Math.max(next.unit.stat("spd"), 1);
    }
    return out;
  }

  elapsed(unit, i) { return unit.av + i; }

  advanceToNextActor() {
    if (this.checkEnd()) return;
    const alive = this.units.filter(u => u.alive);
    const next = alive.reduce((a, b) => (a.av <= b.av ? a : b));
    const delta = next.av;
    if (delta > 0) {
      for (const u of alive) u.tickClock(delta);
      this.elapsedAv += delta;
    }
    this.updateFrenzy();
    this.turnCount++;

    next.momentum = Math.min(TUNING.MOMENTUM_CAP,
                             next.momentum + next.momentumGain());
    next.tickStatuses(m => this.push(m));

    if (!next.alive) { next.resetAv(); return this.advanceToNextActor(); }
    this.current = next;
  }

  /** Targets a skill can legally hit, for UI highlighting. */
  validTargets(actor, skill) {
    if (skill.targets === "allAllies") return this.allies(actor);
    if (skill.targets === "lowestAlly") {
      const a = this.allies(actor);
      return a.length ? [a.reduce((x, y) => (x.hpPct <= y.hpPct ? x : y))] : [];
    }
    if (skill.targets === "all") return this.enemies(actor);
    return this.enemies(actor);
  }

  /** Execute the current unit's turn. Returns false if the move was illegal. */
  act(skillId, targetId) {
    if (this.over || !this.current) return false;
    const actor = this.current;
    const skill = actor.def.skills.find(s => s.id === skillId);
    if (!skill || !actor.skillReady(skill)) return false;

    let targets;
    if (skill.targets === "single") {
      const t = this.units.find(u => u.id === targetId && u.alive);
      if (!t || t.team === actor.team) return false;
      targets = [t];
    } else {
      targets = this.validTargets(actor, skill);
    }

    this.push(`— ${actor.name} uses ${skill.name}`);

    for (const t of targets) {
      if (skill.multiplier > 0 && t.team !== actor.team) {
        const res = computeDamage(actor, t, skill, this.rng);
        const amount = res.amount * this.frenzyDamageMult();
        const crit = res.crit, adv = res.adv;
        t.hp -= amount;
        const tags = [crit && "CRIT", adv > 0 && "ADV", adv < 0 && "DIS"]
          .filter(Boolean).join(" ");
        this.push(`  ${t.name} takes ${Math.round(amount)}${tags ? " " + tags : ""}`);
        if (!t.alive) this.push(`  ${t.name} is down`);
      }
      if (skill.heal) {
        const amt = actor.stat(skill.healScaling ?? "atk") * skill.heal
                    * this.frenzyHealMult();
        t.hp = Math.min(t.maxHp, t.hp + amt);
        this.push(`  ${t.name} heals ${Math.round(amt)}`);
      }
      if (skill.applies && t.team !== actor.team) {
        const acc = actor.stat("effectAcc") +
                    TUNING.ADVANTAGE_ACC * Math.max(advantage(actor.type, t.type), 0);
        if (this.rng() < (skill.applyChance ?? 1)) {
          t.addStatus(skill.applies, acc, this.rng, m => this.push("  " + m));
        }
      }
      if (skill.buff && t.team === actor.team) {
        t.statuses.push({ ...skill.buff, stacks: 1 });
        this.push(`  ${t.name} gains ${skill.buff.name}`);
      }
    }

    actor.momentum -= skill.momentumCost ?? 0;
    const cd = cooldownAv(skill);
    if (cd > 0) actor.cooldowns[skill.id] = cd;
    actor.resetAv();

    this.advanceToNextActor();
    return true;
  }

  /** Escalate frenzy as action value elapses, and apply the max-HP cut once. */
  updateFrenzy() {
    if (this.elapsedAv < TUNING.FRENZY_START_AV) return;
    const stage = Math.min(
      TUNING.FRENZY_MAX_STAGE,
      1 + Math.floor((this.elapsedAv - TUNING.FRENZY_START_AV) / TUNING.FRENZY_STAGE_AV)
    );
    if (stage <= this.frenzy) return;
    this.frenzy = stage;
    this.push(`Frenzy ${stage} — damage up, healing and max HP down`);
    for (const u of this.units) {
      const cut = 1 + TUNING.FRENZY_MAXHP_PER_STAGE;
      u.maxHp *= cut;
      u.hp = Math.min(u.hp, u.maxHp);
    }
  }

  frenzyDamageMult() { return 1 + TUNING.FRENZY_DMG_PER_STAGE * this.frenzy; }
  frenzyHealMult() { return Math.max(0.1, 1 + TUNING.FRENZY_HEAL_PER_STAGE * this.frenzy); }

  checkEnd() {
    const a = this.living(0).length, b = this.living(1).length;
    if (a && b) return false;
    this.over = true;
    this.winner = a ? 0 : b ? 1 : null;
    this.current = null;
    return true;
  }
}
