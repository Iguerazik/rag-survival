const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const url=file=>require('node:url').pathToFileURL(path.join(root,file)).href;
// Força uma nova oferta: aprende uma passiva neutra (Olhos de Coruja/Perícia) e o motor sorteia as próximas 3.
const reoffer=(core,w,p,dummy)=>{p.skills[dummy]=0;p.choices=[dummy];p.pendingUps=2;core.command(w,p.id,{upgrade:{seq:(p.upgradeSeq||0)+1,id:dummy}});return p.choices.map(c=>typeof c==='string'?c:c.id);};
const engine=()=>import(url('authoritative-world.mjs')).then(()=>import(url('engine/core.mjs')));
const member=(id,job,classId)=>({id,profile:{job,classId},character:{base:60,stage:1,guildTrials:{0:true,4:true},
 stats:{str:40,agi:40,vit:40,int:40,dex:60,luk:10},gear:{weaponAtk:120,weaponMatk:60,items:[]}}});

test('V25.3: melhorias do falcão só aparecem depois de Adestrar Falcão; Ataque Fatal só depois do Golpe Fulminante',async()=>{
 const core=await engine();
 const cases=[['archer','hunter',['steelcrow','falcon'],'falconry','owl'],['sword','knight',['fatal'],'bash','recovery']];
 for(const [job,classId,locked,req,dummy] of cases){
  for(let seed=1;seed<=40;seed++){
   const w=core.makeWorld('sewer','normal',[member('a',job,classId)],{seed});
   w.spawnAt=1e9;w.nextRiftAt=1e9;w.eliteAt=1e9;w.nextMagnetAt=1e9;w.contract.done=true;w.trials=[];w.mobs=[];
   const p=w.players.get('a');
   assert.ok(locked.every(id=>p.pool.includes(id))&&p.pool.includes(req),classId+': habilidades no pool');
   delete p.skills[req];p.slots=p.slots.filter(id=>id!==req);
   for(let n=0;n<6;n++){const offered=reoffer(core,w,p,dummy);
    assert.ok(offered.length>0,'houve oferta');
    for(const id of locked)assert.ok(!offered.includes(id),classId+' ofereceu '+id+' sem '+req+' (seed '+seed+')');}
  }
  // Com o pré-requisito aprendido, as melhorias voltam a ser sorteadas.
  let seen=false;
  for(let seed=1;seed<=60&&!seen;seed++){
   const w=core.makeWorld('sewer','normal',[member('a',job,classId)],{seed});
   w.spawnAt=1e9;w.nextRiftAt=1e9;w.eliteAt=1e9;w.nextMagnetAt=1e9;w.contract.done=true;w.trials=[];w.mobs=[];
   const p=w.players.get('a');p.skills[req]=1;
   for(let n=0;n<4&&!seen;n++)seen=reoffer(core,w,p,dummy).some(id=>locked.includes(id));
  }
  assert.ok(seen,classId+': melhorias liberadas depois de '+req);
 }
});

test('V25.3: efeito do falcão sem ângulo não quebra o canvas; painel de nível acima do MENU; ímãs com cores diferentes',()=>{
 const fx=read('skillfx.js');
 assert.match(fx,/Number\.isFinite\(x\) \|\| !Number\.isFinite\(y\)/,'glow ignora coordenadas inválidas');
 assert.match(fx,/angle: Math\.atan2\(dy, dx\), length: Math\.hypot\(dx, dy\)/,'play calcula ângulo/distância a partir de from');
 const game=read('game.js');
 assert.match(game,/ctx\.setTransform\(canvas\.width\/viewport\.w,0,0,canvas\.height\/viewport\.h,0,0\);\n  ctx\.save\(\);/,'draw recomeça da base');
 assert.match(game,/function placeServerPanel\(el\)/);
 const items=read('run-items.js');
 const color=kind=>items.match(new RegExp("chest\\.kind==='"+kind+"'\\?'(#[0-9a-f]+)'"))[1];
 assert.notEqual(color('goldMagnet'),color('xpMagnet'));
 assert.notEqual(color('goldMagnet'),color('zenyCache'));
});
