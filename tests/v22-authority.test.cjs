const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const entry=path.join(__dirname,'..','authoritative-world.mjs');
const mod=()=>import('file://'+entry);
const members=[{id:'a',profile:{job:'acolyte'}},{id:'b',profile:{job:'mage'}}];
test('V22: EXP de pickup é compartilhada por todo o grupo e o relógio é do mundo',async()=>{
 const {makeWorld,tickWorld,snapshotWorld}=await mod(),w=makeWorld('sewer','normal',members);
 const a=w.players.get('a'),b=w.players.get('b');w.spawnAt=999;
 w.pickups.push({kind:'xp',uid:'xp-1',x:a.x,y:a.y,amount:21});
 tickWorld(w,.05);
 assert.equal(a.xp,21);assert.equal(b.xp,21);
 const snapA=snapshotWorld(w,'a'),snapB=snapshotWorld(w,'b');
 assert.equal(snapA.time,snapB.time);
 assert.equal(snapA.self.xp,snapB.self.xp);
});
test('V22: cura automática de noviço realmente restaura HP e gera FX autoritativo',async()=>{
 const {makeWorld,tickWorld}=await mod(),w=makeWorld('sewer','normal',[members[0]]),p=w.players.get('a');
 w.spawnAt=999;p.hp=30;p.invulnerableUntil=100;p.input.auto=true;
 for(let i=0;i<28;i++)tickWorld(w,.05);
 assert.ok(p.hp>44,`Cura insuficiente: ${p.hp}`);
 assert.ok(w.events.some(e=>e.type==='skillCast'&&e.skill==='heal'));
 assert.ok(w.events.some(e=>e.type==='healed'&&e.skill==='heal'));
});
test('V22: elite a cada 2 minutos e MVP garantido após 12 minutos em servidor',async()=>{
 const {makeWorld,tickWorld,snapshotWorld}=await mod(),w=makeWorld('sewer','normal',members);
 // V23 Etapa 5: elites de campo do solo (90 s, 180 s...; o 4º, aos 360 s, é Comandante).
 w.spawnAt=999;w.time=89.99;tickWorld(w,.05);
 assert.ok(w.mobs.some(m=>m.elite==='elite'));
 for(const t of [179.99,269.99,359.99]){w.time=t;tickWorld(w,.05);}
 assert.ok(w.mobs.some(m=>m.elite==='miniBoss'&&/^Comandante /.test(m.name)));
 w.time=719.99;tickWorld(w,.05);
 assert.ok(w.bossSpawned&&w.mvpActive);
 // V23.6: o MVP vem para o mapa e chama reforços a cada 9 s.
 assert.equal(w.arena,false);const boss=w.mobs.find(m=>m.elite==='mvp');assert.ok(boss);
 w.spawnAt=1e9;const before=w.mobs.filter(m=>m.summoned).length;for(let i=0;i<200;i++){tickWorld(w,.05);for(const q of w.players.values()){q.hp=q.max;}}
 assert.ok(w.mobs.filter(m=>m.summoned).length>before,'MVP chama reforços no mapa');
 assert.ok(snapshotWorld(w,'a').mvpActive);
});
test('V22.1: fenda é compartilhada — com E perto do portal o grupo inteiro entra; com E no portal de saída o grupo volta',async()=>{
 const {makeWorld,tickWorld,clock,snapshotWorld,command}=await mod(),w=makeWorld('sewer','normal',members);
 w.spawnAt=999;w.time=179.99;tickWorld(w,.05);
 assert.ok(w.riftPortal?.active);
 const a=w.players.get('a'),b=w.players.get('b');
 const back={x:b.x,y:b.y};a.x=w.riftPortal.x;a.y=w.riftPortal.y;
 tickWorld(w,.05);assert.equal(w.arena,false,'pisar no portal não leva ninguém (só com E)');
 command(w,'a',{riftEnter:1});tickWorld(w,.05);
 assert.equal(w.arena,true);assert.equal(w.riftPortal,null);
 for(const p of [a,b]){assert.ok(Math.hypot(p.x,p.y)<445,'jogador dentro da arena');assert.equal(p.warpSeq,1);}
 assert.ok(w.mobs.some(m=>m.riftGuardian));assert.equal(w.mobs.filter(m=>m.riftSeal).length,3);
 const frozen=clock(w);for(let i=0;i<40;i++)tickWorld(w,.05);
 assert.ok(Math.abs(clock(w)-frozen)<1e-9,'cronômetro da expedição pausa dentro da fenda');
 assert.equal(snapshotWorld(w,'b').arena,true);assert.ok(snapshotWorld(w,'b').rift.active);
 for(const m of w.mobs)if(m.riftSeal){m.hp=0;m.dead=true;}
 tickWorld(w,.05);assert.equal(w.rift.ward,false);
 const g=w.mobs.find(m=>m.riftGuardian);w.rift.phase=2;g.hp=1;for(const m of w.mobs)if(!m.riftGuardian){m.hp=0;m.dead=true;}w.rift.reinforceAt=1e9;a.x=g.x;a.y=g.y+15;a.invulnerableUntil=b.invulnerableUntil=1e9;
 for(let i=0;i<60&&!w.rift.cleared;i++)tickWorld(w,.05);
 assert.equal(w.rift.cleared,true);assert.equal(w.arena,true,'guardião derrotado abre a saída; ninguém é tirado da fenda');
 for(let i=0;i<40;i++)tickWorld(w,.05);assert.equal(w.arena,true);
 a.x=w.rift.exit.x;a.y=w.rift.exit.y;w.events.length=0;command(w,'a',{riftEnter:2});
 assert.equal(w.arena,false,'E no portal de saída devolve o grupo');assert.ok(w.events.some(e=>e.type==='riftComplete'));
 assert.ok(Math.hypot(b.x-back.x,b.y-back.y)<1,'cada jogador volta para onde estava');
 assert.ok(w.pickups.some(o=>o.kind==='chest'),'baú da fenda no mapa');
});
test('V22.1: fenda expira e devolve o grupo sem recompensa',async()=>{
 const {makeWorld,tickWorld,command}=await mod(),w=makeWorld('sewer','normal',members);
 w.spawnAt=999;w.time=179.99;tickWorld(w,.05);
 const a=w.players.get('a');a.x=w.riftPortal.x+100;a.y=w.riftPortal.y;
 command(w,'a',{riftEnter:1});
 assert.equal(w.arena,true,'botão entra a até 150 px do portal');
 a.invulnerableUntil=w.players.get('b').invulnerableUntil=1e9;
 w.rift.ends=w.time+.1;for(let i=0;i<5;i++)tickWorld(w,.05);
 assert.equal(w.arena,false);assert.ok(w.events.some(e=>e.type==='riftFailed'));
});
test('V22.1: posição prevista pelo cliente é aceita dentro do limite e cortada fora dele',async()=>{
 const {makeWorld,tickWorld,command,passable,playerSpeed}=await mod(),w=makeWorld('sewer','normal',[members[0]]),p=w.players.get('a');
 w.spawnAt=999;for(let i=0;i<10;i++)tickWorld(w,.05);
 const start={x:p.x,y:p.y};
 command(w,'a',{dx:1,dy:0,mv:{seq:1,x:p.x+4,y:p.y,warp:0}});
 assert.ok(Math.abs(p.x-(start.x+4))<1e-6,'passo legítimo aceito exatamente');
 command(w,'a',{dx:1,dy:0,mv:{seq:2,x:p.x+5000,y:p.y,warp:0}});
 assert.ok(p.x-start.x<playerSpeed(p)*.45+30,'teleporte cortado pelo orçamento de velocidade');
 const x=p.x;command(w,'a',{mv:{seq:2,x:p.x+3,y:p.y,warp:0}});assert.equal(p.x,x,'sequência repetida é ignorada');
 command(w,'a',{mv:{seq:3,x:p.x+3,y:p.y,warp:7}});assert.equal(p.x,x,'posição de antes de um teleporte é ignorada');
 for(let i=0;i<40;i++){tickWorld(w,.05);command(w,'a',{mv:{seq:10+i,x:p.x+30,y:p.y,warp:0}});}
 const maps=JSON.parse(require('node:fs').readFileSync(path.join(__dirname,'..','server-maps.json'),'utf8'));
 const map={...maps.sewer,bits:Buffer.from(maps.sewer.nav,'base64')};
 assert.ok(passable(map,p.x,p.y),'nunca atravessa parede');
});
test('V22: upgrades são aplicados no servidor e escolhas de baú requerem identificação válida',async()=>{
 const {makeWorld,command,tickWorld}=await mod(),w=makeWorld('sewer','normal',[members[0]]),p=w.players.get('a');
 w.spawnAt=999;w.pickups.push({uid:'c-1',kind:'chest',x:p.x,y:p.y,amount:2});tickWorld(w,.05);
 assert.equal(p.rewardChoices.length,3);
 command(w,'a',{reward:{seq:1,id:'inexistente'}});
 assert.equal(p.rewardChoices.length,3);
 const offer=p.rewardChoices[0];command(w,'a',{reward:{seq:2,id:offer.id}});
 assert.equal(p.rewardChoices.length,0);
 // V23 Etapa 3: baú dá BÊNÇÃO da run (regra do solo) em vez de bônus genérico.
 assert.equal(offer.stat,'blessing');assert.equal(p.blessings.perks[offer.id],1);
});
test('V22: ressurreição automática e dados de rede incapazes de forjar XP',async()=>{
 const {makeWorld,command,tickWorld}=await mod(),w=makeWorld('sewer','easy',members),a=w.players.get('a'),b=w.players.get('b');
 w.spawnAt=999;a.hp=0;b.x=a.x+12;b.y=a.y;
 command(w,'a',{xp:999999,level:100,damage:99999,revive:true});
 for(let i=0;i<65;i++)tickWorld(w,.05);
 assert.ok(a.hp>0,'Ressurreição por proximidade falhou');
 assert.equal(a.level,1);assert.ok(a.xp<100);
});

