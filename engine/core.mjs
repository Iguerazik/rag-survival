/**
 * RAG SURVIVAL (antigo Ecos de Rune-Midgard) — MOTOR ÚNICO de combate (V23/V24).
 * Roda igual no servidor (online, 60 ticks/s desde a V24; ritmo de jogo da V23 preservado por timerGrid) e no navegador (solo = sala local de 1 jogador).
 * Regras: sem DOM e sem APIs do Node. Mapas, catálogo e lista de cartas chegam por configure().
 * Todo sorteio passa por rand(world): mesma semente + mesmos comandos = mesmo resultado.
 * As entradas contêm só INTENÇÃO (movimento, habilidade, escolha). Nunca HP, dano, alvo ou drop.
 */
import * as D from './dmath.mjs';
import { BLESSINGS, BLESSING_RECIPES, SKILL_COMBOS, CODEX_EVOLUTIONS, PETS, PET_UPGRADES, FORGE_STATS, UTILITY_DROPS, RIFT_SCHEDULE } from './run-data.mjs';
export * as runData from './run-data.mjs';
import { ELEMENT_ORDER, ELEMENT_NAMES, ELEMENT_MATRICES, ELEMENT_LEVELS, MVP_PATTERNS, ITEMS, QUALITY_COUNT, MONSTER_NAMES } from './combat-data.mjs';
export * as combatData from './combat-data.mjs';
export * as dmath from './dmath.mjs';
let maps={},catalog={skills:{},lines:{},starters:{},stages:[[]],classes:{},relics:{},slots:5},SK={},MAX_SLOTS=5,RELICS={};
let CARDS=new Set(),ELEMENTS={};
export let skillCatalog=catalog;
/** Decodifica base64 sem depender de Buffer (Node) nem de atob (navegador antigo). */
const B64='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
export function decodeBase64(text){
 const clean=String(text).replace(/[^A-Za-z0-9+/]/g,''),out=new Uint8Array(Math.floor(clean.length*3/4));
 let bits=0,value=0,n=0;
 for(let i=0;i<clean.length;i++){value=(value<<6)|B64.indexOf(clean[i]);bits+=6;if(bits>=8){bits-=8;out[n++]=(value>>bits)&255;}}
 return n===out.length?out:out.slice(0,n);
}
/**
 * configure({maps, catalog, cards}): maps = conteúdo de server-maps.json, catalog = online-skills.json,
 * cards = ids dos monstros que têm carta (engine/cards-data.mjs).
 */
export function configure(config={}){
 if(config.maps){maps={};for(const [id,map] of Object.entries(config.maps))maps[id]={...map,bits:map.bits||decodeBase64(map.nav)};}
 if(config.catalog){catalog=config.catalog;SK=catalog.skills||{};MAX_SLOTS=catalog.slots||5;RELICS=catalog.relics||{};skillCatalog=catalog;}
 if(config.cards)CARDS=new Set(config.cards);
 if(config.elements)ELEMENTS={...config.elements};
}
export const configured=()=>!!maps.sewer&&!!SK&&Object.keys(SK).length>0;
/** Sorteio com semente (mulberry32). O estado fica no próprio mundo, então dá para salvar e comparar. */
export function rand(world){
 let t=(world.rng=(world.rng+0x6D2B79F5)|0);
 t=Math.imul(t^(t>>>15),t|1);
 t^=t+Math.imul(t^(t>>>7),t|61);
 return ((t^(t>>>14))>>>0)/4294967296;
}
const random=(world,a,b)=>a+rand(world)*(b-a);
const rosters={
 sewer:['thief_female','thief_male','drainliar','cramp'],payon:['archer_skeleton','horong','dokebi','nine_tail'],
 maze:['baphometjr','hunterfly','mantis','sidewinder'],orc:['orc_zombie','orc_skeleton','drainliar','steel_chonchon'],
 geffen:['hunterfly','marionette','whisper','nightmare','deviruchi'],payonfield:['savage','beetle_king','greatestgeneral'],
 glast:['whisper','nightmare','marionette','deviruchi'],mine:['steel_chonchon','hunterfly','cramp','beetle_king'],
 temple:['horong','greatestgeneral','dokebi','sidewinder'],shadow:['deviruchi','nine_tail','baphometjr','nightmare']};
const bosses={sewer:'goldenbug',payon:'moonlight',maze:'baphomet',orc:'orc_hero',geffen:'doppelganger',payonfield:'eddga',glast:'doppelganger',mine:'goldenbug',temple:'baphomet',shadow:'eddga'};
const bossHp={goldenbug:1910,moonlight:1780,baphomet:2120,orc_hero:2560,doppelganger:2950,eddga:3150};
const mobStat={
 thief_female:[32,76,11,2],thief_male:[46,72,13,3],drainliar:[33,90,13,2],cramp:[52,97,15,3],
 archer_skeleton:[42,67,13,3],horong:[48,61,14,3],dokebi:[56,84,15,3],nine_tail:[52,94,16,3],
 baphometjr:[22,69,11,1],hunterfly:[24,106,11,2],mantis:[41,68,14,2],sidewinder:[56,73,17,3],
 orc_zombie:[65,55,17,3],orc_skeleton:[58,74,16,3],steel_chonchon:[43,110,12,2],
 marionette:[55,76,16,3],whisper:[44,83,13,3],nightmare:[82,82,22,4],deviruchi:[70,94,20,4],
 savage:[76,90,20,4],beetle_king:[85,84,21,4],greatestgeneral:[98,30,25,5]};
const jobStat={sword:[120,180,23,75,.68],mage:[85,175,14,310,.73],archer:[98,193,16,400,.65],acolyte:[112,176,17,200,.75],merchant:[125,174,24,85,.86],thief:[100,205,20,85,.5]};
// Alcance dos buffs de grupo (Bênção, Aumentar Agilidade, Angelus…): quem está perto de você.
const PARTY_BUFF_RANGE=200;
const isActive=id=>!!SK[id]&&SK[id].k!=='passive';
const classStage=classId=>{for(const list of Object.values(catalog.classes)){const i=list.indexOf(classId);if(i>=0)return i;}return 0;};
function skillPool(job,stage){const line=catalog.lines[job]||catalog.lines.sword;return (catalog.stages[stage]||catalog.stages[0]).flatMap(tier=>line[tier]||[]);}
const SP_BASE={mage:85,acolyte:75},SP_REGEN={mage:5.4,acolyte:5};
const ZERO_STATS=()=>({dmg:0,aspd:0,speed:0,def:0,regen:0,spregen:0,range:0,dodge:0,zeny:0,crit:0,dbl:0,pickup:0,counter:0,lowhp:0,bashstun:0,spcost:0,cdr:0,autoblitz:0,falcon:0,venom:0,hidden:0,boss:0,drain:0,xp:0,cleave:0,quake:0});
const weapon={sword:'sword',mage:'rod',archer:'bow',acolyte:'rod',merchant:'axe',thief:'knife'};
// Cooperative tuning: groups of two should not receive the density/damage meant for six.
const diff={easy:[.82,.68,1.1],normal:[1,.93,.94],hard:[1.33,1.12,.82],nightmare:[1.72,1.42,.72]};
const teamHealthScale=count=>1+Math.max(0,count-1)*.3;
const MAP_ORDER=['sewer','payon','maze','orc','geffen','payonfield','glast','mine','temple','shadow'];
const mapTier=world=>Math.max(0,MAP_ORDER.indexOf(world.map));
// HP dos monstros cresce com o tempo do mapa (suave no começo, forte no fim) para acompanhar o nível da run.
const hordeGrowth=world=>{const m=clock(world)/60;return 1+m*.14+m*m*.02;};
const teamDamageScale=count=>1+Math.max(0,count-1)*.09;
/* V24.1 · MODO INFINITO: depois do MVP a run continua no mesmo mapa até todos caírem (ou alguém encerrar).
   Hordas MUITO maiores, chegando mais rápido, e EXP de abate multiplicada. A vitória do MVP já fica garantida. */
const ENDLESS={xp:2.5,quota:2.2,quotaCap:260,cap:420,capPerPlayer:70,batch:18,interval:.45};
export const REVIVE_SECONDS=2.8;
export const REVIVE_RADIUS=66;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
/** V24 (60 TPS): o balanceamento da V23 foi feito a 20 ticks/s, em que todo prazo só vence na batida seguinte de 50 ms.
 * Com world.timerGrid=.05 (servidor a 60 TPS), cada prazo é arredondado para cima nessa mesma grade de 50 ms:
 * spawns, cadência de ataque, recargas e durações ficam com o MESMO ritmo da V23, enquanto movimento, colisão,
 * comandos e projéteis passam a ser processados a cada tick (16,7 ms). Sem timerGrid (solo e testes antigos) nada muda. */
function lag(world,d){const g=world.timerGrid;if(!g||!(d>0)||!Number.isFinite(d))return d;return Math.ceil(d/g-1e-6)*g-1e-6;}
const distance=(a,b)=>D.hypot(a.x-b.x,a.y-b.y);

const navIndex=(map,x,y)=>{
 const cx=Math.floor((x+map.w*16)/32),cy=Math.floor((y+map.h*16)/32);
 return cx<0||cy<0||cx>=map.w||cy>=map.h?-1:cy*map.w+cx;
};
export const ARENA_RADIUS=445; // Igual a MVP_ARENA_RADIUS do cliente (expedition.js).
const ARENA=Object.freeze({arena:true,r:ARENA_RADIUS-12,spawn:[0,160]});
export function passable(map,x,y){
 if(map?.arena)return x*x+y*y<map.r*map.r;
 const idx=navIndex(map,x,y);return idx>=0&&!!(map.bits[idx>>3]&(1<<(idx&7)));
}
/** Mapa de navegação atual: o mapa da expedição ou a arena circular da fenda. */
const nav=world=>world.arena?ARENA:(maps[world.map]||maps.sewer);
/** Relógio da expedição: pausa enquanto o grupo está dentro da fenda. */
export const clock=world=>world.time-(world.pausedTime||0)-(world.arena&&world.rift?world.time-world.rift.start:0);
/** Direção no padrão do Ragnarok (0 = sul, 2 = oeste, 4 = norte, 6 = leste), a mesma da tela e dos sprites. */
export const roDir=(dx,dy)=>(Math.round(D.atan2(-dx,dy)/(Math.PI/4))+8)%8;
export const playerSpeed=p=>p.speed*(1+Math.min(.32,Math.floor(p.level/6)*.025)+Math.min(.35,p.modifiers?.speed||0)+Math.min(.4,p.st?.speed||0)+Math.min(.5,p.base?.speed||0));
function segmentClear(map,a,b){
 const d=D.hypot(b.x-a.x,b.y-a.y),steps=Math.max(1,Math.ceil(d/5));
 for(let i=1;i<=steps;i++){const t=i/steps;if(!passable(map,a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t))return false;}
 return true;
}
/** O cliente move X e depois Y a cada quadro; aceitamos o caminho reto ou um dos dois caminhos em L. */
function pathClear(map,a,b){
 if(!passable(map,b.x,b.y))return false;
 if(segmentClear(map,a,b))return true;
 const c1={x:b.x,y:a.y},c2={x:a.x,y:b.y};
 return (segmentClear(map,a,c1)&&segmentClear(map,c1,b))||(segmentClear(map,a,c2)&&segmentClear(map,c2,b));
}
function move(map,actor,dx,dy){if(passable(map,actor.x+dx,actor.y+dy)){actor.x+=dx;actor.y+=dy;}else{
 if(passable(map,actor.x+dx,actor.y))actor.x+=dx;
 if(passable(map,actor.x,actor.y+dy))actor.y+=dy;
}}
// Collision, line of sight and nav grid MUST use the server map, not the random client map.
export function hasSight(map, a, b){
 const dist=distance(a,b),steps=Math.max(1,Math.ceil(dist/13));
 for(let i=1;i<=steps;i++){
  const t=i/steps;if(!passable(map,a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t))return false;
 }
 return true;
}
/** Centro da célula de navegação `index`. */
function cellCenter(map,index){return {x:(index%map.w-map.w/2)*map.cell+map.cell/2,y:(Math.floor(index/map.w)-map.h/2)*map.cell+map.cell/2};}
/** Sala do labirinto em (x, y) (-1 fora das salas ou em mapas sem salas). */
export function roomAt(map,x,y){
 if(!map?.rooms)return -1;
 const col=Math.floor((x+map.w*map.cell/2)/map.cell),row=Math.floor((y+map.h*map.cell/2)/map.cell);
 const room=map.rooms.find(r=>col>=r.x0&&col<=r.x1&&row>=r.y0&&row<=r.y1);return room?room.index:-1;
}
/** Ponto livre perto de (x, y) que o jogador `p` alcança (no labirinto: na mesma sala). */
function openNear(world,p,x,y){
 const map=nav(world),at=nearestOpen(map,x,y),room=roomAt(map,p.x,p.y);
 if(room<0||roomAt(map,at.x,at.y)===room)return at;
 const c=map.rooms[room].center;return nearestOpen(map,c.x+(x>p.x?60:-60),c.y+(y>p.y?40:-40));
}
function nearestOpen(map,x,y){
 if(map.arena){const d=D.hypot(x,y),limit=map.r-24;return d<=limit?{x,y}:{x:x*limit/d,y:y*limit/d};}
 if(passable(map,x,y))return {x,y};
 for(let radius=16;radius<=240;radius+=16)for(let a=0;a<16;a++){
  const angle=a*Math.PI/8,nx=x+radius*D.cos(angle),ny=y+radius*D.sin(angle);
  if(passable(map,nx,ny))return {x:nx,y:ny};
 }
 return {x:map.spawn[0],y:map.spawn[1]};
}
function flowFor(world,p){
 const map=nav(world),index=navIndex(map,p.x,p.y);
 const cached=world.pathFields.get(p.id);
 if(cached&&cached.goal===index&&cached.expires>world.time)return cached.dist;
 const n=map.w*map.h,dist=new Int32Array(n);dist.fill(-1);
 const queue=new Int32Array(n);let head=0,tail=0;
 if(index>=0&&passable(map,p.x,p.y)){dist[index]=0;queue[tail++]=index;}
 while(head<tail){const v=queue[head++],cx=v%map.w,cy=(v/map.w)|0;
  for(const next of [cx>0?v-1:-1,cx+1<map.w?v+1:-1,cy>0?v-map.w:-1,cy+1<map.h?v+map.w:-1]){
   if(next<0||dist[next]!==-1||!(map.bits[next>>3]&(1<<(next&7))))continue;
   dist[next]=dist[v]+1;queue[tail++]=next;
  }
 }
 world.pathFields.set(p.id,{goal:index,dist,expires:world.time+lag(world,1.4)});return dist;
}
function pursuit(world,m,p){
 const map=nav(world),gap=distance(m,p);
 if(map.arena||(gap<300&&hasSight(map,m,p)))return {dx:(p.x-m.x)/(gap||1),dy:(p.y-m.y)/(gap||1)};
 const dist=flowFor(world,p),at=navIndex(map,m.x,m.y);
 if(at<0||dist[at]<0)return {dx:0,dy:0};
 const cx=at%map.w,cy=(at/map.w)|0;
 let best=at,score=dist[at];
 for(const next of [cx>0?at-1:-1,cx+1<map.w?at+1:-1,cy>0?at-map.w:-1,cy+1<map.h?at+map.w:-1]){
  if(next>=0&&dist[next]>=0&&dist[next]<score){score=dist[next];best=next;}
 }
 const x=(best%map.w-map.w/2)*32+16,y=(((best/map.w)|0)-map.h/2)*32+16;
 const size=D.hypot(x-m.x,y-m.y)||1;return {dx:(x-m.x)/size,dy:(y-m.y)/size};
}
function validJob(job){return jobStat[job]?job:'sword'}
/** opts.seed: semente do sorteio (inteiro). opts.id: identificador do mundo (o servidor usa um UUID). */
export function makeWorld(mapId='sewer',difficulty='easy',members=[],opts={}){
 const map=maps[mapId]||maps.sewer;
 const seed=Number.isFinite(opts.seed)?(opts.seed|0):(Math.random()*4294967296)|0; // sem semente: sorteia uma (fora da simulação)
 const world={id:opts.id||('w'+(seed>>>0).toString(16)),seed,rng:seed,map:mapId,difficulty,phase:'play',time:0,wave:0,kills:0,mobs:[],chests:[],pickups:[],events:[],lastEvent:0,
  players:new Map(),spawnAt:.8,eliteAt:120,bossSpawned:false,bossAlive:false,lootSeq:0,mobSeq:0,finished:false,won:false,
  mapStart:0,mvpActive:false,portal:null,rift:null,arena:false,mazeEvent:null,
  pathFields:new Map(),pendingEffects:[],riftPortal:null,nextRiftAt:180,riftSeq:0,riftKills:0,pausedTime:0,riftsDone:0,pruneAt:2,zones:[],zoneSeq:0,contract:null,nextMagnetAt:55,magnetSeq:0,trials:[]};
 if(opts.timerGrid>0)world.timerGrid=Number(opts.timerGrid);
 if(opts.endless===false)world.endlessMode=false;
 world.contract={stage:0,charge:0,node:null,eliteKills:0,goal:2,done:false,route:null,auto:0,pauseUntil:0};
 // Etapa 5: cronogramas do solo (elites de campo a cada 90 s, fendas pelo encounters.js, itens a cada 65 s).
 world.eliteAt=90;world.fieldEvent=0;world.riftIndex=0;world.nextRiftAt=RIFT_SCHEDULE[0]?.time??Infinity;world.nextMagnetAt=55;
 world.maze=map.rooms?{visits:0,spawned:false,active:false,defeated:false,room:-1,uid:0}:null;
 for(const member of members)addPlayer(world,member);
 // Ímãs escondidos no mapa (RunRelics.seedMap do solo): um Orbe de Experiência e um Ímã de Zeny longe do início.
 for(const kind of ['xpmagnet','zenymagnet'])for(let i=0;i<150;i++){
  const index=Math.floor(rand(world)*map.w*map.h);if(!(map.bits[index>>3]&(1<<(index&7))))continue;
  const c=cellCenter(map,index);if(D.hypot(c.x-map.spawn[0],c.y-map.spawn[1])<300)continue;groundDrop(world,kind,c.x,c.y,1);break;
 }
 return world;
}
/** Atributos da conta (FOR/AGI/VIT/INT/DES/SOR e nível de Base) valem no online: mesmas fórmulas do solo (status.js). */
const JOB_ASPD={sword:152,mage:148,archer:146,acolyte:150,merchant:146,thief:154};
function aspdOf(job,agi,dex){
 const base=JOB_ASPD[job]??152,penalty=Math.min(.96,1-(base-144)/50);
 const correction=agi<205?(Math.sqrt(205)-Math.sqrt(agi))/7.15:0;
 return Math.min(193,Math.floor((base-correction+Math.sqrt(agi*9.999+dex*.19212)*penalty)*100)/100);
}
/** Bônus de equipamento + cartas (Gear.engineBonuses, items.js) com cada número saneado e limitado. */
const GEAR_LIMITS={str:[-20,60],agi:[-20,60],vit:[-20,60],int:[-20,60],dex:[-20,60],luk:[-20,60],crit:[-20,60],hit:[-60,120],flee:[-60,120],
 perfectDodge:[0,40],def:[0,200],mdef:[0,200],weaponAtk:[0,600],weaponMatk:[0,400],spFlat:[0,200],spPct:[-.5,1],spRegen:[0,1],hpPct:[-.5,1],
 hpRegen:[0,20],atkPct:[0,2],spellPct:[0,2],speed:[0,.5],aspdPct:[0,1],autoBash:[0,.5],doubleAttack:[0,10],vsWater:[0,1],earthResist:[0,.9],
 zeny:[0,.2],spCost:[.25,4]};
