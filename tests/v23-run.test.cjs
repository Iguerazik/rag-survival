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
const member=(id,job,extra={})=>({id,profile:{job,classId:job},character:{base:40,stage:1,guildTrials:{0:true,4:true},
 stats:{str:40,agi:30,vit:30,int:40,dex:30,luk:10},gear:{weaponAtk:60,weaponMatk:40,items:[]},...extra}});
const clean=v=>JSON.parse(JSON.stringify(v));
function quiet(core,w){w.spawnAt=1e9;w.mobs=[];w.nextRiftAt=1e9;w.eliteAt=1e9;w.nextMagnetAt=1e9;w.contract.done=true;w.trials=[];return w;}

test('V23 Etapa 3: dados da run do motor = scripts do jogo (bênçãos, combinações, evoluções do Códex, pets)',async()=>{
 const data=await import(url('engine/run-data.mjs'));
 const ctx={run:null,document:{createElement:()=>({})}};vm.createContext(ctx);
 vm.runInContext(read('run-loot.js')+';this.L=RuneLoot;',ctx);vm.runInContext(read('codex.js')+';this.C=Codex;',ctx);
 const rg=read('roguelike.js'),ctx2={};vm.createContext(ctx2);vm.runInContext(rg.slice(rg.indexOf('const RuneCombos'),rg.indexOf('function runeCast'))+';this.R=RuneCombos;',ctx2);
 assert.deepEqual(clean(data.BLESSINGS),clean(ctx.L.perks));
 assert.deepEqual(clean(data.BLESSING_RECIPES),clean(ctx.L.recipes));
 assert.deepEqual(clean(data.SKILL_COMBOS),clean(ctx2.R.recipes));
 assert.deepEqual(clean(data.CODEX_EVOLUTIONS),clean(ctx.C.recipes));
 assert.deepEqual(clean(data.PET_UPGRADES),clean(ctx.C.upgrades));
 for(const [id,pet] of Object.entries(ctx.C.pets))assert.deepEqual(clean(data.PETS[id]),clean({name:pet.name,price:pet.price,bonus:pet.bonus,range:pet.range}));
 const catalog=JSON.parse(read('online-skills.json'));
 for(const r of [...Object.values(data.CODEX_EVOLUTIONS),...data.SKILL_COMBOS.flatMap(c=>[{skill:c.first},{skill:c.second}])])
  assert.ok(catalog.skills[r.skill],'habilidade '+r.skill+' existe no catálogo do RO');
});

test('V23 Etapa 3: baú dá 3 BÊNÇÃOS (regra do solo) com raridade pelo tipo do baú e classe certa',async()=>{
 const core=await engine();
 const seen={1:new Set(),3:new Set()};
 for(let seed=1;seed<60;seed++){
  const w=quiet(core,core.makeWorld('sewer','normal',[member('a','sword')],{seed})),p=w.players.get('a');
  for(const grade of [1,3]){w.pickups.push({uid:'c'+grade,kind:'chest',x:p.x,y:p.y,amount:grade});core.tickWorld(w,.05);
   assert.equal(p.rewardChoices.length,3);assert.equal(new Set(p.rewardChoices.map(o=>o.id)).size,3,'3 bênçãos diferentes');
   for(const o of p.rewardChoices){assert.equal(o.stat,'blessing');seen[grade].add(o.g);assert.ok(o.n&&o.d);
    assert.ok(!core.runData.BLESSINGS[o.id].classes||core.runData.BLESSINGS[o.id].classes.includes('sword'),'bênção da classe');}
   core.command(w,'a',{reward:{seq:grade,id:'skip'}});}
 }
 assert.deepEqual([...seen[1]],[1],'baú azul no 1º mapa: só bênçãos comuns');
 assert.ok(seen[3].has(3),'tesouro do MVP pode dar bênção rara');
});

test('V23 Etapa 3: bênçãos mudam o personagem, sobem até o limite e formam combinações',async()=>{
 const core=await engine();
 const w=quiet(core,core.makeWorld('sewer','normal',[member('a','sword')],{seed:3})),p=w.players.get('a');
 const give=id=>{p.rewardChoices=[{id,stat:'blessing',grade:1,value:0}];core.command(w,'a',{reward:{seq:++p.rewardSeq+1,id}});};
 const dmg=p.damage,max=p.max;
 give('temper');assert.equal(p.blessings.perks.temper,1);assert.ok(Math.abs(p.damage/dmg-1.038)<.002,'Lâmina Temperada +3,8% de dano físico');
 give('vitality');assert.ok(p.max>max,'Vigor de Yggdrasil: HP máximo');
 for(let i=0;i<6;i++)give('temper');assert.equal(p.blessings.perks.temper,4,'não passa do limite (4)');
 w.events.length=0;give('fervor');
 assert.ok(w.events.some(e=>e.type==='synergy'&&e.name==='Lâmina das Valquírias'),'Lâmina Temperada + Juramento do Caçador = Lâmina das Valquírias');
 assert.ok(p.runBonus.bossDamage>=.06+.14-1e-9);assert.deepEqual(p.discoveries.synergies,['v14-4']);
 give('shelter');give('guardian');assert.ok(p.runBonus.damageResist>0);
 give('wisdom');assert.ok(p.runBonus.xpBonus>=.055);
 give('magnet');assert.equal(p.runBonus.pickupRadius,16);
});

