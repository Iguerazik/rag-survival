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
/** Carrega cards.js + items.js como o navegador faz (scripts clássicos). */
function browserGear(){
 const ctx={};vm.createContext(ctx);
 for(const file of ['cards.js','items.js'])vm.runInContext(read(file),ctx,{filename:file});
 vm.runInContext('this.api={Gear,itemDb,cardDb,mobElements}',ctx);return ctx.api;
}
const member=(id,job,gear,extra={})=>({id,profile:{job,classId:job},character:{base:40,stage:1,guildTrials:{0:true,4:true},
 stats:{str:40,agi:30,vit:30,int:30,dex:30,luk:10},...extra,...(gear===undefined?{}:{gear})}});

test('V23 Etapa 2: servidor e navegador somam o equipamento com o MESMO items.js/cards.js (mesmo resultado)',async()=>{
 const web=browserGear(),server=await import(url('server-gear.mjs'));
 const ids=Object.keys(web.itemDb),cards=Object.keys(web.cardDb);
 let seed=7;const r=()=>(seed=(seed*16807)%2147483647)/2147483647;
 for(let n=0;n<300;n++){
  const items=[],gear={};
  for(const slot of ['weapon','armor','shield','garment','shoes','headgear','accessory1','accessory2']){
   const pool=ids.filter(id=>web.itemDb[id].type===(slot.startsWith('accessory')?'accessory':slot));
   const id=pool[Math.floor(r()*pool.length)],uid='u'+n+slot;
   items.push({uid,id,refine:Math.floor(r()*12),cards:Array.from({length:Math.floor(r()*5)},()=>cards[Math.floor(r()*cards.length)]),
    upgrades:{str:Math.floor(r()*3),damage:Math.floor(r()*3)},affixes:{luk:Math.floor(r()*3)}});
   gear[slot]=uid;
  }
  const line=['sword','mage','archer','acolyte','merchant','thief'][n%6],journey={stage:n%6,gear};
  const expected=JSON.parse(JSON.stringify(web.Gear.engineBonuses(web.Gear.equipped(journey,items,line))));
  assert.deepEqual(server.gearForAccount({items,journeys:{[line]:journey}},line),expected);
 }
});

test('V23 Etapa 2: equipamento inválido não passa (encaixes, tipo da carta, refino, classe, Katar, duas mãos)',()=>{
 const {Gear}=browserGear();
 const items=[
  {uid:'w',id:'tsurugi',refine:99,cards:['sidewinder','hunterfly','spore','nao_existe']}, // 1 encaixe; carta de acessório não vai em arma
  {uid:'s',id:'guard',cards:['munak']},{uid:'k',id:'katar',cards:[]},{uid:'c',id:'claymore',cards:[]},
  {uid:'r',id:'arcwand',cards:[]},{uid:'x',id:'item_que_nao_existe',cards:[]},{uid:'a',id:'ring',cards:['mantis','mantis']},
 ];
 let eq=Gear.equipped({stage:1,gear:{weapon:'w',shield:'s',accessory1:'a',headgear:'x'}},items,'sword');
 assert.equal(eq.weapon.refine,8,'refino limitado a +8 (limite do ferreiro)');
 assert.deepEqual(eq.weapon.cards,['sidewinder'],'só 1 encaixe e só carta de arma');
 assert.deepEqual(eq.accessory1.cards,['mantis'],'Anel tem 1 encaixe');
 assert.equal(eq.headgear,undefined,'item inexistente é ignorado');
 assert.ok(eq.shield,'escudo com arma de uma mão');
 eq=Gear.equipped({stage:1,gear:{weapon:'c',shield:'s'}},items,'sword');
 assert.equal(eq.shield,undefined,'arma de duas mãos tira o escudo');
 assert.equal(Gear.equipped({stage:1,gear:{weapon:'r'}},items,'sword').weapon.id,'sword','Cajado Arcano é só de Mago (fica a arma inicial)');
 assert.equal(Gear.equipped({stage:0,gear:{weapon:'k'}},items,'thief').weapon.id,'knife','Katar só para Mercenário (estágios 1, 4, 5)');
 assert.equal(Gear.equipped({stage:1,gear:{weapon:'k'}},items,'thief').weapon.id,'katar');
 assert.equal(Gear.equipped({stage:1,gear:{accessory1:'w'}},items,'sword').accessory1,undefined,'arma no espaço de acessório não vale');
 // Conta sem arma equipada (ex.: personagem criado só no servidor): vale a arma inicial da classe.
 for(const [line,id] of [['sword','sword'],['mage','rod'],['archer','bow'],['thief','knife']])
  assert.equal(Gear.equipped({stage:0,gear:{}},[],line).weapon.id,id);
});

