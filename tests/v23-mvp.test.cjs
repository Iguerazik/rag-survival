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
 stats:{str:60,agi:40,vit:40,int:40,dex:40,luk:10},gear:{weaponAtk:120,weaponMatk:60,items:[]},...extra}});
function browser(){
 const ctx={};vm.createContext(ctx);
 for(const f of ['cards.js','elements.js','expedition.js','items.js'])vm.runInContext(read(f),ctx,{filename:f});
 vm.runInContext('this.api={Elemental,bosses,itemDb,Gear,mobElements}',ctx);return ctx.api;
}
function toMvp(core,w){
 w.spawnAt=1e9;w.nextRiftAt=1e9;w.eliteAt=1e9;w.nextMagnetAt=1e9;w.contract.done=true;w.trials=[];w.mobs=[];
 w.time=719.99;core.tickWorld(w,.05);const boss=w.mobs.find(m=>m.elite==='mvp');assert.ok(boss,'MVP apareceu no mapa aos 12:00');
 w.home={x:boss.x,y:boss.y};return boss;
}

test('V23 Etapa 4: dados de combate do motor = scripts do jogo (elementos, MVPs, itens)',async()=>{
 const data=await import(url('engine/combat-data.mjs')),b=browser();
 assert.deepEqual(clean(data.ELEMENT_MATRICES),clean(b.Elemental.matrices));
 assert.deepEqual(clean(data.ELEMENT_LEVELS),clean(b.Elemental.levels));
 assert.deepEqual(clean(data.ELEMENT_ORDER),clean(b.Elemental.order));
 for(const [id,boss] of Object.entries(b.bosses))assert.deepEqual(clean(data.MVP_PATTERNS[id]),clean({name:boss.name,patterns:boss.patterns,attacks:boss.attacks}));
 for(const [id,it] of Object.entries(b.itemDb))assert.deepEqual(clean(data.ITEMS[id]),clean({name:it.name,type:it.type,tier:it.tier,classes:it.classes||null,katar:!!it.katar,twoHanded:!!it.twoHanded}));
 const catalog=JSON.parse(read('online-skills.json'));
 // V23.6: colares de imbuimento (e todas as relíquias) saíram das recompensas.
 for(const id of ['flame','frost','gale','earth','holy'])assert.equal(catalog.relics[id],undefined,'colar elemental '+id+' removido');
 assert.equal(catalog.relics.niflheim.stats.echo,1);
});

test('V23 Etapa 4: tabela de fraquezas igual à do solo, elemento das habilidades e imunidade',async()=>{
 const core=await engine(),b=browser();
 for(const mob of Object.keys(b.mobElements))for(const el of b.Elemental.order)
  assert.equal(core.elementFactor(el,mob),b.Elemental.factor(el,mob),el+' contra '+mob);
 // V23.6: colares de imbuimento saíram do jogo; o ataque básico é Neutro e cada habilidade usa o próprio elemento.
 const w=core.makeWorld('payon','normal',[member('m','mage')],{seed:1});w.spawnAt=1e9;w.eliteAt=1e9;w.nextRiftAt=1e9;core.tickWorld(w,.05);w.mobs=[];w.pickups=[];
 const m=w.players.get('m');m.sp=m.maxSp=999;m.input.attack=false;
 assert.equal(core.elementOf(m,''),'neutral');assert.equal(core.elementOf(m,'fire'),'fire');assert.equal(core.elementOf(m,'frost'),'water');
 let seq=0;const cast=(skill,mobId)=>{w.mobs=[];m.skills={[skill]:1};m.slots=[skill];m.cooldowns={};
  const mob=core.testing.spawn(w,mobId,{at:{x:m.x+60,y:m.y}});mob.hp=mob.max=500;mob.damage=0;mob.speed=0;w.events.length=0;const events=[];
  for(let i=0;i<30;i++){core.command(w,'m',{dx:0,dy:0,attack:false,auto:false,skill:1,skillSeq:++seq});core.tickWorld(w,.05);events.push(...w.events);w.events.length=0;}
  return {mob,events};};
 // Horong (Fogo 4) é imune a Fogo: Lanças de Fogo não causam dano.
 assert.equal(core.elementFactor('fire','horong'),0);
 const fire=cast('fire','horong');assert.equal(fire.mob.hp,500,'imune a Fogo');assert.ok(fire.events.some(e=>e.type==='immune'&&e.el==='fire'));
 // fraqueza: Água contra Nove Caudas (Fogo) aparece no evento do golpe
 const frost=cast('frost','nine_tail');const hit=frost.events.find(e=>e.type==='hit'&&e.by==='m');
 assert.equal(hit.el,'water');assert.equal(hit.f,core.elementFactor('water','nine_tail'));assert.ok(hit.f>1);
});

