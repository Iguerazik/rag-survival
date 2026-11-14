const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const url=file=>require('node:url').pathToFileURL(path.join(root,file)).href;
const engine=()=>import(url('authoritative-world.mjs')).then(()=>import(url('engine/core.mjs')));
const member=(id,job,classId,dex=20)=>({id,profile:{job,classId},character:{base:60,stage:0,stats:{str:30,agi:30,vit:30,int:60,dex,luk:10}}});

test('V25.12: magias têm tempo de conjuração, dá para andar conjurando e DES reduz o tempo',async()=>{
 const core=await engine();
 const run=dex=>{
  const w=core.makeWorld('sewer','normal',[member('a','mage','mage',dex)],{seed:3});
  w.spawnAt=1e9;w.nextRiftAt=1e9;w.eliteAt=1e9;w.mobs=[];w.contract.done=true;w.trials=[];
  const p=w.players.get('a');p.skills={fireball:3};p.slots=['fireball'];
  const m=core.testing.spawn(w,'cramp',{at:{x:p.x+150,y:p.y}});m.hp=m.max=1e6;
  let cast=null,hitAt=null;const x0=p.x;
  for(let i=0;i<240&&hitAt==null;i++){p.sp=p.maxSp;p.input={...(p.input||{}),auto:true,dx:0,dy:1};core.tickWorld(w,1/60);
   for(const e of w.events.splice(0)){if(e.type==='castStart')cast={e,t:w.time};if(e.type==='skillEffect'&&e.skill==='fireball'&&hitAt==null)hitAt=w.time;}}
  return {cast:cast?.e.duration,delay:hitAt-cast.t,moved:Math.abs(p.y)>0||p.x!==x0};
 };
 const slow=run(1),fast=run(99);
 assert.ok(slow.cast>.5,'conjuração com pouca DES: '+slow.cast);
 assert.ok(fast.cast<slow.cast*.5,'DES 99 conjura bem mais rápido: '+fast.cast+' vs '+slow.cast);
 assert.ok(slow.delay>=slow.cast-.02,'o dano só sai depois da conjuração');
 assert.ok(slow.moved,'o personagem continua andando enquanto conjura');
});

test('V25.12: carta no online é sorteada entre o grupo e todos veem quem ganhou',async()=>{
 const core=await engine();
 const w=core.makeWorld('sewer','normal',[member('a','sword','sword'),member('b','mage','mage'),member('c','archer','archer')],{seed:8});
 w.spawnAt=1e9;w.mobs=[];
 const won={a:0,b:0,c:0};
 for(let i=0;i<60;i++){const m=core.testing.spawn(w,'cramp',{at:{x:900,y:900}});m.cardRate=1;core.testing.defeated(w,m,w.players.get('a'));}
 for(const id of ['a','b','c'])won[id]=w.players.get(id).cards.length;
 assert.ok(w.events.some(e=>e.type==='cardWon'&&e.party===3),'evento avisa o sorteio para todos');
 assert.equal(won.a+won.b+won.c,60,'todas as cartas sorteadas');
 assert.ok(won.b>5&&won.c>5,'não fica só com quem matou: '+JSON.stringify(won));
 assert.equal(w.pickups.filter(o=>o.kind==='card').length,0,'no online a carta não fica no chão');
 const g=read('game.js');
 assert.match(g,/e\.type==='cardWon'/);assert.match(g,/function minorNote\(message\)/);
 assert.match(g,/'buff-bar','world-event-bar'\]\)/);
});