test('V23 Etapa 3: efeitos de acerto das bênçãos (lentidão, queimadura, roubo de vida, raio) e Cadeia Rúnica a partir do nível 3',async()=>{
 const core=await engine();
 const w=quiet(core,core.makeWorld('sewer','normal',[member('a','sword',{stats:{str:80,dex:99,luk:1}})],{seed:5})),p=w.players.get('a');
 for(const id of ['snow','firemark','drain','thunder'])p.blessings.perks[id]=3;
 p.level=1;
 const mobs=()=>{w.mobs=[];for(let k=0;k<5;k++){const m=core.testing.spawn(w,'drainliar',{at:{x:p.x+18+k*14,y:p.y}});m.hp=m.max=1e5;m.damage=0;}};
 // força o recálculo dos bônus da run
 p.rewardChoices=[{id:'snow',stat:'blessing'}];p.blessings.perks.snow=2;core.command(w,'a',{reward:{seq:1,id:'snow'}});
 assert.ok(p.runBonus.slowChance>0&&p.runBonus.igniteChance>0&&p.runBonus.lifesteal>0&&p.runBonus.procShock>0);
 mobs();p.hp=p.max*.5;w.events.length=0;
 for(let i=0;i<400;i++){core.command(w,'a',{dx:0,dy:0});core.tickWorld(w,.05);}
 assert.ok(w.mobs.some(m=>m.slowUntil>0),'Geada Retardante desacelera');
 assert.ok(w.mobs.some(m=>m.poisonUntil>0),'Marca Incandescente queima');
 const types=new Set(w.events.map(e=>e.type+(e.skill?':'+e.skill:'')));
 assert.ok(types.has('chain'),'raio do Eco do Trovão salta para outro inimigo');
 assert.ok(types.has('hit:shock'),'o raio causa dano');
 // Cadeia Rúnica só a partir do nível 3
 const w2=quiet(core,core.makeWorld('sewer','normal',[member('b','sword',{stats:{dex:99}})],{seed:6})),b=w2.players.get('b');
 const run=lvl=>{b.level=lvl;w2.mobs=[];for(let k=0;k<4;k++){const m=core.testing.spawn(w2,'drainliar',{at:{x:b.x+18+k*20,y:b.y}});m.hp=m.max=1e5;m.damage=0;}
  w2.events.length=0;b.chainNext=0;let n=0;for(let i=0;i<60;i++){core.command(w2,'b',{dx:0,dy:0});core.tickWorld(w2,.05);n+=w2.events.filter(e=>e.type==='chain').length;w2.events.length=0;}return n;};
 assert.equal(run(2),0,'nível 2: sem Cadeia Rúnica');
 assert.ok(run(3)>=2,'nível 3: acertos saltam para mais dois inimigos');
});

test('V23 Etapa 3: runas de habilidade aparecem ao subir de nível (a partir do 3) e funcionam',async()=>{
 const core=await engine();
 const w=quiet(core,core.makeWorld('sewer','normal',[member('m','mage')],{seed:8})),p=w.players.get('m');
 p.skills.stormgust=1;p.slots.push('stormgust');
 let rune=null;
 for(let i=0;i<40&&!rune;i++){w.pickups.push({uid:'x'+i,kind:'xp',x:p.x,y:p.y,amount:p.needed});core.tickWorld(w,.05);
  rune=p.choices.find(id=>id.startsWith('rune:'));if(!rune&&p.choices.length)core.command(w,'m',{upgrade:{seq:++p.upgradeSeq+1,id:p.choices[0]}});}
 assert.ok(rune,'runa oferecida');assert.ok(p.level>=3);
 const snap=core.snapshotWorld(w,'m').self.choices.find(c=>c.id===rune);
 assert.ok(snap.rune&&/Cadeia Rúnica|Propagação|Área Amplificada/.test(snap.name)&&snap.d);
 // Área Amplificada na Nevasca: raio +12% por nível
 p.choices=['rune:stormgust:wide'];core.command(w,'m',{upgrade:{seq:999,id:'rune:stormgust:wide'}});
 assert.equal(p.mods.stormgust.wide,1);assert.ok(Math.abs(core.wideRadius(p,'stormgust')-1.12)<1e-12);
 p.choices=['rune:stormgust:wide'];core.command(w,'m',{upgrade:{seq:1000,id:'rune:stormgust:wide'}});
 p.choices=['rune:stormgust:wide'];core.command(w,'m',{upgrade:{seq:1001,id:'rune:stormgust:wide'}});
 assert.equal(p.mods.stormgust.wide,2,'no máximo 2 por habilidade');
 assert.equal(core.runeInfo('rune:nao_existe:wide'),null);
});

