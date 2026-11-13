const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const url=require('node:url');
const root=path.join(__dirname,'..');
const load=async()=>{await import(url.pathToFileURL(path.join(root,'authoritative-world.mjs')).href);return import(url.pathToFileURL(path.join(root,'engine/core.mjs')).href);};
const member=id=>({id,profile:{job:'sword',classId:'sword'},character:{base:60,stage:1,stats:{str:60,agi:40,vit:40,int:40,dex:40,luk:10},gear:{weaponAtk:120,items:[]}}});
test('MVP: fases 75/50/25 são únicas, simultâneas para a sala, e reforços válidos',async()=>{
 const core=await load(),w=core.makeWorld('payon','normal',[member('a'),member('b')],{seed:53});
 for(const p of w.players.values()){p.hp=p.max=1e8;p.input.attack=false;}
 w.time=719.99;core.tickWorld(w,.05);
 const boss=w.mobs.find(m=>m.elite==='mvp');assert.ok(boss);assert.equal(w.arena,false);
 const initial=w.events.filter(e=>e.type==='mvpReinforcements');assert.equal(initial.length,1);assert.ok(initial[0].count>0);
 for(const [health,phase] of [[.74,2],[.49,3],[.24,4]]){
  boss.hp=boss.max*health;w.events=[];core.tickWorld(w,.05);
  assert.equal(w.mvpArena.phase,phase);
  assert.equal(w.events.filter(e=>e.type==='mvpPhase'&&e.phase===phase).length,1);
  w.events=[];core.tickWorld(w,.05);assert.equal(w.events.filter(e=>e.type==='mvpPhase').length,0);
 }
 assert.equal(boss.enraged,true);
 const map=JSON.parse(require('node:fs').readFileSync(path.join(root,'server-maps.json'),'utf8')).payon;
 for(const m of w.mobs.filter(m=>m.summoned)){
  const col=Math.floor((m.x-map.x)/map.cell),row=Math.floor((m.y-map.y)/map.cell);
  if(col>=0&&row>=0&&col<map.w&&row<map.h)assert.ok(map.bits[(row*map.w+col)>>3]&(1<<((row*map.w+col)&7)));
  for(const p of w.players.values())assert.ok(Math.hypot(m.x-p.x,m.y-p.y)>85);
 }
});
test('MVP: populações normais não caem a 40% durante luta; tempo é da mesma sala',async()=>{
 const core=await load();const a=core.makeWorld('sewer','normal',[member('a')],{seed:8}),b=core.makeWorld('sewer','normal',[member('a')],{seed:8});
 for(const w of [a,b]){w.time=650;w.spawnAt=0;w.contract.done=true;w.eliteAt=Infinity;w.nextRiftAt=Infinity;w.nextMagnetAt=Infinity;const p=w.players.get('a');p.hp=p.max=1e7;p.input.attack=false;}
 b.bossSpawned=true; // testa o efeito da flag, isoladamente
 core.tickWorld(a,.05);core.tickWorld(b,.05);
 const count=w=>w.mobs.filter(m=>!m.elite).length;
 assert.equal(count(a),count(b),'flag bossSpawned não pode reduzir a cota base');
});