test('V23.6: MVP aparece NO MAPA aos 12:00, perto do grupo, sem arena, e continua chamando reforços',async()=>{
 const core=await engine();
 const w=core.makeWorld('payon','normal',[member('a','sword'),member('b','mage'),member('c','acolyte')],{seed:2});
 const boss=toMvp(core,w);
 assert.equal(w.arena,false);assert.equal(core.snapshotWorld(w,'a').arena,false);assert.equal(w.mvpPortal,undefined);
 assert.equal(boss.id,'moonlight');assert.deepEqual(boss.patterns,['circle','ring','line']);
 const a=w.players.get('a');assert.ok(Math.hypot(boss.x-a.x,boss.y-a.y)<300);
 for(const p of w.players.values()){p.hp=p.max=1e6;p.input.attack=false;}boss.hp=boss.max=1e8;
 let most=0;for(let i=0;i<20*20;i++){core.tickWorld(w,.05);most=Math.max(most,w.mobs.filter(m=>m.summoned).length);}
 assert.ok(most>=4,'reforços a cada 9 s ('+most+')');
});

test('V23 Etapa 4: ataques com aviso no chão (círculo, anel, linha, investida, invocação) acertam quem está na área',async()=>{
 const core=await engine();
 const circle={kind:'circle',x:0,y:0,radius:100,angle:0},ring={kind:'ring',x:0,y:0,radius:225,angle:0},line={kind:'line',x:0,y:0,radius:90,angle:0};
 assert.ok(core.strikeHits(circle,{x:50,y:0}));assert.ok(!core.strikeHits(circle,{x:150,y:0}));
 assert.ok(core.strikeHits(ring,{x:200,y:0}));assert.ok(!core.strikeHits(ring,{x:50,y:0}),'centro do anel é seguro');
 assert.ok(core.strikeHits(line,{x:400,y:20}));assert.ok(!core.strikeHits(line,{x:400,y:80}),'desviar para o lado escapa da linha');
 const w=core.makeWorld('payon','normal',[member('a','sword'),member('b','sword')],{seed:3});toMvp(core,w);
 const a=w.players.get('a'),b=w.players.get('b');
 const boss=w.mobs.find(m=>m.elite==='mvp');boss.hp=boss.max=1e7;
 for(const p of [a,b]){p.hp=p.max=1e5;p.input.attack=false;}
 const kinds=new Set(),names=new Set();let warned=false,hits=0;
 for(let i=0;i<20*30;i++){
  if(boss.warning&&!warned){warned=true;const w0=boss.warning;
   // a fica dentro da área, b fica longe
   a.x=w0.kind==='ring'?w0.x+200:w0.x+(w0.kind==='line'?Math.cos(w0.angle)*200:10);a.y=w0.kind==='line'?w0.y+Math.sin(w0.angle)*200:w0.y;b.x=w0.x;b.y=w0.y+(w0.kind==='circle'?300:w0.kind==='ring'?20:300);
   if(w0.kind==='line'){b.x=w0.x-Math.sin(w0.angle)*300;b.y=w0.y+Math.cos(w0.angle)*300;}
   a.invulnerableUntil=b.invulnerableUntil=0;}
  core.tickWorld(w,.05);
  for(const e of w.events){if(e.type==='strike'){kinds.add(e.kind);if(warned){warned=false;}}if(e.type==='bossAttack')names.add(e.name);if(e.type==='hurt'&&e.strike)hits++;}
  w.events.length=0;boss.x=w.home.x;boss.y=w.home.y;
 }
 assert.ok(kinds.has('circle')&&kinds.has('ring')&&kinds.has('line'),'Flor do Luar usa círculo, anel e linha: '+[...kinds]);
 assert.ok([...names].some(n=>/Coluna de Fogo|Ataque em anel|Investida/.test(n)),'nome do ataque aparece ('+[...names].join(', ')+')');
 assert.ok(hits>0,'o golpe acerta quem ficou na área');
 // Carta Besouro-Ladrão Dourado: imune à magia do MVP (Flor do Luar: círculo e anel são mágicos).
 const w2=core.makeWorld('payon','normal',[member('g','sword',{gear:{weaponAtk:100,magicImmune:true,items:[]}})],{seed:4});toMvp(core,w2);
 const g=w2.players.get('g');
 const m2=w2.mobs.find(m=>m.elite==='mvp');m2.hp=m2.max=1e7;g.hp=g.max=1e5;g.input.attack=false;
 let immune=0;for(let i=0;i<20*20;i++){if(m2.warning&&m2.warning.kind!=='line'){g.x=m2.warning.x;g.y=m2.warning.y+(m2.warning.kind==='ring'?200:0);g.invulnerableUntil=0;}
  core.tickWorld(w2,.05);immune+=w2.events.filter(e=>e.type==='magicImmune').length;w2.events.length=0;m2.x=w2.home.x;m2.y=w2.home.y;}
 assert.ok(immune>0,'magia do MVP bloqueada pela carta');
 // Elite (Comandante) a cada 2 minutos também ataca com aviso; Besouro-Ladrão Dourado invoca ajudantes.
 const w3=core.makeWorld('sewer','normal',[member('e','sword')],{seed:5});w3.spawnAt=1e9;w3.time=89.99;core.tickWorld(w3,.05);
 const elite=w3.mobs.find(m=>m.elite==='elite');assert.ok(elite.patterns&&elite.patterns.length===2);
 const w4=core.makeWorld('sewer','normal',[member('s','sword')],{seed:8});toMvp(core,w4);const s4=w4.players.get('s');
 const bug=w4.mobs.find(m=>m.elite==='mvp');bug.hp=bug.max=1e7;s4.hp=s4.max=1e6;s4.input.attack=false;let summoned=0;
 for(let i=0;i<20*15;i++){core.tickWorld(w4,.05);summoned=Math.max(summoned,w4.mobs.filter(m=>m.summoned).length);}
 assert.equal(bug.id,'goldenbug');assert.ok(summoned>=2,'Convocar Besouros chama ajudantes ('+summoned+')');
});

