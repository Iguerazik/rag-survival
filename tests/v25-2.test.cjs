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

test('V25.2: Asa de Mosca — calma de ~1,5 s e depois os monstros chegam pelas bordas da tela',async()=>{
 const core=await engine();
 const w=core.makeWorld('sewer','normal',[member('a','sword',{wings:{flywing:2}})],{seed:7});
 w.nextRiftAt=1e9;w.eliteAt=1e9;w.nextMagnetAt=1e9;w.contract.done=true;w.trials=[];
 const p=w.players.get('a');
 for(let i=0;i<600;i++){p.hp=p.max;core.tickWorld(w,.05);} // 30 s de horda normal
 assert.ok(w.mobs.length>3,'horda formada ('+w.mobs.length+')');
 core.command(w,'a',{item:{seq:1,kind:'flywing'}});core.tickWorld(w,.05);
 assert.ok(p.wingsUsed.flywing===1,'asa usada');
 const seen=new Set(w.mobs.map(m=>m.uid)),born=[];
 for(let i=0;i<120;i++){p.hp=p.max;core.tickWorld(w,.05);
  for(const m of w.mobs)if(!seen.has(m.uid)){seen.add(m.uid);born.push({t:w.time,d:Math.hypot(m.x-p.x,m.y-p.y),elite:!!m.elite});}}
 const tp=w.time-120*.05;
 assert.ok(born.length>0,'reforços chegaram');
 assert.ok(born.every(b=>b.t-tp>=1.4||b.elite),'nada nasce nos primeiros ~1,5 s');
 const common=born.filter(b=>!b.elite);
 assert.ok(common.every(b=>b.d>=380),'os novos monstros nascem longe (borda da tela): '+common.map(b=>Math.round(b.d)).join(','));
});

test('V25.2: Aprendiz T. recebe as Melhorias de treino e o Golpe Amplo fere quem está em volta do alvo',async()=>{
 const core=await engine();
 const novice={...member('a','sword'),profile:{job:'sword',classId:'highnovice'}};
 const w=core.makeWorld('sewer','normal',[novice],{seed:3});
 w.spawnAt=1e9;w.nextRiftAt=1e9;w.eliteAt=1e9;w.nextMagnetAt=1e9;w.contract.done=true;w.trials=[];w.mobs=[];
 const p=w.players.get('a');
 const boons=['treino_amplo','treino_onda','treino_ritmo','treino_forca','treino_saber','treino_pele'];
 for(const id of boons)assert.ok(p.pool.includes(id),'melhoria '+id+' na escolha de nível do Aprendiz T.');
 assert.ok(!core.makeWorld('sewer','normal',[member('b','sword')],{seed:3}).players.get('b').pool.includes('treino_amplo'),'cavaleiro não recebe');
 // mesmo cenário com e sem a melhoria: no tique em que o alvo leva o 1º golpe, os vizinhos dele só se ferem com Golpe Amplo
 const trial=boon=>{
  const w2=core.makeWorld('sewer','normal',[novice],{seed:3});w2.spawnAt=1e9;w2.nextRiftAt=1e9;w2.eliteAt=1e9;w2.nextMagnetAt=1e9;w2.contract.done=true;w2.trials=[];w2.mobs=[];
  const q=w2.players.get('a');if(boon)q.skills.treino_amplo=5;
  core.testing.spawn(w2,'poring',{at:{x:q.x+40,y:q.y}});for(const dy of [-28,28])core.testing.spawn(w2,'poring',{at:{x:q.x+95,y:q.y+dy}});
  for(const m of w2.mobs)m.speed=0;const [t,...others]=w2.mobs;
  for(let i=0;i<80&&t.hp>=t.max;i++){q.hp=q.max;core.tickWorld(w2,.05);}
  assert.ok(t.hp<t.max,'acertou o alvo');return others.reduce((n,m)=>n+(m.max-Math.max(0,m.hp)),0);
 };
 assert.equal(trial(false),0,'sem a melhoria os vizinhos não sofrem dano');
 assert.ok(trial(true)>0,'Golpe Amplo feriu monstros em volta do alvo');
});

test('V25.2: baú não oferece bênção só de habilidade (recarga/SP/dano mágico) para quem não tem habilidade de dano',async()=>{
 const core=await engine();
 const novice={...member('a','mage'),profile:{job:'mage',classId:'highnovice'}};
 const only=new Set(['pulse','serenity','arcana','battlemage','tempest']);
 for(let seed=1;seed<40;seed++){
  const w=core.makeWorld('glast','normal',[novice],{seed});w.spawnAt=1e9;w.nextRiftAt=1e9;w.eliteAt=1e9;w.nextMagnetAt=1e9;w.contract.done=true;w.trials=[];w.mobs=[];
  const p=w.players.get('a');w.pickups.push({uid:'c',kind:'chest',x:p.x,y:p.y,amount:2});core.tickWorld(w,.05);
  for(const o of p.rewardChoices)assert.ok(!only.has(o.id),'Aprendiz T. recebeu '+o.id);
 }
 // um Mago (tem habilidades de dano) continua podendo receber
 let seen=false;
 for(let seed=1;seed<60&&!seen;seed++){
  const w=core.makeWorld('glast','normal',[member('a','mage')],{seed});w.spawnAt=1e9;w.nextRiftAt=1e9;w.eliteAt=1e9;w.nextMagnetAt=1e9;w.contract.done=true;w.trials=[];w.mobs=[];
  const p=w.players.get('a');w.pickups.push({uid:'c',kind:'chest',x:p.x,y:p.y,amount:2});core.tickWorld(w,.05);
  seen=p.rewardChoices.some(o=>only.has(o.id));
 }
 assert.ok(seen,'mago ainda recebe Pulso Arcano / Foco Arcano');
});

test('V25.2: tesouro do MVP — chapéus e acessórios variam também depois do 1º mapa',async()=>{
 const core=await engine(),{ITEMS}=await import(url('engine/combat-data.mjs'));
 const w=core.makeWorld('glast','normal',[member('a','sword')],{seed:5}),p=w.players.get('a'),seen=new Set();
 for(let i=0;i<800;i++)for(const o of core.rollMvpGear(w,p))seen.add(o.id);
 const of=t=>[...seen].filter(id=>ITEMS[id].type===t);
 assert.ok(of('headgear').length>=2,'chapéus: '+of('headgear'));
 assert.ok(of('accessory').length>=4,'acessórios: '+of('accessory'));
 assert.ok(of('shoes').length>=2&&of('garment').length>=2,'botas e capas variam');
});
