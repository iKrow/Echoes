// Integration contract for replacing the prototype simulator with the real Project Echo combat engine.
export type Team = 'ally' | 'enemy';
export type BattleMode = 'pve' | 'pvp';
export type SkillKind = 'basic' | 'skill' | 'forkAlt' | 'ultimate';
export type Origin = 'Human' | 'Beastkin' | 'Construct' | 'Mythic';
export type Role = 'Vanguard' | 'Slayer' | 'Warden' | 'Arcanist' | 'Mystic';
export type Affinity = 'Tide' | 'Pyre' | 'Root' | 'Gale' | 'Arc' | 'Radiant' | 'Umbral' | 'Null';

export interface BattleUIUnit {
  id: string; name: string; team: Team; origin: Origin; role: Role; affinity: Affinity;
  level: number; hp: number; maxHp: number; speed: number; momentum: number; resolve: number;
  portrait: string; battleModel: string; statuses: Array<{id:string;name:string;kind:'buff'|'debuff';stacks?:number;remainingAV?:number}>;
  skills: Record<SkillKind,{id:string;name:string;kind:SkillKind;icon:string;targetType:string;cooldownAV:number;currentCooldownAV:number}>;
}
export interface BattleUIState {
  mode: BattleMode; round: number; clock: number; units: BattleUIUnit[];
  queue: Array<{unitId:string;scheduledAt:number}>; activeUnitId: string; selectedTargetId: string|null;
  selectedSkillKind: SkillKind|null; battleStatus: 'playing'|'paused'|'ended'; winner?: Team;
}
export interface BattleUIAdapter {
  getState(): BattleUIState;
  subscribe(listener:(state:BattleUIState)=>void):()=>void;
  selectTarget(unitId:string):void;
  castSkill(kind:SkillKind):void;
  togglePause():void;
  reset():void;
}