export function cleanGear(raw){
 const g=raw&&typeof raw==='object'?raw:{},out={};
 for(const [key,[lo,hi]] of Object.entries(GEAR_LIMITS)){const v=Number(g[key]);out[key]=Number.isFinite(v)?clamp(v,lo,hi):(key==='spCost'?1:0);}
 if(!(Number(g.spCost)>0))out.spCost=1;
 out.drains=(Array.isArray(g.drains)?g.drains:[]).slice(0,8).map(d=>[clamp(Number(d?.[0])||0,0,.5),clamp(Number(d?.[1])||0,0,1)]);
 for(const key of ['splash','magicImmune','stunImmune','endure'])out[key]=g[key]===true;
 out.cards=(Array.isArray(g.cards)?g.cards:[]).filter(id=>typeof id==='string'&&CARDS.has(id)).slice(0,16);
 out.items=(Array.isArray(g.items)?g.items:[]).filter(id=>typeof id==='string'&&/^[a-z0-9_]{2,24}$/.test(id)).slice(0,8);
 // Etapa 5: que item está em cada espaço (a forja da run melhora itens equipados).
 out.slots=Object.fromEntries(Object.entries(g.slots&&typeof g.slots==='object'?g.slots:{}).filter(([slot,id])=>/^(weapon|armor|shield|garment|shoes|headgear|accessory[12])$/.test(slot)&&ITEMS[id]));
 return out;
}
/**
 * Atributos derivados do personagem (fórmulas do status.js, as mesmas do solo) + equipamento e cartas.
 * character.gear = Gear.engineBonuses(...) calculado pelo MESMO items.js/cards.js no navegador e no servidor.
 * Sem equipamento informado (convidado sem conta), vale a arma inicial de referência.
 */
export function deriveCharacter(job,character,extra=null){
 const c=character&&typeof character==='object'?character:{};
 const int=(v,lo,hi,d)=>Number.isFinite(Number(v))?clamp(Math.floor(Number(v)),lo,hi):d;
 const lv=int(c.base,1,200,1),raw=c.stats&&typeof c.stats==='object'?c.stats:{};
 const hasGear=!!(c.gear&&typeof c.gear==='object'),g=cleanGear(c.gear);
 // V23 Etapa 3: bênçãos, pet e evoluções do Códex somam nos mesmos atributos do equipamento (como run.bonus no solo).
 if(extra)for(const key of EXTRA_KEYS)if(extra[key])g[key]+=extra[key];
 const s={};for(const k of ['str','agi','vit','int','dex','luk'])s[k]=Math.max(1,int(raw[k],1,130,1)+Math.round(g[k]));
 const ranged=job==='archer',magic=job==='mage'||job==='acolyte',main=ranged?s.dex:s.str;
 const statusAtk=Math.floor(lv/4+main+(ranged?s.str:s.dex)/5+s.luk/3);
 const statusMatk=Math.floor(lv/4+s.int+s.int/2+s.dex/5+s.luk/3);
 const weaponAtk=hasGear?g.weaponAtk:25,weaponMatk=hasGear?g.weaponMatk:15;
 const physical=D.pow(Math.max(1,statusAtk*2+weaponAtk+Math.floor(weaponAtk*main*.005))/27,.55)*(1+g.atkPct);
 const magical=D.pow(Math.max(1,statusMatk+weaponMatk)/17,.55)*(1+g.spellPct);
 const stage=int(c.stage,0,5,0),softDef=Math.floor(s.vit/2+s.agi/5+lv/2),hardDef=g.def,trans=stage>=2?1.25:1;
 // V23: SOR/AGI/DES seguem a regra do solo (status.js): HIT, FLEE, Esquiva Perfeita e CRIT em pontos (%).
 const hit=175+lv+s.dex+Math.floor(s.luk/3)+g.hit,flee=100+lv+s.agi+Math.floor(s.luk/5)+g.flee;
 const perfectDodge=1+Math.floor(s.luk/10)+g.perfectDodge,critPct=1+Math.floor(s.luk*.3)+g.crit;
 const softMdef=Math.floor(s.int+s.vit/5+s.dex/5+lv/4);
 return {lv,s,stage,magic,power:magic?magical:physical,hit,flee,perfectDodge,critPct,
  delay:clamp((200-aspdOf(job,s.agi,s.dex))/(200-aspdOf(job,1,1))/(1+g.aspdPct),.3,1),
  hpMul:(1+(lv-1)*.006)*(1+s.vit/100)*trans*(1+g.hpPct),spMul:(1+(lv-1)*.006)*(1+s.int/100)*trans*(1+g.spPct),spFlat:g.spFlat,
  // DEF do status.js: DEF macia (VIT/AGI/nível) e DEF dura (equipamento) se combinam.
  def:1-(1-softDef/(softDef+120))*(1-hardDef/(hardDef+60)),mdef:(softMdef+g.mdef)/(softMdef+g.mdef+150),
  regen:(Math.max(1,s.vit/5)-1)*.05+g.hpRegen,spRegen:(1+Math.floor(s.int/6)*.1)*(1+g.spRegen),speed:g.speed,
  cdr:magic?Math.min(.3,(s.dex*2+s.int-3)/530*.5):0,gear:g};
}
export function addPlayer(world,member){
 const map=maps[world.map],job=validJob(member.profile?.job);const [hp,speed,damage,range,rate]=jobStat[job];
 const base=deriveCharacter(job,member.character),stage=classStage(member.profile?.classId||job);
 const sp=Math.round((SP_BASE[job]||60)*base.spMul+base.spFlat),max=Math.round(hp*base.hpMul);
 // A habilidade inicial é sempre da etapa atual da classe (o Aprendiz T. começa com Primeiros Socorros, não com a da classe anterior).
 const pool=skillPool(job,stage),preferred=catalog.starters[job]||catalog.starters.sword;
 const starter=pool.includes(preferred)?preferred:(pool.find(isActive)||preferred);
 const i=world.players.size, angle=i*Math.PI/3;
 const p={id:member.id,userId:member.userId||null,job,sp,maxSp:sp,x:map.spawn[0]+D.cos(angle)*24,y:map.spawn[1]+D.sin(angle)*24,
  hp:max,max,dir:0,walk:0,weapon:weapon[job],animKind:'',animType:'sword',animProgress:0,animSkill:'',arena:false,
  speed,damage:damage*base.power,range,rate:rate*base.delay,attackAt:0,skillAt:0,skillSeq:0,xp:0,level:1,needed:xpNeeded(1),zeny:0,kills:0,stats:{},
  base,stage,pool:skillPool(job,stage),st:ZERO_STATS(),relics:{},relicHp:{},buffs:new Map(),shield:0,shieldUntil:0,hiddenUntil:0,
  input:{dx:0,dy:0,attack:true,skill:0,skillSeq:0,revive:false},lastInput:0,hitAt:-99,invulnerableUntil:1.5,strikes:[],
  downedAt:0,reviveProgress:0,reviveBy:null,animStart:0,animDuration:0,animSeq:0,
  claimed:new Set(),cards:[],earned:[],upgrades:0,animUntil:0,skills:{[starter]:1},slots:[starter],choices:[],pendingUps:0,offerAt:0,choiceSeq:0,upgradeSeq:0,
  cooldowns:Object.create(null),cdSpan:Object.create(null),rewardSeq:0,rewardOffer:0,rewardChoices:[],modifiers:{damage:0,hpRegen:0,range:0,attackRate:0,heal:0,speed:0,maxSp:0},lastSkillAt:0,chestQueue:[],
  mvSeq:0,warpSeq:0,moveBudget:24,usesClientMove:false,riftEnterSeq:0,
  character:member.character&&typeof member.character==='object'?member.character:null,
  blessings:{perks:{},synergies:[]},runBonus:{},mods:{},evolutions:[],discoveries:{codex:[],combos:[],synergies:[]},
  comboReady:{},comboCd:{},chainNext:0,shockNext:0,pet:cleanPet(member.character?.pet),petX:0,petY:0,
  // Etapa 5: forja da run, asas e poções (estoque vem da conta/save; o motor conta o que foi ganho e usado).
  forged:{},wings:cleanCount(member.character?.wings,['flywing','butterflywing']),wingsGained:{},wingsUsed:{},
  potions:Math.min(999,Math.max(0,Math.floor(Number(member.character?.potions)||0))),potionsUsed:0,potionNext:0,
  flyNext:0,flyHealUntil:0,flyConfig:cleanFly(member.character?.flyConfig),pursuitAt:0,pursuers:[],warpReady:0,itemSeq:0};
 p.petX=p.x-22;p.petY=p.y+27;
 if(p.pet){rebase(p);p.hp=p.max;p.sp=p.maxSp;}
 if(!passable(map,p.x,p.y)){p.x=map.spawn[0];p.y=map.spawn[1]}
 // Prova da Guilda (1ª classe e transclasse): vale no online para quem ainda não passou.
 const c=member.character,trialStage=c&&[0,4].includes(c.stage)&&!c.guildTrials?.[c.stage]?c.stage:-1;
 p.trialStage=trialStage;p.trialDone=-1;
 if(trialStage>=0&&!world.trials.some(t=>t.job===job&&t.stage===trialStage))world.trials.push({job,stage:trialStage,kills:trialStage===4?48:24,spawned:false});
 world.players.set(member.id,p);return p;
}
function event(world,type,data={}){world.events.push({seq:++world.lastEvent,type,...data});if(world.events.length>60)world.events.splice(0,world.events.length-60)}
export function command(world,id,raw){
 const p=world.players.get(id);if(!p||world.finished||!raw||typeof raw!=='object')return;
 // A browser can request only an INPUT, not its own position, life, targets, damage or loot.
 const number=v=>typeof v==='number'&&Number.isFinite(v)?v:0;
 let dx=clamp(number(raw.dx),-1,1),dy=clamp(number(raw.dy),-1,1);const mag=D.hypot(dx,dy);
 if(mag>1){dx/=mag;dy/=mag;}
 const skill=Number.isInteger(raw.skill)&&raw.skill>=1&&raw.skill<=5?raw.skill:0;
 const skillSeq=Number.isSafeInteger(raw.skillSeq)&&raw.skillSeq>=0&&raw.skillSeq<1_000_000_000?raw.skillSeq:0;
 if(skillSeq>p.skillSeq && skill){p.input.skill=skill;p.skillSeq=skillSeq;}
 p.input.dx=dx;p.input.dy=dy;p.input.attack=raw.attack!==false; // Ressurreição é calculada pela proximidade no servidor.
 p.input.auto=raw.auto===true;
 if(raw.endRun===true&&world.endless)world.endRequested=true; // V24.1: qualquer jogador encerra o modo infinito (todos recebem as recompensas)
 const mv=raw.mv&&typeof raw.mv==='object'?raw.mv:null;
 if(mv)acceptMove(world,p,mv);
 if(Number.isSafeInteger(raw.riftEnter)&&raw.riftEnter>p.riftEnterSeq){p.riftEnterSeq=raw.riftEnter;interact(world,p);}
 // Etapa 5: usar Asa de Mosca, Asa de Borboleta ou Poção de Cura (o motor confere estoque e recarga).
 const use=raw.item&&typeof raw.item==='object'?raw.item:null;
 if(use&&Number.isSafeInteger(use.seq)&&use.seq>p.itemSeq){p.itemSeq=use.seq;if(use.kind==='flywing')useFlyWing(world,p,false);else if(use.kind==='butterflywing')useButterfly(world,p);else if(use.kind==='potion')usePotion(world,p);}
 if((raw.route==='seal'||raw.route==='relic')&&!world.contract.route&&!world.contract.done&&world.contract.stage===0){world.contract.route=raw.route;event(world,'contractRoute',{route:raw.route,by:p.id});}
 const upgrade=raw.upgrade&&typeof raw.upgrade==='object'?raw.upgrade:null;
 if(upgrade && Number.isSafeInteger(upgrade.seq) && upgrade.seq>p.upgradeSeq){
  p.upgradeSeq=upgrade.seq;
  if(p.choices.includes(upgrade.id))learn(world,p,upgrade.id,false);
 }
 
 const reward=raw.reward&&typeof raw.reward==='object'?raw.reward:null;
 if(reward&&Number.isSafeInteger(reward.seq)&&reward.seq>p.rewardSeq){
  p.rewardSeq=reward.seq;
  const found=p.rewardChoices.find(item=>item.id===reward.id);
  if(reward.id==='skip'&&p.rewardChoices.length){
   // Descartar o baú/relicário sem escolher nada.
   p.rewardChoices=[];p.rewardOffer++;event(world,'reward',{player:p.id,item:'skip',stat:'skip',value:0});
   if(p.chestQueue.length)offerReward(world,p,p.chestQueue.shift());
  }else if(found&&found.stat==='relic'){
   // Imbuimentos como no solo: 2 anéis + 1 colar; escolher um espaço ocupado substitui o anterior.
   const relic=RELICS[found.id];
   if(relic){
    const allowed=relic.slot==='ring'?['ring1','ring2']:['necklace'];
    const slot=allowed.includes(reward.slot)?reward.slot:(allowed.find(key=>!p.relics[key])||allowed[0]);
    const previous=p.relicHp[slot]||0,add=relic.hp?Math.round((p.max-previous)*relic.hp):0;
    p.relics[slot]=found.id;p.relicHp[slot]=add;
    p.max=Math.max(20,p.max-previous+add);p.hp=Math.max(1,Math.min(p.max,p.hp+Math.max(0,add-previous)));
   }
   p.rewardChoices=[];p.rewardOffer++;event(world,'reward',{player:p.id,item:found.id,stat:'relic',value:0});
   if(p.chestQueue.length)offerReward(world,p,p.chestQueue.shift());
  }else if(found&&found.stat==='forge'){
   p.forged[found.slot]={...(p.forged[found.slot]||{}),[found.key]:Math.min(4,(p.forged[found.slot]?.[found.key]||0)+1)};
   rebase(p);p.rewardChoices=[];p.rewardOffer++;event(world,'forged',{player:p.id,item:found.item,key:found.key,level:p.forged[found.slot][found.key]});
   if(p.chestQueue.length)offerReward(world,p,p.chestQueue.shift());
  }else if(found&&found.stat==='gear'){
   chooseGear(world,p,found);
   if(p.chestQueue.length)offerReward(world,p,p.chestQueue.shift());
  }else if(found&&found.stat==='blessing'){
   applyBlessing(world,p,found.id);
   p.rewardChoices=[];p.rewardOffer++;event(world,'reward',{player:p.id,item:found.id,stat:'blessing',value:0});
   if(p.chestQueue.length)offerReward(world,p,p.chestQueue.shift());
  }
 }
 p.lastInput=world.time;
}
/**
 * Movimento previsto pelo cliente e VALIDADO aqui: orçamento de velocidade, colisão do mapa do
 * servidor e caminho livre. Posição fora do orçamento é cortada e o cliente reconcilia.
 */
