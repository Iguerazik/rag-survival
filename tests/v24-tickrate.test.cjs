// V24: servidor a 60 ticks/s com snapshots a 20/s; o ritmo de jogo (prazos) continua o da V23 (grade de 50 ms).
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const root=path.join(__dirname,'..');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function startServer(extra={}){
 const data=fs.mkdtempSync(path.join(os.tmpdir(),'rag-v24-'));
 const port=30000+Math.floor(Math.random()*15000);
 const child=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,PORT:String(port),HOST:'127.0.0.1',DATA_DIR:data,ALLOW_GUEST_MULTIPLAYER:'1',MIDGARD_AUTO_UPDATE:'0',...extra},stdio:'ignore'});
 const base='http://127.0.0.1:'+port;
 for(let i=0;i<100;i++){try{if((await fetch(base+'/api/health')).ok)return {child,base,data,port}}catch{}await sleep(40)}
 child.kill();throw new Error('Servidor não iniciou');
}
const post=async(base,url,obj)=>{const r=await fetch(base+'/api/coop/rooms'+url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(obj)});return {status:r.status,data:await r.json()}};

test('V24: /api/version informa RAG SURVIVAL, 60 ticks/s e snapshots a 20/s',async()=>{
 const {child,base,data}=await startServer();
 try{
  const v=await (await fetch(base+'/api/version')).json();
  assert.equal(v.name,'RAG SURVIVAL');assert.equal(v.tickRate,60);assert.equal(v.snapshotRate,20);
 }finally{child.kill();await sleep(200);fs.rmSync(data,{recursive:true,force:true})}
});

test('V24: partida real — servidor sustenta ~60 TPS e o WebSocket entrega ~20 snapshots/s',{skip:typeof WebSocket==='undefined'},async()=>{
 const {child,base,data,port}=await startServer();
 try{
  const h=await post(base,'',{profile:{job:'sword'}}),g=await post(base,'/'+h.data.code+'/join',{profile:{job:'mage'}});
  await post(base,'/'+h.data.code+'/ready',{token:g.data.token,ready:true});
  assert.equal((await post(base,'/'+h.data.code+'/start',{token:h.data.token})).status,200);
  const ws=new WebSocket('ws://127.0.0.1:'+port+'/api/coop/ws');let count=0,first=0,last=0;
  await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});
  ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.t==='s'){count++;last=performance.now();if(!first)first=last;}};
  ws.send(JSON.stringify({t:'hello',code:h.data.code,token:h.data.token}));
  await sleep(3200);ws.close();
  const rate=(count-1)/((last-first)/1000);
  assert.ok(rate>17&&rate<23,'snapshots por segundo: '+rate.toFixed(1));
  const tick=(await (await fetch(base+'/api/health')).json()).tick;
  assert.equal(tick.configured,60);
  assert.ok(tick.measuredTps>55&&tick.measuredTps<65,'TPS medido: '+tick.measuredTps);
  assert.ok(tick.p99Ms<16.67,'p99 do tick acima do orçamento: '+tick.p99Ms);
 }finally{child.kill();await sleep(200);fs.rmSync(data,{recursive:true,force:true})}
});

test('V24: com timerGrid a 60 ticks/s, a cadência de ataque é a mesma de 20 ticks/s (sem a grade ela ficaria mais rápida)',async()=>{
 const {pathToFileURL}=require('node:url');
 const core=await import(pathToFileURL(path.join(root,'authoritative-world.mjs')).href);
 function cadence(rate,grid=rate>20){
  const opts={seed:5,...(grid?{timerGrid:.05}:{})};
  const w=core.makeWorld('sewer','normal',[{id:'a',profile:{job:'archer',classId:'hunter'},character:{base:40,stage:1,stats:{str:10,agi:50,vit:30,int:1,dex:60,luk:5},gear:{weaponAtk:90}}}],opts);
  w.spawnAt=1e9;w.eliteAt=1e9;w.nextRiftAt=1e9;w.nextMagnetAt=1e9;
  const p=w.players.get('a');
  // um alvo parado e imortal na frente do arqueiro
  w.mobs.push({uid:999,id:'poring',x:p.x+120,y:p.y,hp:1e9,max:1e9,r:12,speed:0,damage:0,dead:false,elite:'',target:'a',contactAt:0,slowUntil:0,stunUntil:0,poisonUntil:0,vulnUntil:0});
  const shots=[];let prev=p.animSeq;
  for(let i=0;i<rate*12;i++){core.command(w,'a',{dx:0,dy:0,attack:true,auto:false});core.tickWorld(w,1/rate);if(p.animSeq!==prev&&p.animKind==='attack'){shots.push(w.time);prev=p.animSeq;}}
  const gaps=shots.slice(1).map((t,i)=>t-shots[i]);return gaps.reduce((a,b)=>a+b,0)/gaps.length;
 }
 const at20=cadence(20),at60=cadence(60),raw60=cadence(60,false);
 assert.ok(Number.isFinite(at20)&&at20>0,'sem ataques a 20 TPS');
 // a 60 TPS o golpe pode sair até 1 tick (16,7 ms) depois da batida de 50 ms
 assert.ok(Math.abs(at60-at20)<=1/60+1e-6,`cadência 20 TPS ${at20.toFixed(4)} s × 60 TPS ${at60.toFixed(4)} s`);
 console.log(`# cadência média: 20 TPS ${at20.toFixed(4)} s · 60 TPS com grade ${at60.toFixed(4)} s · 60 TPS sem grade ${raw60.toFixed(4)} s`);
});
