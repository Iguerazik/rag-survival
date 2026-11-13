const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');

test('V21: jogador abatido pode ser ressuscitado por proximidade sem usar R', async()=>{
 const {makeWorld,command,tickWorld,snapshotWorld}=await import('../authoritative-world.mjs');
 const world=makeWorld('sewer','easy',[
   {id:'a',profile:{job:'archer'}},{id:'b',profile:{job:'acolyte'}}
 ]);
 const a=world.players.get('a'),b=world.players.get('b');
 world.spawnAt=100000;world.eliteAt=100000;
 b.x=a.x+24;b.y=a.y;
 a.hp=0;a.downedAt=.1;
 command(world,'b',{dx:0,dy:0,attack:false});
 for(let i=0;i<75;i++)tickWorld(world,.05);
 assert.ok(a.hp>0,'ally should regain HP');
 assert.ok(a.hp<=a.max*.55,'should not revive with full life');
 assert.ok(world.events.some(e=>e.type==='revived'&&e.by==='b'));
 assert.equal(snapshotWorld(world,'a').self.downed,false);
});

test('V20: cliente não pode falsificar o progresso de reviver e não revive à distância',async()=>{
 const {makeWorld,command,tickWorld}=await import('../authoritative-world.mjs');
 const world=makeWorld('sewer','easy',[
   {id:'a',profile:{job:'mage'}},{id:'b',profile:{job:'sword'}}
 ]);
 const a=world.players.get('a'),b=world.players.get('b');
 world.spawnAt=9999;world.eliteAt=9999;
 a.hp=0;b.x=a.x+200;b.y=a.y;
 command(world,'b',{revive:true,reviveProgress:300,hp:9999999,dx:0,dy:0,attack:false});
 for(let i=0;i<70;i++)tickWorld(world,.05);
 assert.equal(a.hp,0);
 assert.equal(a.reviveProgress,0);
});

test('V20: poses de ataque têm duração, sequência e progressão real em vez do valor constante',async()=>{
 const {makeWorld,tickWorld,snapshotWorld}=await import('../authoritative-world.mjs');
 const w=makeWorld('sewer','easy',[{id:'one',profile:{job:'archer'}}]);
 const p=w.players.get('one');
 w.spawnAt=9999;w.eliteAt=9999;
 w.mobs.push({uid:1,id:'baphometjr',x:p.x+32,y:p.y+5,hp:200,max:200,damage:0,speed:0,xp:1,dir:0,elite:'',r:10,contactAt:5000});
 tickWorld(w,.05);
 const view1=snapshotWorld(w,'one').players.one;
 assert.equal(view1.attack,true);assert.equal(view1.animKind,'attack');
 assert.ok(view1.animDuration>=.4);assert.equal(view1.animSeq,1);
 for(let i=0;i<3;i++)tickWorld(w,.05);
 const view2=snapshotWorld(w,'one').players.one;
 assert.ok(view2.animProgress>view1.animProgress,'progress should increase');
});

test('V20: guia abre na página e o lobby está visível acima das escolhas de classes',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.ok(html.includes('id="online-help-open"'));
 assert.ok(html.includes('id="online-help-dialog"'));
 assert.ok(html.indexOf('id="online-hub"')<html.indexOf('class="roster"'));
 assert.ok(!html.includes('href="CONTAS_ONLINE_V18.md" download'));
 assert.match(html,/id="coop-panel"[^>]+aria-labelledby="coop-title"(?! hidden)/);
 assert.ok(fs.existsSync(path.join(root,'v20-online.css')));
});
