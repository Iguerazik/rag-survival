const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const root=path.join(__dirname,'..');
const mod=()=>import('file://'+path.join(root,'authoritative-world.mjs'));
const catalog=JSON.parse(fs.readFileSync(path.join(root,'online-skills.json'),'utf8'));
test('V22.5: catálogo de habilidades do RO é íntegro (ícones existentes, classes, iniciais)',()=>{
 const kinds=new Set(['melee','bolt','ball','area','self','zone','trap','heal','healzone','buff','debuff','revive','passive']);
 for(const [id,s] of Object.entries(catalog.skills)){
  assert.ok(s.n&&s.d&&kinds.has(s.k)&&s.max>=1,'habilidade inválida: '+id);
  if(s.ic)assert.ok(fs.existsSync(path.join(root,'assets','ro','skill-'+s.ic+'.png')),'ícone ausente: '+s.ic);
  if(s.k!=='passive'&&s.k!=='buff'&&s.k!=='heal'&&s.k!=='healzone'&&s.k!=='revive')assert.ok(s.cd>0,'sem recarga: '+id);
 }
 for(const [line,tiers] of Object.entries(catalog.lines)){
  for(const list of Object.values(tiers))for(const id of list)assert.ok(catalog.skills[id],line+' usa habilidade inexistente '+id);
  assert.ok(tiers.first.includes(catalog.starters[line]));assert.ok(tiers.first.length>=6);
 }
 assert.equal(catalog.skills.vulture.n,'Olhos de Águia');assert.equal(catalog.skills.focus.n,'Aumentar Recuperação de SP');
});
test('V22.5: no máximo 5 ativas por run, ofertas com identificador e fila de níveis',async()=>{
 const {makeWorld,tickWorld,command,snapshotWorld}=await mod();
 const w=makeWorld('sewer','normal',[{id:'a',profile:{job:'mage',classId:'wizard'}}]),p=w.players.get('a');
 w.spawnAt=1e9;p.invulnerableUntil=1e9;
 assert.deepEqual(p.slots,['fire'],'V26.4: o Bruxo herda as Lanças de Fogo');assert.ok(p.pool.includes('stormgust')&&p.pool.includes('fire')&&!p.pool.includes('soulstrike'),'2ª classe: Bruxo + herança (não toda a 1ª classe)');
 w.pickups.push({uid:'xp-1',kind:'xp',x:p.x,y:p.y,amount:5000});tickWorld(w,.05);
 assert.ok(p.level>5&&p.pendingUps>3,'vários níveis de uma vez ficam na fila');
 let seq=0,guard=0;const seen=new Set();
 while(p.choices.length&&guard++<200){
  const snap=snapshotWorld(w,'a').self;assert.ok(!seen.has(snap.choiceSeq));seen.add(snap.choiceSeq);
  // V23 Etapa 3: a partir do nível 3 uma das opções pode ser uma runa ("rune:habilidade:tipo").
  for(const id of p.choices)if(!id.startsWith('rune:'))assert.ok((p.skills[id]||0)<catalog.skills[id].max);
  const active=p.choices.find(id=>catalog.skills[id]&&catalog.skills[id].k!=='passive')||p.choices[0];
  command(w,'a',{upgrade:{seq:++seq,id:active}});
 }
 assert.equal(p.pendingUps,0);assert.ok(p.slots.length<=5);
 w.pickups.push({uid:'xp-2',kind:'xp',x:p.x,y:p.y,amount:200000});tickWorld(w,.05);
 while(p.choices.length&&guard++<400){
  for(const id of p.choices)if(id.startsWith('rune:'))assert.ok(p.slots.includes(id.split(':')[1]),'runa só para habilidade ativa já aprendida');
   else if(catalog.skills[id].k!=='passive')assert.ok(p.slots.includes(id)||p.slots.length<5,'com 5 ativas, só oferece melhorias das que já tem');
  command(w,'a',{upgrade:{seq:++seq,id:p.choices[0]}});
 }
 assert.equal(p.slots.length,5);
});
test('V22.5: SP é gasto e recuperado; poção azul e subir de nível devolvem SP; Curar atinge o grupo',async()=>{
 const {makeWorld,tickWorld}=await mod();
 const w=makeWorld('sewer','easy',[{id:'a',profile:{job:'acolyte'}},{id:'b',profile:{job:'mage'}},{id:'c',profile:{job:'sword'}}]);
 const [a,b,c]=['a','b','c'].map(id=>w.players.get(id));w.spawnAt=1e9;
 for(const p of [a,b,c]){p.invulnerableUntil=1e9;p.input.auto=true;}
 b.x=a.x+60;c.x=a.x-60;b.hp=20;c.hp=25;a.hp=30;const sp=a.sp;
 for(let i=0;i<30;i++)tickWorld(w,.05);
 assert.ok(a.hp>45&&b.hp>40&&c.hp>45,'uma cura levanta o HP dos três');
 const casts=()=>w.events.filter(e=>e.type==='skillCast'&&e.skill==='heal').length,before=casts();
 a.sp=0;a.hp=b.hp=c.hp=20;a.cooldowns.heal=0;tickWorld(w,.05);assert.equal(casts(),before,'sem SP não cura');assert.ok(sp>0);
 b.sp=0;w.pickups.push({uid:'sp-1',kind:'sppotion',x:b.x,y:b.y,amount:35});tickWorld(w,.05);
 assert.ok(b.sp>=b.maxSp*.3,'poção azul recupera SP');
 b.sp=0;w.pickups.push({uid:'xp-1',kind:'xp',x:a.x,y:a.y,amount:a.needed+1});tickWorld(w,.05); // V24.1: EXP para subir 1 nível na curva nova
 assert.ok(b.sp>=b.maxSp*.25,'subir de nível devolve SP');
});
test('V22.5: horda por jogador — quem se afasta do grupo também recebe monstros, e cada um é alvo',async()=>{
 const {makeWorld,tickWorld}=await mod();
 const w=makeWorld('payonfield','normal',[{id:'a',profile:{job:'sword'}},{id:'b',profile:{job:'mage'}}]);
 const a=w.players.get('a'),b=w.players.get('b');a.invulnerableUntil=b.invulnerableUntil=1e9;a.input.attack=b.input.attack=false;
 b.x=a.x+1800; // bem longe (o teste só precisa de coordenadas; nearestOpen acha chão válido para os monstros)
 w.time=120;for(let i=0;i<200;i++)tickWorld(w,.05);
 const near=p=>w.mobs.filter(m=>Math.hypot(m.x-p.x,m.y-p.y)<900).length;
 assert.ok(near(a)>=8,'monstros perto de A: '+near(a));assert.ok(near(b)>=8,'monstros perto de B: '+near(b));
 assert.ok(w.mobs.some(m=>m.target==='a')&&w.mobs.some(m=>m.target==='b'));
});
test('V22.5: atributos da conta valem no online; prova da guilda, ímãs, missão e imbuimento',async()=>{
 const {makeWorld,tickWorld,command,deriveCharacter}=await mod();
 const weak=deriveCharacter('sword',null),strong=deriveCharacter('sword',{base:60,stats:{str:70,agi:40,vit:50,int:1,dex:30,luk:20}});
 assert.ok(strong.power>weak.power*1.8&&strong.hpMul>weak.hpMul*1.5&&strong.delay<weak.delay&&strong.def>weak.def);
 const w=makeWorld('sewer','normal',[{id:'a',profile:{job:'thief'},character:{base:1,stats:{},stage:0,guildTrials:{}}},{id:'b',profile:{job:'mage'},character:{base:40,stats:{int:60},stage:0,guildTrials:{0:true}}}]);
 const a=w.players.get('a'),b=w.players.get('b');a.invulnerableUntil=b.invulnerableUntil=1e9;w.spawnAt=1e9;
 assert.ok(b.max>100&&b.damage>20,'personagem forte entra forte');
 assert.equal(a.trialStage,0);assert.equal(b.trialStage,-1);
 w.kills=24;tickWorld(w,.05);
 const trial=w.mobs.find(m=>m.trial);assert.ok(trial&&trial.name==='Sombra da Guilda');
 trial.hp=1;a.x=trial.x;a.y=trial.y+10;for(let i=0;i<40&&a.trialDone<0;i++)tickWorld(w,.05);
 assert.equal(a.trialDone,0);
 // ímã de EXP
 w.pickups=w.pickups.filter(o=>o.kind!=='xp');w.pickups.push({uid:'x1',kind:'xp',x:a.x+900,y:a.y,amount:7},{uid:'m1',kind:'xpmagnet',x:a.x,y:a.y,amount:1});
 const xp=b.xp+b.level*1000;tickWorld(w,.05);assert.ok(!w.pickups.some(o=>o.kind==='xp'),'ímã recolhe a EXP distante');
 // missão: investigar perto do selo → relicário de imbuimento para todos
 // V23 Etapa 5: sem escolher rota, 3 s no selo = rota da Relíquia (regra do solo), depois 6 s de investigação.
 w.contract.node={x:a.x,y:a.y};b.x=a.x;b.y=a.y;for(let i=0;i<260&&w.contract.stage===0;i++)tickWorld(w,.05);
 assert.equal(w.contract.route,'relic');
 assert.equal(w.contract.stage,1);
 for(let i=0;i<10;i++)tickWorld(w,.05);
 // V23.6: anéis e colares (relíquias de imbuimento) saíram do jogo: a missão não solta mais o relicário.
 assert.ok(!w.pickups.some(o=>o.kind==='relic'));for(const p of [a,b])assert.ok(!p.rewardChoices.some(o=>o.stat==='relic'));
});
async function startServer(extra={}){
 const data=fs.mkdtempSync(path.join(os.tmpdir(),'midgard-225-'));const port=30000+Math.floor(Math.random()*15000);
 const child=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,PORT:String(port),HOST:'127.0.0.1',DATA_DIR:data,ALLOW_GUEST_MULTIPLAYER:'1',...extra},stdio:'ignore'});
 const base='http://127.0.0.1:'+port;
 for(let i=0;i<100;i++){try{if((await fetch(base+'/api/health')).ok)return {child,base,data}}catch{}await new Promise(r=>setTimeout(r,40))}
 child.kill();throw new Error('Servidor não iniciou');
}
const post=async(base,url,obj)=>{const r=await fetch(base+'/api/coop/rooms'+url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(obj)});return {status:r.status,data:await r.json()}};
test('V22.5: depois da partida a sala volta ao lobby e continua existindo',async()=>{
 const {child,base,data}=await startServer({MIDGARD_TEST_WIN_AT:'1'});
 try{
  const h=await post(base,'',{profile:{job:'sword'}}),g=await post(base,'/'+h.data.code+'/join',{profile:{job:'mage'}});
  await post(base,'/'+h.data.code+'/ready',{token:g.data.token,ready:true});
  await post(base,'/'+h.data.code+'/start',{token:h.data.token});
  assert.equal((await post(base,'/'+h.data.code+'/lobby',{token:g.data.token})).status,409,'não volta ao lobby no meio da partida');
  await new Promise(r=>setTimeout(r,1500));
  const back=await post(base,'/'+h.data.code+'/lobby',{token:g.data.token});
  assert.equal(back.status,200);assert.equal(back.data.phase,'lobby');assert.equal(back.data.members.length,2);assert.equal(back.data.world,null);
  assert.equal(back.data.members.find(m=>m.id===g.data.id).ready,false);
  assert.equal((await post(base,'/'+h.data.code+'/lobby',{token:h.data.token})).data.phase,'lobby');
  await post(base,'/'+h.data.code+'/ready',{token:g.data.token,ready:true});
  const again=await post(base,'/'+h.data.code+'/start',{token:h.data.token});
  assert.equal(again.status,200);assert.equal(again.data.phase,'playing');
 }finally{child.kill();fs.rmSync(data,{recursive:true,force:true})}
});
