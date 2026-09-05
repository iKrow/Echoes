import { createEngineAdapter } from './engine-adapter.js';

/* The placeholder simulator in state.js has been replaced by the real combat
   engine. The UI is unchanged: it still reads the same battle-state shape. */
const engine = createEngineAdapter('pvp');
let state = engine.getState();
let debugOpen = false;
const root = document.getElementById('battle-root');

const pct=u=>Math.max(0,Math.round(u.hp/u.maxHp*100));
const unit=id=>state.units.find(u=>u.id===id);
const esc=s=>String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

function statusHtml(statuses,compact=false){
  return `<div class="status-strip ${compact?'status-strip--compact':''}">${statuses.slice(0,compact?4:6).map(s=>`<span class="status-chip status-chip--${s.kind}" title="${esc(s.name)}">${esc(s.name[0])}${s.stacks>1?`<b>${s.stacks}</b>`:''}</span>`).join('')}</div>`;
}

function queueHtml(){
  return `<aside class="action-queue panel-glass"><div class="action-queue__title">ACTION<br>QUEUE</div><div class="action-queue__list">${state.queue.slice(0,7).map((q,i)=>{const u=unit(q.unitId);return `<div class="queue-entry queue-entry--${u.team} ${i===0?'is-current':''}"><span class="queue-entry__number">${i+1}</span><img src="${u.portrait}" alt="${u.name}"><span class="queue-entry__team">${u.team==='ally'?'A':'E'}</span>${i===0?'<span class="queue-entry__arrow">›</span>':''}</div>`}).join('')}</div></aside>`;
}

function headerHtml(){
  const pvp=state.mode==='pvp';
  return `<header class="battle-header"><div class="project-mark"><strong>PROJECT<br>ECHO</strong><span>FRACTURED WORLDS, STILL OURS</span></div><div class="duel-header panel-glass"><div class="player-side player-side--ally"><b>${pvp?'Eclipse':'Expedition'}</b><span>${pvp?'The Vanquishers':'Player Team'}</span></div><div class="round"><small>${pvp?'ROUND':'WAVE'}</small><strong>${state.round}</strong></div><div class="player-side player-side--enemy"><b>${pvp?'Noir':'Fractured Host'}</b><span>${pvp?'Astral Covenant':'Enemy Formation'}</span></div></div><div class="battle-controls"><button data-action="mode">${state.mode.toUpperCase()}</button><button data-action="pause">${state.battleStatus==='paused'?'▶':'Ⅱ'}</button><button data-action="reset">↻</button><button data-action="debug">⚙</button></div></header>`;
}

function enemyHtml(u){
  const selected=state.selectedTargetId===u.id;
  return `<button class="enemy-unit ${selected?'is-selected':''} ${u.hp<=0?'is-defeated':''}" data-target="${u.id}" ${u.hp<=0?'disabled':''}><div class="enemy-unit__hud">${statusHtml(u.statuses)}<div class="enemy-unit__line"><span class="affinity affinity--${u.affinity.toLowerCase()}">${u.affinity[0]}</span><span class="level">${u.level}</span><div class="hpbar"><i style="width:${pct(u)}%"></i></div><strong>${pct(u)}%</strong></div></div><div class="enemy-unit__model-wrap"><img class="enemy-unit__model" src="${u.battleModel}" alt="${u.name}">${selected?'<div class="target-reticle"><span></span></div>':''}</div><div class="enemy-unit__name">${u.name}</div></button>`;
}

function battlefieldHtml(){
  const active=unit(state.activeUnitId);
  const enemies=state.units.filter(u=>u.team==='enemy');
  return `<section class="battlefield"><div class="active-model ${active.team==='enemy'?'active-model--enemy':''}"><img src="${active.battleModel}" alt="${active.name}"><div class="active-model__glow"></div></div><div class="enemy-line">${enemies.map(enemyHtml).join('')}</div></section>`;
}