test('V23 Etapa 2: tabela de elementos do motor = mobElements de cards.js',async()=>{
 const {MOB_ELEMENTS}=await import(url('engine/cards-data.mjs'));
 assert.deepEqual({...MOB_ELEMENTS},{...browserGear().mobElements});
});

test('V23 Etapa 2: arma, refino, DEF, HP%, SP, ASPD, velocidade e atributos do equipamento mudam o personagem no motor',async()=>{
 const core=await engine(),{Gear}=browserGear();
 const bonus=(line,stage,gear,items)=>JSON.parse(JSON.stringify(Gear.engineBonuses(Gear.equipped({stage,gear},items,line))));
 const knife=bonus('sword',1,{weapon:'a'},[{uid:'a',id:'knife'}]);
 const tsurugi=bonus('sword',1,{weapon:'a'},[{uid:'a',id:'tsurugi',refine:8}]);
 const a=core.deriveCharacter('sword',{base:40,stats:{str:40},gear:knife}),b=core.deriveCharacter('sword',{base:40,stats:{str:40},gear:tsurugi});
 assert.ok(b.power>a.power*1.3,'Tsurugi +8 bate bem mais que Faca ('+b.power.toFixed(2)+' x '+a.power.toFixed(2)+')');
 const mage1=core.deriveCharacter('mage',{base:40,stats:{int:50},gear:bonus('mage',1,{weapon:'a'},[{uid:'a',id:'rod'}])});
 const mage2=core.deriveCharacter('mage',{base:40,stats:{int:50},gear:bonus('mage',1,{weapon:'a'},[{uid:'a',id:'arcwand',refine:4}])});
 assert.ok(mage2.power>mage1.power,'MATK do Cajado Arcano aumenta a magia');
 const tank=core.deriveCharacter('sword',{base:40,stats:{vit:30},gear:bonus('sword',1,{armor:'p',shield:'s',headgear:'h'},[{uid:'p',id:'platearmor',refine:6},{uid:'s',id:'shieldbig'},{uid:'h',id:'helm',cards:['orc_hero']}])});
 const naked=core.deriveCharacter('sword',{base:40,stats:{vit:30},gear:bonus('sword',1,{},[])});
 assert.ok(tank.def>naked.def+.05,'DEF dura do equipamento reduz dano ('+tank.def.toFixed(3)+' x '+naked.def.toFixed(3)+')');
 assert.ok(tank.hpMul>naked.hpMul*1.15,'Carta Herói Orc: VIT +8 e HP +12%');
 assert.equal(tank.s.vit,30+8);
 const clip=core.deriveCharacter('mage',{base:40,stats:{int:40},gear:bonus('mage',1,{accessory1:'c'},[{uid:'c',id:'clip'}])});
 assert.equal(clip.spFlat,10,'Clipe: SP +10');
 const fast=core.deriveCharacter('thief',{base:40,stats:{agi:40},gear:bonus('thief',1,{weapon:'d',shoes:'m'},[{uid:'d',id:'knife',cards:['doppelganger']},{uid:'m',id:'boots',cards:['moonlight']}])});
 const slow=core.deriveCharacter('thief',{base:40,stats:{agi:40},gear:bonus('thief',1,{weapon:'d'},[{uid:'d',id:'knife'}])});
 assert.ok(fast.delay<slow.delay,'Carta Doppelganger: +20% de velocidade de ataque');
 assert.equal(fast.speed,.25,'Carta Lua Crescente: movimento');
 const w=core.makeWorld('sewer','normal',[member('f','thief',fast.gear),member('s','thief',slow.gear)],{seed:1});
 assert.ok(core.playerSpeed(w.players.get('f'))>core.playerSpeed(w.players.get('s')));
 // Sem equipamento informado (convidado sem conta): arma de referência, como antes.
 const guest=core.deriveCharacter('sword',{base:40,stats:{str:40}});
 assert.ok(Math.abs(guest.power-core.deriveCharacter('sword',{base:40,stats:{str:40},gear:{weaponAtk:25}}).power)<1e-12);
 // Números absurdos vindos de fora são limitados.
 assert.equal(core.cleanGear({weaponAtk:1e9,crit:1e6,cards:['poring','mantis']}).weaponAtk,600);
 assert.deepEqual(core.cleanGear({cards:['nao_existe','mantis']}).cards,['mantis']);
});

