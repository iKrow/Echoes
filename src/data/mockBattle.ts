import assets from './assetManifest.json';
import type { Affinity, Role, SkillKind, TargetType, Team, UnitDefinition } from '../types/battle';

const skillNames: Record<string, [string, string, string, string]> = {
  vesper: ['Chrono Shard', 'Time Lock', 'Split Second', 'Event Horizon'],
  nyra: ['Wing Slash', 'Aerial Hunter', 'Updraft', 'Dive Strike'],
  thaleia: ['Stone Lance', 'Root Bind', 'Earth Ward', 'Living Bastion'],
  lyraen: ['Windstep', 'Gale Mark', 'Path Reveal', 'Horizon Strike'],
  kaelith: ['Draconic Lance', 'Blood Surge', 'Scarlet Ascent', 'Rending Impact'],
  pyre: ['Cinder Claw', 'Hellrush', 'Fault Burst', 'Molten Maelstrom'],
  draven: ['Hollow Cut', 'Shadow Lunge', 'Crowned Mark', 'Reign of Null'],
  cairn: ['Sepulchral Bolt', 'Rite of Remembrance', 'Graveshade Field', 'Tower of the Unending'],
  aurex: ['Radiant Strike', 'Sunward Shield', 'Earthward Impact', "Lion's Advance"],
  sesha: ['Coil Lash', 'Veil Venom', 'Shed Skin', 'Emerald Eclipse'],
};

const unitMeta: Record<string, {origin: UnitDefinition['origin']; role: Role; affinity: Affinity}> = {
  vesper: { origin: 'Construct', role: 'Arcanist', affinity: 'Arc' },
  nyra: { origin: 'Beastkin', role: 'Slayer', affinity: 'Gale' },
  thaleia: { origin: 'Human', role: 'Arcanist', affinity: 'Root' },
  lyraen: { origin: 'Human', role: 'Slayer', affinity: 'Gale' },
  kaelith: { origin: 'Beastkin', role: 'Vanguard', affinity: 'Pyre' },
  pyre: { origin: 'Mythic', role: 'Slayer', affinity: 'Pyre' },
  draven: { origin: 'Human', role: 'Slayer', affinity: 'Umbral' },
  cairn: { origin: 'Construct', role: 'Mystic', affinity: 'Umbral' },
  aurex: { origin: 'Beastkin', role: 'Vanguard', affinity: 'Radiant' },
  sesha: { origin: 'Beastkin', role: 'Mystic', affinity: 'Tide' },
};

function buildSkills(id: string) {
  const names = skillNames[id];
  const icons = assets[id as keyof typeof assets].icons;
  const config: Array<[SkillKind, TargetType, number, number, string]> = [
    ['basic', 'enemy', 0, 14, 'Reliable single-target strike.'],
    ['skill', 'enemy', 2400, 22, 'Primary identity skill with a meaningful cooldown.'],
    ['forkAlt', 'enemy', 2400, 18, 'Exclusive alternate fork of the secondary skill.'],
    ['ultimate', 'allEnemies', 5200, 30, 'High-impact ultimate action.'],
  ];
  return Object.fromEntries(config.map(([kind, targetType, cooldownAV, power, description], index) => [kind, {
    id: `${id}-${kind}`,
    name: names[index],
    kind,
    icon: icons[index] ?? icons[0],
    targetType,
    cooldownAV,
    currentCooldownAV: 0,
    power,
    description,
  }])) as UnitDefinition['skills'];
}

function unit(id: string, name: string, team: Team, hp: number, speed: number, nextAt: number, statuses: UnitDefinition['statuses'] = []): UnitDefinition {
  const meta = unitMeta[id];
  const a = assets[id as keyof typeof assets];
  return {
    id, name, team,
    origin: meta.origin,
    role: meta.role,
    affinity: meta.affinity,
    level: 70,
    hp,
    maxHp: hp,
    speed,
    momentum: 10,
    resolve: 30,
    nextAt,
    portrait: a.portrait,
    battleModel: a.model,
    statuses,
    skills: buildSkills(id),
  };
}

export const initialUnits: UnitDefinition[] = [
  unit('vesper', 'Vesper', 'ally', 37429, 132, 0, [
    { id: 'precision', name: 'Precision', kind: 'buff', stacks: 1, remainingAV: 1600 },
    { id: 'chrono', name: 'Chrono Weave', kind: 'buff', stacks: 2, remainingAV: 2200 },
  ]),
  unit('nyra', 'Nyra', 'ally', 29200, 146, 520, [{ id: 'gust', name: 'Gust', kind: 'buff', remainingAV: 1200 }]),
  unit('thaleia', 'Thaleia', 'ally', 33800, 106, 980, [{ id: 'rooted-focus', name: 'Rooted Focus', kind: 'buff', stacks: 1, remainingAV: 2100 }]),
  unit('lyraen', 'Lyraen', 'ally', 27100, 151, 720, [{ id: 'mark', name: 'Marked', kind: 'debuff', stacks: 1, remainingAV: 800 }]),
  unit('kaelith', 'Kaelith', 'enemy', 41000, 121, 330, [
    { id: 'fury', name: 'Fury', kind: 'buff', stacks: 2, remainingAV: 1800 },
    { id: 'exposed', name: 'Exposed', kind: 'debuff', stacks: 1, remainingAV: 900 },
  ]),
  unit('cairn', 'Cairn', 'enemy', 45200, 94, 870, [{ id: 'warded', name: 'Warded', kind: 'buff', stacks: 1, remainingAV: 2600 }]),
  unit('draven', 'Draven', 'enemy', 32600, 139, 610, [{ id: 'hollow', name: 'Hollow', kind: 'debuff', stacks: 2, remainingAV: 1400 }]),
  unit('aurex', 'Aurex', 'enemy', 50100, 89, 1170, [{ id: 'radiant-guard', name: 'Radiant Guard', kind: 'buff', stacks: 1, remainingAV: 2200 }]),
];

export const playerMeta = {
  ally: { name: 'Eclipse', clan: 'The Vanquishers' },
  enemy: { name: 'Noir', clan: 'Astral Covenant' },
};
