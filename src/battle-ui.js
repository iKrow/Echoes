import { createEngineAdapter } from "./engine-adapter.js";

/*
 * Project Echo Battle UI
 *
 * Important:
 * All helpers and render functions are initialized BEFORE we subscribe
 * to the combat engine. The engine subscription immediately emits its
 * current state, so subscribing too early causes a temporal-dead-zone
 * error such as:
 *
 * "can't access lexical declaration 'unit' before initialization"
 */

const engine = createEngineAdapter("pvp");

let state = engine.getState();
let debugOpen = false;

const root = document.getElementById("battle-root");

if (!root) {
  throw new Error("Project Echo: #battle-root element was not found.");
}

/* -------------------------------------------------------------------------- */
/* Utilities                                                                  */
/* -------------------------------------------------------------------------- */

function getUnitById(id) {
  if (!id) return null;
  return state.units.find((u) => u.id === id) || null;
}

function pct(unit) {
  if (!unit || !unit.maxHp) return 0;

  return Math.max(
    0,
    Math.min(100, Math.round((unit.hp / unit.maxHp) * 100))
  );
}

function esc(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[char]
  );
}

/* -------------------------------------------------------------------------- */
/* Status effects                                                             */
/* -------------------------------------------------------------------------- */

function statusHtml(statuses = [], compact = false) {
  const max = compact ? 4 : 6;

  return `
    <div class="status-strip ${compact ? "status-strip--compact" : ""}">
      ${statuses
        .slice(0, max)
        .map(
          (status) => `
            <span
              class="status-chip status-chip--${esc(status.kind)}"
              title="${esc(status.name)}"
            >
              ${esc(status.name?.[0] || "?")}
              ${
                status.stacks > 1
                  ? `<b>${esc(status.stacks)}</b>`
                  : ""
              }
            </span>
          `
        )
        .join("")}
    </div>
  `;
}

/* -------------------------------------------------------------------------- */
/* Action queue                                                               */
/* -------------------------------------------------------------------------- */

function queueHtml() {
  const entries = state.queue
    .slice(0, 7)
    .map((queueItem, index) => {
      const u = getUnitById(queueItem.unitId);

      if (!u) return "";

      return `
        <div
          class="
            queue-entry
            queue-entry--${u.team}
            ${index === 0 ? "is-current" : ""}
          "
        >
          <span class="queue-entry__number">${index + 1}</span>

          <img
            src="${esc(u.portrait)}"
            alt="${esc(u.name)}"
          />

          <span class="queue-entry__team">
            ${u.team === "ally" ? "A" : "E"}
          </span>

          ${
            index === 0
              ? '<span class="queue-entry__arrow">›</span>'
              : ""
          }
        </div>
      `;
    })
    .join("");

  return `
    <aside class="action-queue panel-glass">

      <div class="action-queue__title">
        ACTION<br />
        QUEUE
      </div>

      <div class="action-queue__list">
        ${entries}
      </div>

    </aside>
  `;
}

/* -------------------------------------------------------------------------- */
/* Top battle header                                                          */
/* -------------------------------------------------------------------------- */

function headerHtml() {
  const pvp = state.mode === "pvp";

  return `
    <header class="battle-header">

      <div class="project-mark">
        <strong>
          PROJECT<br />
          ECHO
        </strong>

        <span>
          FRACTURED WORLDS, STILL OURS
        </span>
      </div>

      <div class="duel-header panel-glass">

        <div class="player-side player-side--ally">
          <b>${pvp ? "Eclipse" : "Expedition"}</b>
          <span>
            ${pvp ? "The Vanquishers" : "Player Team"}
          </span>
        </div>

        <div class="round">
          <small>${pvp ? "ROUND" : "WAVE"}</small>
          <strong>${state.round}</strong>
        </div>

        <div class="player-side player-side--enemy">
          <b>${pvp ? "Noir" : "Fractured Host"}</b>
          <span>
            ${pvp ? "Astral Covenant" : "Enemy Formation"}
          </span>
        </div>

      </div>

      <div class="battle-controls">

        <button data-action="mode">
          ${state.mode.toUpperCase()}
        </button>

        <button data-action="pause">
          ${state.battleStatus === "paused" ? "▶" : "Ⅱ"}
        </button>

        <button data-action="reset">
          ↻
        </button>

        <button data-action="debug">
          ⚙
        </button>

      </div>

    </header>
  `;
}

/* -------------------------------------------------------------------------- */
/* Enemy battlefield units                                                    */
/* -------------------------------------------------------------------------- */

