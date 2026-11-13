const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const url=file=>require('node:url').pathToFileURL(path.join(root,file)).href;
const engine=()=>import(url('authoritative-world.mjs')).then(()=>import(url('engine/core.mjs')));
const S=JSON.parse(read('online-skills.json'));
const routes={sword:['sword','knight','highnovice','highsword','lordknight','runeknight'],mage:['mage','wizard','highnovice','highmage','highwizard','warlock'],
 archer:['archer','hunter','highnovice','higharcher','sniper','ranger'],acolyte:['acolyte','priest','highnovice','highacolyte','highpriest','archbishop'],
 merchant:['merchant','blacksmith','highnovice','highmerchant','whitesmith','mechanic'],thief:['thief','assassin','highnovice','highthief','assassincross','guillotine']};
const want=[['first'],['second'],['novice','boon'],['first','boon'],['second','trans'],['third','boon']];

test('V25.9: cada classe recebe só as próprias habilidades',async()=>{
 const core=await engine();
 for(const [job,route] of Object.entries(routes))for(const [stage,classId] of route.entries()){
  const w=core.makeWorld('sewer','normal',[{id:'a',profile:{job,classId},character:{base:60,stage,stats:{str:40}}}],{seed:1});
  const p=w.players.get('a'),expected=want[stage].flatMap(t=>S.lines[job][t]||[]);
  assert.deepEqual([...p.pool].sort(),[...expected].sort(),classId);
  for(const id of p.slots)assert.ok(!S.skills[id].req||!p.pool.includes(S.skills[id].req)||p.skills[S.skills[id].req],classId+' começa com '+id+' sem o pré-requisito');
 }
});

test('V25.9: lobo, dragão, robô e carrinho liberam primeiro; depois as habilidades que dependem deles',async()=>{
 const core=await engine();
 const reqs={wargstrike:'wargtrain',dragon:'dragontrain',armcannon:'madogear',cartrev:'pushcart',cartterm:'pushcart',falcon:'falconry',steelcrow:'falconry',sonicblow:'katar'};
 for(const [id,req] of Object.entries(reqs))assert.equal(S.skills[id].req,req,id);
 const cases=[['archer','ranger','wargstrike','wargtrain','arrowstorm'],['sword','runeknight','dragon','dragontrain','ignition'],['merchant','mechanic','armcannon','madogear','axeboom']];
 for(const [job,classId,locked,req,dummy] of cases)for(let seed=1;seed<=25;seed++){
  const w=core.makeWorld('sewer','normal',[{id:'a',profile:{job,classId},character:{base:90,stage:5,stats:{str:40}}}],{seed});
  w.spawnAt=1e9;w.mobs=[];const p=w.players.get('a');delete p.skills[req];
  for(let n=0;n<5;n++){p.skills[dummy]=0;p.choices=[dummy];p.pendingUps=2;core.command(w,'a',{upgrade:{seq:(p.upgradeSeq||0)+1,id:dummy}});
   assert.ok(!p.choices.includes(locked),classId+': '+locked+' antes de '+req);}
 }
});

test('V25.9: todas as combinações do Códex continuam possíveis em alguma classe',async()=>{
 const d=await import(url('engine/run-data.mjs'));
 const pool=(line,st)=>S.stages[st].flatMap(t=>S.lines[line][t]||[]);
 for(const c of d.SKILL_COMBOS)assert.ok([0,1,2,3,4,5].some(st=>pool(c.family,st).includes(c.first)&&pool(c.family,st).includes(c.second)),c.name);
 for(const [id,e] of Object.entries(d.CODEX_EVOLUTIONS))assert.ok(Object.keys(S.lines).some(line=>[0,1,3,4,5].some(st=>pool(line,st).includes(e.skill))),id);
 // roguelike.js (lista do Códex no navegador) igual ao motor
 const src=read('roguelike.js');
 for(const c of d.SKILL_COMBOS)assert.ok(src.includes("'"+c.name+"','"+c.first+"','"+c.second+"'"),'roguelike.js: '+c.name);
});

test('V25.9: "Jogar como" — classe anterior liberada usa as skills dela; metas da classe atual só contam com ela',()=>{
 const game=read('game.js');
 assert.match(game,/function playStageOf\(profile\)/);
 assert.match(game,/jobs\[jobLines\[selected\]\[journeyMode === 'training' \? 5 : playStageOf\(journeyOf\(\)\)\]\]/);
 assert.match(read('v12-ui.js'),/Jogar como/);
 assert.match(read('v12-systems.js'),/playStageOf\(profile\)!==profile\.stage\)return;/);
 assert.match(read('server.mjs'),/playStage:p\.stage/);
 assert.match(read('accounts.mjs'),/if\(award\.playStage==null\|\|Number\(award\.playStage\)===stage\)next\.runRecords=/);
});
