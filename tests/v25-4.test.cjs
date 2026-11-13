const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const url=file=>require('node:url').pathToFileURL(path.join(root,file)).href;
const engine=()=>import(url('authoritative-world.mjs')).then(()=>import(url('engine/core.mjs')));
const member=(id,job,classId=job)=>({id,profile:{job,classId},character:{base:60,stage:1,guildTrials:{0:true,4:true},
 stats:{str:50,agi:40,vit:40,int:40,dex:50,luk:10},gear:{weaponAtk:120,weaponMatk:60,items:[]}}});
const quiet=w=>{w.spawnAt=1e9;w.nextRiftAt=1e9;w.eliteAt=1e9;w.nextMagnetAt=1e9;w.contract.done=true;w.trials=[];w.mobs=[];};
test('V25.4: cada mapa tem monstros com mais vida e mais dano que o anterior',async()=>{
 const core=await engine();
 const src=read('engine/core.mjs');
 const rosters=eval('('+src.match(/const rosters=(\{[\s\S]*?\});/)[1]+')');
 const order=['sewer','payon','maze','orc','geffen','payonfield','glast','mine','temple','shadow'];
 let prev=null;
 for(const map of order){
  const w=core.makeWorld(map,'normal',[member('a','sword')],{seed:1});quiet(w);
  const ms=rosters[map].map(id=>core.testing.spawn(w,id,{}));
  const hp=ms.reduce((a,m)=>a+m.max,0)/ms.length,dmg=ms.reduce((a,m)=>a+m.damage,0)/ms.length;
  if(prev){assert.ok(hp>prev.hp*1.1,map+': HP médio '+hp.toFixed(0)+' > '+prev.hp.toFixed(0));assert.ok(dmg>prev.dmg*1.05,map+': dano médio '+dmg.toFixed(1)+' > '+prev.dmg.toFixed(1));}
  prev={hp,dmg};
 }
});

test('V25.4: modo infinito — monstros mais fortes a cada minuto',async()=>{
 const core=await engine();
 const w=core.makeWorld('sewer','normal',[member('a','sword')],{seed:2});quiet(w);
 w.time=800;w.endless={start:800,boss:'goldenbug'};
 const a=core.testing.spawn(w,'cramp',{});
 w.time=800+5*60;const b=core.testing.spawn(w,'cramp',{});
 // clock também sobe; o bônus do infinito sozinho é 1+5×0,15+25×0,01=2,0× de HP e 1,5× de dano
 assert.ok(b.max/a.max>2.4,'HP sobe com os minutos: '+(b.max/a.max).toFixed(2));
 assert.ok(b.damage/a.damage>1.6,'dano sobe: '+(b.damage/a.damage).toFixed(2));
});

test('V25.4: ao sair da fenda os monstros não batem na hora',async()=>{
 const core=await engine();
 const w=core.makeWorld('sewer','normal',[member('a','sword')],{seed:5});quiet(w);
 const p=w.players.get('a');
 for(let i=0;i<8;i++){const m=core.testing.spawn(w,'cramp',{at:{x:p.x+Math.cos(i)*60,y:p.y+Math.sin(i)*60}});}
 w.riftPortal={x:p.x,y:p.y,active:true,id:1,index:0,kind:'elite',expires:w.time+100,activated:false};
 core.command(w,'a',{riftEnter:1});
 assert.ok(w.rift,'entrou na fenda');
 w.rift.cleared=true;w.rift.exit={x:p.x,y:p.y};
 core.command(w,'a',{riftEnter:2});
 assert.ok(!w.rift,'saiu da fenda');
 const near=w.mobs.filter(m=>m.hp>0&&Math.hypot(m.x-p.x,m.y-p.y)<300);
 assert.equal(near.length,0,'ninguém colado no jogador ('+w.mobs.map(m=>Math.round(Math.hypot(m.x-p.x,m.y-p.y))).join(',')+')');
 assert.ok(w.mobs.every(m=>m.contactAt>=w.time+1.9),'ataque de contato atrasado');
 const hp=p.hp;for(let i=0;i<20;i++)core.tickWorld(w,.05);
 assert.equal(p.hp,hp,'sem dano no primeiro segundo');
});