function acceptMove(world,p,mv){
 const seq=mv.seq;
 if(!Number.isSafeInteger(seq)||seq<=p.mvSeq)return;
 p.mvSeq=seq;p.usesClientMove=true;
 // V23.6: carimbo no relógio do próprio jogador (só repassado aos colegas; nunca usado para validar nada).
 if(typeof mv.ct==='number'&&Number.isFinite(mv.ct)&&mv.ct>(p.moveCt||0)&&mv.ct<1e8)p.moveCt=mv.ct;
 // Carimbo de tempo do remetente (no relógio do servidor): os outros jogadores interpolam por ele.
 const stamp=typeof mv.t==='number'&&Number.isFinite(mv.t)?clamp(mv.t,world.time-1,world.time+.05):world.time;
 p.moveT=Math.max(p.moveT||0,stamp);
 if(p.hp<=0||mv.warp!==p.warpSeq)return;
 const x=mv.x,y=mv.y;
 if(typeof x!=='number'||typeof y!=='number'||!Number.isFinite(x)||!Number.isFinite(y))return;
 const map=nav(world);let tx=x,ty=y,d=D.hypot(tx-p.x,ty-p.y);
 if(d<.001)return;
 if(d>p.moveBudget){const k=p.moveBudget/d;tx=p.x+(tx-p.x)*k;ty=p.y+(ty-p.y)*k;d=p.moveBudget;}
 if(pathClear(map,p,{x:tx,y:ty})){p.x=tx;p.y=ty;}
 else{
  const steps=Math.max(1,Math.ceil(d/6)),sx=(tx-p.x)/steps,sy=(ty-p.y)/steps;
  for(let i=0;i<steps;i++){if(passable(map,p.x+sx,p.y))p.x+=sx;if(passable(map,p.x,p.y+sy))p.y+=sy;}
 }
 p.moveBudget=Math.max(0,p.moveBudget-d);
}
function warp(p,x,y,world){
 p.x=x;p.y=y;p.warpSeq++;p.moveBudget=0;p.moveT=world.time;p.invulnerableUntil=Math.max(p.invulnerableUntil,world.time+lag(world,1.6));
 // V25.2: depois de um teleporte a horda não brota em cima do jogador: ~1,5 s de calma e, nos segundos seguintes,
 // os reforços chegam pelas bordas da tela.
 p.spawnCalmUntil=world.time+lag(world,1.5);p.edgeSpawnUntil=world.time+lag(world,8);
}
/** Posição na borda da tela (elipse ~ metade da área visível no PC), para os monstros entrarem andando. */
function edgeSpot(world,map,target,living){
 for(let k=0;k<40;k++){
  const a=random(world,0,Math.PI*2),nx=target.x+D.cos(a)*random(world,600,720),ny=target.y+D.sin(a)*random(world,420,500);
  if(passable(map,nx,ny)&&passable(map,nx+12,ny)&&passable(map,nx,ny+12)&&living.every(p=>D.hypot(nx-p.x,ny-p.y)>380)&&(!map.rooms||roomAt(map,nx,ny)===roomAt(map,target.x,target.y)))return {x:nx,y:ny};
 }
 return null;
}
function spawn(world,id,{elite='',boss=false,at=null,near=null,edge=false}={}){
 const map=nav(world),stats=mobStat[id]||[45,75,14,2];const count=world.players.size;
 const factor=diff[world.difficulty]||diff.normal;
 // V24.1: no MVP o crescimento da horda pesa menos (^0,75): aos 12 min o MVP tinha ~5,6× o HP base e a luta só demorava.
 // ...e o dano do MVP subiu 35% (23 → 31) para a luta ter perigo de verdade.
 const growth=boss?D.pow(hordeGrowth(world),.75):hordeGrowth(world);
 const hp=(boss?bossHp[id]||1900:stats[0])*(boss?2.15:elite?4.3:1)*factor[0]*teamHealthScale(count)*(boss?1.14:1)*growth*(1+mapTier(world)*.2);
 const living=[...world.players.values()].filter(p=>p.hp>0),target=near||living[Math.floor(rand(world)*living.length)]||{x:map.spawn[0],y:map.spawn[1]};
 let x=at?at.x:target.x,y=at?at.y:target.y;
 const fromEdge=!at&&edge?edgeSpot(world,map,target,living):null;
 if(fromEdge){x=fromEdge.x;y=fromEdge.y;}
 for(let k=0;k<(at||fromEdge?0:70);k++){
  const a=random(world,0,Math.PI*2),r=random(world,boss?150:195,boss?230:450);
  const nx=target.x+D.cos(a)*r,ny=target.y+D.sin(a)*r;
  if(passable(map,nx,ny)&&passable(map,nx+12,ny)&&passable(map,nx,ny+12)&&living.every(p=>D.hypot(nx-p.x,ny-p.y)>95)&&(!map.rooms||roomAt(map,nx,ny)===roomAt(map,target.x,target.y))){x=nx;y=ny;break;}
 }
 const safe=nearestOpen(map,x,y);x=safe.x;y=safe.y;
 const m={uid:++world.mobSeq,id,x,y,hp,max:hp,damage:(boss?23*1.35:stats[2])*(elite?1.22:1)*factor[1]*teamDamageScale(count)*(1+mapTier(world)*.1)*(.78+clock(world)/60*.09),
  speed:(boss?77:stats[1])*(elite?1.07:1),xp:stats[3],dir:0,elite:boss?'mvp':elite,r:boss?32:elite?21:13,
  contactAt:0,attackAt:0,hitFlash:0,strike:null,warning:null,riftId:0,riftGuardian:false,riftSeal:false,noLoot:false,
  target:target.id||null,stunUntil:0,slowUntil:0,slowBy:1,poisonUntil:0,poisonDps:0,poisonBy:null,vulnUntil:0,vuln:0,lex:false};world.mobs.push(m);
 // Etapa 4: MVP e elites atacam com aviso no chão (padrões do solo).
 if(boss&&MVP_PATTERNS[id]){m.patterns=MVP_PATTERNS[id].patterns;m.attacks=MVP_PATTERNS[id].attacks;m.patternAt=world.time+lag(world,3);m.gapNext=world.time+lag(world,4);}
 else if(elite==='miniBoss'){const k=(world.eliteCount=(world.eliteCount||0)+1);m.patterns=k%2?['line','circle']:['circle','summons'];
  m.attacks=k%2?['Investida do Comandante','Ruptura Circular']:['Ruptura Circular','Chamar Reforços'];m.patternAt=world.time+lag(world,3);}
 if(elite||boss)event(world,boss?'boss':'elite',{id,uid:m.uid,x,y});
 return m;
}
function groundDrop(world,kind,x,y,amount=1,id=''){
 const map=nav(world),safe=nearestOpen(map,x,y);
 const item={uid:kind+'-'+(++world.lootSeq),kind,x:safe.x,y:safe.y,amount,id};
 world.pickups.push(item);world.pickupRev=(world.pickupRev||0)+1;return item;
}
function defeated(world,m,source){
 if(m.dead)return;m.dead=true;
 if(m.noLoot){event(world,'kill',{uid:m.uid,killer:source.id,elite:null,seal:true});return;}
 world.kills++;source.kills++;
 const zenyChance=(source.base?.gear?.zeny||0)+(source.runBonus?.zeny||0); // Carta Cãibra + Bolso de Poring/Destino Afortunado
 if(zenyChance&&rand(world)<zenyChance){const gain=1+Math.floor(rand(world)*500);source.zeny+=gain;event(world,'cardZeny',{player:source.id,amount:gain,x:Math.round(m.x),y:Math.round(m.y)});}
 const rare=!!m.elite,amount=(m.xp*(1+clock(world)/900)+(rare?12:0))*(world.endless?ENDLESS.xp:1);
 groundDrop(world,'xp',m.x,m.y,Math.round(amount));
 // Drops do solo: Zeny em 55% dos abates (2 a 5+6×mapa), poção vermelha em 4,5% (sem poção azul).
 if(rand(world)<.55||rare)groundDrop(world,'zeny',m.x+8,m.y,(2+Math.floor(rand(world)*(4+mapTier(world)*6)))*(rare?5:1));
 if(rand(world)<.045&&world.pickups.filter(o=>o.kind==='potion').length<12)groundDrop(world,'potion',m.x-5,m.y+5,1);
 // Mesmas chances de carta do modo solo (cards.js / game.js): comum 0,035% · elite 0,045% · miniboss 0,08% · MVP 0,75%.
 // Só monstros que TÊM carta (antes o online sorteava carta até de quem não tem, como Gatuna/Gatuno).
 if(CARDS.has(m.id)&&rand(world)<(m.cardRate??(m.elite==='mvp'?.0075:m.elite==='miniBoss'?.0008:m.elite?.00045:.00035))){
   const card=groundDrop(world,'card',m.x,m.y,1,m.id);
   event(world,'cardDrop',{id:m.id,x:card.x,y:card.y});
 }
 // Etapa 5: asas e ímãs (RunRelics.rollDrops do solo). Asas são consumíveis guardados na conta/save.
 if(!m.summoned&&!m.riftSeal&&!m.trial){
  const tier=m.elite==='mvp'?'mvp':m.special||m.elite==='miniBoss'?'miniBoss':m.elite?'elite':'common';
  for(const [kind,chance] of Object.entries(UTILITY_DROPS[tier]))if(chance>0&&rand(world)<chance&&world.pickups.filter(o=>o.utility).length<30){
   const item=groundDrop(world,{flywing:'flywing',butterflywing:'butterflywing',xpMagnet:'xpmagnet',goldMagnet:'zenymagnet'}[kind],m.x+(kind==='flywing'?22:-22),m.y+26,1);item.utility=true;item.expires=world.time+lag(world,100);
  }
 }
 // Baú verde da forja: 0,05% por abate comum (era 0,11% até a V24; no máximo 5); Comandantes, Guardião dos Portais e Prova da Guilda sempre.
 if(!rare&&!m.trial&&rand(world)<.0005&&world.pickups.filter(o=>o.kind==='forge').length<5)groundDrop(world,'forge',m.x+7,m.y+5,1).expires=world.time+lag(world,70);
 if(m.elite==='miniBoss'&&!m.riftGuardian||m.special||m.trial)groundDrop(world,'forge',m.x+43,m.y+8,1);
 // Baú azul comum: 0,15% por abate (era 0,35% até a V24 — "recompensa demais na run"), no máximo 4 no chão: 1 bênção entre 3.
 if(!rare&&!m.trial&&rand(world)<.0015&&world.pickups.filter(o=>o.kind==='chest'&&o.amount===1).length<4)
  groundDrop(world,'chest',m.x-6,m.y+4,1).expires=world.time+lag(world,65);
 // MVP não solta baú de bênção: o prêmio dele é o tesouro de equipamento (como no solo).
 if(m.special)mazeGuardianDown(world,m,source);
 // V24.1: os 2 guardas de cada fenda não soltam mais baú (eram 3 baús por fenda); o baú da fenda concluída continua.
 else if(rare&&!m.riftGuardian&&m.elite!=='mvp'&&m.elite!=='riftGuard'){
   const box=groundDrop(world,'chest',m.x,m.y,m.elite==='mvp'?3:2);
   event(world,'chestDrop',{x:box.x,y:box.y,mvp:m.elite==='mvp'});
 }
 if(world.pickups.length>220)world.pickups.splice(0,world.pickups.length-220);
 event(world,'kill',{uid:m.uid,killer:source.id,elite:m.elite||null});
 if(m.elite&&m.elite!=='mvp'&&world.contract.stage===1)world.contract.eliteKills++;
 if(m.trial){
  for(const p of world.players.values())if(p.job===m.trial.job&&p.trialStage===m.trial.stage)p.trialDone=m.trial.stage;
  event(world,'trialDone',{job:m.trial.job,name:m.name});
 }
 if(m.elite==='mvp'){
  // Etapa 4: MVP derrotado na arena. Cada jogador escolhe 1 equipamento permanente do tesouro (como no solo);
  // a expedição termina quando todos escolherem ou depois de 25 s.
  world.bossAlive=false;world.mvpDefeated=true;world.finishAt=world.time+lag(world,25);
  for(const p of world.players.values()){p.zeny+=150;if(p.rewardChoices.length){if(p.chestQueue.length<6)p.chestQueue.unshift('mvpgear');}else offerReward(world,p,'mvpgear');}
  event(world,'mvpDown',{boss:m.id,x:Math.round(m.x),y:Math.round(m.y)});
 }
}
const targetable=m=>m.hp>0&&!m.dead;
/* ===================== V23 Etapa 4: elementos ===================== */
/** Multiplicador elemental (tabela do bROWiki em elements.js): ataque de `attack` contra o monstro `id`. */
export function elementFactor(attack,id){
 const el=ELEMENTS[id]||'neutral',level=ELEMENT_LEVELS[id]||1,a=ELEMENT_ORDER.indexOf(attack),t=ELEMENT_ORDER.indexOf(el);
 return ELEMENT_MATRICES[level-1]?.[t]?.[a]??1;
}
/** Imbuimento elemental do colar (Brasão Ígneo, Cristal Glacial...). */
const imbueOf=p=>{for(const id of Object.values(p.relics||{})){const el=RELICS[id]?.el;if(el)return el;}return 'neutral';};
/** Elemento do golpe: elemento fixo da habilidade (catálogo do RO) ou o imbuimento; o raio do Eco do Trovão é Vento. */
export function elementOf(p,skill){
 if(skill==='shock')return 'wind';
 return SK[skill]?.el||imbueOf(p);
}
const weaponType=p=>p.job==='archer'?'bow':p.job==='mage'||p.job==='acolyte'?'staff':p.job==='merchant'?'axe':p.job==='thief'?'dagger':'sword';
/** Nível do monstro (regra do solo): cresce com o nível de Base de quem ele ataca e com o mapa. */
export function mobLevel(world,id,baseLv){
 if(Object.values(bosses).includes(id))return baseLv+10+mapTier(world)*6;
 const tier=Math.max(0,(rosters[world.map]||[]).indexOf(id));
 return Math.max(1,Math.round(baseLv*.7+tier*3+2+mapTier(world)*6));
}
export const CRIT_MULT=1.4;
/** Chance de crítico em % (SOR e itens; Katar dobra). Só ataque físico básico; magia não crita nem erra. */
export function critChance(p){
 if(p.base.magic)return 0;
 const katar=p.job==='thief'&&[1,4,5].includes(p.base.stage);
 return (p.base.critPct+(p.st.crit||0)*100)*(katar?2:1);
}
/** Ataque básico: crítico nunca erra; senão, acerto = 80 + HIT - FLEE do monstro (5% a 100%). */
function basicStrike(world,p,mob){
 if(p.base.magic)return {crit:false,miss:false};
 if(rand(world)*100<critChance(p))return {crit:true,miss:false};
 const lv=mobLevel(world,mob.id,p.base.lv),chance=clamp(80+p.base.hit-(100+2*lv),5,100);
 return {crit:false,miss:rand(world)*100>=chance};
}
/** Esquiva do jogador: Esquiva Perfeita (SOR) e depois FLEE x HIT do monstro; cada monstro além de 2 colado tira 10% do FLEE. */
function evades(world,p,m){
 const perfect=Math.min(60,p.base.perfectDodge+(p.st.dodge||0)*100);
 if(rand(world)*100<perfect)return true;
 const lv=mobLevel(world,m.id,p.base.lv),crowd=Math.max(0,(p.contacts||1)-2);
 const flee=p.base.flee*Math.max(0,1-.1*crowd),chance=clamp(80+175+lv-flee,5,100);
 return rand(world)*100>=chance;
}
const dmgBonus=p=>(1+p.modifiers.damage)*(1+p.st.dmg+(p.hp<p.max*.25?p.st.lowhp:0));
/** Passivas aprendidas + buffs ativos = atributos do momento. */
function refreshStats(world,p){
 const st=ZERO_STATS();
 for(const [id,level] of Object.entries(p.skills)){const def=SK[id];if(def?.k!=='passive')continue;for(const [k,v] of Object.entries(def.stats))st[k]=(st[k]||0)+v*level;}
 for(const [id,buff] of p.buffs){
  if(buff.until<=world.time){p.buffs.delete(id);continue;}
  for(const [k,v] of Object.entries(buff.stats))if(k!=='shield')st[k]=(st[k]||0)+v;
 }
 for(const id of Object.values(p.relics))for(const [k,v] of Object.entries(RELICS[id]?.stats||{}))st[k]=(st[k]||0)+v;
 p.st=st;
}
function applyStatus(world,p,m,st,level){
 if(!st||!targetable(m))return;
 const boss=m.elite==='mvp'||m.riftGuardian;
 for(const key of ['stun','freeze','stone']){
  const spec=st[key];if(!spec||boss||m.riftSeal||rand(world)>=spec[0]+spec[1]*level)continue;
  m.stunUntil=Math.max(m.stunUntil,world.time+lag(world,spec[2]*(m.elite?.5:1)));
 }
 if(st.slow&&!m.riftSeal){m.slowUntil=world.time+lag(world,st.slow[1]);m.slowBy=boss?1-(1-st.slow[0])*.4:st.slow[0];}
 if(st.poison&&!m.riftSeal&&!m.riftGuardian){m.poisonUntil=world.time+lag(world,st.poison[1]);m.poisonDps=Math.max(m.poisonUntil>world.time?m.poisonDps:0,p.damage*st.poison[0]*(1+level*.12)*dmgBonus(p));m.poisonBy=p.id;}
 if(st.vuln){const value=st.vuln[0]+st.vuln[1]*level;m.vuln=m.vulnUntil>world.time?Math.max(m.vuln,value):value;m.vulnUntil=world.time+lag(world,st.vuln[2]);}
 if(st.lex)m.lex=true;
 if(st.knock&&!m.elite&&m.speed>0){const d=distance(p,m)||1;move(nav(world),m,(m.x-p.x)/d*st.knock,(m.y-p.y)/d*st.knock);}
}
function hurtMob(world,p,mob,amount,skill,area,quiet=false,crit=false,proc=false){
 if(!targetable(mob)||!(amount>0))return 0;
 // Etapa 4: fraquezas e resistências elementais (como no solo). Imune: o golpe não causa dano.
 const element=elementOf(p,skill),factor=elementFactor(element,mob.id);
 if(factor===0){if((mob.immuneNote||0)<=world.time){mob.immuneNote=world.time+lag(world,1);event(world,'immune',{by:p.id,x:Math.round(mob.x),y:Math.round(mob.y),el:element});}return 0;}
 amount*=factor;
 if(mob.elite==='mvp')amount*=.87;
 if(mob.elite==='mvp'&&world.contract.done&&world.contract.route==='seal')amount*=1.12; // rota Purificar
 if(mob.elite&&p.st.boss)amount*=1+p.st.boss;
 if(mob.elite&&p.runBonus?.bossDamage)amount*=1+Math.min(.45,p.runBonus.bossDamage); // Juramento do Caçador / Lâmina das Valquírias
 if(mob.vulnUntil>world.time)amount*=1+mob.vuln;
 if(mob.lex){amount*=2;mob.lex=false;}
 if(!p.base.magic&&p.base.gear.vsWater&&ELEMENTS[mob.id]==='water')amount*=1+p.base.gear.vsWater;
 amount=Math.max(1,Math.round(amount));
 if(mob.riftGuardian&&world.rift?.ward)amount=Math.max(1,Math.round(amount*.3));
 const dealt=Math.min(Math.max(0,mob.hp),amount);
 mob.hp-=amount;mob.hitFlash=.25;
 if(p.st.drain&&p.hp>0)p.hp=Math.min(p.max,p.hp+Math.min(amount*p.st.drain,p.max*.015));
 if(mob.riftGuardian&&world.rift&&world.rift.phase===1&&mob.hp<=mob.max*.55){mob.hp=mob.max*.55;riftPhaseTwo(world,mob);}
 if(!quiet)event(world,'hit',{by:p.id,target:mob.uid,x:Math.round(mob.x),y:Math.round(mob.y),area,damage:amount,skill,crit:crit?1:0,...(factor!==1?{el:element,f:factor}:{})});
 if(!proc)onHitEffects(world,p,mob,dealt,skill);
 if(mob.elite==='mvp'&&world.mvpArena?.field)advanceMvpPhases(world,mob);
 if(mob.hp<=0)defeated(world,mob,p);
 return amount;
}
function strikeArea(world,p,center,radius,power,skill,st,level,needSight=true){
 const map=nav(world);let n=0;
 for(const mob of world.mobs){
  if(n>=18)break;
  if(!targetable(mob)||D.hypot(mob.x-center.x,mob.y-center.y)>radius+mob.r*.5)continue;
  if(needSight&&!hasSight(map,center,mob))continue;
  hurtMob(world,p,mob,power,skill,true,n>=6);applyStatus(world,p,mob,st,level);n++;
 }
 return n;
}
const skillRange=(p,def)=>(def.r||0)+(def.r>200?(p.st.range||0)+(p.modifiers.range||0)*.5:0);
// Custo de SP do solo: 6 + 2,2 × recarga (no automático, 60%); Desconto/cartas reduzem.
const spCost=(p,def,level,auto=false)=>Math.max(1,Math.ceil(Math.round(6+def.cd*2.2)*(1-Math.min(.5,p.st.spcost||0))*(p.base.gear?.spCost||1)*(auto?.6:1)));
const SUPPORT=new Set(['heal','healzone','buff','revive']);
function skillCast(world,p,id,closest,visible,auto=false){
 const def=SK[id],level=p.skills[id]||0;if(!def||!level||def.k==='passive')return false;
 if(world.time<(p.cooldowns[id]||0))return false;
 const cost=spCost(p,def,level,auto);if(p.sp<cost)return false;
 const map=nav(world),range=skillRange(p,def),allies=[...world.players.values()];
 let target=null,point={x:p.x,y:p.y};
 switch(def.k){
  case 'melee':case 'bolt':case 'ball':case 'area':case 'zone':
   if(!closest||distance(p,closest)>range)return false;
   target=closest;point={x:target.x,y:target.y};break;
  case 'debuff':{
   const fresh=m=>!(def.st.lex&&m.lex)&&!(def.st.vuln&&m.vulnUntil>world.time+1)&&!(def.st.slow&&m.slowUntil>world.time+1)&&!(def.st.stone&&m.stunUntil>world.time);
   const options=visible.filter(m=>distance(p,m)<=range&&!m.riftSeal&&fresh(m));
   if(!options.length)return false;
   target=options.reduce((a,b)=>b.max>a.max?b:a);point={x:target.x,y:target.y};break;}
  case 'self':if(!visible.some(m=>distance(p,m)<=def.rad+m.r))return false;break;
  case 'trap':{
   if(!closest||distance(p,closest)>300)return false;
   if(world.zones.filter(z=>z.trap&&z.by===p.id&&z.skill===id).length>=2)return false;
   const d=distance(p,closest)||1,step=Math.min(d*.6,90);
   point={x:p.x+(closest.x-p.x)/d*step,y:p.y+(closest.y-p.y)/d*step};
   if(!passable(map,point.x,point.y))point={x:p.x,y:p.y};break;}
  case 'heal':if(def.self?p.hp>=p.max*.86:!allies.some(a=>a.hp>0&&a.hp<a.max*.86&&distance(a,p)<=def.rad))return false;break;
  case 'healzone':if(!allies.some(a=>a.hp>0&&a.hp<a.max*.8&&distance(a,p)<=def.rad+60))return false;break;
  case 'revive':target=allies.find(a=>a.hp<=0&&distance(a,p)<=def.rad);if(!target)return false;point={x:target.x,y:target.y};break;
  case 'buff':{
   const active=p.buffs.get(id);if(active&&active.until>world.time+1)return false;
   if(!closest)return false; // só em combate
   if(def.stats.hidden&&p.hp>p.max*.6)return false; // esconder-se é defensivo
   break;}
  default:return false;
 }
 p.sp-=cost;
 const span=def.cd*(1-Math.min(.5,p.st.cdr+p.base.cdr+(p.modifiers.attackRate||0)*.3+(p.runBonus?.cooldownReduction||0)));
 p.cooldowns[id]=world.time+lag(world,span);p.cdSpan[id]=span;
 const support=SUPPORT.has(def.k),caster=p.job==='mage'||p.job==='acolyte'||support;
 p.animKind=caster?'cast':'attack';p.animStart=world.time;p.animDuration=support?.8:caster?.62:.5;
 p.animUntil=world.time+lag(world,p.animDuration);p.animSkill=id;p.animSeq++;
 if(target&&typeof target.uid==='number'&&(target.x!==p.x||target.y!==p.y))p.dir=roDir(target.x-p.x,target.y-p.y);
 event(world,'combat',{player:p.id,kind:p.animKind,weaponType:weaponType(p),duration:p.animDuration,at:world.time,animSeq:p.animSeq,dir:p.dir,skill:id});
 event(world,'skillCast',{player:p.id,skill:id,name:def.n,x:Math.round(p.x),y:Math.round(p.y),targetX:Math.round(point.x),targetY:Math.round(point.y)});
 const arrive=def.k==='bolt'||def.k==='ball'?.26:def.k==='melee'?.22:support?.5:.45;
 const power=p.damage*(1.25+(def.m||0))*(1+level*.23)*dmgBonus(p)*(id==='falcon'?1+p.st.falcon:1)*widePower(p,id);
 skillCombos(world,p,id,level,target,point);
 world.pendingEffects.push({time:world.time+lag(world,arrive),player:p.id,skill:id,target:target?(target.uid??target.id):null,x:point.x,y:point.y,power,level});
 if(def.k==='bolt'||def.k==='ball')event(world,'projectile',{player:p.id,skill:id,fromX:Math.round(p.x),fromY:Math.round(p.y),toX:Math.round(point.x),toY:Math.round(point.y),duration:arrive});
 return true;
}
function reviveNow(world,down,by,share){
 down.hp=Math.ceil(down.max*share);down.invulnerableUntil=world.time+lag(world,3.5);
 down.reviveProgress=0;down.reviveBy=null;down.downedAt=0;
 event(world,'revived',{player:down.id,by:by.id,hp:down.hp});
}
// Quadro de impacto (combat-animations.js): o golpe só acerta quando a arma encosta/solta o disparo.
const IMPACT={sword:.53,dagger:.43,axe:.64,mace:.60,bow:.62,staff:.63};
function resolveStrikes(world,p,visible){
 if(!p.strikes.length)return;
 const st=p.st,keep=[];
 for(const hit of p.strikes){
  if(world.time<hit.at){keep.push(hit);continue;}
  const closest=world.mobs.find(m=>m.uid===hit.uid);
  // O alvo precisa continuar vivo e ao alcance no quadro de impacto.
  if(!closest||!targetable(closest)||distance(p,closest)>hit.range+(closest.r||12)+25)continue;
  const {power,strike}=hit;
  if(strike.miss){event(world,'miss',{by:p.id,target:closest.uid,x:Math.round(closest.x),y:Math.round(closest.y)});}
  else{const dealt=hurtMob(world,p,closest,power*(strike.crit?CRIT_MULT:1),'',false,false,strike.crit);cardOnHit(world,p,closest,power,dealt,visible);}
  // Golpe básico em um alvo só (regra do solo; o golpe em arco era só do online antigo). Respingo vem de cartas/bênçãos.
  if(!strike.miss&&(st.dbl||p.base.gear.doubleAttack)&&rand(world)<Math.min(.7,st.dbl+p.base.gear.doubleAttack*.05))hurtMob(world,p,closest,power*(strike.crit?CRIT_MULT:1),'doubleattack',false,false,strike.crit);
  if(st.venom)applyStatus(world,p,closest,{poison:[st.venom,4]},1);
  // V25.2 — Melhorias de treino (Aprendiz T. e 1ª transclasse): Golpe Amplo e Onda de Choque no ataque básico.
  if(!strike.miss&&st.cleave){let n=0;for(const m of world.mobs){if(n>=5)break;if(m===closest||!targetable(m)||m.riftSeal||distance(m,closest)>80)continue;hurtMob(world,p,m,power*st.cleave,'treino_amplo',true,true,false,true);n++;}}
  if(!strike.miss&&st.quake&&rand(world)<Math.min(.4,st.quake)){
   strikeArea(world,p,closest,100,power*1.3,'treino_onda',null,1,false);
   event(world,'skillEffect',{by:p.id,x:Math.round(closest.x),y:Math.round(closest.y),skill:'magnum',style:'area',rad:100});
  }
  if(st.autoblitz&&rand(world)<st.autoblitz){
   strikeArea(world,p,closest,70,p.damage*1.7*(1+st.falcon)*dmgBonus(p),'falcon',null,1,false);
   event(world,'skillEffect',{by:p.id,x:Math.round(closest.x),y:Math.round(closest.y),skill:'falcon',style:'area',rad:70});
  }
 }
 p.strikes=keep;
}
function processEffects(world){
 const keep=[];const map=nav(world);
 for(const fx of world.pendingEffects){
  if(world.time<fx.time){keep.push(fx);continue;}
  const p=world.players.get(fx.player);if(!p||p.hp<=0)continue;
  const def=SK[fx.skill],level=fx.level;if(!def)continue;
  const target=typeof fx.target==='number'?world.mobs.find(m=>m.uid===fx.target&&targetable(m)):null;
  const show=(x,y,style)=>event(world,'skillEffect',{by:p.id,x:Math.round(x),y:Math.round(y),skill:fx.skill,style,rad:def.rad||0});
  switch(def.k){
   case 'melee':case 'bolt':
    if(target&&hasSight(map,p,target)){
     if(fx.skill==='bash'&&p.st.bashstun)applyStatus(world,p,target,{stun:[p.st.bashstun,0,1.5]},level);
     hurtMob(world,p,target,fx.power*(def.big&&target.elite?def.big:1),fx.skill,false);
     if(def.kill&&targetable(target)&&!target.elite&&!target.riftSeal&&rand(world)<def.kill*level)hurtMob(world,p,target,target.hp+1,fx.skill,false,true);
     applyStatus(world,p,target,def.st,level);
     if(def.zeny){const gain=Math.round((def.zeny+level)*(1+clock(world)/300));p.zeny+=gain;event(world,'pickup',{player:p.id,kind:'zeny',amount:gain,id:''});}
     show(target.x,target.y,'single');
    }break;
   case 'ball':case 'area':{
    const center=target||{x:fx.x,y:fx.y};
    strikeArea(world,p,center,def.rad*wideRadius(p,fx.skill),fx.power,fx.skill,def.st,level);show(center.x,center.y,'area');break;}
   case 'debuff':
    if(target){
     applyStatus(world,p,target,def.st,level);
     if(def.rad)for(const m of world.mobs)if(m!==target&&targetable(m)&&distance(m,target)<=def.rad)applyStatus(world,p,m,def.st,level);
     show(target.x,target.y,'debuff');
    }break;
   case 'self':
    if(def.m>0)strikeArea(world,p,p,def.rad*wideRadius(p,fx.skill),fx.power,fx.skill,def.st,level);
    else for(const m of world.mobs)if(targetable(m)&&distance(m,p)<=def.rad)applyStatus(world,p,m,def.st,level);
    show(p.x,p.y,'area');break;
   case 'zone':case 'trap':case 'healzone':{
    const trap=def.k==='trap',heal=def.k==='healzone';
    world.zones.push({uid:++world.zoneSeq,skill:fx.skill,by:p.id,x:heal?p.x:fx.x,y:heal?p.y:fx.y,rad:def.rad*(heal?1:wideRadius(p,fx.skill)),
      until:world.time+lag(world,(trap?14:def.dur)),next:world.time+lag(world,(trap?.5:0)),tick:def.tick||.5,power:fx.power,level,trap,heal,el:def.el||''});
    if(world.zones.length>40)world.zones.shift();
    break;}
   case 'heal':{
    // Valores do solo (Curar: 21 HP, Primeiros Socorros: 14 HP; +27% por nível), proporcionais ao HP máximo de quem cura.
    const amount=Math.round(((def.amt?def.amt[0]+def.amt[1]*(level-1):24+level*19)+(p.modifiers.heal||0))*p.max/(jobStat[p.job]?.[0]||100));
    for(const ally of def.self?[p]:world.players.values()){
     if(ally.hp<=0||ally.hp>=ally.max||distance(ally,p)>(def.rad||0)+20)continue;
     const healed=Math.min(amount,ally.max-ally.hp);ally.hp+=healed;
     event(world,'healed',{by:p.id,player:ally.id,amount:Math.round(healed),x:Math.round(ally.x),y:Math.round(ally.y),skill:fx.skill});
    }
    break;}
   case 'buff':{
    const stats={};for(const [k,v] of Object.entries(def.stats))stats[k]=v[0]+v[1]*level;
    const dur=def.dur+(def.durLv||0)*level;
    const targets=def.party?[...world.players.values()].filter(a=>a.hp>0&&distance(a,p)<=PARTY_BUFF_RANGE):[p];
    for(const ally of targets){
     ally.buffs.set(fx.skill,{until:world.time+lag(world,dur),stats});
     if(stats.shield){ally.shield=Math.max(ally.shieldUntil>world.time?ally.shield:0,Math.floor(stats.shield));ally.shieldUntil=world.time+lag(world,dur);}
     if(stats.hidden)ally.hiddenUntil=world.time+lag(world,dur);
     event(world,'skillEffect',{by:p.id,x:Math.round(ally.x),y:Math.round(ally.y),skill:fx.skill,style:'buff',rad:0});
    }
    break;}
   case 'revive':{
    const ally=world.players.get(fx.target);
    if(ally&&ally.hp<=0){reviveNow(world,ally,p,Math.min(1,.2+.2*level));show(ally.x,ally.y,'buff');}
    break;}
  }
 }
 world.pendingEffects=keep;
}
/** Áreas persistentes (Barreira de Fogo, Nevasca, Santuário…) e armadilhas. */
function tickZones(world){
 if(!world.zones.length)return;
 const keep=[];
 for(const z of world.zones){
  if(world.time>=z.until)continue;
  const p=world.players.get(z.by),def=SK[z.skill];if(!p||!def)continue;
  if(z.trap){
   if(world.time>=z.next&&world.mobs.some(m=>targetable(m)&&D.hypot(m.x-z.x,m.y-z.y)<=Math.max(36,z.rad*.45))){
    strikeArea(world,p,z,z.rad,z.power,z.skill,def.st,z.level,false);
    event(world,'skillEffect',{by:p.id,x:Math.round(z.x),y:Math.round(z.y),skill:z.skill,style:'area',rad:z.rad});
    continue;
   }
  }else if(world.time>=z.next){
   z.next=world.time+lag(world,z.tick);
   if(z.heal){
    const amount=Math.ceil(10+z.level*6+p.damage*.25+p.modifiers.heal*.4);
    for(const ally of world.players.values()){
     if(ally.hp<=0||ally.hp>=ally.max||distance(ally,z)>z.rad)continue;
     const healed=Math.min(amount,ally.max-ally.hp);ally.hp+=healed;
     event(world,'healed',{by:p.id,player:ally.id,amount:Math.round(healed),x:Math.round(ally.x),y:Math.round(ally.y),skill:z.skill});
    }
   }else if(def.m>0)strikeArea(world,p,z,z.rad,z.power,z.skill,def.st,z.level,false);
   else for(const m of world.mobs)if(targetable(m)&&D.hypot(m.x-z.x,m.y-z.y)<=z.rad)applyStatus(world,p,m,def.st,z.level);
   event(world,'skillEffect',{by:p.id,x:Math.round(z.x),y:Math.round(z.y),skill:z.skill,style:'pulse',rad:z.rad});
  }
  keep.push(z);
 }
 world.zones=keep;
}
function learn(world,p,id,automatic){
 const rune=runeInfo(id);
 if(rune){
  // Runa de habilidade: Cadeia Rúnica / Propagação / Área Amplificada (no máximo 2 de cada por habilidade).
  if(!p.slots.includes(rune.skill)||(modOf(p,rune.skill)[rune.key]||0)>=2)return;
  p.mods[rune.skill]={...modOf(p,rune.skill),[rune.key]:(modOf(p,rune.skill)[rune.key]||0)+1};
  p.upgrades++;p.choices=[];p.offerAt=0;p.pendingUps=Math.max(0,p.pendingUps-1);
  event(world,'rune',{player:p.id,id,name:rune.n,level:p.mods[rune.skill][rune.key],automatic});
  offerUpgrade(world,p);return;
 }
 if(!SK[id])return;
 p.skills[id]=(p.skills[id]||0)+1;
 if(isActive(id)&&!p.slots.includes(id))p.slots.push(id);
 if(checkEvolutions(world,p))rebase(p);
 p.upgrades++;p.choices=[];p.offerAt=0;p.pendingUps=Math.max(0,p.pendingUps-1);
 event(world,'upgrade',{player:p.id,skill:id,level:p.skills[id],automatic});
 offerUpgrade(world,p);
}
/** Três opções por nível, sorteadas entre TODAS as habilidades da classe (no máximo 5 ativas por run). */
function offerUpgrade(world,p){
 if(p.choices.length||p.pendingUps<=0)return;
 const full=p.slots.length>=MAX_SLOTS;
 const options=p.pool.filter(id=>(p.skills[id]||0)<SK[id].max&&(!isActive(id)||p.slots.includes(id)||!full));
 if(!options.length&&!(p.level>=3&&runeOptions(p).length)){p.pendingUps=0;return;}
 for(let i=options.length-1;i>0;i--){const j=Math.floor(rand(world)*(i+1));[options[i],options[j]]=[options[j],options[i]];}
 p.choices=options.slice(0,3);
 // A partir do nível 3 da run, uma das opções pode ser uma runa para uma habilidade já aprendida (como no solo).
 const runes=runeOptions(p);
 if(runes.length&&p.level>=3){const pick=runes[Math.floor(rand(world)*runes.length)];if(p.choices.length>=3)p.choices.splice(2,1,pick);else p.choices.push(pick);}
 p.offerAt=world.time;p.choiceSeq++;
}
/** Efeitos das cartas no ataque físico básico (iguais ao basicHit do solo): roubo de HP, Golpe Fulminante
 * automático (Carta Bongun) e dano em área 3x3 (Carta Bafomé). Magia não ativa efeitos de golpe. */
