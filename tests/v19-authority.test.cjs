const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const root=path.join(__dirname,'..');
async function startServer(extra={}){
 const data=fs.mkdtempSync(path.join(os.tmpdir(),'midgard-authority-'));
 const port=30000+Math.floor(Math.random()*15000);
 const child=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,PORT:String(port),HOST:'127.0.0.1',DATA_DIR:data,ALLOW_GUEST_MULTIPLAYER:'1',STRICT_ONLINE_PROGRESS:'1',...extra},stdio:'ignore'});
 const base='http://127.0.0.1:'+port;
 for(let i=0;i<100;i++){try{if((await fetch(base+'/api/health')).ok)return {child,base,data}}catch{}await new Promise(r=>setTimeout(r,40))}
 child.kill();throw new Error('Servidor não iniciou');
}
const post=async(base,url,obj,cookie)=>{
 const result=await fetch(base+url,{method:'POST',headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{}),'X-Midgard-Request':'1'},body:JSON.stringify(obj)});
 return {status:result.status,data:await result.json(),cookie:result.headers.get('set-cookie')?.split(';')[0]};
};
test('V19: lobby, jogo e simulação independentes de snapshots forjados pelo anfitrião',async()=>{
 const {child,base,data}=await startServer();
 try{
  let h=await post(base,'/api/coop/rooms',{profile:{job:'sword'}}),g=await post(base,'/api/coop/rooms/'+h.data.code+'/join',{profile:{job:'mage'}});
  assert.equal(h.status,200);assert.equal(g.status,200);
  await post(base,'/api/coop/rooms/'+h.data.code+'/ready',{token:g.data.token,ready:true});
  const begin=await post(base,'/api/coop/rooms/'+h.data.code+'/start',{token:h.data.token});
  assert.equal(begin.status,200);assert.equal(begin.data.world.authoritative,true);
  const dest='/api/coop/rooms/'+h.data.code+'/sync';
  await new Promise(r=>setTimeout(r,400));
  const before=await post(base,dest,{token:h.data.token});
  const spawnX=before.data.world.self.x;
  const forged=await post(base,dest,{token:h.data.token,input:{x:999999,y:-999999,hp:9999999999,max:99999999,damage:90000,hits:[[1,1,9999999]],dx:10,dy:0},world:{time:99999,mobs:[],phase:'win'},phase:'ended'});
  assert.equal(forged.data.phase,'playing');assert.ok(forged.data.world.time<15);
  assert.ok(forged.data.world.self.hp<=125);
  assert.ok(Math.abs(forged.data.world.self.x-spawnX)<120);
  assert.ok(forged.data.world.mobs.length>=0);
  await new Promise(r=>setTimeout(r,260));
  const updated=await post(base,dest,{token:h.data.token,input:{dx:1,dy:0,skill:5,skillSeq:1}});
  assert.ok(updated.data.world.self.x>=spawnX);
  const other=await post(base,dest,{token:g.data.token,input:{hp:0,damage:1000000,world:{phase:'win'}}});
  assert.equal(other.data.world.authoritative,true);
  assert.ok(other.data.world.self.hp>0);
 }finally{child.kill();fs.rmSync(data,{recursive:true,force:true})}
});
test('V19: simulação move apenas por comando, servidor controla elite 2min e MVP 12min',async()=>{
 const {makeWorld,command,tickWorld,passable,snapshotWorld}=await import('../authoritative-world.mjs');
 const member={id:'p1',userId:'u1',profile:{job:'archer'}};
 const w=makeWorld('sewer','normal',[member]),p=w.players.get('p1');
 const before=p.x;
 command(w,'p1',{x:9000000,hp:9999999,dx:100,dy:100});
 for(let i=0;i<7;i++)tickWorld(w,.05);
 assert.ok(p.x>before&&p.x<before+70);assert.ok(passable((await import('../authoritative-world.mjs')).passable?{...JSON.parse(fs.readFileSync(path.join(root,'server-maps.json'))).sewer,bits:Buffer.from(JSON.parse(fs.readFileSync(path.join(root,'server-maps.json'))).sewer.nav,'base64')}:null,p.x,p.y));
 // V23 Etapa 5: elites de campo do solo, a cada 90 s (o 4º é um Comandante).
 w.time=89.99;tickWorld(w,.05);assert.ok(w.mobs.some(m=>m.elite==='elite'&&/^Veterano /.test(m.name)));
 // V23.6: aos 12:00 o MVP aparece NO MAPA (servidor), perto do grupo; não há mais arena.
 w.time=719.99;tickWorld(w,.05);assert.equal(w.bossSpawned,true);assert.equal(w.arena,false);
 const boss=w.mobs.find(m=>m.elite==='mvp');assert.ok(boss);assert.ok(Math.hypot(boss.x-p.x,boss.y-p.y)<300,'nasce perto do grupo');
 const s=snapshotWorld(w,'p1');assert.equal(s.authoritative,true);assert.ok(s.mobs.some(m=>m[1]==='goldenbug'));
});
test('V19: recompensas persistentes são registradas pelo servidor uma única vez; navegador não altera Zeny ou cartas',async()=>{
 const {child,base,data}=await startServer({ALLOW_GUEST_MULTIPLAYER:'0'});
 try{
  const registered=await post(base,'/api/auth/register',{username:'testauthority',email:'auth@example.test',nickname:'Guardião de Tyr',password:'muito-segura-senha-19'});
  assert.equal(registered.status,201);const cookie=registered.cookie;
  const progress=await (await fetch(base+'/api/account/progress',{headers:{Cookie:cookie}})).json();
  assert.ok(progress.data.journeys.sword);assert.equal(progress.data.zeny,0);
  const forged=await fetch(base+'/api/account/progress',{method:'PUT',headers:{Cookie:cookie,'Content-Type':'application/json','X-Midgard-Request':'1'},body:JSON.stringify({revision:0,data:{...progress.data,zeny:999999,album:{baphomet:9999}}})});
  assert.equal(forged.status,403);
  const clean=await fetch(base+'/api/account/progress',{method:'PUT',headers:{Cookie:cookie,'Content-Type':'application/json','X-Midgard-Request':'1'},body:JSON.stringify({revision:0,data:{...progress.data,muted:true}})});
  assert.equal(clean.status,200);
  assert.equal((await (await fetch(base+'/api/account/coop-rewards',{headers:{Cookie:cookie}})).json()).awards.length,0);
 }finally{child.kill();fs.rmSync(data,{recursive:true,force:true})}
});
