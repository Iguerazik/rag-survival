const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path');
const os=require('node:os');
const fs=require('node:fs');
const root=path.resolve(__dirname,'..');
const script=n=>fs.readFileSync(path.join(root,n),'utf8');

async function launch(){
 const port=33000+Math.floor(Math.random()*12000);
 const child=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,PORT:String(port),HOST:'127.0.0.1',ALLOW_GUEST_MULTIPLAYER:'1',DATA_DIR:fs.mkdtempSync(path.join(os.tmpdir(),'midgard-v17-legacy-'))},stdio:'ignore'});
 const base='http://127.0.0.1:'+port;
 for(let n=0;n<60;n++){
   try{const r=await fetch(base+'/api/health');if(r.ok)return {child,base};}catch{}
   await new Promise(resolve=>setTimeout(resolve,35));
 }
 child.kill();throw new Error('Servidor não inicializou');
}
async function post(base,uri,data){const res=await fetch(base+'/api/coop/rooms'+uri,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});return {status:res.status,data:await res.json()}}

test('V17: sala de seis, pronto, configuração por líder, iniciar, snapshots, proteções HTTP',async()=>{
 const {child,base}=await launch();
 try{
  assert.equal((await (await fetch(base+'/api/version')).json()).version,require('../package.json').version);
  const created=await post(base,'',{profile:{name:'Líder',job:'sword'},config:{map:'maze',difficulty:'easy'}});
  assert.equal(created.status,200);const host=created.data,code=host.code;
  const players=[];
  for(let n=1;n<6;n++){
   const result=await post(base,'/'+code+'/join',{profile:{name:'Personagem '+n,job:'archer'}});
   assert.equal(result.status,200);players.push(result.data);
  }
  assert.equal((await post(base,'/'+code+'/join',{profile:{name:'Sétimo'}})).status,409);
  assert.equal((await post(base,'/'+code+'/start',{token:host.token})).status,409);
  assert.equal((await post(base,'/'+code+'/settings',{token:players[0].token,config:{map:'geffen'}})).status,403);
  for(const player of players) assert.equal((await post(base,'/'+code+'/ready',{token:player.token,ready:true})).status,200);
  const changed=await post(base,'/'+code+'/settings',{token:host.token,config:{map:'glast',difficulty:'normal'}});
  assert.equal(changed.status,200);
  assert.equal(changed.data.members.filter(m=>m.ready).length,1);
  assert.equal((await post(base,'/'+code+'/start',{token:host.token})).status,409);
  for(const player of players) await post(base,'/'+code+'/ready',{token:player.token,ready:true});
  assert.equal((await post(base,'/'+code+'/start',{token:host.token})).status,200);
  const world={map:'glast',difficulty:'normal',mobs:[],time:7.4,phase:'play',ack:{}};
  const sync=await post(base,'/'+code+'/sync',{token:host.token,world,phase:'playing'});
  assert.equal(sync.status,200);assert.equal(sync.data.phase,'playing');
  assert.equal(sync.data.world.map,'glast');assert.equal(sync.data.config.difficulty,'normal');
  assert.equal((await post(base,'/'+code+'/join',{profile:{name:'Tardio'}})).status,409);
  const guest=await post(base,'/'+code+'/sync',{token:players[0].token,world:{map:'hack'},input:{x:500,y:300,hp:32,max:35,animKind:'cast',animSkill:'stormgust',hits:[[1,32,1000]]}});
  assert.equal(guest.data.world.map,'glast');
  const actor=guest.data.members.find(m=>m.id===players[0].id);
  assert.equal(actor.input.animSkill,'');assert.equal(actor.input.hp,actor.input.max);assert.notEqual(actor.input.x,500);
  assert.equal(guest.data.world.authoritative,true);assert.ok(guest.data.world.time<7.4);
  assert.equal(guest.data.world.mobs.length,0); // host's injected world is ignored
  assert.equal((await fetch(base+'/server.mjs')).status,404);
  assert.equal((await fetch(base+'/package.json')).status,404);
  assert.equal((await fetch(base+'/tests/v17-coop.test.cjs')).status,404);
  assert.equal((await fetch(base+'/.env')).status,404);
  assert.equal((await fetch(base+'/assets/mark.svg')).status,200);
  assert.equal((await post(base,'/'+code+'/leave',{token:host.token})).status,200);
  // V22.1: se o líder sai, a liderança passa para o próximo jogador (a sala não cai para todos).
  const after=await post(base,'/'+code+'/sync',{token:players[0].token});
  assert.equal(after.status,200);assert.notEqual(after.data.hostId,host.id);
  assert.ok(after.data.members.some(m=>m.id===after.data.hostId));
 }finally{child.kill('SIGTERM')}
});
test('V17: ataques e conjuração de habilidades sincronizam hit no quadro de impacto',()=>{
 const game=script('game.js'),fx=script('combat-v17.js'),client=script('coop.js');
 // V23: o efeito da habilidade espera a chegada (pendingEffects) e o golpe básico, o impacto (resolveStrikes) — no motor.
 const core=script('engine/core.mjs');
 assert.match(core,/world\.pendingEffects\.push\(\{time:world\.time\+(?:lag\(world,)?(?:cast\+)?arrive/); // V25.12: + conjuração
 assert.match(core,/resolveStrikes\(world,p,visible\)/);
 assert.match(game,/CombatV17\.draw\(ctx,actor,motion/);
 assert.match(game,/CombatV17\.draw\(ctx,actor,remote/);
 assert.match(fx,/cast/);
 assert.match(client,/\/start/);
});