test('V23 Etapa 2: efeitos especiais das cartas funcionam no motor (dos dois modos)',async()=>{
 const core=await engine();
 const g=extra=>({...core.cleanGear({}),weaponAtk:25,...extra});
 // Carta Besouro-Ladrão Dourado: custo de SP dobrado.
 {const w=core.makeWorld('sewer','normal',[member('n','sword',g({})),member('b','sword',g({spCost:2}))],{seed:2});
  for(const id of ['n','b']){const p=w.players.get(id);p.sp=p.maxSp=500;}
  const mob=core.testing.spawn(w,'thief_female',{at:{x:w.players.get('n').x+30,y:w.players.get('n').y}});mob.hp=mob.max=1e6;
  const cost={};for(const id of ['n','b']){const p=w.players.get(id);const sp=p.sp;core.command(w,id,{skill:1,skillSeq:1});core.tickWorld(w,.05);cost[id]=sp-p.sp;}
  assert.ok(cost.b>cost.n*1.8,'custo dobrado ('+cost.b.toFixed(1)+' x '+cost.n.toFixed(1)+')');}
 // Carta Cãibra (Zeny), Hunter Fly (roubo de HP), Bongun (Golpe automático), Bafomé (área) e Sidewinder (Ataque Duplo).
 const w=core.makeWorld('sewer','normal',[member('k','sword',g({zeny:1,drains:[[1,.15]],autoBash:1,splash:true,doubleAttack:10}),{stats:{str:60,dex:99,luk:1}})],{seed:4});
 const p=w.players.get('k');core.tickWorld(w,.05);p.hp=p.max*.5;
 const seen=new Set();let zeny=0;
 for(let i=0;i<400;i++){
  if(w.mobs.length<6)for(let k=0;k<3;k++){const m=core.testing.spawn(w,'drainliar',{at:{x:p.x+20+k*6,y:p.y+k*4}});m.damage=0;m.hp=m.max=k?140:900;}
  core.command(w,'k',{dx:0,dy:0});core.tickWorld(w,.05);
  for(const e of w.events){seen.add(e.type+(e.skill?':'+e.skill:''));if(e.type==='cardZeny')zeny+=e.amount;}w.events.length=0;
 }
 for(const type of ['cardZeny','drain','hit:bash','hit:doubleattack'])assert.ok(seen.has(type),'efeito '+type+' aconteceu');
 assert.ok(zeny>0&&p.zeny>=zeny);
 // Esporo (água) x Carta Drainliar: +20% de dano físico.
 const w2=core.makeWorld('sewer','normal',[member('a','sword',g({})),member('b','sword',g({vsWater:.2}))],{seed:5});core.tickWorld(w2,.05);
 const first={};
 for(const id of ['a','b']){
  const q=w2.players.get(id);q.base.critPct=-999;q.base.hit=9999; // sem crítico e sem erro: comparação limpa
  w2.mobs=[];const m=core.testing.spawn(w2,'spore',{at:{x:q.x+15,y:q.y}});m.hp=m.max=1e6;m.damage=0;
  for(const other of w2.players.values())if(other!==q){other.input.attack=false;other.attackAt=1e9;}
  q.attackAt=0;q.input.attack=true;w2.events.length=0;
  for(let i=0;i<40&&!first[id];i++){core.tickWorld(w2,.05);first[id]=w2.events.find(e=>e.type==='hit'&&e.by===id&&!e.skill)?.damage;}
 }
 assert.ok(first.a>0&&first.b>0);
 assert.ok(Math.abs(first.b/first.a-1.2)<.08,'+20% contra Água ('+first.b+' x '+first.a+')');
 // Carta Munak (-5% de Terra) e Carta Eddga (-8%): dano recebido menor (Louva-a-deus é Terra).
 const taken={};
 for(const [id,extra] of [['n',{}],['r',{earthResist:.05,endure:true}]]){
  const w3=core.makeWorld('maze','normal',[member(id,'sword',g(extra))],{seed:6}),q=w3.players.get(id);
  core.tickWorld(w3,.05);q.base.flee=0;q.base.perfectDodge=0;q.invulnerableUntil=0;q.hp=q.max=1e6;w3.spawnAt=1e9;w3.mobs=[];
  const m=core.testing.spawn(w3,'mantis',{at:{x:q.x+18,y:q.y}});m.contactAt=0;m.hp=m.max=1e6;q.input.attack=false;
  for(let i=0;i<6&&q.hp===1e6;i++)core.tickWorld(w3,.05);
  taken[id]=1e6-q.hp;
 }
 assert.ok(taken.n>0&&Math.abs(taken.r/taken.n-.95*.92)<.01,'Munak + Eddga: '+taken.r.toFixed(2)+' x '+taken.n.toFixed(2));
 const src=read('engine/core.mjs');
 assert.match(src,/ELEMENTS\[m\.id\]==='earth'\?1-g\.earthResist:1\)\*\(g\.endure\?\.92:1\)/);
 assert.match(src,/!p\.base\.magic&&p\.base\.gear\.vsWater&&ELEMENTS\[mob\.id\]==='water'/);
});

