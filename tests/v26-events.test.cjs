const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const root=path.join(__dirname,'..');
const url=file=>require('node:url').pathToFileURL(path.join(root,file)).href;
const engine=()=>import(url('authoritative-world.mjs')).then(()=>import(url('engine/core.mjs')));
const member=(id,job='sword')=>({id,profile:{job,classId:job},character:{base:60,stage:0,stats:{str:60,agi:40,vit:60,int:20,dex:40,luk:10},gear:{weaponAtk:150}}});
const force=(w,id='poringInvasion')=>{w.director={state:'idle',next:0,ev:null,seq:0,history:[],force:id};w.nextRiftAt=1e9;w.eliteAt=1e9;w.contract.done=true;w.trials=[];};

test('V26 Diretor: Invasão de Porings passa por preparação → ativo → fim, com lotes limitados e recompensa uma vez',async()=>{
 const core=await engine();
 const w=core.makeWorld('orc','normal',[member('a'),member('b','mage')],{seed:11});force(w);
 core.WORLD_EVENTS.poringInvasion.golden=1; // garante o Poring Dourado neste teste
 const phases=[];let maxAlive=0;
 for(let i=0;i<60*110;i++){
  for(const p of w.players.values()){p.hp=p.max;p.input={...(p.input||{}),attack:true,auto:true};}
  core.tickWorld(w,1/60);
  const alive=w.mobs.filter(m=>m.eventId&&!m.dead&&m.hp>0).length;maxAlive=Math.max(maxAlive,alive);
  for(const e of w.events.splice(0))if(e.type==='worldEvent')phases.push(e.phase+(e.result?':'+e.result:''));
  if(phases.some(p=>p.startsWith('end')))break;
 }
 core.WORLD_EVENTS.poringInvasion.golden=.45;
 assert.deepEqual(phases.filter(p=>['prep','start'].includes(p)),['prep','start'],'prep → start: '+phases.join(','));
 assert.ok(phases.includes('golden'),'Poring Dourado apareceu');
 assert.ok(phases.some(p=>p.startsWith('end')),'evento terminou');
 assert.ok(maxAlive<=34+6*2,'teto de Porings vivos respeitado ('+maxAlive+')');
 assert.equal(w.director.state,'idle','diretor volta ao repouso');
 assert.ok(w.director.next>core.clock(w)+100,'próximo evento só depois do intervalo');
 assert.equal(phases.filter(p=>p.startsWith('end')).length,1,'um único fim/recompensa');
 const snap=core.snapshotWorld(w,'a');assert.equal(snap.worldEvent,null);
});

test('V26 Diretor: não começa durante MVP, fenda ou arena e cancela sem recompensa se o MVP aparece',async()=>{
 const core=await engine();
 const w=core.makeWorld('sewer','hard',[member('a')],{seed:3});force(w);
 w.mvpActive=true;w.bossAlive=true;
 for(let i=0;i<300;i++)core.tickWorld(w,1/60);
 assert.equal(w.director.state,'idle','bloqueado durante o MVP');
 w.mvpActive=false;w.bossAlive=false;w.mvpAt=1e9;
 let started=false;for(let i=0;i<600&&!started;i++){core.tickWorld(w,1/60);started=w.director.state==='active';}
 assert.ok(started,'começa quando liberado');
 const snap=core.snapshotWorld(w,'a');assert.equal(snap.worldEvent.id,'poringInvasion');assert.equal(snap.worldEvent.phase,'active');
 w.mvpActive=true;core.tickWorld(w,1/60);
 const end=w.events.filter(e=>e.type==='worldEvent'&&e.phase==='end').at(-1);
 assert.equal(end?.result,'cancel');assert.equal(end.reward,null);
});