test('V23 Etapa 4: tesouro do MVP — 4 equipamentos da classe, escolha de cada um, modo infinito e fim da expedição',async()=>{
 const core=await engine();
 const w=core.makeWorld('maze','normal',[member('a','sword'),member('b','mage')],{seed:6});toMvp(core,w);
 const a=w.players.get('a'),b=w.players.get('b');
 const boss=w.mobs.find(m=>m.elite==='mvp');
 w.pickups.push({uid:'card-x',kind:'card',x:0,y:0,amount:1,id:'baphomet'});
 core.testing.defeated(w,boss,a);boss.hp=0;
 assert.ok(w.mvpDefeated&&!w.finished,'não termina antes da escolha');
 assert.ok(!w.pickups.some(o=>o.kind==='chest'),'MVP não solta baú de bênção, só o tesouro de equipamento');
 for(const p of [a,b]){
  // V23.6: 4 opções de TIPOS diferentes (arma, armadura, escudo, chapéu, capa, bota, acessório)
  assert.equal(p.rewardChoices.length,4);assert.equal(new Set(p.rewardChoices.map(o=>core.combatData.ITEMS[o.id].type)).size,4,'tipos diferentes');
  for(const o of p.rewardChoices){const it=core.combatData.ITEMS[o.id];assert.equal(o.stat,'gear');assert.ok(it.tier>=1&&it.tier<=4);
   assert.ok(!it.classes||it.classes.includes(p.job),'item da classe');assert.equal(Object.keys(o.affixes).length,{1:0,2:1,3:2,4:3}[it.tier]);}
 }
 const offered=a.rewardChoices.length;core.command(w,'a',{reward:{seq:1,id:'nao-existe'}});assert.equal(a.rewardChoices.length,offered,'escolha inválida ignorada');
 const pick=a.rewardChoices[1];core.command(w,'a',{reward:{seq:2,id:pick.id}});core.tickWorld(w,.05);
 assert.deepEqual(a.mvpItem,{id:pick.id,affixes:pick.affixes});assert.ok(!w.finished,'espera o outro jogador');
 core.command(w,'b',{reward:{seq:1,id:'skip'}});core.tickWorld(w,.05);
 // V24.1: depois do tesouro começa o MODO INFINITO (a vitória já conta); qualquer jogador pode encerrar a run.
 assert.equal(w.won,true);assert.ok(w.endless,'modo infinito ativo');assert.equal(w.finished,false);assert.equal(b.mvpItem,undefined);
 assert.ok(w.events.some(e=>e.type==='endlessStart'));
 core.command(w,'b',{endRun:true});core.tickWorld(w,.05);
 assert.equal(w.finished,true);assert.equal(w.won,true);assert.equal(w.phase,'win');assert.ok(w.events.some(e=>e.type==='endlessEnd'&&e.reason==='stop'));
 assert.ok(a.cards.includes('baphomet')||b.cards.includes('baphomet'),'carta do chão vai para alguém antes de encerrar');
 // Sem escolha em 25 s: leva a 1ª opção.
 const w2=core.makeWorld('maze','normal',[member('c','thief')],{seed:7});toMvp(core,w2);const c=w2.players.get('c');
 const boss2=w2.mobs.find(m=>m.elite==='mvp');core.testing.defeated(w2,boss2,c);boss2.hp=0;const first=c.rewardChoices[0].id;
 w2.time+=25.1;core.tickWorld(w2,.05);assert.ok(w2.endless&&!w2.finished);assert.equal(c.mvpItem.id,first);
 // no infinito, se todos caem a run termina como VITÓRIA (o MVP já tinha caído)
 c.hp=0;c.reviveAt=Infinity;core.tickWorld(w2,.05);assert.equal(w2.finished,true);assert.equal(w2.won,true);assert.equal(w2.phase,'win');
});