test('V23 Etapa 2: trocar equipamento no meio do solo atualiza o motor sem perder o que a run ganhou',async()=>{
 const core=await engine(),{Gear}=browserGear();
 const w=core.makeWorld('sewer','normal',[member('s','sword',JSON.parse(JSON.stringify(Gear.engineBonuses({weapon:{id:'knife',cards:[]}}))))],{seed:9});
 const p=w.players.get('s');p.level=10;p.damage*=1.5;const maxBefore=p.max,dmg=p.damage;
 core.updateCharacter(w,'s',{base:40,stage:1,stats:{str:40,agi:30,vit:30,int:30,dex:30,luk:10},guildTrials:{0:true,4:true},
  gear:JSON.parse(JSON.stringify(Gear.engineBonuses({weapon:{id:'tsurugi',refine:8,cards:[]},headgear:{id:'helm',cards:['orc_hero']}})))});
 assert.ok(p.damage>dmg*1.3,'dano sobe com a arma nova e mantém o bônus da run');
 assert.ok(p.max>maxBefore,'HP máximo sobe com a Carta Herói Orc');
 assert.match(read('game.js'),/run\.localRoom\.core\.updateCharacter\(run\.localRoom\.world,LocalRoom\.ID,localCharacter\(\)\)/);
});

async function startServer(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'midgard-gear-'));
 const port=33000+Math.floor(Math.random()*9000);
 const child=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,PORT:String(port),DATA_DIR:dir,HOST:'127.0.0.1',STRICT_ONLINE_PROGRESS:'0'},stdio:'ignore'});
 const base='http://127.0.0.1:'+port;
 for(let i=0;i<120;i++){try{if((await fetch(base+'/api/health')).ok)return {dir,child,base};}catch{}await new Promise(r=>setTimeout(r,40));}
 child.kill();throw new Error('Servidor não iniciou');
}
const H={'Content-Type':'application/json','X-Midgard-Request':'1'};
async function api(base,route,data,cookie,method='POST'){
 const r=await fetch(base+route,{method,headers:{...H,Cookie:cookie},body:data===undefined?undefined:JSON.stringify(data)});
 return {status:r.status,data:await r.json().catch(()=>({})),cookie:r.headers.get('set-cookie')?.split(';')[0]};
}
test('V23 Etapa 2: ONLINE — o servidor lê o equipamento e as cartas da CONTA (o navegador não informa nada)',async()=>{
 const t=await startServer();
 try{
  const cookies=[];
  for(const user of ['equipado','pelado']){
   const r=await api(t.base,'/api/auth/register',{username:user,email:user+'@example.test',nickname:'Nick '+user,password:'Senha-super-segura-1234567'},'');
   assert.equal(r.status,201);cookies.push(r.cookie);
  }
  // Conta 1: Elmo com Carta Herói Orc (VIT +8, HP +12%) e Sapatos da Maré + Cachecol de Lã (conjunto: HP +10%).
  const snap=(await api(t.base,'/api/account/progress',undefined,cookies[0],'GET')).data;
  const items=[{uid:'h1',id:'helm',refine:0,cards:['orc_hero'],upgrades:{},affixes:{}},{uid:'t1',id:'tidalshoes',refine:0,cards:[],upgrades:{},affixes:{}},{uid:'w1',id:'woolscarf',refine:0,cards:[],upgrades:{},affixes:{}}];
  const journeys={...(snap.data.journeys||{}),sword:{...(snap.data.journeys?.sword||{stage:0,base:1,job:1,v:2,stats:{str:1,agi:1,vit:1,int:1,dex:1,luk:1}}),gear:{headgear:'h1',shoes:'t1',garment:'w1'}}};
  const put=await api(t.base,'/api/account/progress',{revision:snap.revision,data:{...snap.data,items:[...(snap.data.items||[]),...items],journeys}},cookies[0],'PUT');
  assert.equal(put.status,200,JSON.stringify(put.data));
  const room=await api(t.base,'/api/coop/rooms',{profile:{name:'A',job:'sword',classId:'sword'},config:{map:'sewer',difficulty:'easy'}},cookies[0]);
  assert.equal(room.status,200);
  const join=await api(t.base,'/api/coop/rooms/'+room.data.code+'/join',{profile:{name:'B',job:'sword',classId:'sword'}},cookies[1]);
  assert.equal(join.status,200);
  assert.equal((await api(t.base,'/api/coop/rooms/'+room.data.code+'/ready',{token:join.data.token,ready:true},cookies[1])).status,200);
  assert.equal((await api(t.base,'/api/coop/rooms/'+room.data.code+'/start',{token:room.data.token},cookies[0])).status,200);
  // O navegador tenta "informar" HP e equipamento: o servidor ignora (só intenção de movimento é aceita).
  const forged={dx:0,dy:0,hp:99999,max:99999,gear:{weaponAtk:9999},character:{gear:{hpPct:5}}};
  const a=(await api(t.base,'/api/coop/rooms/'+room.data.code+'/sync',{token:room.data.token,input:forged},cookies[0])).data.world.self;
  const b=(await api(t.base,'/api/coop/rooms/'+room.data.code+'/sync',{token:join.data.token,input:forged},cookies[1])).data.world.self;
  assert.ok(a.max>b.max*1.2,'equipado tem mais HP pelo equipamento da CONTA ('+a.max+' x '+b.max+')');
  assert.ok(b.max<200,'o "max" forjado pelo navegador foi ignorado');
 }finally{t.child.kill();fs.rmSync(t.dir,{recursive:true,force:true});}
});