test('V23 Etapa 3: combinação de habilidades (1ª prepara, 2ª dispara em até 6 s) e evolução do Códex (habilidade + item)',async()=>{
 const core=await engine();
 const w=quiet(core,core.makeWorld('sewer','normal',[member('k','sword',{gear:{weaponAtk:130,items:['tsurugi']}})],{seed:9})),p=w.players.get('k');
 p.sp=p.maxSp=999;const m=core.testing.spawn(w,'drainliar',{at:{x:p.x+30,y:p.y}});m.hp=m.max=1e6;m.damage=0;m.elite='miniBoss';
 // Golpe Fulminante nv. 2 + Tsurugi = Lâmina Valente (FOR +3, dano +4%)
 p.skills.bash=1;p.choices=['bash'];w.events.length=0;core.command(w,'k',{upgrade:{seq:1,id:'bash'}});
 assert.ok(w.events.some(e=>e.type==='evolution'&&e.name==='Lâmina Valente'));assert.deepEqual(p.evolutions,['knight']);
 assert.equal(p.base.s.str,40+3);
 // Provocar (1ª) e depois Golpe Fulminante (2ª) contra elite: Ruptura de Tyr
 p.skills.provoke=2;p.slots=['bash','provoke'];w.events.length=0;
 core.command(w,'k',{skill:2,skillSeq:1});core.tickWorld(w,.05);
 for(let i=0;i<8;i++)core.tickWorld(w,.05);
 p.cooldowns={};core.command(w,'k',{skill:1,skillSeq:2});core.tickWorld(w,.05);
 const combo=w.events.find(e=>e.type==='runeCombo');
 assert.ok(combo,'combinação disparou');assert.equal(combo.name,'Ruptura de Tyr');assert.ok(p.discoveries.combos.includes('rune-0'));
});

test('V23 Etapa 3: pets dão bônus e coletam itens conforme as melhorias (mesma regra no solo e no online)',async()=>{
 const core=await engine();
 assert.equal(core.petFromSave({activePet:'familiar',petsOwned:{}}),null,'pet não comprado não vale');
 const pet=core.petFromSave({activePet:'familiar',petsOwned:{familiar:true},petUpgrades:{pickupGold:1,range:2}});
 const w=quiet(core,core.makeWorld('sewer','normal',[member('a','thief',{pet}),member('b','thief')],{seed:10})),a=w.players.get('a'),b=w.players.get('b');
 assert.equal(a.base.critPct,b.base.critPct+5,'Esporo (antigo Familiar): crítico +5');assert.equal(a.base.s.str,b.base.s.str+3);
 assert.equal(a.pet.range,52+2*22);
 assert.equal(core.cleanPet({id:'familiar',upgrades:{range:99}}).range,52+4*22,'melhoria limitada ao máximo da loja');
 assert.equal(core.cleanPet({id:'dragao_inventado'}),null);
 // O pet coleta Zeny fora do alcance do jogador, mas dentro do alcance dele; EXP não (sem a melhoria).
 b.x=a.x+2000;core.tickWorld(w,.05);
 a.petX=a.x-22;a.petY=a.y+27;
 w.pickups.push({uid:'z1',kind:'zeny',x:a.petX-80,y:a.petY,amount:50},{uid:'x1',kind:'xp',x:a.petX-80,y:a.petY,amount:5});
 const zeny=a.zeny;core.tickWorld(w,.05);
 assert.ok(a.zeny>=zeny+50,'pet recolheu o Zeny');assert.ok(w.pickups.some(o=>o.uid==='x1'),'sem "Coletar EXP", o cristal fica');
});