test('V22: noviço saudável pode curar o colega ferido automaticamente',async()=>{
 const {makeWorld,tickWorld}=await mod(),w=makeWorld('sewer','easy',members);
 const ac=w.players.get('a'),mage=w.players.get('b');
 ac.input.auto=true;ac.invulnerableUntil=999;mage.invulnerableUntil=999;
 mage.hp=18;w.spawnAt=999;
 for(let i=0;i<20;i++)tickWorld(w,.05);
 assert.ok(mage.hp>30,'O noviço não curou o aliado: HP '+mage.hp);
 assert.ok(w.events.some(e=>e.type==='healed'&&e.player==='b'));
});

test('V22.1: grupo inteiro caído na fenda volta ao mapa com 25% de HP (a run continua)',async()=>{
 const {makeWorld,tickWorld,command}=await mod(),w=makeWorld('sewer','normal',members);
 w.spawnAt=999;w.time=179.99;tickWorld(w,.05);
 const a=w.players.get('a'),b=w.players.get('b');a.x=w.riftPortal.x;a.y=w.riftPortal.y;command(w,'a',{riftEnter:1});tickWorld(w,.05);
 assert.equal(w.arena,true);a.hp=0;b.hp=0;tickWorld(w,.05);
 assert.equal(w.arena,false);assert.equal(w.finished,false);
 assert.ok(a.hp>=a.max*.25&&b.hp>=b.max*.25);
 assert.ok(w.events.some(e=>e.type==='riftFailed'&&e.wiped));
});