function cardOnHit(world,p,target,power,dealt,visible){
 const g=p.base.gear;if(p.base.magic||!(dealt>0))return;
 for(const [chance,share] of g.drains){
  if(rand(world)>=chance||p.hp<=0)continue;
  const second=Math.floor(world.time);if(p.drainSecond!==second){p.drainSecond=second;p.drainUsed=0;}
  const gain=Math.max(0,Math.min(dealt*share,p.max*.015-p.drainUsed,p.max-p.hp));
  if(gain>0){p.drainUsed+=gain;p.hp+=gain;event(world,'drain',{player:p.id,amount:Math.max(1,Math.round(gain)),x:Math.round(p.x),y:Math.round(p.y)});}
 }
 if(g.autoBash&&targetable(target)&&rand(world)<g.autoBash){
  hurtMob(world,p,target,power*1.3,'bash',false);
  applyStatus(world,p,target,{knock:36},1);
  event(world,'skillEffect',{by:p.id,x:Math.round(target.x),y:Math.round(target.y),skill:'bash',style:'single',rad:0});
 }
 if(g.splash)for(const m of visible)if(m!==target&&targetable(m)&&distance(m,target)<=52)hurtMob(world,p,m,power,'',true,true);
}
/* ===================== V23 Etapa 3: bênçãos, runas, pets e Códex ===================== */
/** Atributos que bênçãos, pet e evoluções somam ao personagem (mesmos nomes do run.bonus do solo). */
const EXTRA_KEYS=['str','agi','vit','int','dex','luk','crit','hit','flee','def','mdef','atkPct','spellPct','aspdPct','hpPct','hpRegen','spRegen','speed'];
/** Pet ativo vindo da conta/save: o motor só aceita id e melhorias; bônus e alcance saem da tabela PETS. */
export function cleanPet(raw){
 const id=raw&&typeof raw==='object'?raw.id:null;if(!id||!PETS[id])return null;
 const up=raw.upgrades&&typeof raw.upgrades==='object'?raw.upgrades:{},level=k=>clamp(Math.floor(Number(up[k])||0),0,PET_UPGRADES[k]?.max||0);
 return {id,bonus:{...PETS[id].bonus},range:(PETS[id].range||35)+level('range')*22,
  collect:{zeny:level('pickupGold')>0,xp:level('pickupXp')>0,potion:level('pickupHeals')>0}};
}
/** Pet do save (navegador) ou da conta (servidor): mesmo formato. */
export function petFromSave(save){
 const id=save?.activePet;if(!id||!save?.petsOwned?.[id]||!PETS[id])return null;
 return {id,upgrades:{...(save.petUpgrades||{})}};
}
/** Soma das bênçãos (com combinações), pet e evoluções do Códex: igual a RuneLoot.bonuses + Codex no solo. */
function extraBonus(p){
 const total={};const add=(k,v)=>{total[k]=(total[k]||0)+v;};
 for(const [id,count] of Object.entries(p.blessings.perks)){const b=BLESSINGS[id];if(!b)continue;for(const [k,v] of Object.entries(b.bonus||{}))add(k,v*Math.min(b.cap,count));}
 for(const r of BLESSING_RECIPES)if(p.blessings.perks[r.a]&&p.blessings.perks[r.b])for(const [k,v] of Object.entries(r.bonus))add(k,v);
 total.damageResist=Math.min(.42,total.damageResist||0);total.lifesteal=Math.min(.035,total.lifesteal||0);total.cooldownReduction=Math.min(.31,total.cooldownReduction||0);
 for(const levels of Object.values(p.forged||{}))for(const [k,v] of Object.entries(levels))add(k,v*(FORGE_STATS[k]||0));
 if(p.pet)for(const [k,v] of Object.entries(p.pet.bonus))add(k,v);
 for(const id of p.evolutions)for(const [k,v] of Object.entries(CODEX_EVOLUTIONS[id]?.bonus||{}))add(k,v);
 return total;
}
/** Recalcula atributos (equipamento + bônus da run) sem perder o que a run já ganhou (níveis, baús, imbuimentos). */
function rebase(p){
 const old=p.base,extra=extraBonus(p),next=deriveCharacter(p.job,p.character,extra),[hp]=jobStat[p.job];
 const oldMax=Math.round(hp*old.hpMul),newMax=Math.round(hp*next.hpMul);
 const oldSp=Math.round((SP_BASE[p.job]||60)*old.spMul+old.spFlat),newSp=Math.round((SP_BASE[p.job]||60)*next.spMul+next.spFlat);
 p.max=Math.max(20,p.max-oldMax+newMax);p.hp=Math.min(p.max,p.hp);
 p.maxSp=Math.max(1,p.maxSp-oldSp+newSp);p.sp=Math.min(p.maxSp,p.sp);
 p.damage*=next.power/old.power;p.rate*=next.delay/old.delay;p.base=next;p.runBonus=extra;
}
/** Troca de equipamento no meio da partida (solo): recalcula os atributos sem perder o que a run já ganhou. */
export function updateCharacter(world,id,character){
 const p=world.players.get(id);if(!p)return false;
 p.character=character&&typeof character==='object'?character:null;
 checkEvolutions(world,p);rebase(p);return true;
}
const gearItems=p=>cleanGear(p.character?.gear).items;
/** Evolução do Códex: habilidade nv. 2+ e o item certo equipado (como Codex.check no solo). */
function checkEvolutions(world,p){
 const worn=new Set(gearItems(p));let changed=false;
 for(const [id,r] of Object.entries(CODEX_EVOLUTIONS)){
  if(p.evolutions.includes(id)||(p.skills[r.skill]||0)<2||!worn.has(r.item))continue;
  p.evolutions.push(id);changed=true;
  if(!p.discoveries.codex.includes(id))p.discoveries.codex.push(id);
  event(world,'evolution',{player:p.id,id,name:r.name});
 }
 return changed;
}
/* ---- Bênçãos (RuneLoot do solo) ---- */
const blessingRank=(p,id)=>Math.max(0,Number(p.blessings.perks[id]||0));
/** 3 bênçãos ponderadas, igual a RuneLoot.options do solo (sorteio pela semente do mundo). */
function blessingOptions(world,p,ctx){
 const stage=clamp(Number(ctx.mapTier)||0,0,9),special=ctx.source==='elite'||ctx.source==='maze'||ctx.source==='rift';
 const maxGrade=stage>=5?3:stage>=2?2:special?2:1;
 // V25.2: quem não tem habilidade de dano no kit (Aprendiz T.) não recebe bênção que só serve para habilidades
 // (recarga, SP, dano mágico de habilidade).
 const skillDamage=[...p.slots,...p.pool].some(id=>DAMAGE_KINDS.has(SK[id]?.k));
 const skillOnly=b=>Object.keys(b.bonus||{}).every(k=>SKILL_ONLY_BONUS.has(k));
 const list=Object.entries(BLESSINGS).filter(([id,b])=>(!b.classes||b.classes.includes(ctx.family))&&blessingRank(p,id)<b.cap&&(b.grade<=maxGrade||ctx.source==='mvp')&&(skillDamage||!skillOnly(b)));
 const picked=[];
 while(picked.length<3&&list.length){
  const weights=list.map(([id,b])=>{
   const current=blessingRank(p,id),matches=BLESSING_RECIPES.some(r=>(r.a===id&&blessingRank(p,r.b))||(r.b===id&&blessingRank(p,r.a)));
   const earlyXp=['wisdom','greed','magnet'].includes(id);
   const grade=D.pow(b.grade,special?1.2:-.9);
   return Math.max(.01,(current?1.2:1.7)*(matches?2.2:1)*(earlyXp&&ctx.time>400?.17:1)*grade);
  });
  const sum=weights.reduce((a,b)=>a+b,0);let roll=Math.min(.999999,rand(world))*sum;
  let index=weights.findIndex(w=>(roll-=w)<0);if(index<0)index=list.length-1;
  picked.push(list.splice(index,1)[0][0]);
 }
 return picked;
}
function applyBlessing(world,p,id){
 const b=BLESSINGS[id];if(!b||blessingRank(p,id)>=b.cap)return false;
 const before=new Set(BLESSING_RECIPES.filter(r=>blessingRank(p,r.a)&&blessingRank(p,r.b)).map(r=>r.id));
 p.blessings.perks[id]=blessingRank(p,id)+1;
 const now=BLESSING_RECIPES.filter(r=>blessingRank(p,r.a)&&blessingRank(p,r.b));
 p.blessings.synergies=now.map(r=>r.id);
 for(const r of now)if(!before.has(r.id)){
  if(!p.discoveries.synergies.includes(r.id))p.discoveries.synergies.push(r.id);
  event(world,'synergy',{player:p.id,id:r.id,name:r.name});
 }
 rebase(p);event(world,'blessing',{player:p.id,id,name:b.name,rank:p.blessings.perks[id],cap:b.cap});
 return true;
}
/* ---- Runas de habilidade (RuneAugments do solo) ---- */
const DAMAGE_KINDS=new Set(['melee','bolt','ball','area','zone','self','trap']);
const SKILL_ONLY_BONUS=new Set(['cooldownReduction','spRegen','spellPct','int']);
const AREA_KINDS=new Set(['ball','area','zone','self','trap']);
const RUNE_NAMES={split:'Cadeia Rúnica',splash:'Propagação',wide:'Área Amplificada'};
const RUNE_TEXT={split:'Acertos desta habilidade ganham +1 salto de cadeia (máx. 2 melhorias).',
 splash:'Espalha 25% do dano em até três inimigos próximos; máx. 2 melhorias.',wide:'Raio +12% e potência +8% por melhoria; máx. 2.'};