test('V23 Etapa 4: item do tesouro vai para o inventário com a regra do solo (novo, repetido vira refino, +8 vira Zeny)',()=>{
 const {Gear}=browser();
 let r=Gear.grantItem([],{id:'tsurugi',affixes:{str:3,hack:99,luk:7}},2,'u1');
 assert.equal(r.text,'novo');assert.deepEqual(clean(r.item.affixes),{str:3,luk:3});assert.equal(r.items.length,1);
 r=Gear.grantItem(r.items,{id:'tsurugi'},2,'u2');assert.equal(r.items.length,1);assert.equal(r.items[0].refine,1);
 let list=[{uid:'x',id:'tsurugi',refine:8,cards:[]}];r=Gear.grantItem(list,{id:'tsurugi'},2,'u3');
 assert.equal(r.zeny,45+4*35+2*10);assert.equal(r.items,list);
 assert.equal(Gear.grantItem([],{id:'inventado'},0,'u4').item,null);
});

test('V23 Etapa 4: ONLINE — o servidor grava o item escolhido no tesouro na CONTA (só em vitória)',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'midgard-mvp-'));
 const port=36000+Math.floor(Math.random()*9000),base='http://127.0.0.1:'+port;
 const child=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,PORT:String(port),DATA_DIR:dir,HOST:'127.0.0.1'},stdio:'ignore'});
 try{
  for(let i=0;i<120;i++){try{if((await fetch(base+'/api/health')).ok)break;}catch{}await new Promise(r=>setTimeout(r,40));}
  const r=await fetch(base+'/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json','X-Midgard-Request':'1'},
   body:JSON.stringify({username:'mvphunter',email:'mvp@example.test',nickname:'Caçador',password:'Senha-super-segura-1234567'})});
  assert.equal(r.status,201);const cookie=r.headers.get('set-cookie').split(';')[0];
  const {accountStore}=await import(url('accounts.mjs'));const acc=accountStore(dir);const id=acc.current({headers:{cookie}}).id;
  const before=acc.snapshot(id).data.items.length;
  const award={zeny:10,kills:100,level:20,map:'maze',difficulty:'normal',line:'sword',win:true,cards:[],item:{id:'claymore',affixes:{str:3,vit:3,dex:3}}};
  assert.equal(acc.grantCoop(id,'mvp-1',award),true);
  let items=acc.snapshot(id).data.items;assert.equal(items.length,before+1);
  const got=items.find(i=>i.id==='claymore');assert.deepEqual(got.affixes,{str:3,vit:3,dex:3});assert.equal(got.refine,0);
  acc.grantCoop(id,'mvp-2',award);items=acc.snapshot(id).data.items;
  assert.equal(items.filter(i=>i.id==='claymore').length,1);assert.equal(items.find(i=>i.id==='claymore').refine,1,'repetido vira refino');
  acc.grantCoop(id,'mvp-3',{...award,win:false,item:{id:'katar'}});
  assert.ok(!acc.snapshot(id).data.items.some(i=>i.id==='katar'),'derrota não dá item');
  acc.grantCoop(id,'mvp-4',{...award,item:{id:'item_forjado'}});
  assert.ok(!acc.snapshot(id).data.items.some(i=>i.id==='item_forjado'),'item inexistente é ignorado');
 }finally{child.kill();fs.rmSync(dir,{recursive:true,force:true});}
});

