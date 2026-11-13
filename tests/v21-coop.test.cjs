const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const file=n=>fs.readFileSync(path.join(root,n),'utf8');

test('V21: aproximação ressuscita automaticamente (sem tecla ou flag do cliente)',async()=>{
 const {makeWorld,command,tickWorld,REVIVE_SECONDS}=await import('../authoritative-world.mjs');
 const w=makeWorld('sewer','easy',[{id:'a',profile:{job:'archer'}},{id:'b',profile:{job:'acolyte'}}]);
 w.spawnAt=1e6;w.eliteAt=1e6;
 const a=w.players.get('a'),b=w.players.get('b');a.hp=0;b.x=a.x+25;b.y=a.y;
 command(w,'b',{dx:0,dy:0,attack:false});
 for(let i=0;i<Math.ceil((REVIVE_SECONDS+.1)/.05);i++)tickWorld(w,.05);
 assert.ok(a.hp>0 && a.hp<a.max*.52);
 assert.ok(w.events.some(e=>e.type==='revived'&&e.player==='a'&&e.by==='b'));
});

test('V21: ressurreição à distância e progresso de revive forjado são ignorados',async()=>{
 const {makeWorld,command,tickWorld}=await import('../authoritative-world.mjs');
 const w=makeWorld('sewer','easy',[{id:'a',profile:{job:'archer'}},{id:'b',profile:{job:'acolyte'}}]);
 w.spawnAt=1e6;w.eliteAt=1e6;
 const a=w.players.get('a'),b=w.players.get('b');a.hp=0;b.x=a.x+200;b.y=a.y;
 command(w,'b',{dx:0,dy:0,revive:true,reviveProgress:999999,hp:99999,attack:false});
 for(let i=0;i<65;i++)tickWorld(w,.05);
 assert.equal(a.hp,0);assert.equal(a.reviveProgress,0);
});

test('V23.6: ao subir de nível NÃO cura HP (regra do solo) e devolve 25% do SP',async()=>{
 const {makeWorld,tickWorld}=await import('../authoritative-world.mjs');
 const w=makeWorld('sewer','easy',[{id:'a',profile:{job:'sword'}}]);
 w.spawnAt=1e6;w.eliteAt=1e6;
 const a=w.players.get('a');a.hp=20;a.sp=0;
 w.pickups.push({uid:'xp-test',kind:'xp',x:a.x,y:a.y,amount:100});
 tickWorld(w,.05);
 assert.ok(a.level>=2);assert.ok(a.hp<21,`não curou: hp=${a.hp}`);
 assert.ok(a.sp>=8,'devolveu SP');assert.ok(w.events.some(e=>e.type==='levelUp'&&e.healed===0));
});

test('V21: servidor gera eventos distintos para animação e números de dano',async()=>{
 const {makeWorld,tickWorld,snapshotWorld}=await import('../authoritative-world.mjs');
 const w=makeWorld('sewer','easy',[{id:'a',profile:{job:'archer'}}]);
 w.spawnAt=1e6;w.eliteAt=1e6;
 const a=w.players.get('a');w.mobs.push({uid:987,id:'cramp',x:a.x+35,y:a.y+5,hp:200,max:200,damage:0,speed:0,xp:1,dir:0,elite:'',r:10,contactAt:1e6});
 // V23: o dano do ataque básico entra no quadro de impacto da arma (como no solo), não no quadro zero.
 const events=[];for(let i=0;i<30&&!events.some(e=>e.type==='hit');i++){tickWorld(w,.05);events.push(...w.events.filter(e=>e.type==='hit'||e.type==='combat'));w.events.length=0;}
 assert.ok(events.some(e=>e.type==='combat'&&e.kind==='attack'&&e.player==='a'));
 assert.ok(events.some(e=>e.type==='hit'&&e.damage>0&&e.target===987));
 const snap=snapshotWorld(w,'a');assert.ok(snap.mobs[0][4]<snap.mobs[0][5]);
});

test('V21: HUD móvel, ataque do personagem local, popup contido e painel de ressuscitação',()=>{
 const html=file('index.html'),game=file('game.js'),coop=file('coop.js');
 assert.match(html,/v21-coop\.css/);
 assert.match(html,/Arraste pelo título/);
 assert.doesNotMatch(html,/Segure <kbd>R<\/kbd> para ressuscitar/);
 assert.match(game,/performance\.now\(\)\/1000/);
 assert.match(game,/damageLabels\+\+<5/);
 assert.match(game,/\$\('online-revive-meter'\)\.max/);
 assert.match(coop,/response\.world\.net=\{rtt\}/);assert.match(coop,/new WebSocket/);
 assert.match(file('ro-hud-layout.js'),/savePositions/);
});