const modOf=(p,id)=>p.mods[id]||{};
export const wideRadius=(p,id)=>1+.12*(modOf(p,id).wide||0);
const widePower=(p,id)=>1+.08*(modOf(p,id).wide||0);
function runeOptions(p){
 return p.slots.filter(id=>DAMAGE_KINDS.has(SK[id]?.k)).flatMap(id=>(AREA_KINDS.has(SK[id].k)?['wide','split']:['split','splash'])
  .filter(k=>(modOf(p,id)[k]||0)<2).map(k=>'rune:'+id+':'+k));
}
export function runeInfo(id){
 const [,skill,key]=String(id).split(':');
 return SK[skill]&&RUNE_NAMES[key]?{skill,key,n:RUNE_NAMES[key]+' · '+SK[skill].n,d:RUNE_TEXT[key]}:null;
}
/* ---- Efeitos de acerto (bênçãos e runas): roubo de vida, lentidão, queimadura, raio, cadeia e propagação ---- */
function onHitEffects(world,p,mob,dealt,skill){
 if(!(dealt>0)||mob.riftSeal)return;
 const rb=p.runBonus||{},alive=mob.hp>0;
 if(alive&&rb.lifesteal&&p.hp>0){const gain=Math.min(dealt*rb.lifesteal,Math.max(0,p.max-p.hp),p.max*.015);p.hp+=gain;}
 if(alive&&targetable(mob)){
  if(rb.slowChance&&rand(world)<rb.slowChance){const boss=mob.elite==='mvp'||mob.riftGuardian;mob.slowUntil=Math.max(mob.slowUntil,world.time+lag(world,2));mob.slowBy=boss?.84:.6;}
  if(rb.igniteChance&&!mob.riftGuardian&&rand(world)<rb.igniteChance){mob.poisonUntil=world.time+lag(world,2.4);mob.poisonDps=Math.max(mob.poisonUntil>world.time?mob.poisonDps:0,dealt*.085/.6);mob.poisonBy=p.id;}
 }
 if(alive&&rb.procShock&&rand(world)<rb.procShock&&p.shockNext<=world.time){
  p.shockNext=world.time+lag(world,.9);let best=null,gap=125;
  for(const m of world.mobs)if(m!==mob&&targetable(m)){const d=distance(m,mob);if(d<gap){gap=d;best=m;}}
  if(best){hurtMob(world,p,best,dealt*.24,'shock',false,false,false,true);event(world,'chain',{player:p.id,x:Math.round(mob.x),y:Math.round(mob.y),tx:Math.round(best.x),ty:Math.round(best.y)});}
 }
 // Cadeia Rúnica: a partir do nível 3 da run, um acerto salta para mais 2 inimigos (+1 por runa), a cada 1,1 s.
 if(p.level>=3&&p.chainNext<=world.time){
  p.chainNext=world.time+lag(world,1.1);
  const rank=modOf(p,skill).split||0,hops=2+rank,hit=new Set([mob.uid]);let origin=mob;
  for(let i=0;i<hops;i++){
   let next=null,best=165;
   for(const m of world.mobs){if(!targetable(m)||hit.has(m.uid)||m.riftSeal)continue;const d=distance(origin,m);if(d<best){best=d;next=m;}}
   if(!next)break;hit.add(next.uid);
   event(world,'chain',{player:p.id,x:Math.round(origin.x),y:Math.round(origin.y),tx:Math.round(next.x),ty:Math.round(next.y)});
   hurtMob(world,p,next,dealt*(.45+rank*.06)*D.pow(.78,i),skill,true,true,false,true);origin=next;
  }
 }
 // Anel de Niflheim (eco): a cada 2 s um acerto replica 18% do dano em até 3 inimigos próximos.
 if(p.st.echo&&(p.echoNext||0)<=world.time){
  p.echoNext=world.time+lag(world,2);
  const near=world.mobs.filter(m=>m!==mob&&targetable(m)&&!m.riftSeal&&distance(m,mob)<100).sort((a,b)=>distance(a,mob)-distance(b,mob)).slice(0,3);
  for(const m of near)hurtMob(world,p,m,dealt*.18,skill,true,true,false,true);
 }
 const splash=modOf(p,skill).splash||0;
 if(splash){let count=0;for(const m of world.mobs){if(count>=3)break;if(m===mob||!targetable(m)||m.riftSeal||distance(m,mob)>65+splash*15)continue;
  hurtMob(world,p,m,dealt*(.20+splash*.05),skill,true,true,false,true);count++;}}
}
/* ---- Combinações de habilidades (RuneCombos do solo): 1ª habilidade prepara, 2ª dispara em até 6 s ---- */
function skillCombos(world,p,id,level,target,center){
 for(const r of SKILL_COMBOS){
  if(r.family!==p.job)continue;
  if(id===r.second&&(p.comboReady[r.id]??-Infinity)>=world.time&&(p.comboCd[r.id]??0)<=world.time&&(p.skills[r.first]||0)>=2&&(p.skills[r.second]||0)>=2){
   if(r.role==='boss'&&!(target&&targetable(target)&&target.elite))continue;
   delete p.comboReady[r.id];p.comboCd[r.id]=world.time+lag(world,10);
   const power=p.damage*2*(1+(level-1)*.29)*dmgBonus(p);
   const targets=r.role==='boss'?[target]:world.mobs.filter(m=>targetable(m)&&distance(m,center)<145).sort((a,b)=>distance(a,center)-distance(b,center)).slice(0,5);
   for(const m of targets)hurtMob(world,p,m,power*(r.role==='boss'?.65:.38),'combo',true,true,false,true);
   if(!p.discoveries.combos.includes(r.id))p.discoveries.combos.push(r.id);
   event(world,'runeCombo',{player:p.id,id:r.id,name:r.name,role:r.role,x:Math.round(center.x),y:Math.round(center.y)});
  }
  if(id===r.first)p.comboReady[r.id]=world.time+lag(world,6);
 }
}
/* ---- Pet: segue o jogador e coleta (Zeny, EXP, poções) conforme as melhorias compradas ---- */
function movePet(p,dt){
 if(!p.pet)return;const k=Math.min(1,dt*5);p.petX+=(p.x-22-p.petX)*k;p.petY+=(p.y+27-p.petY)*k;
}
function advancePlayer(world,p,dt){
 movePet(p,dt);
 if(p.hp<=0){p.strikes.length=0;return;}
 if(p.flyHealUntil>world.time)p.hp=Math.min(p.max,p.hp+p.max*.03*dt);
 if(p.pursuitAt&&world.time>=p.pursuitAt)flyPursuit(world,p);
 if(p.flyConfig.enabled&&p.hp<p.max*Math.max(.05,Math.min(.5,p.flyConfig.threshold/100)))useFlyWing(world,p,true);
 refreshStats(world,p);
 const map=nav(world),input=p.input,st=p.st;
 const dx=input.dx,dy=input.dy,sp=playerSpeed(p);
 // Clientes V23 enviam a posição prevista (validada em acceptMove); clientes antigos, só a direção.
 if(p.usesClientMove)p.moveBudget=Math.min(sp*.45+16,p.moveBudget+sp*dt*1.15);
 else move(map,p,dx*sp*dt,dy*sp*dt);
 if(Math.abs(dx)+Math.abs(dy)>.01){p.dir=roDir(dx,dy);p.walk+=dt*13;}
 else p.walk=0;
 const hidden=p.hiddenUntil>world.time;
 // Regeneração do solo: HP = VIT/5 × 0,05 + passiva + equipamento; SP = (4,6 conjurador / 3,4) + 0,1 por nível da run.
 p.hp=Math.min(p.max,p.hp+dt*(.05+(p.modifiers.hpRegen||0)+st.regen+p.base.regen)*(hidden?3:1));
 p.sp=Math.min(p.maxSp,p.sp+dt*(((p.job==='mage'||p.job==='acolyte'?4.6:3.4)+p.level*.1)*p.base.spRegen+st.spregen));
 // V23.6: a escolha de habilidade não some mais sozinha (antes escolhia a 1ª opção depois de 18 s).
 const reach=Math.max(525,p.range+st.range+120);
 const visible=world.mobs.filter(m=>targetable(m)&&distance(m,p)<=reach&&hasSight(map,p,m));
 resolveStrikes(world,p,visible);
 let closest=null,best=Infinity;for(const m of visible){const d=distance(m,p);if(d<best){best=d;closest=m;}}
 if(!hidden&&closest&&world.time>=p.attackAt&&input.attack){
  const range=p.range+(p.modifiers.range||0)+st.range+(p.level>6?20:0);
  if(best<=range){
   const power=p.damage*(1+Math.min(1.8,(p.level-1)*.06))*dmgBonus(p);
   p.attackAt=world.time+lag(world,p.rate*(1-Math.min(.6,(p.modifiers.attackRate||0)+st.aspd)));
   p.animKind='attack';p.animStart=world.time;p.animDuration=Math.min(p.job==='archer'?.55:p.job==='merchant'?.61:.48,Math.max(.2,(p.attackAt-world.time)*.95));p.animUntil=world.time+lag(world,p.animDuration);p.animSeq++;p.animSkill='';
   event(world,'combat',{player:p.id,kind:'attack',weaponType:weaponType(p),duration:p.animDuration,at:world.time,animSeq:p.animSeq,dir:p.dir});
   // Solo: crítico/erro sorteados no início do golpe; o dano entra no quadro de impacto da arma.
   const strike=basicStrike(world,p,closest);
   p.strikes.push({at:world.time+lag(world,p.animDuration*(IMPACT[weaponType(p)]||.53)),uid:closest.uid,power,strike,range});
  }
 }
 // Habilidades: manual (teclas 1–5) ou automático. No automático, cura vem primeiro e as demais revezam
 // pela que está pronta há mais tempo, para uma só não gastar todo o SP.
 let casted=false;
 if(!hidden){
  const manual=input.skill?p.slots[input.skill-1]:null;
  if(manual){casted=skillCast(world,p,manual,closest,visible);
   // Tecla apertada e a habilidade não saiu: avisa o motivo (antes não acontecia nada na tela).
   if(!casted&&SK[manual]){const def=SK[manual],lv=p.skills[manual]||1;
    const reason=world.time<(p.cooldowns[manual]||0)?'cooldown':p.sp<spCost(p,def,lv)?'sp':def.k==='heal'||def.k==='healzone'?'full':def.k==='buff'&&p.buffs.get(manual)?.until>world.time+1?'active':'range';
    event(world,'skillFail',{player:p.id,skill:manual,reason});}}
  if(!casted && input.auto && world.time>=p.lastSkillAt){
   const ready=p.slots.filter(id=>world.time>=(p.cooldowns[id]||0))
     .sort((a,b)=>(SUPPORT.has(SK[b].k)&&SK[b].k!=='buff'?1:0)-(SUPPORT.has(SK[a].k)&&SK[a].k!=='buff'?1:0)||(p.cooldowns[a]||0)-(p.cooldowns[b]||0));
   for(const id of ready){if(skillCast(world,p,id,closest,visible,true)){casted=true;break;}}
  }
 }
 if(casted)p.lastSkillAt=world.time+lag(world,.25);
 input.skill=0;
 if(world.time>p.animUntil){p.animKind='';p.animSkill='';}
}
function enemyStep(world,m,dt){
 if(!targetable(m))return;
 if(m.poisonUntil>world.time){
  m.hp-=m.poisonDps*dt;
  if(m.hp<=0){const by=world.players.get(m.poisonBy)||world.players.values().next().value;if(by)defeated(world,m,by);return;}
 }
 if(m.speed<=0&&m.damage<=0)return; // selos da fenda
 if(m.stunUntil>world.time)return;
 const living=[...world.players.values()].filter(p=>p.hp>0&&!(p.hiddenUntil>world.time));
 if(!living.length)return;
 // Cada monstro persegue o jogador para quem nasceu; só troca se ele cair/sumir ou outro estiver bem mais perto.
 const nearest=living.reduce((a,b)=>distance(a,m)<distance(b,m)?a:b);
 let p=world.players.get(m.target);
 if(!p||p.hp<=0||p.hiddenUntil>world.time||distance(m,p)>640||distance(m,nearest)<distance(m,p)*.55){p=nearest;m.target=p.id;}
 if(m.patterns)bossAct(world,m,p);
 if(!targetable(m))return;
 const gap=distance(m,p),direction=pursuit(world,m,p),map=nav(world);
 const speed=m.speed*(m.slowUntil>world.time?m.slowBy:1);
 if(gap>m.r+19){move(map,m,direction.dx*speed*dt,direction.dy*speed*dt);}
 if(m.damage>0&&gap<m.r+21&&hasSight(map,m,p)&&world.time>m.contactAt&&p.invulnerableUntil<world.time){
  m.contactAt=world.time+lag(world,1.18);m.attackUntil=world.time+lag(world,.42);
  if(evades(world,p,m)){p.invulnerableUntil=world.time+lag(world,.5);event(world,'dodged',{player:p.id,x:Math.round(p.x),y:Math.round(p.y)});}
  else if(p.shield>0&&p.shieldUntil>world.time){p.shield--;p.invulnerableUntil=world.time+lag(world,.5);event(world,'blocked',{player:p.id,x:Math.round(p.x),y:Math.round(p.y)});}
  else{
   const g=p.base.gear,dmg=m.damage/(1+Math.floor(p.level/7)*.10)*(1-Math.min(.75,p.st.def+p.base.def))*channeling(world,p)
     *(ELEMENTS[m.id]==='earth'?1-g.earthResist:1)*(g.endure?.92:1)*(1-Math.min(.42,p.runBonus?.damageResist||0));
   p.hp=Math.max(0,p.hp-dmg);p.invulnerableUntil=world.time+lag(world,.85);
   event(world,'hurt',{player:p.id,hp:Math.round(p.hp),x:Math.round(p.x),y:Math.round(p.y)});
   if(p.hp===0){p.downedAt=world.time;p.reviveProgress=0;p.buffs.clear();event(world,'downed',{player:p.id});}
  }
  if(p.hp>0&&p.st.counter&&targetable(m)&&rand(world)<Math.min(.6,p.st.counter))hurtMob(world,p,m,p.damage*2.2*dmgBonus(p),'counter',false);
 }
 m.dir=roDir(direction.dx,direction.dy);
}
export function resolveRevives(world,dt){
 const players=[...world.players.values()];
 for(const down of players){
  if(down.hp>0){down.reviveProgress=0;continue;}
  // Passive revive: stay next to a fallen ally; the server validates the entire time.
  const helpers=players.filter(p=>p.hp>0&&distance(p,down)<=REVIVE_RADIUS);
  if(helpers.length){
   down.reviveProgress+=dt*Math.min(1.6,1+(helpers.length-1)*.2);
   down.reviveBy=helpers[0].id;
   if(down.reviveProgress>=REVIVE_SECONDS)reviveNow(world,down,helpers[0],.46);
  }else{down.reviveProgress=Math.max(0,down.reviveProgress-dt*.6);down.reviveBy=null;}
 }
}
function offerReward(world,p,grade){
 if(grade==='forge'){
  // Forja da expedição (RuneLoot.forge do solo): 3 melhorias temporárias em itens equipados, no máximo 4 por atributo.
  const options=[];
  for(const [slot,id] of Object.entries(cleanGear(p.character?.gear).slots))for(const key of Object.keys(FORGE_STATS))
   if((p.forged[slot]?.[key]||0)<4)options.push({slot,id,key,level:(p.forged[slot]?.[key]||0)+1});
  const picks=[];while(picks.length<3&&options.length)picks.push(...options.splice(Math.min(options.length-1,Math.floor(rand(world)*options.length)),1));
  if(!picks.length){p.zeny+=30;event(world,'chestZeny',{player:p.id,amount:30});if(p.chestQueue.length)offerReward(world,p,p.chestQueue.shift());return;}
  p.rewardChoices=picks.map(o=>({id:'forge:'+o.slot+':'+o.key,stat:'forge',grade:1,value:0,slot:o.slot,item:o.id,n:ITEMS[o.id]?.name||o.id,key:o.key,level:o.level}));
  p.rewardOffer++;event(world,'chestOpened',{player:p.id,grade:'forge'});return;
 }
 if(grade==='mvpgear'){
  const options=rollMvpGear(world,p);
  if(options.length){p.rewardChoices=options.map(o=>({id:o.id,stat:'gear',grade:3,value:0,n:ITEMS[o.id].name,tier:ITEMS[o.id].tier,affixes:o.affixes}));p.rewardOffer++;event(world,'chestOpened',{player:p.id,grade:'mvp'});return;}
  grade=3;
 }
 if(grade==='relic'){
  // Relicário de imbuimento (investigação e fenda), como no solo: 3 opções que o jogador ainda não tem.
  const magic=p.job==='mage'||p.job==='acolyte',owned=new Set(Object.values(p.relics));
  const pool=Object.keys(RELICS).filter(id=>!RELICS[id].for||RELICS[id].for===(magic?'magic':'phys'))
    .map(id=>[id,rand(world)]).sort((a,b)=>Number(owned.has(a[0]))-Number(owned.has(b[0]))||a[1]-b[1]).map(([id])=>id);
  // Sempre oferece um anel e um colar, priorizando os que o jogador ainda não tem (igual ao solo).
  const ring=pool.find(id=>RELICS[id].slot==='ring'),neck=pool.find(id=>RELICS[id].slot==='necklace');
  const options=[ring,neck,...pool.filter(id=>id!==ring&&id!==neck)].filter(Boolean).slice(0,3);
  if(options.length){p.rewardChoices=options.map(id=>({id,stat:'relic',grade:3,value:0}));p.rewardOffer++;event(world,'chestOpened',{player:p.id,grade:'relic'});return;}
  grade=3;
 }
 // V23 Etapa 3: baú azul/elite/MVP dá BÊNÇÃOS da run (regra do solo), escolhidas por cada jogador.
 const source=grade==='maze'?'maze':grade>=3?'mvp':grade===2?'elite':'common';
 const ids=blessingOptions(world,p,{source,mapTier:mapTier(world),family:p.job,time:clock(world)});
 if(!ids.length){const gain=60+mapTier(world)*18;p.zeny+=gain;event(world,'chestZeny',{player:p.id,amount:gain});
  if(p.chestQueue.length)offerReward(world,p,p.chestQueue.shift());return;}
 p.rewardChoices=ids.map(id=>({id,stat:'blessing',grade,value:0,n:BLESSINGS[id].name,d:BLESSINGS[id].desc,g:BLESSINGS[id].grade,
  rank:blessingRank(p,id),cap:BLESSINGS[id].cap,ic:BLESSINGS[id].icon,
  combo:BLESSING_RECIPES.find(r=>(r.a===id&&blessingRank(p,r.b))||(r.b===id&&blessingRank(p,r.a)))?.name||''}));
 p.rewardOffer++;event(world,'chestOpened',{player:p.id,grade});
}
/** Baús de elite, MVP e fenda valem para o GRUPO: cada jogador recebe a própria escolha. */
function shareChest(world,grade,by){
 for(const p of world.players.values()){
  if(p.rewardChoices.length){if(p.chestQueue.length<6)p.chestQueue.push(grade);}
  else offerReward(world,p,grade);
 }
 event(world,'chestShared',{by:by.id,grade});
}
// V23.6: subir de nível ficou ~40% mais lento (menos escolhas em sequência). Mantido: as missões pedem nível 30 na run.
const xpNeeded=level=>Math.ceil(26*D.pow(level,1.42));
function giveExperience(world,amount){
 // XP is shared across the party, including anyone awaiting resurrection.
 for(const p of world.players.values()){
  p.xp+=amount*(1+p.st.xp+(p.runBonus?.xpBonus||0));let guard=0;
  while(p.xp>=p.needed && guard++<8){
   p.xp-=p.needed;p.level++;p.needed=xpNeeded(p.level);
   // Como no solo: subir de nível não cura HP; devolve 25% do SP (no mínimo 8).
   p.max+=5;const healed=0;
   p.damage+=.8*p.base.power;p.maxSp+=1;
   if(p.hp>0)p.sp=Math.min(p.maxSp,p.sp+Math.max(8,p.maxSp*.25));
   p.pendingUps++;offerUpgrade(world,p);
   event(world,'levelUp',{player:p.id,level:p.level,healed:p.hp>0?healed:0});
  }
 }
}
function autoCollect(world){
 const living=[...world.players.values()].filter(p=>p.hp>0),remaining=[];
 for(const item of world.pickups){
  if(item.taken)continue;
  // Poção vermelha (solo): só para quem está ferido e encosta nela; o pet pode buscar.
  const candidates=item.kind==='potion'
   ?living.filter(p=>p.hp<p.max&&(distance(p,item)<24||(p.pet&&p.pet.collect.potion&&D.hypot(p.petX-item.x,p.petY-item.y)<p.pet.range)))
   :living.filter(p=>distance(p,item)<84+p.st.pickup+(p.runBonus?.pickupRadius||0)||
   (p.pet&&p.pet.collect[item.kind]&&D.hypot(p.petX-item.x,p.petY-item.y)<p.pet.range));
  if(!candidates.length){remaining.push(item);continue;}
  const p=candidates.reduce((a,b)=>distance(a,item)<distance(b,item)?a:b);
  if(item.kind==='xp'){giveExperience(world,item.amount);}
  else if(item.kind==='zeny')p.zeny+=Math.round(item.amount*(1+p.st.zeny));
  else if(item.kind==='sppotion'){
   if(p.sp>=p.maxSp*.97){remaining.push(item);continue;}
   p.sp=Math.min(p.maxSp,p.sp+p.maxSp*item.amount/100);
  }
  else if(item.kind==='healing'){const heal=Math.min(p.max-p.hp,p.max*.25);p.hp+=heal;event(world,'healed',{player:p.id,by:'potion',amount:Math.round(heal),x:Math.round(p.x),y:Math.round(p.y),skill:'heal'});}
  else if(item.kind==='zenycache'){const gain=25+mapTier(world)*10;p.zeny+=gain;event(world,'zenyCache',{player:p.id,amount:gain});}
  else if(item.kind==='flywing'||item.kind==='butterflywing'){p.wingsGained[item.kind]=(p.wingsGained[item.kind]||0)+1;event(world,'wing',{player:p.id,kind:item.kind});}
  else if(item.kind==='forge')shareChest(world,'forge',p);
  else if(item.kind==='potion'){
   // Cura do solo: (22 + 5 × Aumentar Recuperação de HP) × (1 + 2% por VIT) × (1 + 0,6% por nível de base acima do 1).
   const amount=(22+5*(p.skills.recovery||0))*(1+p.base.s.vit*.02)*(1+(p.base.lv-1)*.006);
   const heal=Math.max(0,Math.min(amount,p.max-p.hp));p.hp+=heal;
   event(world,'healed',{player:p.id,by:'potion',amount:Math.round(heal),x:Math.round(p.x),y:Math.round(p.y),skill:'heal'});
  }else if(item.kind==='chest')shareChest(world,item.amount,p);else if(item.kind==='relic')shareChest(world,'relic',p);else if(item.kind==='card')p.cards.push(item.id);
  else if(item.kind==='xpmagnet'||item.kind==='zenymagnet'){
   // Orbe de Experiência / Ímã de Zeny: recolhe TUDO daquele tipo que está no chão, para o grupo.
   const want=item.kind==='xpmagnet'?'xp':'zeny';let total=0;
   for(const other of world.pickups)if(other.kind===want&&!other.taken){total+=other.amount;other.taken=true;}
   if(want==='xp'){if(total)giveExperience(world,total);}
   else for(const ally of world.players.values())ally.zeny+=Math.round(total*(1+ally.st.zeny));
   event(world,'magnet',{player:p.id,kind:want,amount:total});
  }
  event(world,'pickup',{player:p.id,kind:item.kind,amount:item.amount,id:item.id});
 }
 const kept=remaining.filter(item=>!item.taken);
 if(kept.length!==world.pickups.length)world.pickupRev=(world.pickupRev||0)+1;
 world.pickups=kept;
}
export function tickWorld(world,dt){
 if(world.finished||world.phase!=='play')return;
 dt=clamp(dt,0,.1);world.time+=dt;
 const now=clock(world);
 const wave=Math.floor(now/120);world.wave=Math.min(6,wave);
 const scale=diff[world.difficulty]||diff.normal;
 if(!world.arena){
  // V22.5: horda progressiva POR JOGADOR. Cada um tem a própria cota de monstros por perto (maior se
  // estiver acompanhado), então quem se afasta do grupo também recebe horda. Elites não contam na cota.
  const players=[...world.players.values()],living=players.filter(p=>p.hp>0),minutes=now/60;
  const common=world.mobs.filter(m=>!m.elite&&!m.riftSeal&&!m.dead);
  world.spawnAt-=dt;
  if(now>=world.pruneAt){
   // Monstros esquecidos longe de todos voltam para a "fila" e reaparecem perto de alguém.
   world.pruneAt=now+2;
   if(living.length)world.mobs=world.mobs.filter(m=>m.elite||m.dead||living.some(p=>Math.abs(m.x-p.x)<1350&&Math.abs(m.y-p.y)<1100));
  }
  if(world.spawnAt<=0&&living.length){
   const raw=6+minutes*10.5+minutes*minutes*.32,E=world.endless;
   const quotaBase=(E?Math.min(ENDLESS.quotaCap,raw*ENDLESS.quota):Math.min(115,raw))/scale[2]; // não reduzir a horda durante o MVP
   const cap=E?Math.min(ENDLESS.cap+players.length*ENDLESS.capPerPlayer,ENDLESS.cap*2):Math.min(280,85+players.length*45); // limite dinâmico para solo e grupos
   let chosen=null,deficit=0;
   for(const p of living){
    if(world.time<(p.spawnCalmUntil||0))continue; // acabou de se teleportar
    const friends=living.reduce((n,a)=>n+(a!==p&&distance(a,p)<520?1:0),0);
    let local=0;for(const m of common)if(Math.abs(m.x-p.x)<760&&Math.abs(m.y-p.y)<620)local++;
    const missing=quotaBase*(1+friends*.6)-local;
    if(missing>deficit){deficit=missing;chosen=p;}
   }
   if(chosen&&common.length<cap){
    const roster=rosters[world.map]||rosters.sewer;
    const batch=Math.min(Math.ceil(deficit),cap-common.length,2+Math.floor(minutes/1.1),E?ENDLESS.batch:10);
    // área vazia (teleporte, corrida para longe…): os reforços entram pelas bordas da tela em vez de surgir ao lado
    const edge=world.time<(chosen.edgeSpawnUntil||0)||deficit>quotaBase*.6;
    for(let n=0;n<batch;n++)spawn(world,roster[Math.floor(random(world,0,roster.length))],{near:chosen,edge});
    world.spawnAt=lag(world,Math.max(.11,(.72-minutes*.065))*scale[2]/(1+(living.length-1)*.5)*(E?ENDLESS.interval:1));
   }else world.spawnAt=lag(world,.2);
  }
  tickContract(world,dt,living);
  // Etapa 5 (eventos de campo do solo): a cada 65 s, a partir dos 55 s, aparece Poção de Cura, Orbe de Experiência
  // ou Bolsa de Zeny a 230 de alguém (no máximo 5 no chão, somem em 95 s).
  if(now>=world.nextMagnetAt&&living.length){
   world.nextMagnetAt+=65;const seq=world.magnetSeq++,kind=['healing','xpmagnet','zenycache'][seq%3];
   if(world.pickups.filter(o=>o.timed).length<5){
    const p=living[Math.floor(rand(world)*living.length)],a=random(world,0,Math.PI*2),at=openNear(world,p,p.x+D.cos(a)*230,p.y+D.sin(a)*230);
    const item=groundDrop(world,kind,at.x,at.y,1);item.timed=true;item.expires=world.time+lag(world,95);
   }
  }
  for(const trial of world.trials){
   if(trial.spawned||world.kills<trial.kills||world.bossSpawned)continue;
   const owner=living.find(p=>p.job===trial.job&&p.trialStage===trial.stage);if(!owner)continue;
   trial.spawned=true;
   const roster=rosters[world.map]||rosters.sewer,id=roster[(trial.stage+1)%roster.length],stats=mobStat[id]||[45,75,14,2];
   const m=spawn(world,id,{elite:'guildTrial',near:owner});
   m.hp=m.max=stats[0]*(trial.stage===4?28:14)*scale[0]*teamHealthScale(players.length);m.damage*=1.25;m.speed=Math.min(126,m.speed*1.1);m.r=22;
   m.name=TRIAL_NAMES[trial.job]?.[trial.stage===4?1:0]||'Prova da Guilda';m.trial={job:trial.job,stage:trial.stage};m.patterns=null;
   event(world,'trial',{name:m.name,job:trial.job});
  }
  // Elites de campo do solo (ZonePressure): 7 eventos, um a cada 90 s; o 4º é um Comandante (miniBoss).
  if(now>=world.eliteAt&&!world.bossSpawned&&living.length){
   const index=world.fieldEvent++,roster=rosters[world.map]||rosters.sewer,id=roster[index%roster.length],commander=index===3;
   const target=living[index%living.length],e=spawn(world,id,{elite:commander?'miniBoss':'elite',near:target});
   // V24.1: elites de campo mais fortes (pedido: "elites muito fáceis"): +60% de HP (Comandante +90%), dano ×1,55 e sem a lentidão de antes.
   e.hp=e.max=e.max*(commander?1.9:1.6);
   e.name=(commander?'Comandante ':'Veterano ')+(MONSTER_NAMES[id]||id);e.speed=Math.max(60,e.speed*1.05);e.damage*=1.55;
   e.patterns=index%2?['line','circle']:['circle','summons'];e.attacks=index%2?['Investida do Comandante','Ruptura Circular']:['Ruptura Circular','Chamar Reforços'];e.patternAt=world.time+lag(world,3);
   event(world,'fieldElite',{name:e.name,uid:e.uid});
   world.eliteAt=world.fieldEvent<7?(world.fieldEvent+1)*90:Infinity;
  }
  // Fendas no cronograma do solo (encounters.js): 2, 4, 6 (Comandante), 8 e 10 minutos; o portal dura 110 s.
  if(now>=world.nextRiftAt&&!world.riftPortal&&!world.arena&&!world.bossSpawned&&!world.maze?.active){
   const alive=living[0];
   if(alive){const index=world.riftIndex,safe=openNear(world,alive,alive.x+95,alive.y+45);
    world.riftPortal={x:safe.x,y:safe.y,active:true,id:++world.riftSeq,index,kind:RIFT_SCHEDULE[index]?.kind||'elite',expires:world.time+lag(world,110),activated:false};
    event(world,'riftOpen',{x:safe.x,y:safe.y,index});
   }
   world.riftIndex++;world.nextRiftAt=RIFT_SCHEDULE[world.riftIndex]?.time??Infinity;
  }
  if(world.riftPortal){
   const r=world.riftPortal;
   if(world.time>r.expires||world.bossSpawned){world.riftPortal=null;event(world,'riftClosed');}
   // V23.6: só entra com E (ou o botão), perto do portal; pisar não faz nada.
  }
  if(now>=(world.mvpAt||720) && !world.bossSpawned){world.bossSpawned=true;world.mvpActive=true;world.riftPortal=null;
   // V23.6: o MVP vem para o MAPA (nos dois modos), perto do grupo, e continua chamando reforços a cada 9 s.
   const p=living[0]||players[0];
   const boss=spawn(world,bosses[world.map],{boss:true,near:p});world.bossAlive=true;
   world.mvpArena={start:world.time,by:p.id,addsAt:world.time+lag(world,9),boss:boss.uid,field:true,phase:1};
   event(world,'mvpWarning',{name:MVP_PATTERNS[boss.id]?.name||boss.id,x:boss.x,y:boss.y});
   summonMvpReinforcements(world,boss,4,'arrival');
   event(world,'mvpEnter',{by:p.id,boss:boss.id,name:MVP_PATTERNS[boss.id]?.name||boss.id,field:true});
  }
 }
 if(world.pickups.some(o=>o.expires&&o.expires<=world.time)){world.pickups=world.pickups.filter(o=>!(o.expires<=world.time));world.pickupRev=(world.pickupRev||0)+1;}
 for(const player of world.players.values())advancePlayer(world,player,dt);
 processEffects(world);
 tickZones(world);
 for(const p of world.players.values()){let n=0;if(p.hp>0)for(const m of world.mobs)if(targetable(m)&&m.damage>0&&distance(m,p)<m.r+24)n++;p.contacts=n;}
 for(const mob of world.mobs)enemyStep(world,mob,dt);
 resolveRevives(world,dt);
 world.mobs=world.mobs.filter(m=>m.hp>0);
 autoCollect(world);
 if(world.arena&&world.rift)tickRift(world);
 if(world.mvpArena)tickMvpArena(world);
 if(world.finished)return;
 if(world.endless&&world.endRequested){endEndless(world,'stop');return;}
 if([...world.players.values()].every(p=>p.hp<=0)){
  if(world.endless){endEndless(world,'fallen');return;}
  world.phase='loss';world.finished=true;event(world,'defeat');
 }
}
/** Fim do modo infinito: a run termina como VITÓRIA (o MVP já tinha caído), com o tempo sobrevivido. */
function endEndless(world,reason){
 world.finished=true;world.phase='win';world.won=true;
 event(world,'endlessEnd',{reason,seconds:Math.round(world.time-world.endless.start)});
 event(world,'victory',{boss:world.endless.boss,endless:true});
}
const TRIAL_NAMES={sword:['Cavaleiro da Provação','Guardião das Runas'],mage:['Conjurador de Geffen','Sentinela Elemental'],archer:['Caçador da Guilda','Lobo do Desafio'],
 acolyte:['Discípulo da Luz','Protetor de Yggdrasil'],merchant:['Ferreiro da Prova','Autômato da Forja'],thief:['Sombra da Guilda','Executor da Meia-noite']};
