export const assets = {
  vesper: { portrait: './public/assets/characters/vesper-portrait.png', model: './public/assets/characters/vesper-model.png', icons: [1,2,3,4].map(n=>`./public/assets/characters/vesper-skill-${n}.png`) },
  aurex: { portrait: './public/assets/characters/aurex-portrait.png', model: './public/assets/characters/aurex-model.png', icons: [1,2,3,4].map(n=>`./public/assets/characters/aurex-skill-${n}.png`) },
  nyra: { portrait: './public/assets/characters/nyra-portrait.png', model: './public/assets/characters/nyra-model.png', icons: [1,2,3,4].map(n=>`./public/assets/characters/nyra-skill-${n}.png`) },
  kaelith: { portrait: './public/assets/characters/kaelith-portrait.png', model: './public/assets/characters/kaelith-model.png', icons: [1,2,3,4].map(n=>`./public/assets/characters/kaelith-skill-${n}.png`) },
  pyre: { portrait: './public/assets/characters/pyre-portrait.png', model: './public/assets/characters/pyre-model.png', icons: [1,2,3,4].map(n=>`./public/assets/characters/pyre-skill-${n}.png`) },
  sesha: { portrait: './public/assets/characters/sesha-portrait.png', model: './public/assets/characters/sesha-model.png', icons: [1,2,3,4].map(n=>`./public/assets/characters/sesha-skill-${n}.png`) },
  lyraen: { portrait: './public/assets/characters/lyraen-portrait.png', model: './public/assets/characters/lyraen-model.png', icons: [1,2,3,4].map(n=>`./public/assets/characters/lyraen-skill-${n}.png`) },
  draven: { portrait: './public/assets/characters/draven-portrait.png', model: './public/assets/characters/draven-model.png', icons: [1,2,3,4].map(n=>`./public/assets/characters/draven-skill-${n}.png`) },
  thaleia: { portrait: './public/assets/characters/thaleia-portrait.png', model: './public/assets/characters/thaleia-model.png', icons: ['./public/assets/characters/thaleia-skill-1.png','./public/assets/characters/thaleia-skill-2.png','./public/assets/characters/thaleia-skill-3.png','./public/assets/characters/thaleia-skill-3.png'] },
  cairn: { portrait: './public/assets/characters/cairn-portrait.png', model: './public/assets/characters/cairn-model.png', icons: [1,2,3,4].map(n=>`./public/assets/characters/cairn-skill-${n}.png`) },
};

const meta = {
  vesper: ['Construct','Arcanist','Arc'], nyra: ['Beastkin','Slayer','Gale'], thaleia: ['Human','Arcanist','Root'], lyraen: ['Human','Slayer','Gale'],
  kaelith: ['Beastkin','Vanguard','Pyre'], cairn: ['Construct','Mystic','Umbral'], draven: ['Human','Slayer','Umbral'], aurex: ['Beastkin','Vanguard','Radiant'],
};
const skillNames = {
  vesper: ['Chrono Shard','Time Lock','Split Second','Event Horizon'],
  nyra: ['Wing Slash','Aerial Hunter','Updraft','Dive Strike'],
  thaleia: ['Stone Lance','Root Bind','Earth Ward','Living Bastion'],
  lyraen: ['Windstep','Gale Mark','Path Reveal','Horizon Strike'],
  kaelith: ['Draconic Lance','Blood Surge','Scarlet Ascent','Rending Impact'],
  cairn: ['Sepulchral Bolt','Rite of Remembrance','Graveshade Field','Tower of the Unending'],
  draven: ['Hollow Cut','Shadow Lunge','Crowned Mark','Reign of Null'],
  aurex: ['Radiant Strike','Sunward Shield','Earthward Impact',"Lion's Advance"],
};

export function makeUnit(id, name, team, hp, speed, nextAt, statuses=[]) {
  const [origin, role, affinity] = meta[id];
  const a = assets[id];
  const names = skillNames[id];
  const kinds = ['basic','skill','forkAlt','ultimate'];
  const skills = Object.fromEntries(kinds.map((kind,i)=>[kind,{
    id:`${id}-${kind}`, name:names[i], kind, icon:a.icons[i], targetType:kind==='ultimate'?'allEnemies':'enemy',
    cooldownAV:[0,2400,2400,5200][i], currentCooldownAV:0, power:[14,22,18,30][i]
  }]));
  return { id,name,team,origin,role,affinity,level:70,hp,maxHp:hp,speed,nextAt,momentum:10,resolve:30,portrait:a.portrait,battleModel:a.model,statuses,skills };
}

export const initialUnits = [
  makeUnit('vesper','Vesper','ally',37429,132,0,[{id:'precision',name:'Precision',kind:'buff',stacks:1,remainingAV:1600},{id:'chrono',name:'Chrono Weave',kind:'buff',stacks:2,remainingAV:2200}]),
  makeUnit('nyra','Nyra','ally',29200,146,520,[{id:'gust',name:'Gust',kind:'buff',remainingAV:1200}]),
  makeUnit('thaleia','Thaleia','ally',33800,106,980,[{id:'focus',name:'Rooted Focus',kind:'buff',remainingAV:2100}]),
  makeUnit('lyraen','Lyraen','ally',27100,151,720,[{id:'mark',name:'Marked',kind:'debuff',remainingAV:800}]),
  makeUnit('kaelith','Kaelith','enemy',41000,121,330,[{id:'fury',name:'Fury',kind:'buff',stacks:2,remainingAV:1800},{id:'exposed',name:'Exposed',kind:'debuff',remainingAV:900}]),
  makeUnit('cairn','Cairn','enemy',45200,94,870,[{id:'warded',name:'Warded',kind:'buff',remainingAV:2600}]),
  makeUnit('draven','Draven','enemy',32600,139,610,[{id:'hollow',name:'Hollow',kind:'debuff',stacks:2,remainingAV:1400}]),
  makeUnit('aurex','Aurex','enemy',50100,89,1170,[{id:'guard',name:'Radiant Guard',kind:'buff',remainingAV:2200}]),
];