function enemyHtml(u) {
  const selected = state.selectedTargetId === u.id;
  const defeated = u.hp <= 0;

  return `
    <button
      class="
        enemy-unit
        ${selected ? "is-selected" : ""}
        ${defeated ? "is-defeated" : ""}
      "
      data-target="${esc(u.id)}"
      ${defeated ? "disabled" : ""}
    >

      <div class="enemy-unit__hud">

        ${statusHtml(u.statuses)}

        <div class="enemy-unit__line">

          <span
            class="
              affinity
              affinity--${esc(u.affinity.toLowerCase())}
            "
          >
            ${esc(u.affinity[0])}
          </span>

          <span class="level">
            ${esc(u.level)}
          </span>

          <div class="hpbar">
            <i style="width:${pct(u)}%"></i>
          </div>

          <strong>
            ${pct(u)}%
          </strong>

        </div>

      </div>

      <div class="enemy-unit__model-wrap">

        <img
          class="enemy-unit__model"
          src="${esc(u.battleModel)}"
          alt="${esc(u.name)}"
        />

        ${
          selected
            ? `
              <div class="target-reticle">
                <span></span>
              </div>
            `
            : ""
        }

      </div>

      <div class="enemy-unit__name">
        ${esc(u.name)}
      </div>

    </button>
  `;
}

/* -------------------------------------------------------------------------- */
/* Battlefield                                                                */
/* -------------------------------------------------------------------------- */

function battlefieldHtml() {
  const livingAlly =
    state.units.find(
      (u) => u.team === "ally" && u.hp > 0
    ) || state.units[0];

  const active =
    getUnitById(state.activeUnitId) || livingAlly;

  const enemies = state.units.filter(
    (u) => u.team === "enemy"
  );

  if (!active) {
    return `
      <section class="battlefield"></section>
    `;
  }

  return `
    <section class="battlefield">

      <div
        class="
          active-model
          ${
            active.team === "enemy"
              ? "active-model--enemy"
              : ""
          }
        "
      >

        <img
          src="${esc(active.battleModel)}"
          alt="${esc(active.name)}"
        />

        <div class="active-model__glow"></div>

      </div>

      <div class="enemy-line">
        ${enemies.map(enemyHtml).join("")}
      </div>

    </section>
  `;
}

/* -------------------------------------------------------------------------- */
/* Ally HUD                                                                   */
/* -------------------------------------------------------------------------- */

function allyHudHtml() {
  const allies = state.units.filter(
    (u) => u.team === "ally"
  );

  if (!allies.length) return "";

  const currentActor = getUnitById(
    state.activeUnitId
  );

  const active =
    currentActor?.team === "ally"
      ? currentActor
      : allies[0];

  const others = allies.filter(
    (u) => u.id !== active.id
  );

  return `
    <div class="ally-hud">

      <div class="active-card panel-glass">

        <img
          src="${esc(active.portrait)}"
          alt="${esc(active.name)}"
          class="active-card__portrait"
        />

        <div class="active-card__body">

          ${statusHtml(active.statuses, true)}

          <div class="active-card__name">

            <span class="level-gem">
              ${esc(active.level)}
            </span>

            ${esc(active.name)}

          </div>

          <div class="active-card__hp">

            <div class="hpbar">
              <i style="width:${pct(active)}%"></i>
            </div>

            <b>
              ${active.hp.toLocaleString()}
              /
              ${active.maxHp.toLocaleString()}
            </b>

          </div>

        </div>

      </div>

      <div class="party-row">

        ${others
          .map(
            (u) => `
              <button
                class="
                  party-card
                  ${
                    state.selectedTargetId === u.id
                      ? "is-selected"
                      : ""
                  }
                "
                data-target="${esc(u.id)}"
              >

                ${statusHtml(u.statuses, true)}

                <img
                  src="${esc(u.portrait)}"
                  alt="${esc(u.name)}"
                />

                <div class="party-card__hp">
                  <i style="width:${pct(u)}%"></i>
                </div>

                <strong>
                  ${pct(u)}%
                </strong>

              </button>
            `
          )
          .join("")}

      </div>

    </div>
  `;
}

/* -------------------------------------------------------------------------- */
/* Skills                                                                     */
/* -------------------------------------------------------------------------- */

function skillDockHtml() {
  const active =
    getUnitById(state.activeUnitId) ||
    state.units.find((u) => u.team === "ally");

  if (!active || !active.skills) return "";

  const kinds = [
    "basic",
    "skill",
    "forkAlt",
    "ultimate",
  ];

  const selectedKind =
    state.selectedSkillKind || "basic";

  const selectedSkill =
    active.skills[selectedKind] ||
    active.skills.basic;

  if (!selectedSkill) return "";

  const targetLabel =
    selectedSkill.targetType === "allEnemies"
      ? "All Enemies"
      : selectedSkill.targetType === "allies"
      ? "Allies"
      : "Single Target";

  return `
    <div class="skill-dock">

      <div class="target-mode">
        ⌖
        <span>
          ${targetLabel}
        </span>
      </div>

      <div class="skill-row">

        ${kinds
          .map((kind) => {
            const skill = active.skills[kind];

            if (!skill) return "";

            const disabled = !skill.ready;

            const label =
              kind === "forkAlt"
                ? "Fork Alt"
                : kind.charAt(0).toUpperCase() +
                  kind.slice(1);

            return `
              <button
                class="
                  skill-button
                  ${
                    kind === "ultimate"
                      ? "is-ultimate"
                      : ""
                  }
                  ${
                    selectedKind === kind
                      ? "is-selected"
                      : ""
                  }
                "
                data-skill="${kind}"
                ${disabled ? "disabled" : ""}
              >

                <img
                  src="${esc(skill.icon)}"
                  alt=""
                />

                <span class="skill-button__label">
                  ${label}
                </span>

                ${
                  disabled
                    ? `
                      <span class="cooldown">
                        ${esc(skill.cooldownTurns)}
                      </span>
                    `
                    : ""
                }

              </button>
            `;
          })
          .join("")}

      </div>

      <div class="skill-name">
        ${esc(selectedSkill.name)}
      </div>

    </div>
  `;
}

