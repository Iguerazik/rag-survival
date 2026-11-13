const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const vm=require('node:vm');
const {spawn}=require('node:child_process');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const url=file=>require('node:url').pathToFileURL(path.join(root,file)).href;
const engine=()=>import(url('authoritative-world.mjs')).then(()=>import(url('engine/core.mjs')));
const clean=v=>JSON.parse(JSON.stringify(v));
const member=(id,job,extra={})=>({id,profile:{job,classId:job},character:{base:60,stage:1,guildTrials:{0:true,4:true},
 stats:{str:60,agi:40,vit:40,int:40,dex:40,luk:10},gear:{weaponAtk:120,weaponMatk:60,items:['sword','cottonshirt'],slots:{weapon:'sword',armor:'cottonshirt'}},...extra}});
const tickTo=(core,w,t)=>{while(w.time<t)core.tickWorld(w,.05);};

test('V23 Etapa 5: dados do motor = scripts do jogo (forja, drops de asas, cronograma de fendas, salas do labirinto)',async()=>{
 const data=await import(url('engine/run-data.mjs'));
 const ctx={run:null,document:{createElement:()=>({})}};vm.createContext(ctx);
 vm.runInContext(read('run-loot.js')+';this.L=RuneLoot;',ctx);vm.runInContext(read('run-items.js')+';this.R=RunRelics;',ctx);vm.runInContext(read('encounters.js')+';this.E=MapEncounters;',ctx);
 assert.deepEqual(clean(data.FORGE_STATS),clean(ctx.L.forgeStats));
 assert.deepEqual(clean(data.UTILITY_DROPS),clean(ctx.R.dropRates));
 assert.deepEqual(clean(data.RIFT_SCHEDULE),clean(ctx.E.schedule));
 // salas e teleportes do labirinto no mapa do servidor = MapGen do navegador
 const noop=new Proxy(function(){},{get:(t,k)=>k==='canvas'?{width:1,height:1}:noop,apply:()=>noop,construct:()=>noop,set:()=>true});
 const g={document:{createElement:()=>({getContext:()=>noop,width:0,height:0,style:{}})},Image:function(){}};vm.createContext(g);
 vm.runInContext(read('mapgen.js')+';this.M=MapGen;',g);const f=g.M.build('maze'),maze=JSON.parse(read('server-maps.json')).maze;
 assert.deepEqual(maze.rooms,clean(f.rooms.map(r=>({index:r.index,x0:r.x0,y0:r.y0,x1:r.x1,y1:r.y1,center:r.center}))));
 assert.deepEqual(maze.warps,clean(f.warps.map(w=>({room:w.room,side:w.side,x:w.x,y:w.y}))));
});

test('V23 Etapa 5: eventos de campo do solo — elites a cada 90 s (4º Comandante), fendas aos 2/4/6/8/10 min, itens a cada 65 s',async()=>{
 const core=await engine();
 const w=core.makeWorld('payon','normal',[member('a','sword')],{seed:1}),p=w.players.get('a');
 assert.deepEqual(w.pickups.map(o=>o.kind).sort(),['xpmagnet','zenymagnet'],'ímãs escondidos no mapa desde o início');
 for(const o of w.pickups)assert.ok(Math.hypot(o.x-16,o.y-16)>=300);
 w.spawnAt=1e9;p.hp=p.max=1e6;p.input.attack=false;
 const elites=[],rifts=[],timed=[];
 for(let t=0;t<640;t+=.05){
  core.tickWorld(w,.05);p.hp=p.max;
  for(const e of w.events){if(e.type==='fieldElite')elites.push([Math.round(w.time),e.name]);if(e.type==='riftOpen')rifts.push(Math.round(w.time));}
  w.events.length=0;
  for(const o of w.pickups)if(o.timed&&!timed.some(x=>x[0]===o.uid))timed.push([o.uid,o.kind,Math.round(w.time),o.expires-w.time]);
  if(w.riftPortal)w.riftPortal.expires=0; // não entra nas fendas
  w.mobs=w.mobs.filter(m=>m.elite);for(const m of w.mobs)m.damage=0;
 }
 assert.deepEqual(elites.map(e=>e[0]),[90,180,270,360,450,540,630]);
 assert.match(elites[3][1],/^Comandante /);assert.match(elites[0][1],/^Veterano /);
 assert.deepEqual(rifts,[120,240,360,480,600]);
 assert.deepEqual(timed.slice(0,3).map(x=>[x[1],x[2]]),[['healing',55],['xpmagnet',120],['zenycache',185]]);
 assert.ok(timed.every(x=>x[3]<=95.01),'somem em 95 s');
 // Poção de Cura do chão e Bolsa de Zeny
 const h=core.makeWorld('payon','normal',[member('h','sword')],{seed:2}),q=h.players.get('h');h.spawnAt=1e9;core.tickWorld(h,.05);
 q.hp=q.max*.5;const hp=q.hp,z=q.zeny;h.pickups.push({uid:'hh',kind:'healing',x:q.x,y:q.y,amount:1},{uid:'zz',kind:'zenycache',x:q.x,y:q.y,amount:1});core.tickWorld(h,.05);
 assert.ok(q.hp>=hp+q.max*.25-1);assert.equal(q.zeny-z,25+1*10,'Bolsa de Zeny: 25 + 10 por mapa');
});

