# Project Echo Battle UI — Interactive Prototype

This is actual UI infrastructure, not a concept image. It is a zero-dependency HTML/CSS/JavaScript prototype so it can be opened immediately, shared with Claude, or transplanted into a React/TypeScript app later.

## Run

Must be **served**, not opened as a `file://` path — ES modules and the service
worker both require an origin.

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080`.

## Run on a phone

### Same wifi (quickest)

Serve from your machine and open the LAN address on the phone:

```bash
python3 -m http.server 8080 --bind 0.0.0.0
# then browse to http://<your-computer-ip>:8080
```

Works for testing, but Chrome will not offer "Install app" over plain HTTP on
a non-localhost origin, so you get the page without the PWA behaviour.

### Installed as a PWA (recommended)

Host the folder anywhere with HTTPS — GitHub Pages, Netlify drop, Vercel — then
on the Pixel: Chrome → ⋮ → **Add to Home screen**.

Installed, it launches fullscreen in landscape with no browser chrome, which is
what the layout is designed for. It also runs offline after first load.

- `manifest.webmanifest` — `display: fullscreen`, `orientation: landscape`
- `sw.js` — cache-first service worker; bump `CACHE_VERSION` when assets change
- `public/assets/pwa/` — app icons, including maskable variants

HTTPS is required for service worker registration. Over plain HTTP the app
still runs, it just won't install or cache.

## Implemented

- Locked Project Echo PvE/PvP combat-shell layout.
- Same HUD positions in PvE and PvP.
- Over-shoulder acting-unit model capped at ~25% of the useful battlefield width.
- Four-enemy formation with clickable targets.
- Enemy HP + status rows on the battlefield only.
- Bottom ally HUD with HP + status rows and clickable ally portraits.
- Left action queue with strong ally/enemy differentiation.
- Square Basic / Skill / Fork Alt / Ultimate controls; Ultimate is emphasized with glow, not a different shape.
- Target reticle.
- Mock Action Value scheduler driven by Speed.
- Momentum accumulation as battle time advances.
- AV-based skill cooldowns and status expiry.
- Damage resolution and battle end state.
- PvE/PvP toggle, pause, reset, and developer state drawer.
- Responsive landscape-phone styling.
- CCPS-derived portraits, transparent full-body assets and ability icons.
- Approved violet-ruins combat background.

## Engine status

**The placeholder simulator has been replaced with the real combat engine.**

- `src/combat.js` — the engine. Action-value turn order, the momentum speed
  tax, three defences (Armor / Ward / Resolve), the five-type advantage cycle,
  turn-authored cooldowns, statuses and Frenzy escalation. No DOM references,
  so it ports to Godot or Unity unchanged.
- `src/units.js` — unit and skill definitions, point costs, star-rank caps.
- `src/engine-adapter.js` — implements `BattleUIAdapter` on top of the engine.
- `src/state.js` — the original mock, kept for reference but no longer used.

Fork Alt maps to the alternate branch of the second skill, matching the design
where a fork is one choice with two versions rather than two separate skills.

## Architecture

- `index.html` — app mount point.
- `src/data.js` — unit assets, CCPS taxonomy, mock stats and skills.
- `src/state.js` — temporary combat-state simulator / Action Value timeline.
- `src/battle-ui.js` — UI component rendering and interactions.
- `src/battle-ui.css` — locked battle layout and responsive rules.
- `engine-contract.ts` — TypeScript interface for connecting the future real combat engine.
- `public/assets/characters/` — extracted CCPS UI assets.
- `public/assets/backgrounds/` — battle environment.

## Intended engine handoff

The production combat engine should implement the interface in `engine-contract.ts`. The player-facing UI does not need to be rebuilt: replace the temporary functions in `src/state.js` with an adapter that supplies the same battle-state shape and handles `selectTarget`, `castSkill`, pause, and reset.

## Locked UI decisions represented here

- Allies who are not acting remain off-camera; their bottom portraits are the interactive full readout.
- Ally statuses live in the bottom ally HUD; enemy statuses live over enemy units. No duplicated status clutter.
- The left queue carries turn-order information and makes ally/enemy ownership obvious.
- Action Value exists in state but is not printed over every unit by default.
- The active character stays cinematic without consuming roughly one-third of the screen.