test('V26 Diretor: mesmo resultado em solo e online (mesma semente) e tick dentro do orçamento de 60 TPS',async()=>{
 const core=await engine();
 const run=()=>{const w=core.makeWorld('glast','normal',[member('a'),member('b','archer'),member('c','mage'),member('d','acolyte')],{seed:21});force(w);
  let worst=0,total=0,n=0;
  for(let i=0;i<60*70;i++){for(const p of w.players.values()){p.hp=p.max;p.input={...(p.input||{}),attack:true,auto:true};}
   const t=process.hrtime.bigint();core.tickWorld(w,1/60);const ms=Number(process.hrtime.bigint()-t)/1e6;if(i>60*10){worst=Math.max(worst,ms);total+=ms;n++;}w.events.length=0;}
  return {w,avg:total/n,worst};};
 const a=run(),b=run();
 assert.deepEqual(a.w.director.ev&&{s:a.w.director.ev.spawned,k:a.w.director.ev.killed},b.w.director.ev&&{s:b.w.director.ev.spawned,k:b.w.director.ev.killed},'determinístico');
 assert.ok(a.avg<4,'tick médio '+a.avg.toFixed(2)+' ms (orçamento 16,67 ms)');
});

test('V26 Diretor ONLINE: os dois jogadores da sala veem o mesmo evento (servidor autoritativo, 60 TPS)',async()=>{
 const {spawn}=require('node:child_process'),fs=require('node:fs'),os=require('node:os');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'midgard-ev-'));const port=24000+Math.floor(Math.random()*15000);
 const child=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,PORT:String(port),HOST:'127.0.0.1',DATA_DIR:dir,MIDGARD_AUTO_UPDATE:'0',MIDGARD_TEST_EVENT_AT:'1',ALLOW_GUEST_MULTIPLAYER:'1'},stdio:'ignore'});
 const base='http://127.0.0.1:'+port;
 const post=async(url,data)=>{const r=await fetch(base+'/api/coop/rooms'+url,{method:'POST',headers:{'Content-Type':'application/json','X-Midgard-Request':'1'},body:JSON.stringify(data)});return {status:r.status,data:await r.json()};};
 try{
  for(let i=0;i<120;i++){try{if((await fetch(base+'/api/health')).ok)break}catch{}await new Promise(r=>setTimeout(r,50));}
  const lead=await post('',{profile:{name:'A',job:'sword'},config:{map:'sewer',difficulty:'easy'}});
  const mate=await post('/'+lead.data.code+'/join',{profile:{name:'B',job:'mage'}});
  await post('/'+lead.data.code+'/ready',{token:mate.data.token,ready:true});
  assert.equal((await post('/'+lead.data.code+'/start',{token:lead.data.token})).status,200);
  await new Promise(r=>setTimeout(r,7000));
  const a=await post('/'+lead.data.code+'/sync',{token:lead.data.token}),b=await post('/'+lead.data.code+'/sync',{token:mate.data.token});
  const ea=a.data.world?.worldEvent,eb=b.data.world?.worldEvent;
  assert.ok(ea&&eb,'evento visível para os dois');
  assert.equal(ea.uid,eb.uid);assert.equal(ea.id,eb.id);assert.ok(['poringInvasion','treasureRain','orcMarch'].includes(ea.id));assert.equal(ea.phase,eb.phase);
  const health=await (await fetch(base+'/api/health')).json();
  assert.equal(health.tick.configured,60);
 }finally{child.kill('SIGTERM');fs.rmSync(dir,{recursive:true,force:true});}
});


test('V26.2: eventos só a partir do mapa dos Orcs ou na dificuldade Difícil/Pesadelo',async()=>{
 const core=await engine();
 const ok=(map,d)=>core.eventsEnabled(core.makeWorld(map,d,[member('a')],{seed:1}));
 assert.equal(ok('sewer','normal'),false);assert.equal(ok('payon','easy'),false);assert.equal(ok('maze','normal'),false);
 assert.equal(ok('orc','normal'),true);assert.equal(ok('shadow','easy'),true);
 assert.equal(ok('sewer','hard'),true);assert.equal(ok('payon','nightmare'),true);
 const w=core.makeWorld('sewer','normal',[member('a')],{seed:2});w.director={state:'idle',next:0,ev:null,seq:0,history:[]};
 for(let i=0;i<600;i++)core.tickWorld(w,1/60);
 assert.equal(w.director.state,'idle','Esgoto no Normal: nenhum evento');
 // variedade: sorteio não repete o mesmo evento em seguida
 const w2=core.makeWorld('orc','normal',[member('a')],{seed:4});w2.director={state:'idle',next:0,ev:null,seq:0,history:['orcMarch']};
 const seen=new Set();for(let i=0;i<40;i++){w2.director.history=['orcMarch'];seen.add(core.testing.pickEvent(w2));}
 assert.ok(!seen.has('orcMarch')&&seen.size===2,'sem repetir e com variedade: '+[...seen]);
});