test('V23 Etapa 4: a tela desenha avisos do motor, usa portais só com E e mostra o tesouro com equipamento',()=>{
 const game=read('game.js');
 assert.match(game,/warning:Array\.isArray\(tele\)\?\{kind:tele\[0\]/);
 assert.match(game,/function enterPortal\(\)\{run\.coopRiftEnter=\(run\.coopRiftEnter\|\|0\)\+1;\}/);
 assert.match(game,/gear=offers\[0\]\?\.stat==='gear'/);
 assert.match(game,/Gear\.grantItem\(items\(\),\{id:e\.id,affixes:e\.affixes\}/);
 assert.match(game,/Controls\.matches\(event,'portal'\) && nearbyPortal\(\)/);
 assert.match(game,/function nearbyPortal\(\)/);
 assert.match(read('server.mjs'),/item:win\?p\.mvpItem\|\|null:null/);
});

test('V24.1: modo infinito pós-MVP — EXP ×2,5, hordas maiores e mais densas',async()=>{
 const core=await engine();
 const make=endless=>{const w=core.makeWorld('sewer','normal',[member('a','sword')],{seed:11});w.nextRiftAt=1e9;w.eliteAt=1e9;w.trials=[];w.mobs=[];w.time=600;
  w.director={state:'idle',next:1e9,ev:null,seq:0,history:[]}; // V26: sem evento dinâmico nesta comparação
  if(endless){w.won=true;w.mvpDefeated=true;w.endless={start:590,boss:'x'};}return w;};
 const xpOf=w=>{const a=w.players.get('a');core.testing.spawn(w,'poring',{x:a.x+40,y:a.y});const m=w.mobs.at(-1);
  const before=w.pickups.length;core.testing.defeated(w,m,a);return w.pickups.slice(before).filter(o=>o.kind==='xp').reduce((s,o)=>s+o.amount,0);};
 const base=xpOf(make(false)),inf=xpOf(make(true));
 assert.ok(base>0,'mob comum dá EXP');assert.ok(inf/base>=2&&inf/base<=3,'EXP ×2,5 no infinito ('+base+' → '+inf+')');
 // mais monstros na tela: mesma janela de 20 s, com e sem infinito
 const count=endless=>{const w=make(endless);const a=w.players.get('a');a.hp=a.max=1e9;w.spawnAt=w.time;for(let i=0;i<400;i++)core.tickWorld(w,.05);return w.mobs.filter(m=>m.hp>0).length;};
 const normal=count(false),more=count(true);
 assert.ok(more>=normal*2,'hordas bem maiores no infinito ('+normal+' → '+more+')');
});