test('V23 Etapa 5: Asa de Mosca (fuga, proteção, cura, recarga, automática) e Poção de Cura usadas pelo motor',async()=>{
 const core=await engine();
 const w=core.makeWorld('sewer','normal',[member('a','sword',{wings:{flywing:2},potions:1,flyConfig:{enabled:false}})],{seed:3}),p=w.players.get('a');
 w.spawnAt=1e9;core.tickWorld(w,.05);
 const before={x:p.x,y:p.y};core.command(w,'a',{item:{seq:1,kind:'flywing'}});
 assert.ok(Math.hypot(p.x-before.x,p.y-before.y)>=280,'teleportou para longe');assert.ok(p.invulnerableUntil>=w.time+2.4);
 assert.equal(core.snapshotWorld(w,'a').self.wings.flywing,1);
 const at={x:p.x,y:p.y};core.command(w,'a',{item:{seq:2,kind:'flywing'}});assert.deepEqual({x:p.x,y:p.y},at,'recarga de 60 s');
 p.hp=p.max*.5;const hp=p.hp;for(let i=0;i<40;i++)core.tickWorld(w,.05);assert.ok(p.hp>hp+p.max*.05,'recupera HP por 4 s');
 // poção comprada
 p.hp=p.max*.4;const before2=p.hp;core.command(w,'a',{item:{seq:3,kind:'potion'}});assert.ok(p.hp>=before2+p.max*.25-1);
 core.command(w,'a',{item:{seq:4,kind:'potion'}});assert.equal(p.potionsUsed,1,'sem estoque e com recarga');
 // automática abaixo do HP escolhido
 const w2=core.makeWorld('sewer','normal',[member('b','sword',{wings:{flywing:1},flyConfig:{enabled:true,threshold:30}})],{seed:4}),b=w2.players.get('b');
 w2.spawnAt=1e9;core.tickWorld(w2,.05);b.hp=b.max*.2;w2.events.length=0;core.tickWorld(w2,.05);
 assert.ok(w2.events.some(e=>e.type==='flyWing'&&e.automatic),'Asa de Mosca automática');
 // sem asa no estoque não teleporta
 const w3=core.makeWorld('sewer','normal',[member('c','sword')],{seed:5}),c=w3.players.get('c');core.tickWorld(w3,.05);const pos={x:c.x,y:c.y};
 core.command(w3,'c',{item:{seq:1,kind:'flywing'}});assert.deepEqual({x:c.x,y:c.y},pos);
});

test('V23 Etapa 5: Asa de Borboleta leva o grupo a uma fenda contra um MVP (120 s, carta 1%)',async()=>{
 const core=await engine();
 const w=core.makeWorld('payon','normal',[member('a','sword',{wings:{butterflywing:1}}),member('b','mage')],{seed:6}),a=w.players.get('a');
 w.spawnAt=1e9;core.tickWorld(w,.05);
 core.command(w,'a',{item:{seq:1,kind:'butterflywing'}});
 assert.ok(w.arena&&w.rift?.mvp,'entrou na fenda MVP');
 const g=w.mobs.find(m=>m.uid===w.rift.guardian);
 assert.ok(Object.keys(core.combatData.MVP_PATTERNS).includes(g.id));assert.equal(g.cardRate,.01);assert.ok(Math.abs(w.rift.ends-w.time-120)<.1);
 assert.equal(a.wingsUsed.butterflywing,1);
 for(const p of w.players.values())assert.ok(Math.hypot(p.x,p.y-160)<120,'o grupo foi junto');
 // não funciona depois do portal do MVP
 const w2=core.makeWorld('payon','normal',[member('c','sword',{wings:{butterflywing:1}})],{seed:7});w2.spawnAt=1e9;w2.time=719.99;core.tickWorld(w2,.05);
 core.command(w2,'c',{item:{seq:1,kind:'butterflywing'}});assert.ok(!w2.rift);
});