/** Missão da expedição no online (igual à do solo, para o grupo): investigar → caçar elites → consagrar. */
/** Missão da expedição (regra do solo): escolher a rota (Purificar ou Relíquia; 3 s no selo sem escolher = Relíquia),
 * investigar 6 s, caçar elites (2, ou 3 na Relíquia) e consagrar 10 s. Dano recebido no selo atrasa 0,5 s. */
function tickContract(world,dt,living){
 const q=world.contract;if(q.done||world.bossSpawned||world.arena||!living.length)return;
 if(q.stage===1){
  if(q.eliteKills>=q.goal){q.stage=2;q.charge=0;q.node=null;event(world,'contract',{stage:2});}
  return;
 }
 if(!q.node){const p=living[0],at=openNear(world,p,p.x+(q.stage?150:100),p.y+(q.stage?60:0));q.node={x:Math.round(at.x),y:Math.round(at.y)};}
 const close=living.filter(p=>distance(p,q.node)<138).length;
 if(!q.route){
  if(!close){q.auto=0;return;}
  q.auto+=dt;if(q.auto<3)return;
  q.route='relic';event(world,'contractRoute',{route:'relic',auto:true});
 }
 if(close&&world.time>=q.pauseUntil)q.charge+=dt*Math.min(1.6,1+(close-1)*.3);else if(!close)q.charge=Math.max(0,q.charge-dt*.12);
 const need=q.stage===0?6:10;
 if(q.charge<need)return;
 q.charge=0;
 if(q.stage===0){q.stage=1;q.goal=q.route==='relic'?3:2; /* V23.6: sem baú de anéis/colares (relíquias removidas) */ event(world,'contract',{stage:1,goal:q.goal,route:q.route});}
 else{
  q.done=true;giveExperience(world,q.route==='relic'?90:40);
  // Relíquia: baú de elite (bênção). Purificar: forja e +12% de dano contra o MVP.
  if(q.route==='relic')groundDrop(world,'chest',q.node.x+24,q.node.y,2);else groundDrop(world,'forge',q.node.x+24,q.node.y,1);
  event(world,'contract',{stage:3,route:q.route});
 }
}
const riftVariants=['Selo Rúnico','Ritual Amaldiçoado','Cerco do Comandante'];
function riftSeals(world,guardian,name){
 const roster=rosters[world.map]||rosters.sewer;
 for(let i=0;i<3;i++){
  const a=i*Math.PI*2/3-Math.PI/2;
  const s=spawn(world,roster[0],{elite:'',at:{x:D.cos(a)*210,y:D.sin(a)*210}});
  s.riftSeal=true;s.noLoot=true;s.speed=0;s.damage=0;s.r=14;s.hp=s.max=Math.max(110,guardian.max*.05);s.name=name;
 }
}
function riftPhaseTwo(world,guardian){
 const r=world.rift;if(!r||r.phase!==1)return;
 r.phase=2;r.ward=true;
 for(const m of world.mobs)if(m.riftSeal){m.hp=0;m.dead=true;}
 riftSeals(world,guardian,'Selo da Segunda Fase');
 event(world,'riftPhase',{phase:2});
}
/** Todo o grupo entra junto: posições salvas, mundo principal congelado, arena própria. */
function enterRift(world,by){
 const portal=world.riftPortal;if(!portal||world.arena||world.finished)return false;
 world.riftPortal=null;
 const players=[...world.players.values()];
 const saved={mobs:world.mobs,pickups:world.pickups,positions:new Map(players.map(p=>[p.id,{x:p.x,y:p.y}])),portal:{x:portal.x,y:portal.y}};
 world.mobs=[];world.pickups=[];world.pendingEffects=[];world.zones=[];world.pathFields.clear();
 world.arena=true;
 world.rift={active:true,id:portal.id,index:portal.index,start:world.time,ends:world.time+lag(world,90),by:by.id,saved,ward:true,phase:1,reinforceAt:world.time+lag(world,12),guardian:0};
 players.forEach((p,i)=>warp(p,(i-(players.length-1)/2)*36,160,world));
 const roster=rosters[world.map]||rosters.sewer,count=world.players.size,factor=diff[world.difficulty]||diff.normal;
 const id=portal.mvp||roster[(portal.index+world.wave)%roster.length],stats=mobStat[id]||[45,75,14,2];
 const g=spawn(world,id,{elite:'miniBoss',at:{x:0,y:-110}});
 g.riftGuardian=true;g.hp=g.max=(portal.mvp?(bossHp[id]||1900)*1.6:stats[0]*14)*factor[0]*teamHealthScale(count)*(1+clock(world)/240)*(portal.kind==='miniBoss'&&!portal.mvp?1.25:1);
 g.speed=Math.max(95,Math.min(125,stats[1]*1.1));g.damage=stats[2]*1.45*factor[1]*teamDamageScale(count);g.r=24;
 g.patterns=portal.mvp?MVP_PATTERNS[id].patterns:RIFT_PATTERNS[portal.index%3];g.attacks=portal.mvp?MVP_PATTERNS[id].attacks:g.patterns.map(k=>PATTERN_NAMES[k]);g.patternAt=world.time+lag(world,3);g.gapNext=world.time+lag(world,4);
 if(portal.mvp){world.rift.guardian=g.uid;g.cardRate=.01;g.name=MVP_PATTERNS[id].name;world.rift.mvp=id;world.rift.ward=false;world.rift.phase=0;world.rift.ends=world.time+lag(world,120);world.rift.addsAt=world.time+lag(world,5);
  event(world,'riftEnter',{by:by.id,index:portal.index,name:'Fenda MVP · '+MVP_PATTERNS[id].name,mvp:true});return true;}
 world.rift.guardian=g.uid;
 for(let i=0;i<2;i++){const e=spawn(world,roster[(i+1+portal.index)%roster.length],{elite:'riftGuard',at:{x:(i?1:-1)*150,y:-60}});e.riftId=portal.id;}
 /* (fenda comum: guardas e selos) */
 riftSeals(world,g,'Selo Rúnico');
 event(world,'riftEnter',{by:by.id,index:portal.index,name:riftVariants[portal.index%3]});
 return true;
}
/** Tecla E: o único jeito de usar portais (sair da fenda concluída, portais do labirinto, abrir a fenda). */
function interact(world,p){
 if(p.hp<=0)return false;
 const r=world.rift;
 if(r){if(r.cleared&&distance(p,r.exit)<=110){leaveRift(world,true);return true;}return false;}
 if(world.maze){const map=nav(world),w=map.warps?.find(item=>D.hypot(item.x-p.x,item.y-p.y)<44);if(w)return mazeWarp(world,p,w);}
 return tryEnterRift(world,p,150);
}
function tryEnterRift(world,p,maxDistance){
 if(!world.riftPortal||world.arena||p.hp<=0||distance(p,world.riftPortal)>maxDistance)return false;
 return enterRift(world,p);
}
/* ===================== V23 Etapa 5: consumíveis, labirinto e missão ===================== */
const cleanCount=(raw,keys)=>Object.fromEntries(keys.map(k=>[k,Math.min(999,Math.max(0,Math.floor(Number(raw?.[k])||0)))]));
const cleanFly=raw=>({enabled:raw?.enabled!==false,threshold:clamp(Number(raw?.threshold)||25,5,50)});
const stock=(p,kind)=>(p.wings[kind]||0)+(p.wingsGained[kind]||0)-(p.wingsUsed[kind]||0);
/** Dano recebido perto do selo da missão (canalizando): -38%, e a canalização atrasa 0,5 s (regra do solo). */
function channeling(world,p){
 const q=world.contract;
 if(!q.route||q.done||q.stage===1||!q.node||world.arena||distance(p,q.node)>=138)return 1;
 q.pauseUntil=Math.max(q.pauseUntil,world.time+lag(world,.5));q.charge=Math.max(0,q.charge-.18);return .62;
}
/** Asa de Mosca: teleporta para longe (na mesma sala do labirinto), 2,5 s de proteção, cura 12% em 4 s, recarga 60 s.
 * Elites e chefes que perseguiam reaparecem na borda da tela depois de 3,4 s (V25.2). Pode ser automática abaixo do HP escolhido. */