function allyHudHtml(){
  const allies=state.units.filter(u=>u.team==='ally');
  const activeCandidate=unit(state.activeUnitId);
  const active=activeCandidate.team==='ally'?activeCandidate:allies[0];
  const others=allies.filter(u=>u.id!==active.id);
  return `<div class="ally-hud"><div class="active-card panel-glass"><img src="${active.portrait}" alt="${active.name}" class="active-card__portrait"><div class="active-card__body">${statusHtml(active.statuses,true)}<div class="active-card__name"><span class="level-gem">${active.level}</span>${active.name}</div><div class="active-card__hp"><div class="hpbar"><i style="width:${pct(active)}%"></i></div><b>${active.hp.toLocaleString()} / ${active.maxHp.toLocaleString()}</b></div></div></div><div class="party-row">${others.map(u=>`<button class="party-card ${state.selectedTargetId===u.id?'is-selected':''}" data-target="${u.id}">${statusHtml(u.statuses,true)}<img src="${u.portrait}" alt="${u.name}"><div class="party-card__hp"><i style="width:${pct(u)}%"></i></div><strong>${pct(u)}%</strong></button>`).join('')}</div></div>`;
}

function skillDockHtml(){
  const active=unit(state.activeUnitId);
  const order=['basic','skill','forkAlt','ultimate'];
  return `<div class="skill-dock"><div class="target-mode">⌖ <span>${active.skills[state.selectedSkillKind||'basic'].targetType==='allEnemies'?'All Enemies':'Single Target'}</span></div><div class="skill-row">${order.map(kind=>{const s=active.skills[kind];const disabled=!s.ready;return `<button class="skill-button ${kind==='ultimate'?'is-ultimate':''} ${state.selectedSkillKind===kind?'is-selected':''}" data-skill="${kind}" ${disabled?'disabled':''}><img src="${s.icon}" alt=""><span class="skill-button__label">${kind==='forkAlt'?'Fork Alt':kind[0].toUpperCase()+kind.slice(1)}</span>${disabled?`<span class="cooldown">${s.cooldownTurns}</span>`:''}</button>`}).join('')}</div><div class="skill-name">${active.skills[state.selectedSkillKind||'basic'].name}</div></div>`;
}

function debugHtml(){
  if(!debugOpen)return '';
  const active=unit(state.activeUnitId);
  return `<aside class="debug-drawer panel-glass"><button data-action="debug" class="debug-drawer__close">×</button><h3>Battle State</h3><dl><div><dt>Mode</dt><dd>${state.mode}</dd></div><div><dt>Clock</dt><dd>${Math.round(state.clock)} AV</dd></div><div><dt>Active</dt><dd>${active.name}</dd></div><div><dt>Speed</dt><dd>${active.speed}</dd></div><div><dt>Momentum</dt><dd>${Math.round(active.momentum)}</dd></div><div><dt>Resolve</dt><dd>${active.resolve}</dd></div><div><dt>Armor</dt><dd>${active.armor}</dd></div><div><dt>Ward</dt><dd>${active.ward}</dd></div><div><dt>Frenzy</dt><dd>${state.frenzy}</dd></div></dl><p>Developer-only state view.
The player-facing HUD stays fixed while the real combat engine can replace this prototype state layer later.</p></aside>`;
}

function resultHtml(){
  return state.battleStatus==='ended'?`<div class="battle-result panel-glass"><small>BATTLE COMPLETE</small><strong>${state.winner==='ally'?'VICTORY':'DEFEAT'}</strong><button data-action="reset">Reset encounter</button></div>`:'';
}

function render(){
  root.innerHTML=`<div class="battle-bg"></div><div class="battle-vignette"></div>${headerHtml()}${queueHtml()}${battlefieldHtml()}${allyHudHtml()}${skillDockHtml()}<div class="mode-note">${state.mode==='pvp'?'RTA':'PvE'} • shared combat shell</div>${debugHtml()}${resultHtml()}`;
}

root.addEventListener('click',e=>{
  const target=e.target.closest('[data-target]');
  if(target){ engine.selectTarget(target.dataset.target); return; }

  const skill=e.target.closest('[data-skill]');
  if(skill){ engine.castSkill(skill.dataset.skill); return; }

  const action=e.target.closest('[data-action]');
  if(!action)return;

  if(action.dataset.action==='mode'){ engine.setMode(state.mode==='pvp'?'pve':'pvp'); engine.reset(); return; }
  if(action.dataset.action==='pause'){ engine.togglePause(); return; }
  if(action.dataset.action==='reset'){ engine.reset(); return; }
  if(action.dataset.action==='debug'){ debugOpen=!debugOpen; }

  render();
});

/*
 * Subscribe LAST.
 * createEngineAdapter.subscribe() immediately invokes the callback.
 * By subscribing here, all const helpers above are initialized first.
 */
engine.subscribe(next => {
  state = next;
  render();
});