test('V23 Etapa 5: asas caem de elites (taxas do solo) e vão para o estoque; servidor grava ganhos e usos na conta',async()=>{
 const core=await engine();
 const w=core.makeWorld('sewer','normal',[member('a','sword')],{seed:8}),p=w.players.get('a');w.spawnAt=1e9;
 let fly=0,kills=4000;
 for(let i=0;i<kills;i++){const m=core.testing.spawn(w,'cramp',{elite:'elite',at:{x:p.x+400,y:p.y}});core.testing.defeated(w,m,p);w.mobs=[];
  fly+=w.pickups.filter(o=>o.kind==='flywing').length;w.pickups=[];}
 assert.ok(fly>=50&&fly<=120,'Asa de Mosca ≈2% por elite ('+fly+'/'+kills+')');
 w.pickups.push({uid:'w1',kind:'flywing',x:p.x,y:p.y,amount:1});core.tickWorld(w,.05);assert.equal(p.wingsGained.flywing,1);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'midgard-wings-'));
 const port=37000+Math.floor(Math.random()*9000),base='http://127.0.0.1:'+port;
 const child=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,PORT:String(port),DATA_DIR:dir,HOST:'127.0.0.1'},stdio:'ignore'});
 try{
  for(let i=0;i<120;i++){try{if((await fetch(base+'/api/health')).ok)break;}catch{}await new Promise(r=>setTimeout(r,40));}
  const r=await fetch(base+'/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json','X-Midgard-Request':'1'},
   body:JSON.stringify({username:'asinhas',email:'asas@example.test',nickname:'Asas',password:'Senha-super-segura-1234567'})});
  const cookie=r.headers.get('set-cookie').split(';')[0];const {accountStore}=await import(url('accounts.mjs'));const acc=accountStore(dir);const id=acc.current({headers:{cookie}}).id;
  const award={zeny:0,kills:10,level:3,map:'sewer',difficulty:'normal',line:'sword',win:false,cards:[],wings:{gained:{flywing:3,butterflywing:1},used:{flywing:1}},potionsUsed:0};
  acc.grantCoop(id,'w-1',award);let data=acc.snapshot(id).data;assert.deepEqual(data.wings,{flywing:2,butterflywing:1});
  acc.grantCoop(id,'w-2',{...award,wings:{gained:{},used:{flywing:9,butterflywing:9}}});data=acc.snapshot(id).data;
  assert.deepEqual(data.wings,{flywing:0,butterflywing:0},'nunca fica negativo');
  // Quem sai no meio da partida não leva prêmio, mas o que gastou sai do estoque (sem duplicar asas/poções).
  acc.grantCoop(id,'w-3',{...award,wings:{gained:{flywing:4,butterflywing:2},used:{}},potionsUsed:0});
  let d=acc.snapshot(id).data;d.healPotions=3;
  assert.equal(acc.spendConsumables(id,{wings:{flywing:1,butterflywing:0},potionsUsed:2}),true);
  d=acc.snapshot(id).data;assert.deepEqual(d.wings,{flywing:3,butterflywing:2});
  assert.equal(acc.spendConsumables(id,{wings:{},potionsUsed:0}),false,'nada gasto = nada muda');
  assert.match(read('server.mjs'),/if\(p&&member\.userId&&!room\.world\.finished\)\{try\{accounts\.spendConsumables\(member\.userId,\{wings:p\.wingsUsed,potionsUsed:p\.potionsUsed\}\)/);
 }finally{child.kill();fs.rmSync(dir,{recursive:true,force:true});}
});