function useFlyWing(world,p,automatic){
 if(p.hp<=0||world.mvpDefeated||world.time<p.flyNext||stock(p,'flywing')<1)return false;
 const map=nav(world);let dest=null;
 if(world.arena){for(let i=0;i<40;i++){const a=random(world,0,D.PI*2),r=random(world,180,310),c={x:D.cos(a)*r,y:D.sin(a)*r};if(distance(c,p)>200){dest=c;break;}}}
 else{const room=roomAt(map,p.x,p.y);
  for(let i=0;i<160;i++){const index=Math.floor(rand(world)*map.w*map.h);if(!(map.bits[index>>3]&(1<<(index&7))))continue;const c=cellCenter(map,index);
   if(distance(c,p)<280||room>=0&&roomAt(map,c.x,c.y)!==room)continue;dest=c;break;}}
 if(!dest)return false;
 p.wingsUsed.flywing=(p.wingsUsed.flywing||0)+1;
 warp(p,dest.x,dest.y,world);p.invulnerableUntil=Math.max(p.invulnerableUntil,world.time+lag(world,2.5));p.flyNext=world.time+lag(world,60);p.flyHealUntil=world.time+lag(world,4);
 p.pursuers=world.mobs.filter(m=>targetable(m)&&(m.elite||m.trial||m.special||m.riftGuardian)&&m.target===p.id).map(m=>m.uid);p.pursuitAt=p.pursuers.length?world.time+lag(world,3.4):0;
 event(world,'flyWing',{player:p.id,automatic,x:Math.round(p.x),y:Math.round(p.y)});return true;
}
function flyPursuit(world,p){
 const ids=new Set(p.pursuers);p.pursuers=[];p.pursuitAt=0;const map=nav(world),room=roomAt(map,p.x,p.y);
 const list=world.mobs.filter(m=>targetable(m)&&ids.has(m.uid)).slice(0,6);
 list.forEach((m,i)=>{for(let k=0;k<20;k++){const a=(i+k*.16)*D.PI*2/Math.max(1,list.length),r=(k<12?560:215)+k%3*24,at=nearestOpen(map,p.x+D.cos(a)*r,p.y+D.sin(a)*r*.75);
  if(room>=0&&roomAt(map,at.x,at.y)!==room||distance(p,at)<150)continue;m.x=at.x;m.y=at.y;m.warning=null;break;}});
 if(list.length)event(world,'pursuit',{player:p.id,count:list.length});
}
/** Asa de Borboleta: leva o grupo a uma fenda contra um MVP aleatório (120 s, carta 1% na vitória). */
function useButterfly(world,p){
 if(p.hp<=0||world.arena||world.bossSpawned||world.riftPortal||world.maze?.active||stock(p,'butterflywing')<1)return false;
 p.wingsUsed.butterflywing=(p.wingsUsed.butterflywing||0)+1;
 const ids=Object.keys(MVP_PATTERNS),boss=ids[Math.floor(rand(world)*ids.length)];
 world.riftPortal={x:p.x,y:p.y,active:true,id:++world.riftSeq,index:1,kind:'miniBoss',mvp:boss,expires:world.time+lag(world,1)};
 event(world,'butterfly',{player:p.id,boss,name:MVP_PATTERNS[boss].name});
 return enterRift(world,p);
}
/** Poção de Cura comprada: +25% do HP, recarga de 30 s. */
function usePotion(world,p){
 if(p.hp<=0||p.hp>=p.max||world.time<p.potionNext||p.potions-p.potionsUsed<1)return false;
 p.potionsUsed++;p.potionNext=world.time+lag(world,30);const heal=Math.min(p.max-p.hp,p.max*.25);p.hp+=heal;event(world,'potionUsed',{player:p.id});
 event(world,'healed',{player:p.id,by:'potion',amount:Math.round(heal),x:Math.round(p.x),y:Math.round(p.y),skill:'heal'});return true;
}
/** Teleporte do labirinto: sozinho, sala aleatória; em grupo, destino fixo para todos poderem se seguir (como no solo). */
function mazeWarp(world,p,w){
 const map=nav(world);
 if(world.arena||!map.warps||world.bossSpawned||world.maze.active||world.time<p.warpReady||!w)return false;
 const count=map.rooms.length,fixed=world.players.size>1;let room;
 if(fixed){room=(w.room*7+w.side*3+5)%count;if(room===w.room)room=(room+1)%count;}
 else{room=Math.floor(rand(world)*(count-1));if(room>=w.room)room++;}
 const exits=map.warps.filter(item=>item.room===room),exit=fixed?exits[(w.side+2)%exits.length]:exits[Math.floor(rand(world)*exits.length)];
 const target=map.rooms[room].center,gap=D.hypot(target.x-exit.x,target.y-exit.y)||1;
 const dest=nearestOpen(map,exit.x+(target.x-exit.x)*110/gap,exit.y+(target.y-exit.y)*110/gap);
 warp(p,dest.x,dest.y,world);p.warpReady=world.time+lag(world,1.2);
 // Monstros e cristais em salas sem ninguém ficam para trás (não dá EXP de graça).
 const rooms=new Set([...world.players.values()].filter(q=>q.hp>0).map(q=>roomAt(map,q.x,q.y)));
 world.mobs=world.mobs.filter(m=>m.elite||m.special||rooms.has(roomAt(map,m.x,m.y)));
 const before=world.pickups.length;world.pickups=world.pickups.filter(o=>o.kind!=='xp'||rooms.has(roomAt(map,o.x,o.y)));if(world.pickups.length!==before)world.pickupRev=(world.pickupRev||0)+1;
 world.pathFields.clear();event(world,'mazeWarp',{player:p.id,room});
 const z=world.maze;if(z.spawned)return;
 z.visits++;
 if(!z.defeated&&z.visits>=2&&clock(world)>=55&&(z.visits>=8||rand(world)<.24))spawnMazeGuardian(world,p,room);
}
/** Guardião dos Portais (encontro secreto do labirinto): sela os portais até ser derrotado; o grupo é convocado. */
function spawnMazeGuardian(world,p,room){
 const z=world.maze,at=openNear(world,p,p.x+83,p.y-75),g=spawn(world,'baphometjr',{elite:'miniBoss',at});
 const factor=diff[world.difficulty]||diff.normal;
 g.special=true;g.name='Guardião dos Portais';g.r=28;g.speed=93;g.damage=19*factor[1]*teamDamageScale(world.players.size);
 g.hp=g.max=1700*factor[0]*teamHealthScale(world.players.size)*(1+mapTier(world)*.2);g.cardRate=.0025;
 g.patterns=['circle','line','ring','summons'];g.attacks=['Selo Labiríntico','Corte do Portal','Ruptura Dimensional','Sombras Perdidas'];g.patternAt=world.time+lag(world,3);
 z.active=true;z.spawned=true;z.room=room;z.uid=g.uid;
 for(const q of world.players.values())if(q!==p&&q.hp>0){const spot=openNear(world,p,p.x+((q.id.length%3)-1)*36,p.y+36);warp(q,spot.x,spot.y,world);q.warpReady=world.time+lag(world,2);}
 event(world,'mazeGuardian',{uid:g.uid,room});
}
function mazeGuardianDown(world,m,source){
 const z=world.maze;if(z){z.active=false;z.defeated=true;}
 const box=groundDrop(world,'chest',m.x,m.y,'maze');box.amount='maze';
 for(const p of world.players.values())p.zeny+=Math.round(240*(1+mapTier(world))/Math.max(1,world.players.size));
 giveExperience(world,55*(1+mapTier(world)*.15));
 if(world.contract.stage===1)world.contract.eliteKills++;
 event(world,'mazeCleared',{x:Math.round(m.x),y:Math.round(m.y)});
}
/* ===================== V23 Etapa 4: arena do MVP ===================== */
/** Reforços em posições transitáveis e longe dos personagens. O mesmo motor é usado em solo e online. */
function summonMvpReinforcements(world,boss,requested,reason){
 const roster=rosters[world.map]||rosters.sewer;
 const players=[...world.players.values()].filter(p=>p.hp>0);
 const cap=Math.min(280,85+world.players.size*45);
 let made=0;
 for(let i=0;i<requested&&world.mobs.filter(m=>m.hp>0&&!m.dead).length<cap;i++){
  // spawn(near) procura terreno aberto; a checagem adicional evita aparecer sobre heróis.
  const anchor=players[i%Math.max(1,players.length)]||boss;
  const mob=spawn(world,roster[(world.wave+i+Math.floor(world.time/20))%roster.length],{near:anchor,elite:reason==='fury'&&i===0?'elite':''});
  if(players.some(p=>distance(p,mob)<105)||distance(mob,boss)<38){
   let safe=null;
   const map=nav(world);
   for(let attempt=0;attempt<50;attempt++){
    const angle=random(world,0,Math.PI*2),r=random(world,195,440);
    const point={x:anchor.x+D.cos(angle)*r,y:anchor.y+D.sin(angle)*r};
    if(passable(map,point.x,point.y)&&passable(map,point.x+12,point.y)&&passable(map,point.x,point.y+12)&&
      players.every(p=>distance(p,point)>120)&&distance(point,boss)>45){safe=point;break;}
   }
   if(safe){mob.x=safe.x;mob.y=safe.y;}
   else {world.mobs.splice(world.mobs.indexOf(mob),1);continue;}
  }
  mob.summoned=true;made++;
 }
 if(made)event(world,'mvpReinforcements',{phase:world.mvpArena?.phase||1,count:made,reason});
 return made;
}
/** Cada limiar dispara uma única vez, inclusive se um golpe atravessa vários deles. */
function advanceMvpPhases(world,boss){
 const state=world.mvpArena;if(!state?.field||state.boss!==boss.uid)return;
 const hp=Math.max(0,boss.hp)/boss.max;
 for(const [threshold,phase,count,reason] of [[.75,2,4,'reinforcements'],[.5,3,5,'special'],[.25,4,6,'fury']]){
  if(state.phase>=phase||hp>threshold)continue;
  state.phase=phase;
  if(phase===2){boss.patternAt=Math.min(boss.patternAt||world.time+lag(world,2),world.time+lag(world,1.5));}
  if(phase===3){boss.patternAt=world.time+lag(world,.4);boss.gapNext=world.time+lag(world,1);}
  if(phase===4){boss.speed*=1.17;boss.damage*=1.28;boss.patternAt=world.time+lag(world,.3);boss.gapNext=world.time+lag(world,.8);boss.enraged=true;}
  event(world,'mvpPhase',{uid:boss.uid,boss:boss.id,phase,health:Math.round(hp*100),x:boss.x,y:boss.y});
  summonMvpReinforcements(world,boss,count,reason);
 }
}
function tickMvpArena(world){
 const a=world.mvpArena,boss=world.mobs.find(m=>m.uid===a.boss&&m.hp>0);
 if(boss&&a.field){
  advanceMvpPhases(world,boss);
  if(world.time>=a.addsAt){
   a.addsAt=world.time+lag(world,9);
   summonMvpReinforcements(world,boss,2,'periodic');
  }
 }
 if(world.mvpDefeated&&(world.time>=world.finishAt||[...world.players.values()].every(p=>p.hp<=0||!p.rewardChoices.some(o=>o.stat==='gear')&&!p.chestQueue.includes('mvpgear')))){
  for(const item of world.pickups.filter(o=>o.kind==='card')){
   const living=[...world.players.values()].filter(p=>p.hp>0),p=living.reduce((b,q)=>!b||distance(q,item)<distance(b,item)?q:b,null);
   if(p){p.cards.push(item.id);event(world,'pickup',{player:p.id,kind:'card',amount:1,id:item.id});}
  }
  world.pickups=world.pickups.filter(o=>o.kind!=='card');
  for(const p of world.players.values()){const gear=p.rewardChoices.find(o=>o.stat==='gear');if(gear&&!p.mvpItem)chooseGear(world,p,gear);}
  world.won=true;
  if(world.endlessMode===false){world.finished=true;world.phase='win';event(world,'victory',{boss:bosses[world.map]});}
  else{
   // V24.1: MVP vencido → modo infinito no mesmo mapa (a vitória já conta; a run termina quando todos caírem ou alguém encerrar).
   world.mvpArena=null;world.mvpActive=false;world.endless={start:world.time,boss:bosses[world.map]}; // phase continua 'play'
   world.spawnAt=lag(world,1.5);event(world,'endlessStart',{boss:bosses[world.map],xp:ENDLESS.xp});
  }
 }
}
/** Tesouro do MVP: 4 equipamentos da classe (Gear.rollChoices do solo, com o sorteio do mundo). */
function canEquipItem(id,line,stage){const it=ITEMS[id];return !!it&&(!it.classes||it.classes.includes(line))&&(!it.katar||[1,4,5].includes(stage));}
export function rollMvpGear(world,p){
 const tier=mapTier(world),low=Math.min(4,Math.max(2,tier+2)),high=4,stage=p.base.stage;
 // V23.6: sorteia primeiro o TIPO (arma, armadura, escudo, chapéu, capa, bota, acessório), com chance igual e sem repetir,
 // depois o item dentro do tipo pela raridade. Antes as armas (34 itens) dominavam e chapéu/escudo quase nunca saíam.
 const usable=Object.keys(ITEMS).filter(id=>ITEMS[id].tier<=high&&canEquipItem(id,p.job,stage));
 const types=[...new Set(usable.map(id=>ITEMS[id].type))].sort();
 const picks=[];
 while(picks.length<4&&types.length){
  const type=types.splice(Math.floor(rand(world)*types.length),1)[0];
  const ofType=usable.filter(id=>ITEMS[id].type===type);
  // V25.2: o piso de raridade é relativo ao melhor item que existe DAQUELE tipo. Chapéus e acessórios não têm
  // raridade 4, então a partir do 2º mapa só saíam o Elmo e o Rosário; agora entram as duas melhores raridades do tipo.
  const best=Math.max(...ofType.map(id=>ITEMS[id].tier));
  const candidates=ofType.filter(id=>ITEMS[id].tier>=Math.min(low,best-1));
  const weights=candidates.map(id=>D.pow(ITEMS[id].tier,3)*2);
  let value=rand(world)*weights.reduce((x,y)=>x+y,0),index=weights.findIndex(w=>(value-=w)<=0);
  if(index<0)index=candidates.length-1;picks.push(candidates[index]);
 }
 return picks.map(id=>{
  // Opções do item (ItemQuality.roll do solo): quantidade pela raridade, valor = raridade - 1.
  const t=ITEMS[id].tier,keys=['vit','dex','luk','agi',...(ITEMS[id].classes?.includes('mage')?['int']:['str'])],affixes={};
  for(let i=0;i<QUALITY_COUNT[t];i++){const key=keys.splice(Math.floor(rand(world)*keys.length),1)[0];affixes[key]=Math.max(1,t-1);}
  return {id,affixes};
 });
}
function chooseGear(world,p,found){
 p.mvpItem={id:found.id,affixes:{...found.affixes}};
 p.rewardChoices=[];p.rewardOffer++;
 event(world,'mvpItem',{player:p.id,id:found.id,affixes:p.mvpItem.affixes});
}
/* ===================== V23 Etapa 4: ataques com aviso no chão ===================== */
const RIFT_PATTERNS=[['line','circle'],['circle','ring'],['line','summons']];
const PATTERN_NAMES={line:'Fissura Rúnica',circle:'Maldição Rúnica',ring:'Maldição Rúnica',summons:'Convocar Guerreiros'};
/** Acerto do aviso (isBossHit do solo): linha 715 x 96, círculo e anel. */
export function strikeHits(w,p){
 const gap=distance(p,w),dx=p.x-w.x,dy=p.y-w.y,along=dx*D.cos(w.angle)+dy*D.sin(w.angle),across=-dx*D.sin(w.angle)+dy*D.cos(w.angle);
 return w.kind==='line'?along>=-65&&along<=650&&Math.abs(across)<48:w.kind==='ring'?gap<w.radius+7&&gap>w.radius-102:gap<w.radius+11;
}
const bossMagic=(id,kind)=>(id==='moonlight'&&kind!=='line')||(id==='baphomet'&&kind==='ring');
function strikePlayers(world,m,w){
 for(const p of world.players.values()){
  if(p.hp<=0||p.hiddenUntil>world.time||p.invulnerableUntil>world.time||!strikeHits(w,p))continue;
  const g=p.base.gear;
  if(bossMagic(m.id,w.kind)&&g.magicImmune){p.invulnerableUntil=world.time+lag(world,.4);event(world,'magicImmune',{player:p.id,x:Math.round(p.x),y:Math.round(p.y)});continue;}
  let dmg=Math.max(w.kind==='line'?35:31,m.damage*(w.kind==='line'?1.1:1));
  if(world.arena)dmg=Math.min(dmg,p.max*(m.riftGuardian||m.elite==='mvp'?.23:.34));
  dmg*=(1-Math.min(.75,p.st.def+p.base.def))*(g.endure?.92:1)*(1-Math.min(.42,p.runBonus?.damageResist||0));
  p.hp=Math.max(0,p.hp-dmg);p.invulnerableUntil=world.time+lag(world,.68);
  event(world,'hurt',{player:p.id,hp:Math.round(p.hp),x:Math.round(p.x),y:Math.round(p.y),strike:1});
  if(p.hp===0){p.downedAt=world.time;p.reviveProgress=0;p.buffs.clear();event(world,'downed',{player:p.id});}
 }
}
/** advanceBoss do solo: investida (MVP e guardião), padrões em ciclo e invocação. Vale para todos os jogadores do grupo. */
function bossAct(world,m,p){
 const now=world.time,low=m.hp<m.max*.5;
 if((m.elite==='mvp'||m.riftGuardian)&&!m.warning&&now>=(m.gapNext||0)&&distance(m,p)>255){
  const sp=playerSpeed(p),pred={x:p.x+p.input.dx*sp*.85,y:p.y+p.input.dy*sp*.85};
  const a=D.atan2(pred.y-m.y,pred.x-m.x),gap=Math.min(440,Math.max(100,distance(m,pred)-45));
  m.warning={kind:'line',x:m.x,y:m.y,angle:a,radius:90,since:now,at:now+1.05,dash:true,toX:m.x+D.cos(a)*gap,toY:m.y+D.sin(a)*gap};
  m.gapNext=now+(low?7:10);event(world,'bossAttack',{uid:m.uid,name:'Investida! Desvie para os lados.'});
 }
 if(m.warning){
  const w=m.warning;if(now<w.at)return;
  strikePlayers(world,m,w);
  if(w.dash){const dest=nearestOpen(nav(world),w.toX,w.toY);m.x=dest.x;m.y=dest.y;}
  if(m.id==='moonlight'&&w.kind==='line'){const x=m.x+D.cos(w.angle)*125,y=m.y+D.sin(w.angle)*125;if(passable(nav(world),x,y)){m.x=x;m.y=y;}}
  world.strikeCount=(world.strikeCount||0)+1;
  event(world,'strike',{uid:m.uid,kind:w.kind,x:Math.round(w.x),y:Math.round(w.y),radius:w.radius,angle:Math.round(w.angle*1000)/1000});
  m.warning=null;return;
 }
 if(now<(m.patternAt||0))return;
 const index=(m.pattern=(m.pattern||0)+1)-1,kind=m.patterns[index%m.patterns.length];
 event(world,'bossAttack',{uid:m.uid,name:m.attacks?.[index%m.patterns.length]||PATTERN_NAMES[kind]});
 if(kind==='summons'){
  const roster=rosters[world.map]||rosters.sewer,cap=world.rift?11:world.mvpArena?20:120;
  for(let i=0;i<(world.rift?2:4);i++){
   if(world.mobs.filter(e=>e.hp>0).length>=cap)break;
   const angle=i*D.PI/2,minion=spawn(world,roster[i%roster.length],{at:{x:m.x+58*D.cos(angle),y:m.y+58*D.sin(angle)}});minion.summoned=true;
  }
  m.patternAt=now+3;return;
 }
 const centered=kind!=='circle';
 m.warning={kind,x:centered?m.x:p.x,y:centered?m.y:p.y,radius:kind==='ring'?225:100,angle:D.atan2(p.y-m.y,p.x-m.x),since:now,at:now+(low?.94:1.18)};
 m.patternAt=now+(low?2.65:3.45);
}
function tickRift(world){
 const r=world.rift;if(!r)return;
 // Um jogador decide pelo grupo inteiro, então cair na fenda não encerra a run: todos voltam feridos.
 if([...world.players.values()].every(p=>p.hp<=0)){leaveRift(world,false,true);return;}
 const guardian=world.mobs.find(m=>m.uid===r.guardian&&m.hp>0);
 if(r.ward&&!world.mobs.some(m=>m.riftSeal&&m.hp>0)){r.ward=false;event(world,'riftWard',{phase:r.phase});}
 // Fenda MVP (Asa de Borboleta): reforços a cada 9 s enquanto houver menos de 9 monstros.
 if(r.mvp&&guardian&&world.time>=r.addsAt&&world.mobs.filter(m=>m.hp>0).length<9){r.addsAt=world.time+lag(world,9);const roster=rosters[world.map]||rosters.sewer;
  for(let i=0;i<2;i++){const e=spawn(world,roster[1%roster.length],{at:{x:(i?1:-1)*300,y:-200}});e.summoned=true;}}
 if(!r.mvp&&guardian&&!r.ward&&world.time>=r.reinforceAt){
  r.reinforceAt=world.time+lag(world,12);
  const living=world.mobs.filter(m=>m.hp>0&&!m.riftSeal).length,roster=rosters[world.map]||rosters.sewer;
  for(let i=0;i<Math.min(2,9-living);i++){const e=spawn(world,roster[(i+r.index)%roster.length],{at:{x:(i?1:-1)*300,y:-200}});e.hp=e.max=e.max*1.45;}
 }
 // Guardião derrotado: abre o portal de saída no centro. O grupo recolhe o que caiu e sai com E
 // (saída automática de segurança depois de 90 s).
 if(!guardian&&!r.cleared){r.cleared=true;r.exit={x:0,y:40};r.autoLeave=world.time+lag(world,90);event(world,'riftCleared',{x:0,y:40});}
 if(r.cleared){if(world.time>=r.autoLeave)leaveRift(world,true);}
 else if(world.time>=r.ends)leaveRift(world,false);
}
function leaveRift(world,success,wiped=false){
 const r=world.rift;if(!r)return;
 const leftovers=world.pickups,players=[...world.players.values()];
 world.pausedTime+=world.time-r.start;
 world.arena=false;world.rift=null;
 world.mobs=r.saved.mobs;world.pickups=r.saved.pickups;world.pendingEffects=[];world.zones=[];world.pathFields.clear();
 const map=nav(world),portal=r.saved.portal;
 for(const p of players){
  const back=r.saved.positions.get(p.id)||nearestOpen(map,portal.x,portal.y);
  warp(p,back.x,back.y,world);
 }
 if(success){
  world.riftsDone++;
  for(const item of leftovers){
   if(item.kind==='xp')giveExperience(world,item.amount);
   else if(item.kind==='zeny')for(const p of players)p.zeny+=Math.ceil(item.amount/players.length);
   else if(item.kind==='card'||item.kind==='chest')groundDrop(world,item.kind,portal.x+random(world,-30,30),portal.y+random(world,-20,20),item.amount,item.id);
  }
  for(const p of players){p.zeny+=60;if(p.hp>0)p.hp=Math.min(p.max,p.hp+p.max*.15);}
  // V23.6: anéis e colares (relíquias) saíram do jogo; a fenda dá Zeny, cura e o baú.
  groundDrop(world,'chest',portal.x+26,portal.y+8,2);
  event(world,'riftComplete',{x:portal.x,y:portal.y});
 }else{
  if(wiped)for(const p of players){p.hp=Math.max(p.hp,Math.ceil(p.max*.25));p.downedAt=0;p.reviveProgress=0;p.reviveBy=null;p.invulnerableUntil=world.time+lag(world,3);}
  event(world,'riftFailed',{x:portal.x,y:portal.y,wiped});
 }
}
export function inputView(world,id){
 const p=world.players.get(id);if(!p)return null;
 const active=!!p.animKind && world.time<p.animUntil;
 const r2=v=>Math.round(v*100)/100;
 return {x:r2(p.x),y:r2(p.y),hp:Math.round(p.hp*10)/10,max:p.max,dir:p.dir,walk:p.walk>0?1:0,weapon:p.weapon,
   attack:active,animKind:active?p.animKind:'',animType:p.job==='archer'?'bow':p.job==='mage'||p.job==='acolyte'?'staff':p.job==='merchant'?'axe':p.job==='thief'?'dagger':'sword',
   animProgress:active?Math.round(clamp((world.time-p.animStart)/Math.max(.1,p.animDuration),0,.995)*1000)/1000:0,animDuration:p.animDuration,
   animSeq:p.animSeq,animSkill:active?p.animSkill:'',reviveProgress:Math.round(p.reviveProgress*100)/100,reviveBy:p.reviveBy,downed:p.hp<=0,
   speed:Math.round(playerSpeed(p)*10)/10,arena:!!world.arena,warp:p.warpSeq,mt:p.usesClientMove&&p.hp>0&&p.moveT?Math.round(p.moveT*1000)/1000:null,ct:p.usesClientMove&&p.hp>0&&p.moveCt?p.moveCt:null};
}
const MOB_VIEW_X=1500,MOB_VIEW_Y=1150,PICKUP_VIEW=1500;
/**
 * opts.cull: envia só o que está perto do jogador (elites/MVP/cartas sempre).
 * opts.pickups===false: omite a lista de itens no chão (o cliente mantém a anterior).
 */
