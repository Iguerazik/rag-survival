// RAG SURVIVAL — benchmark do motor: roda uma partida com bots e mede a duração de cada tick.
// Uso: node tools/bench-tps.mjs . <ticks/s> <segundos> <semente> <jogadores> [god]
//   ex.: node tools/bench-tps.mjs . 60 780 7 6 god   (partida inteira com MVP, 6 jogadores invencíveis)
// Com ticks/s > 20 usa timerGrid=.05 como o servidor (NOGRID=1 desliga para comparação).
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const root=path.resolve(process.argv[2]||'.'), rate=Number(process.argv[3]||20), seconds=Number(process.argv[4]||300), seed=Number(process.argv[5]||1), nPlayers=Number(process.argv[6]||4), god=process.argv[7]==='god';
const core=await import(pathToFileURL(path.join(root,'authoritative-world.mjs')).href);
const jobs=[['sword','knight',{str:60,agi:40,vit:40,int:5,dex:35,luk:25}],['mage','wizard',{str:1,agi:20,vit:30,int:70,dex:45,luk:10}],['archer','hunter',{str:10,agi:50,vit:30,int:10,dex:70,luk:10}],['acolyte','priest',{str:10,agi:30,vit:50,int:60,dex:30,luk:10}],['merchant','blacksmith',{str:60,agi:30,vit:50,int:5,dex:40,luk:20}],['thief','assassin',{str:50,agi:70,vit:30,int:5,dex:30,luk:20}]];
const members=Array.from({length:nPlayers},(_,i)=>{const [job,classId,stats]=jobs[i%6];return {id:'p'+i,profile:{job,classId,name:'Bot'+i},character:{base:55,stage:1,stats,gear:{weaponAtk:120,def:10}}};});
const world=core.makeWorld('sewer','normal',members,{seed,...(rate>20&&process.env.NOGRID!=='1'?{timerGrid:.05}:{})});
const dt=1/rate, steps=Math.round(seconds*rate);
let up=0,rw=0,sk=0; const durs=[]; let spawned=0, seen=new Set(), hurt=0, events=0;
for(let i=0;i<steps;i++){
 const t=i*dt;
 for(const [k,p] of [...world.players.values()].entries()){
  const angle=t*20/(37+k*11);
  const input={dx:Math.cos(angle),dy:Math.sin(angle)*.8,auto:k%2===0,attack:true};
  // habilidade a cada 2 s de jogo (independente da taxa)
  if(Math.floor(t/2)!==Math.floor((t-dt)/2)){input.skill=1+(Math.floor(t/2))%Math.max(1,p.slots.length);input.skillSeq=++sk;}
  if(p.choices.length)input.upgrade={seq:++up,id:p.choices[0]};
  if(p.rewardChoices.length)input.reward={seq:++rw,id:p.rewardChoices[0].id};
  core.command(world,p.id,input);
  if(god&&p.hp>0)p.hp=p.max;
 }
 const s=performance.now();core.tickWorld(world,dt);durs.push(performance.now()-s);
 for(const m of world.mobs)if(!seen.has(m.uid)){seen.add(m.uid);spawned++;}
 if(world.finished)break;
}
durs.sort((a,b)=>a-b);const q=x=>durs[Math.min(durs.length-1,Math.floor(durs.length*x))];
const ps=[...world.players.values()];
console.log(JSON.stringify({rate,seed,players:nPlayers,god,simSeconds:+world.time.toFixed(1),finished:world.finished,phase:world.phase,kills:world.kills,spawned,mobsNow:world.mobs.length,
 levels:ps.map(p=>p.level),zeny:ps.reduce((a,p)=>a+p.zeny,0),cards:ps.reduce((a,p)=>a+p.cards.length,0),alive:ps.filter(p=>p.hp>0).length,mvp:!!world.mvpArena,mvpPhase:world.mvpArena?.phase,
 tickMs:{avg:+(durs.reduce((a,b)=>a+b,0)/durs.length).toFixed(3),p50:+q(.5).toFixed(3),p95:+q(.95).toFixed(3),p99:+q(.99).toFixed(3),max:+durs[durs.length-1].toFixed(2),over16_67:durs.filter(d=>d>16.67).length,ticks:durs.length}}));