test('V23 Etapa 5: forja da expedição (baú verde) melhora itens equipados só nesta run, até 4 por atributo',async()=>{
 const core=await engine();
 const w=core.makeWorld('sewer','normal',[member('a','sword')],{seed:9}),p=w.players.get('a');w.spawnAt=1e9;core.tickWorld(w,.05);
 w.pickups.push({uid:'f1',kind:'forge',x:p.x,y:p.y,amount:1});core.tickWorld(w,.05);
 assert.equal(p.rewardChoices.length,3);for(const o of p.rewardChoices){assert.equal(o.stat,'forge');assert.ok(['weapon','armor'].includes(o.slot));}
 const str=p.base.s.str;
 for(let i=0;i<6;i++){p.rewardChoices=[{id:'forge:weapon:str',stat:'forge',slot:'weapon',item:'sword',key:'str'}];core.command(w,'a',{reward:{seq:10+i,id:'forge:weapon:str'}});}
 assert.equal(p.forged.weapon.str,4,'no máximo 4');assert.equal(p.base.s.str,str+4,'FOR +1 por nível');
 // Comandante sempre deixa forja; sem equipamento, a forja vira 30 Zeny.
 const m=core.testing.spawn(w,'cramp',{elite:'miniBoss',at:{x:p.x+300,y:p.y}});core.testing.defeated(w,m,p);
 assert.ok(w.pickups.some(o=>o.kind==='forge'));
 const w2=core.makeWorld('sewer','normal',[member('b','sword',{gear:{weaponAtk:25,items:[],slots:{}}})],{seed:10}),b=w2.players.get('b');w2.spawnAt=1e9;core.tickWorld(w2,.05);
 const z=b.zeny;w2.pickups.push({uid:'f2',kind:'forge',x:b.x,y:b.y,amount:1});core.tickWorld(w2,.05);assert.equal(b.zeny-z,30);
});

test('V23 Etapa 5: rota da missão — Purificar (forja e +12% contra o MVP) ou Relíquia (3 elites e baú); 3 s no selo escolhe Relíquia',async()=>{
 const core=await engine();
 const run=(route)=>{
  const w=core.makeWorld('sewer','normal',[member('a','sword')],{seed:11}),p=w.players.get('a');w.spawnAt=1e9;w.eliteAt=1e9;w.nextRiftAt=1e9;w.nextMagnetAt=1e9;w.trials=[];
  core.tickWorld(w,.05);const q=w.contract;q.node={x:p.x,y:p.y};p.hp=p.max=1e6;
  if(route)core.command(w,'a',{route});
  for(let i=0;i<300&&q.stage===0;i++)core.tickWorld(w,.05);
  return {w,p,q};
 };
 let {w,p,q}=run(null);assert.equal(q.route,'relic','3 s no selo sem escolher = Relíquia');assert.equal(q.stage,1);assert.equal(q.goal,3);
 ({w,p,q}=run('seal'));assert.equal(q.route,'seal');assert.equal(q.goal,2);
 core.command(w,'a',{route:'relic'});assert.equal(q.route,'seal','a rota não muda depois de escolhida');
 q.eliteKills=2;core.tickWorld(w,.05);assert.equal(q.stage,2);q.node={x:p.x,y:p.y};
 for(let i=0;i<260&&!q.done;i++)core.tickWorld(w,.05);
 assert.ok(q.done);assert.ok(w.pickups.some(o=>o.kind==='forge')||p.rewardChoices.some(o=>o.stat==='forge')||p.chestQueue.includes('forge'),'Purificar dá forja');
 assert.match(read('engine/core.mjs'),/mob\.elite==='mvp'&&world\.contract\.done&&world\.contract\.route==='seal'\)amount\*=1\.12/);
 // canalizando no selo: dano recebido -38% e a canalização atrasa
 const c=run('relic');c.q.stage=0;c.q.node={x:c.p.x,y:c.p.y};c.q.charge=3;
 const m=core.testing.spawn(c.w,'cramp',{at:{x:c.p.x+18,y:c.p.y}});m.contactAt=0;c.p.invulnerableUntil=0;c.p.base.flee=0;c.p.base.perfectDodge=0;c.p.input.attack=false;
 const hp=c.p.hp;for(let i=0;i<4&&c.p.hp===hp;i++)core.tickWorld(c.w,.05);
 assert.ok(c.p.hp<hp);assert.ok(c.q.pauseUntil>c.w.time,'a canalização pausa ao levar dano');
});