export function snapshotWorld(world,id,sinceEvent=0,opts={}){
 const p=world.players.get(id);const pview=p?{x:p.x,y:p.y,hp:p.hp,max:p.max,sp:Math.round(p.sp*10)/10,maxSp:p.maxSp,xp:p.xp,level:p.level,needed:p.needed,zeny:p.zeny,claimed:p.claimed.size,cards:p.cards,
    kills:p.kills,reviveProgress:p.reviveProgress,downed:p.hp<=0,speed:playerSpeed(p),choices:p.choices.map(id=>{const r=runeInfo(id);return r?{id,name:r.n,d:r.d,rune:1,level:modOf(p,r.skill)[r.key]||0}:{id,name:SK[id]?.n||id,level:p.skills[id]||0};}),choiceSeq:p.choiceSeq,pendingUps:p.pendingUps,
    skills:p.skills,slots:p.slots,cds:Object.fromEntries(p.slots.map(id=>[id,[Math.max(0,Math.round(((p.cooldowns[id]||0)-world.time)*10)/10),Math.round((p.cdSpan[id]||SK[id].cd)*10)/10]])),
    buffs:[...p.buffs].filter(([,b])=>b.until>world.time).map(([id,b])=>[id,Math.round((b.until-world.time)*10)/10]),shield:p.shieldUntil>world.time?p.shield:0,
    rewardChoices:p.rewardChoices,rewardOffer:p.rewardOffer,relics:p.relics,chestQueue:p.chestQueue.length,modifiers:p.modifiers,
    trial:p.trialStage>=0?(p.trialDone>=0?2:1):0,mvSeq:p.mvSeq,warpSeq:p.warpSeq,
    blessings:p.blessings,mods:p.mods,evolutions:p.evolutions,pet:p.pet?.id||null,forged:p.forged,
    wings:{flywing:stock(p,'flywing'),butterflywing:stock(p,'butterflywing')},potions:p.potions-p.potionsUsed,
    flyIn:Math.max(0,Math.round((p.flyNext-world.time)*10)/10),potionIn:Math.max(0,Math.round((p.potionNext-world.time)*10)/10)}:null;
 const near=(o,rx,ry)=>!opts.cull||!p||(Math.abs(o.x-p.x)<rx&&Math.abs(o.y-p.y)<ry);
 const now=clock(world),r=world.rift;
 const snap={authoritative:true,id:world.id,map:world.map,difficulty:world.difficulty,phase:world.phase,time:Math.round(now*100)/100,
   simTime:Math.round(world.time*1000)/1000,mapStart:Math.round((world.time-now)*1000)/1000,
   wave:world.wave,kills:world.kills,arena:!!world.arena,portal:null,mvpActive:world.mvpActive,endless:world.endless?Math.round(world.time-world.endless.start):null,
   rift:r?{active:true,index:r.index,left:Math.max(0,Math.round(((r.cleared?r.autoLeave:r.ends)-world.time)*10)/10),ward:r.ward,phase:r.phase,uid:r.guardian,mvp:!!r.mvp,exit:r.cleared?r.exit:null}:null,
   riftPortal:world.riftPortal,mvpPortal:world.mvpPortal||null,mvpArena:!!world.mvpArena,mvpDefeated:!!world.mvpDefeated,maze:world.maze?{active:world.maze.active,defeated:world.maze.defeated,room:world.maze.room}:null,contract:world.arena?null:{route:world.contract.route,stage:world.contract.stage,charge:Math.round(world.contract.charge*10)/10,node:world.contract.node,eliteKills:world.contract.eliteKills,goal:world.contract.goal,done:world.contract.done},reviveSeconds:REVIVE_SECONDS,reviveRadius:REVIVE_RADIUS,
   chests:[],ack:{},mazeEvent:null,self:pview,events:world.events.filter(e=>e.seq>sinceEvent).slice(-48),lastEvent:world.lastEvent,
   mobs:world.mobs.filter(m=>m.elite||near(m,MOB_VIEW_X,MOB_VIEW_Y)).map(m=>[m.uid,m.id,Math.round(m.x),Math.round(m.y),Math.max(0,Math.round(m.hp)),Math.round(m.max),m.dir,m.attackUntil>world.time?1:0,0,m.stunUntil>world.time?2:m.slowUntil>world.time||m.poisonUntil>world.time?1:0,
     m.elite==='mvp'?'miniBoss':m.elite,0,m.riftGuardian?1:0,m.riftSeal?1:0,m.name||'',Math.round(m.damage),
     m.warning?[m.warning.kind,Math.round(m.warning.x),Math.round(m.warning.y),m.warning.radius,Math.round(m.warning.angle*1000)/1000,Math.round(m.warning.since*1000)/1000,Math.round(m.warning.at*1000)/1000]:0]),
   players:Object.fromEntries([...world.players.values()].map(p=>[p.id,inputView(world,p.id)]))};
 if(world.zones.length)snap.zones=world.zones.filter(z=>near(z,MOB_VIEW_X,MOB_VIEW_Y)).map(z=>[z.uid,Math.round(z.x),Math.round(z.y),z.rad,z.el,z.trap?1:z.heal?2:0]);
 if(opts.pickups!==false)snap.pickups=world.pickups.filter(o=>o.kind==='card'||o.kind==='chest'||o.kind==='relic'||o.kind==='xpmagnet'||o.kind==='zenymagnet'||near(o,PICKUP_VIEW,PICKUP_VIEW))
   .map(o=>[o.uid,o.kind,Math.round(o.x),Math.round(o.y),o.amount,o.id||'']);
 return snap;
}
export function roomStatus(world){return {id:world.id,map:world.map,phase:world.phase,time:world.time,kills:world.kills,players:[...world.players.values()].map(p=>({id:p.id,level:p.level,hp:p.hp,zeny:p.zeny}))}}
/** Ganchos só para os testes automáticos (não usados pelo jogo). */
export const testing=Object.freeze({defeated:(world,mob,by)=>defeated(world,mob,by),spawn:(world,id,opts)=>spawn(world,id,opts),basicStrike:(world,p,mob)=>basicStrike(world,p,mob),evades:(world,p,m)=>evades(world,p,m)});