test('V23 Etapa 3: baú azul cai de monstro comum (0,35%) e some depois de 65 s',async()=>{
 const core=await engine();
 const w=quiet(core,core.makeWorld('sewer','normal',[member('a','sword')],{seed:12})),p=w.players.get('a');
 let chests=0;for(let i=0;i<4000;i++){const m=core.testing.spawn(w,'thief_male',{at:{x:p.x+400,y:p.y}});core.testing.defeated(w,m,p);w.mobs=[];
  chests+=w.pickups.filter(o=>o.kind==='chest').length;w.pickups=w.pickups.filter(o=>o.kind==='chest').slice(0,0);}
 assert.ok(chests>=4&&chests<=30,'≈14 baús em 4000 abates ('+chests+')');
 const m=core.testing.spawn(w,'thief_male',{at:{x:p.x+900,y:p.y}});let tries=0;
 while(!w.pickups.some(o=>o.kind==='chest')&&tries++<20000){core.testing.defeated(w,{...m,dead:false},p);}
 const chest=w.pickups.find(o=>o.kind==='chest');assert.equal(chest.amount,1);assert.ok(chest.expires>w.time);
 w.time=chest.expires+.01;core.tickWorld(w,.05);assert.ok(!w.pickups.includes(chest),'sumiu depois de 65 s');
});

test('V23 Etapa 3: descobertas do online dão pontos do Códex na conta só na 1ª vez',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'midgard-codex-'));
 const port=35000+Math.floor(Math.random()*9000),base='http://127.0.0.1:'+port;
 const child=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,PORT:String(port),DATA_DIR:dir,HOST:'127.0.0.1'},stdio:'ignore'});
 try{
  for(let i=0;i<120;i++){try{if((await fetch(base+'/api/health')).ok)break;}catch{}await new Promise(r=>setTimeout(r,40));}
  const r=await fetch(base+'/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json','X-Midgard-Request':'1'},
   body:JSON.stringify({username:'codexer',email:'codexer@example.test',nickname:'Codexer',password:'Senha-super-segura-1234567'})});
  assert.equal(r.status,201);const cookie=r.headers.get('set-cookie').split(';')[0];
  const {accountStore}=await import(url('accounts.mjs'));const a=accountStore(dir);
  const id=a.current({headers:{cookie}})?.id;assert.ok(id,'conta criada');
  const award={zeny:0,kills:10,level:5,map:'sewer',difficulty:'normal',line:'sword',win:true,cards:[],
   discoveries:{codex:['knight'],combos:['rune-0'],synergies:['v14-4'],active:['knight']}};
  assert.equal(a.grantCoop(id,'r1',award),true);
  let data=a.snapshot(id).data;assert.equal(data.codexCoins,240+120+75+18);
  assert.equal(data.codexFound.knight,true);assert.equal(data.codexFound['rune-0'],true);assert.equal(data.runSynergies['v14-4'],true);
  assert.equal(a.grantCoop(id,'r1',award),false,'mesma partida não grava duas vezes');
  assert.equal(a.grantCoop(id,'r2',award),true);data=a.snapshot(id).data;
  assert.equal(data.codexCoins,240+120+75+18+18,'repetida não paga de novo (só o bônus de evolução ativa na vitória)');
  assert.equal(a.grantCoop(id,'r3',{...award,win:false,discoveries:{codex:['../hack'],combos:['x'],synergies:[{}]}}),true);
  assert.equal(a.snapshot(id).data.codexCoins,240+120+75+36,'ids inválidos são ignorados');
 }finally{child.kill();fs.rmSync(dir,{recursive:true,force:true});}
});

test('V23 Etapa 3: a tela mostra bênçãos e runas nos dois modos; solo grava pontos do Códex; online mescla sem perder',()=>{
 const game=read('game.js');
 assert.match(game,/const relic=offers\[0\]\?\.stat==='relic',blessing=offers\[0\]\?\.stat==='blessing'/);
 assert.match(game,/head=offer\.rune\?'RUNA · '/);
 assert.match(game,/pet:window\.MidgardEngine\.core\.petFromSave\(saved\)/);
 // trocar de pet ou comprar melhoria no meio do solo chega ao motor
 assert.match(game,/function localGearKey\(\)\{return JSON\.stringify\(\[run\.gear,saved\.activePet,/);
 assert.match(game,/if\(update&&run&&mode!=='menu'\)refreshStatus\(\)/);
 assert.match(game,/codexCoins:Math\.max\(Number\(server\.codexCoins\)\|\|0,Number\(saved\.codexCoins\)\|\|0\)/);
 for(const type of ['synergy','evolution','runeCombo','chain','blessing','rune'])assert.match(game,new RegExp("e\\.type==='"+type+"'"));
 assert.match(read('server.mjs'),/pet:petFromSave\(data\)/);
 assert.match(read('server.mjs'),/discoveries:\{\.\.\.p\.discoveries,active:p\.evolutions\}/);
});