test('V23 Etapa 5: labirinto — monstros nascem na sua sala, teleportes com E entre salas e Guardião dos Portais',async()=>{
 const core=await engine();
 const maps=JSON.parse(read('server-maps.json')),maze={...maps.maze,bits:Buffer.from(maps.maze.nav,'base64')};
 const w=core.makeWorld('maze','normal',[member('a','sword')],{seed:12}),p=w.players.get('a');w.spawnAt=1e9;core.tickWorld(w,.05);
 const room=core.roomAt(maze,p.x,p.y);assert.equal(room,12,'começa na sala central');
 for(let i=0;i<60;i++){const m=core.testing.spawn(w,'mantis',{near:p});assert.equal(core.roomAt(maze,m.x,m.y),room,'nasce na mesma sala');}
 w.mobs=[];
 const warp=maze.warps.find(x=>x.room===room);p.x=warp.x;p.y=warp.y;w.events.length=0;core.tickWorld(w,.05);
 assert.ok(!w.events.some(x=>x.type==='mazeWarp'),'encostar no portal não teleporta (só com E)');
 core.command(w,'a',{riftEnter:1});
 const e=w.events.find(x=>x.type==='mazeWarp');assert.ok(e,'teleportou');assert.notEqual(e.room,room);assert.equal(core.roomAt(maze,p.x,p.y),e.room);
 // força o encontro secreto: visitas suficientes depois de 55 s
 w.time=Math.max(w.time,60);w.maze.visits=7;p.warpReady=0;
 const exit=maze.warps.find(x=>x.room===core.roomAt(maze,p.x,p.y));p.x=exit.x;p.y=exit.y;core.command(w,'a',{riftEnter:2});
 assert.equal(w.maze.active,true,'Guardião dos Portais apareceu');const g=w.mobs.find(m=>m.special);assert.equal(g.name,'Guardião dos Portais');
 assert.equal(core.roomAt(maze,g.x,g.y),core.roomAt(maze,p.x,p.y));
 // portais selados enquanto ele vive
 const other=maze.warps.find(x=>x.room===core.roomAt(maze,p.x,p.y));p.x=other.x;p.y=other.y;p.warpReady=0;const r0=core.roomAt(maze,p.x,p.y);core.command(w,'a',{riftEnter:3});
 assert.equal(core.roomAt(maze,p.x,p.y),r0,'portais selados');
 core.testing.defeated(w,g,p);
 assert.equal(w.maze.defeated,true);assert.ok(w.pickups.some(o=>o.kind==='chest'&&o.amount==='maze'),'baú do segredo');assert.ok(w.pickups.some(o=>o.kind==='forge'));
 // em grupo, o destino do teleporte é fixo (todos conseguem se seguir)
 const w2=core.makeWorld('maze','normal',[member('x','sword'),member('y','sword')],{seed:13}),x=w2.players.get('x');w2.spawnAt=1e9;core.tickWorld(w2,.05);
 const wp=maze.warps.find(v=>v.room===12&&v.side===1);x.x=wp.x;x.y=wp.y;w2.events.length=0;core.command(w2,'x',{riftEnter:1});
 assert.equal(w2.events.find(v=>v.type==='mazeWarp').room,(12*7+1*3+5)%25);
});

test('V23 Etapa 5: a tela usa o motor para asas, poção e rota, e mostra forja, labirinto e itens de campo',()=>{
 assert.match(read('run-items.js'),/function fly\(automatic=false\)\{\n    if\(run\?\.authoritative\)\{[^\n]*queueOnlineItem\('flywing'\)/);
 assert.match(read('run-items.js'),/queueOnlineItem\('butterflywing'\)/);
 assert.match(read('v12-systems.js'),/queueOnlineItem\('potion'\)/);
 assert.match(read('roguelike.js'),/b\.onclick=\(\)=>\{run\.coopRoute=id;\}/);
 const game=read('game.js');
 assert.match(game,/item:run\.coopItem\|\|null,route:run\.coopRoute\|\|null/);
 for(const kind of ['healing','zenycache','flywing','forge'])assert.match(game,new RegExp("kind==='"+kind+"'"));
 assert.match(read('server.mjs'),/wings:\{gained:p\.wingsGained,used:p\.wingsUsed\},potionsUsed:p\.potionsUsed/);
});
