const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const url=file=>require('node:url').pathToFileURL(path.join(root,file)).href;
const engine=()=>import(url('authoritative-world.mjs')).then(()=>import(url('engine/core.mjs')));
const member=(id,job,classId=job,stage=0)=>({id,profile:{job,classId},character:{base:30,stage,stats:{},gear:{weaponAtk:25,items:[],slots:{}}}});

test('V23.6: direção no padrão do Ragnarok (0 sul, 2 oeste, 4 norte, 6 leste), igual à tela',async()=>{
 const core=await engine();
 assert.deepEqual([core.roDir(0,1),core.roDir(-1,0),core.roDir(0,-1),core.roDir(1,0)],[0,2,4,6]);
 // a tela usa a mesma convenção (direction(x,y) do game.js)
 assert.match(read('game.js'),/function direction\(x, y\) \{\s*return \(Math\.round\(Math\.atan2\(-x, y\) \/ \(Math\.PI \/ 4\)\) \+ 8\) % 8;/);
 const w=core.makeWorld('sewer','normal',[member('a','sword')],{seed:1}),p=w.players.get('a');w.spawnAt=1e9;w.mobs=[];
 core.command(w,'a',{dx:-1,dy:0});for(let i=0;i<4;i++)core.tickWorld(w,.05);assert.equal(p.dir,2,'andando para a esquerda olha para oeste');
});

test('V23.6: Aprendiz T. só com habilidades de Aprendiz (Primeiros Socorros e Fingir de Morto) + Melhorias de treino (V25.2)',async()=>{
 const core=await engine(),cat=JSON.parse(read('online-skills.json'));
 assert.deepEqual(cat.stages[2],['novice','boon']);
 for(const line of Object.keys(cat.lines))assert.deepEqual(cat.lines[line].novice,['firstaid','playdead']);
 for(const line of Object.keys(cat.lines)){
  const w=core.makeWorld('sewer','normal',[member('a',line,cat.classes[line][2],2)],{seed:2}),p=w.players.get('a');
  assert.deepEqual(Object.keys(p.skills),['firstaid'],line+': começa com Primeiros Socorros');
  // habilidades: só as de Aprendiz; o resto do sorteio são as Melhorias de treino (passivas, não ocupam atalho)
  assert.ok(p.pool.every(id=>['firstaid','playdead'].includes(id)||cat.skills[id].boon),line+': nada da classe anterior ('+p.pool+')');
 }
 // Primeiros Socorros cura só você
 const w=core.makeWorld('sewer','normal',[member('a','sword','highnovice',2),member('b','sword')],{seed:3}),a=w.players.get('a'),b=w.players.get('b');
 w.spawnAt=1e9;core.tickWorld(w,.05);a.hp=a.max*.5;b.hp=b.max*.5;b.x=a.x+20;b.y=a.y;const hb=b.hp;
 for(let i=0;i<20;i++){core.command(w,'a',{skill:1,skillSeq:i+1,attack:false});core.tickWorld(w,.05);}
 assert.ok(a.hp>a.max*.5);assert.ok(b.hp<=hb+b.max*.02,'não cura o colega');
});

test('V23.6: drops e subida de nível do solo (poção azul limitada desde a V25.4, poção 4,5%, nível mais lento, sem cura ao subir)',async()=>{
 const src=read('engine/core.mjs');
 assert.match(src,/if\(rand\(world\)<\.045&&world\.pickups\.filter\(o=>o\.kind==='potion'\)\.length<12\)groundDrop\(world,'potion'/);
 // V25.4: a poção azul voltou, mas limitada (no máximo 3 no chão e uma a cada 18 s).
 assert.match(src,/filter\(o=>o\.kind==='sppotion'&&!o\.taken\)\.length<4\)/);
 assert.match(src,/const xpNeeded=level=>Math\.ceil\(26\*D\.pow\(level,1\.42\)\);/);
 const core=await engine();
 const w=core.makeWorld('sewer','normal',[member('a','sword')],{seed:4}),p=w.players.get('a');w.spawnAt=1e9;core.tickWorld(w,.05);
 p.hp=p.max*.5;const hp=p.hp;w.pickups.push({uid:'x1',kind:'xp',x:p.x,y:p.y,amount:p.needed+1});for(let i=0;i<3;i++)core.tickWorld(w,.05);
 assert.equal(p.level,2);assert.ok(p.hp<hp+p.max*.02,'subir de nível não cura');
});

test('V23.6: online suave — movimento carimbado no relógio do próprio jogador e reproduzido nesse ritmo',async()=>{
 const core=await engine();
 const w=core.makeWorld('sewer','normal',[member('a','sword'),member('b','mage')],{seed:5}),a=w.players.get('a');w.spawnAt=1e9;core.tickWorld(w,.05);
 core.command(w,'a',{mv:{seq:1,x:a.x+2,y:a.y,warp:a.warpSeq,ct:1234.5}});
 assert.equal(core.snapshotWorld(w,'b').players.a.ct,1234.5);
 core.command(w,'a',{mv:{seq:2,x:a.x+2,y:a.y,warp:a.warpSeq,ct:1000}});assert.equal(a.moveCt,1234.5,'carimbo nunca volta');
 const game=read('game.js');
 assert.match(game,/out\.mv\.ct=Math\.round\(performance\.now\(\)\)\/1000;/);
 assert.match(game,/entry\.offTarget=entry\.minD\+entry\.jit\+\.04;/);
 assert.match(game,/entry\.off\+=Math\.max\(-\.05\*dt,Math\.min\(\.3\*dt,entry\.offTarget-entry\.off\)\);/);
});

test('V23.6: janela de pets/loja não prende o jogo se algo falhar; MVP no mapa; portais só com E',()=>{
 const game=read('game.js');
 const open=game.slice(game.indexOf('function openCatalogue('),game.indexOf('function closeCatalogue('));
 assert.ok(open.indexOf("mode='catalogue'")>open.indexOf("kind==='codex'"),'só pausa depois de montar a janela');
 assert.match(open,/buy\.disabled=!enabled\|\|level===u\.max\|\|\(saved\.codexCoins\|\|0\)<cost;\n      item\.append\(head,desc,buy\);return item;/,'melhorias do pet sem variável inexistente');
 const core=read('engine/core.mjs');
 assert.doesNotMatch(core,/world\.mvpPortal=\{/);
 assert.match(core,/function interact\(world,p\)/);
 assert.doesNotMatch(core,/find\(p=>p\.hp>0&&distance\(p,r\)<46\)/,'pisar no portal da fenda não entra');
});
