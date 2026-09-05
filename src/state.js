const BASE_AV = 10000;

export function buildQueue(units, clock, depth=12) {
  const working = units.filter(u=>u.hp>0).map(u=>({id:u.id,speed:u.speed,at:Math.max(clock,u.nextAt)}));
  const result=[];
  for(let i=0;i<depth && working.length;i++){
    working.sort((a,b)=>a.at-b.at || b.speed-a.speed);
    const next=working[0]; result.push({unitId:next.id,scheduledAt:next.at}); next.at += BASE_AV/next.speed;
  }
  return result;
}

export function createState(units, mode='pvp') {
  const copy=structuredClone(units); const queue=buildQueue(copy,0);
  return { mode,round:1,clock:0,units:copy,queue,activeUnitId:queue[0].unitId,selectedTargetId:copy.find(u=>u.team==='enemy')?.id??null,selectedSkillKind:null,battleStatus:'playing' };
}

export function resolveSkill(state, kind) {
  if(state.battleStatus!=='playing') return state;
  const actor=state.units.find(u=>u.id===state.activeUnitId); if(!actor || actor.hp<=0) return state;
  const skill=actor.skills[kind]; if(skill.currentCooldownAV>0) return state;
  let targets=[];
  if(skill.targetType==='allEnemies') targets=state.units.filter(u=>u.team!==actor.team && u.hp>0).map(u=>u.id);
  else { const selected=state.units.find(u=>u.id===state.selectedTargetId && u.team!==actor.team && u.hp>0); const fallback=state.units.find(u=>u.team!==actor.team && u.hp>0); if(selected||fallback) targets=[(selected||fallback).id]; }
  if(!targets.length) return state;

  const nextAt=state.clock+BASE_AV/actor.speed; const elapsed=Math.max(1,nextAt-state.clock); const damage=Math.round(skill.power*420*(.8+actor.momentum/125));
  const units=state.units.map(u=>{
    const next={...u,statuses:u.statuses.map(s=>({...s})),skills:Object.fromEntries(Object.entries(u.skills).map(([k,s])=>[k,{...s}]))};
    next.momentum=Math.min(100,next.momentum+elapsed*.006);
    next.statuses=next.statuses.map(s=>({...s,remainingAV:s.remainingAV==null?undefined:Math.max(0,s.remainingAV-elapsed)})).filter(s=>s.remainingAV==null||s.remainingAV>0);
    Object.values(next.skills).forEach(s=>s.currentCooldownAV=Math.max(0,s.currentCooldownAV-elapsed));
    if(targets.includes(next.id)){ next.hp=Math.max(0,next.hp-damage); if(kind==='skill'&&next.hp>0)next.statuses.push({id:`fractured-${state.clock}-${actor.id}`,name:'Fractured',kind:'debuff',stacks:1,remainingAV:1600}); }
    if(next.id===actor.id){ next.nextAt=nextAt; next.momentum=Math.max(0,next.momentum-(kind==='ultimate'?80:28)); next.skills[kind].currentCooldownAV=skill.cooldownAV; }
    return next;
  });
  const queue=buildQueue(units,nextAt); const nextActor=units.find(u=>u.id===queue[0]?.unitId); const selected=nextActor?units.find(u=>u.team!==nextActor.team&&u.hp>0)?.id??null:null;
  const alliesAlive=units.some(u=>u.team==='ally'&&u.hp>0), enemiesAlive=units.some(u=>u.team==='enemy'&&u.hp>0);
  return {...state,clock:nextAt,units,queue,activeUnitId:queue[0]?.unitId??state.activeUnitId,selectedTargetId:selected,selectedSkillKind:null,battleStatus:alliesAlive&&enemiesAlive?'playing':'ended',winner:!enemiesAlive?'ally':!alliesAlive?'enemy':undefined};
}