test('V25.4: portais do labirinto funcionam com o MVP no mapa e levam até a sala dele',async()=>{
 const core=await engine();
 const w=core.makeWorld('maze','normal',[member('a','sword')],{seed:4});quiet(w);
 const p=w.players.get('a');
 w.mvpAt=.5;w.time=1;core.tickWorld(w,.05);
 assert.ok(w.bossSpawned&&w.bossAlive,'MVP apareceu');
 const map=core.testing.nav(w),boss=w.mobs.find(m=>m.uid===w.mvpArena.boss);
 const bossRoom=core.roomAt(map,boss.x,boss.y);
 const warp=map.warps.find(x=>x.room!==bossRoom);
 p.x=warp.x;p.y=warp.y;p.warpReady=0;
 core.command(w,'a',{riftEnter:1});
 assert.equal(core.roomAt(map,p.x,p.y),bossRoom,'o portal levou para a sala do MVP');
 // modo infinito (sem MVP vivo): o portal continua funcionando
 w.bossAlive=false;w.endless={start:w.time,boss:'baphomet'};boss.hp=0;
 const here=core.roomAt(map,p.x,p.y),w2=map.warps.find(x=>x.room===here);
 p.x=w2.x;p.y=w2.y;p.warpReady=0;w.time+=2;
 core.command(w,'a',{riftEnter:2});
 assert.notEqual(core.roomAt(map,p.x,p.y),here,'no infinito o portal troca de sala');
});

test('V25.4: poção azul volta limitada; EXP do solo e do Aprendiz T.; pontos do renascimento',async()=>{
 const core=await engine();
 const w=core.makeWorld('sewer','normal',[member('a','sword')],{seed:9});quiet(w);
 const p=w.players.get('a');
 for(let i=0;i<400;i++){w.time+=.5;const m=core.testing.spawn(w,'cramp',{at:{x:p.x+900,y:p.y}});core.testing.defeated(w,m,p);w.pickups=w.pickups.filter(o=>o.kind!=='xp'&&o.kind!=='zeny');}
 const blue=w.pickups.filter(o=>o.kind==='sppotion'&&!o.taken);
 assert.ok(blue.length>=1&&blue.length<=3,'entre 1 e 3 poções azuis no chão ('+blue.length+')');
 // EXP: o jogador sozinho recebe +20% de EXP da run
 const solo=core.makeWorld('sewer','normal',[member('a','sword')],{seed:1}),duo=core.makeWorld('sewer','normal',[member('a','sword'),member('b','mage')],{seed:1});
 for(const x of [solo,duo]){quiet(x);x.pickups=[];}
 const a=solo.players.get('a'),b=duo.players.get('a');a.xp=b.xp=0;a.level=b.level=50;a.needed=b.needed=1e9;
 const m1=core.testing.spawn(solo,'cramp',{at:{x:a.x+900,y:a.y}}),m2=core.testing.spawn(duo,'cramp',{at:{x:b.x+900,y:b.y}});m2.xp=m1.xp;
 core.testing.defeated(solo,m1,a);core.testing.defeated(duo,m2,b);
 const gem=x=>x.pickups.find(o=>o.kind==='xp');solo.pickups=[gem(solo)];duo.pickups=[gem(duo)];
 for(const [x,q] of [[solo,a],[duo,b]]){const g=x.pickups[0];g.x=q.x;g.y=q.y;core.tickWorld(x,.05);}
 assert.ok(Math.abs(a.xp/b.xp-1.2)<.02,'solo +20% ('+a.xp+' vs '+b.xp+')');
 // EXP de conta e pontos (cliente e servidor com a mesma regra para o Aprendiz T.)
 assert.match(read('accounts.mjs'),/const gain=1\.5\*\(stage===2\?1\.5:1\)/);
 assert.match(read('renewal.js'),/next\.stage === 2 \? 1\.5 : 1/);
 assert.match(read('status.js'),/return stage >= 2 \? 60 : 0/);
 assert.match(read('game.js'),/awardJourney\(run\.journey, run\.kills, run\.time, run\.victories, 1\.25\)/);
});

test('V25.4: menu com Pets, refino avisa que não quebra, cartas saem pelo inventário, Códex na partida',()=>{
 assert.match(read('index.html'),/id="mh-pets"/);
 assert.match(read('menu-home.js'),/'mh-pets': click\('nav-pets'\)/);
 assert.match(read('v12-systems.js'),/Falha sem quebra/); // V25.6: forja até +10 com chance de quebra
 assert.match(read('game.js'),/function removeCards\(uid\)/);
 assert.match(read('game.js'),/function codexSkillHint\(skillId,nextLevel\)/);
});

test('V25.4: Tesouro do MVP sorteia a peça do Códex que falta (Varinha do Arquimago)',async()=>{
 const core=await engine();
 let wand=0;
 for(let s=1;s<=200;s++){const w=core.makeWorld('geffen','normal',[member('a','mage','highwizard')],{seed:s});quiet(w);
  const p=w.players.get('a');if(s===1)assert.ok(p.pool.includes('napalm'),'Arquimago tem Vulcão Napalm');
  if(core.rollMvpGear(w,p).some(o=>o.id==='wand'))wand++;}
 assert.ok(wand>25,'Varinha aparece no tesouro ('+wand+'/200)');
});