/* -------------------------------------------------------------------------- */
/* Debug drawer                                                               */
/* -------------------------------------------------------------------------- */

function debugHtml() {
  if (!debugOpen) return "";

  const active =
    getUnitById(state.activeUnitId) ||
    state.units[0];

  if (!active) return "";

  return `
    <aside class="debug-drawer panel-glass">

      <button
        data-action="debug"
        class="debug-drawer__close"
      >
        ×
      </button>

      <h3>
        Battle State
      </h3>

      <dl>

        <div>
          <dt>Mode</dt>
          <dd>${esc(state.mode)}</dd>
        </div>

        <div>
          <dt>Clock</dt>
          <dd>${Math.round(state.clock)} AV</dd>
        </div>

        <div>
          <dt>Active</dt>
          <dd>${esc(active.name)}</dd>
        </div>

        <div>
          <dt>Speed</dt>
          <dd>${esc(active.speed)}</dd>
        </div>

        <div>
          <dt>Momentum</dt>
          <dd>${Math.round(active.momentum)}</dd>
        </div>

        <div>
          <dt>Resolve</dt>
          <dd>${esc(active.resolve)}</dd>
        </div>

        <div>
          <dt>Armor</dt>
          <dd>${esc(active.armor)}</dd>
        </div>

        <div>
          <dt>Ward</dt>
          <dd>${esc(active.ward)}</dd>
        </div>

        <div>
          <dt>Frenzy</dt>
          <dd>${esc(state.frenzy)}</dd>
        </div>

      </dl>

      <p>
        Developer-only state view.
        The player-facing HUD stays fixed while
        the combat engine evolves underneath it.
      </p>

    </aside>
  `;
}

/* -------------------------------------------------------------------------- */
/* Battle result                                                              */
/* -------------------------------------------------------------------------- */

function resultHtml() {
  if (state.battleStatus !== "ended") {
    return "";
  }

  return `
    <div class="battle-result panel-glass">

      <small>
        BATTLE COMPLETE
      </small>

      <strong>
        ${
          state.winner === "ally"
            ? "VICTORY"
            : "DEFEAT"
        }
      </strong>

      <button data-action="reset">
        Reset encounter
      </button>

    </div>
  `;
}

/* -------------------------------------------------------------------------- */
/* Main render                                                                */
/* -------------------------------------------------------------------------- */

function render() {
  root.innerHTML = `
    <div class="battle-bg"></div>

    <div class="battle-vignette"></div>

    ${headerHtml()}

    ${queueHtml()}

    ${battlefieldHtml()}

    ${allyHudHtml()}

    ${skillDockHtml()}

    <div class="mode-note">
      ${state.mode === "pvp" ? "RTA" : "PvE"}
      • shared combat shell
    </div>

    ${debugHtml()}

    ${resultHtml()}
  `;
}

/* -------------------------------------------------------------------------- */
/* Interaction                                                                */
/* -------------------------------------------------------------------------- */

root.addEventListener("click", (event) => {
  const target = event.target.closest(
    "[data-target]"
  );

  if (target) {
    engine.selectTarget(
      target.dataset.target
    );

    return;
  }

  const skill = event.target.closest(
    "[data-skill]"
  );

  if (skill) {
    engine.castSkill(
      skill.dataset.skill
    );

    return;
  }

  const action = event.target.closest(
    "[data-action]"
  );

  if (!action) return;

  switch (action.dataset.action) {
    case "mode":
      engine.setMode(
        state.mode === "pvp"
          ? "pve"
          : "pvp"
      );

      engine.reset();

      break;

    case "pause":
      engine.togglePause();
      break;

    case "reset":
      engine.reset();
      break;

    case "debug":
      debugOpen = !debugOpen;
      render();
      break;
  }
});

/* -------------------------------------------------------------------------- */
/* IMPORTANT                                                                  */
/* -------------------------------------------------------------------------- */
/*
 * Subscribe LAST.
 *
 * engine.subscribe() immediately calls the supplied callback.
 * By placing this at the bottom, every helper and render function above
 * is already initialized before the first render occurs.
 */

engine.subscribe((nextState) => {
  state = nextState;
  render();
});