test('V26.2: Chuva de Tesouros — baús em lugares válidos, Mímicos, prêmio por baú e baús somem no fim',async()=>{
 const core=await engine();
 const w=core.makeWorld('glast','normal',[member('a'),member('b','mage')],{seed:7});force(w,'treasureRain');
 const map=core.testing.nav(w);let chests=[];
 for(let i=0;i<60*6&&!chests.length;i++){core.tickWorld(w,1/60);chests=w.pickups.filter(o=>o.kind==='treasure');}
 assert.equal(chests.length,9,'7 + 1 por jogador');
 const players=[...w.players.values()];
 for(const c of chests){assert.ok(core.passable(map,c.x,c.y),'baú fora da parede');assert.ok(players.every(p=>Math.hypot(p.x-c.x,p.y-c.y)>=110),'longe dos jogadores');}
 const mimics=chests.filter(c=>c.amount==='mimic').length;assert.ok(mimics>=2&&mimics<=3,'≈30% Mímicos: '+mimics);
 // abrir tudo: anda até cada baú
 const a=w.players.get('a'),z0=a.zeny;let mimicMobs=0;
 for(const c of chests){a.x=c.x;a.y=c.y;a.hp=a.max;core.tickWorld(w,1/60);}
 for(let i=0;i<5;i++){a.hp=a.max;core.tickWorld(w,1/60);}
 for(const e of w.events)if(e.type==='worldEvent'&&e.phase==='mimic')mimicMobs++;
 assert.equal(mimicMobs,mimics,'cada Mímico vira monstro');
 assert.ok(a.zeny>z0,'Zeny dos baús bons');
 const end=w.events.filter(e=>e.type==='worldEvent'&&e.phase==='end').at(-1);
 assert.equal(end?.result,'success','todos abertos → evento termina com sucesso');
 assert.equal(w.pickups.filter(o=>o.kind==='treasure').length,0);
});

test('V26.2: Marcha dos Orcs entra em formação (guerreiros na frente, arqueiros atrás, veteranos) e usa a IA normal',async()=>{
 const core=await engine();
 const w=core.makeWorld('orc','normal',[member('a')],{seed:9});force(w,'orcMarch');w.spawnAt=1e9;w.mobs=[];
 for(let i=0;i<60*5;i++){core.tickWorld(w,1/60);if(w.director.state==='active')break;}
 const orcs=w.mobs.filter(m=>m.eventId);const p=w.players.get('a');
 const front=orcs.filter(m=>m.name==='Orc Guerreiro'),back=orcs.filter(m=>m.name==='Orc Arqueiro'),vets=orcs.filter(m=>m.name==='Orc Veterano');
 assert.equal(front.length,7);assert.equal(back.length,5);assert.equal(vets.length,2);assert.ok(vets.every(m=>m.elite));
 const avg=list=>list.reduce((t,m)=>t+Math.hypot(m.x-p.x,m.y-p.y),0)/list.length;
 assert.ok(avg(back)>avg(front),'arqueiros atrás dos guerreiros');
 const d0=avg(orcs);for(let i=0;i<60*3;i++){p.hp=p.max;core.tickWorld(w,1/60);}
 assert.ok(avg(orcs.filter(m=>m.hp>0))<d0,'a formação avança contra o grupo');
});
