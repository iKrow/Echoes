export type Team = 'ally' | 'enemy';
export type Origin = 'Human' | 'Beastkin' | 'Construct' | 'Mythic';
export type Role = 'Vanguard' | 'Slayer' | 'Warden' | 'Arcanist' | 'Mystic';
export type Affinity = 'Tide' | 'Pyre' | 'Root' | 'Gale' | 'Arc' | 'Radiant' | 'Umbral' | 'Null';
export type SkillKind = 'basic' | 'skill' | 'forkAlt' | 'ultimate';
export type TargetType = 'enemy' | 'ally' | 'self' | 'allEnemies' | 'allAllies';
export type BattleMode = 'pve' | 'pvp';
export type StatusKind = 'buff' | 'debuff';

export interface StatusEffect {
  id: string;
  name: string;
  kind: StatusKind;
  stacks?: number;
  remainingAV?: number;
  icon?: string;
}

export interface SkillDefinition {
  id: string;
  name: string;
  kind: SkillKind;
  icon: string;
  targetType: TargetType;
  cooldownAV: number;
  currentCooldownAV: number;
  power: number;
  description: string;
}

export interface UnitDefinition {
  id: string;
  name: string;
  team: Team;
  origin: Origin;
  role: Role;
  affinity: Affinity;
  level: number;
  hp: number;
  maxHp: number;
  speed: number;
  momentum: number;
  resolve: number;
  nextAt: number;
  portrait: string;
  battleModel: string;
  statuses: StatusEffect[];
  skills: Record<SkillKind, SkillDefinition>;
}

export interface QueueEntry {
  unitId: string;
  scheduledAt: number;
}

export interface BattleState {
  mode: BattleMode;
  round: number;
  clock: number;
  units: UnitDefinition[];
  queue: QueueEntry[];
  activeUnitId: string;
  selectedTargetId: string | null;
  selectedSkillKind: SkillKind | null;
  battleStatus: 'playing' | 'paused' | 'ended';
  winner?: Team;
}
