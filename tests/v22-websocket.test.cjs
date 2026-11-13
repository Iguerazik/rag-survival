const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const root=path.join(__dirname,'..');
async function startServer(extra={}){
 const data=fs.mkdtempSync(path.join(os.tmpdir(),'midgard-ws-'));
 const port=30000+Math.floor(Math.random()*15000);
 const child=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,PORT:String(port),HOST:'127.0.0.1',DATA_DIR:data,ALLOW_GUEST_MULTIPLAYER:'1',...extra},stdio:'ignore'});
 const base='http://127.0.0.1:'+port;
 for(let i=0;i<100;i++){try{if((await fetch(base+'/api/health')).ok)return {child,base,data,port}}catch{}await new Promise(r=>setTimeout(r,40))}
 child.kill();throw new Error('Servidor não iniciou');
}
const post=async(base,url,obj)=>{const r=await fetch(base+'/api/coop/rooms'+url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(obj)});return {status:r.status,data:await r.json()}};
function socket(port){
 const ws=new WebSocket('ws://127.0.0.1:'+port+'/api/coop/ws');const inbox=[];let waiters=[];
 ws.onmessage=e=>{const m=JSON.parse(e.data);inbox.push(m);for(const w of waiters.splice(0))w()};
 const next=async(pred,ms=3000)=>{const end=Date.now()+ms;for(;;){const i=inbox.findIndex(pred);if(i>=0)return inbox.splice(0,i+1).pop();
   if(Date.now()>end)throw new Error('timeout');await new Promise(r=>{waiters.push(r);setTimeout(r,50)})}};
 return {ws,next,open:new Promise((r,j)=>{ws.onopen=r;ws.onerror=j})};
}
test('V22.1: WebSocket empurra o mundo ~20x/s e aplica a posição validada na hora',{skip:typeof WebSocket==='undefined'},async()=>{
 const {child,base,data,port}=await startServer();
 try{
  const h=await post(base,'',{profile:{job:'sword'}}),g=await post(base,'/'+h.data.code+'/join',{profile:{job:'mage'}});
  await post(base,'/'+h.data.code+'/ready',{token:g.data.token,ready:true});
  assert.equal((await post(base,'/'+h.data.code+'/start',{token:h.data.token})).status,200);
  const s=socket(port);await s.open;
  s.ws.send(JSON.stringify({t:'hello',code:h.data.code,token:'errado'}));
  assert.equal((await s.next(m=>m.t==='error')).status,401);
  const t=socket(port);await t.open;
  t.ws.send(JSON.stringify({t:'hello',code:h.data.code,token:h.data.token}));
  const first=await t.next(m=>m.t==='s'&&m.world?.self);
  const start=Date.now();let count=0;
  while(Date.now()-start<1000){await t.next(m=>m.t==='s');count++;}
  assert.ok(count>=12,'esperava ~20 snapshots por segundo, recebeu '+count);
  const self=(await t.next(m=>m.t==='s')).world.self;
  t.ws.send(JSON.stringify({t:'in',input:{dx:1,dy:0,mv:{seq:1,x:self.x+6,y:self.y,warp:self.warpSeq}}}));
  const moved=await t.next(m=>m.t==='s'&&m.world.self.mvSeq===1);
  assert.ok(Math.abs(moved.world.self.x-(self.x+6))<1e-6,'posição aceita sem esperar o próximo poll');
  t.ws.send(JSON.stringify({t:'ping',c:42}));assert.equal((await t.next(m=>m.t==='pong')).c,42);
  assert.ok(first.world.events.length>=0&&Array.isArray(first.world.pickups));
  s.ws.close();t.ws.close();
 }finally{child.kill();fs.rmSync(data,{recursive:true,force:true})}
});
test('V22.1: WebSocket recusa origem de outro site',{skip:typeof WebSocket==='undefined'},async()=>{
 const {child,data,port}=await startServer();
 try{
  const net=require('node:net');
  const reply=await new Promise((resolve,reject)=>{const c=net.connect(port,'127.0.0.1',()=>{c.write('GET /api/coop/ws HTTP/1.1\r\nHost: 127.0.0.1:'+port+'\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nOrigin: https://malicioso.example\r\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\nSec-WebSocket-Version: 13\r\n\r\n')});
   let buf='';c.on('data',d=>{buf+=d});c.on('end',()=>resolve(buf));c.on('error',reject);setTimeout(()=>{c.destroy();resolve(buf)},1500)});
  assert.match(reply,/403/);
 }finally{child.kill();fs.rmSync(data,{recursive:true,force:true})}
});
test('V22.1: WebSocket aceita mensagens do navegador comprimidas (permessage-deflate)',async()=>{
 const {child,data,port}=await startServer();
 try{
  const net=require('node:net'),zlib=require('node:zlib'),crypto=require('node:crypto');
  const reply=await new Promise((resolve,reject)=>{
   const c=net.connect(port,'127.0.0.1',()=>c.write('GET /api/coop/ws HTTP/1.1\r\nHost: 127.0.0.1:'+port+'\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\nSec-WebSocket-Version: 13\r\nSec-WebSocket-Extensions: permessage-deflate; client_max_window_bits\r\n\r\n'));
   let buf=Buffer.alloc(0),sent=false;
   c.on('data',d=>{buf=Buffer.concat([buf,d]);
    if(!sent&&buf.includes('\r\n\r\n')){sent=true;
     const raw=zlib.deflateRawSync(Buffer.from(JSON.stringify({t:'hello',code:'ZZZZZZ',token:'x'.repeat(300)})),{finishFlush:zlib.constants.Z_SYNC_FLUSH});
     const body=raw.subarray(0,raw.length-4),mask=crypto.randomBytes(4),masked=Buffer.from(body.map((b,i)=>b^mask[i&3]));
     const head=body.length<126?Buffer.from([0xC1,0x80|body.length]):Buffer.from([0xC1,0x80|126,body.length>>8,body.length&255]);
     c.write(Buffer.concat([head,mask,masked]));}
   });
   c.on('close',()=>resolve(buf));c.on('error',reject);setTimeout(()=>{c.destroy();resolve(buf)},2000);
  });
  const text=reply.toString('latin1');
  assert.match(text,/101 Switching Protocols/);
  // A resposta de erro vem comprimida ou não; em ambos os casos o servidor fecha com 4404 (sala inexistente), não 1007.
  const close=reply.subarray(reply.lastIndexOf(Buffer.from([0x88]))+2,reply.lastIndexOf(Buffer.from([0x88]))+4);
  assert.equal(close.readUInt16BE(0),4404);
 }finally{child.kill();fs.rmSync(data,{recursive:true,force:true})}
});
test('V22.1: fim do mapa — líder leva o grupo para o próximo mapa ou tenta de novo',async()=>{
 const {child,base,data}=await startServer({MIDGARD_TEST_WIN_AT:'1'});
 try{
  const h=await post(base,'',{profile:{job:'sword'}}),g=await post(base,'/'+h.data.code+'/join',{profile:{job:'mage'}});
  await post(base,'/'+h.data.code+'/ready',{token:g.data.token,ready:true});
  const first=await post(base,'/'+h.data.code+'/start',{token:h.data.token});
  assert.equal(first.data.config.map,'sewer');
  assert.equal((await post(base,'/'+h.data.code+'/next',{token:h.data.token})).status,409,'não pula mapa no meio da partida');
  await new Promise(r=>setTimeout(r,1500));
  const ended=await post(base,'/'+h.data.code+'/sync',{token:g.data.token});
  assert.equal(ended.data.world.phase,'win');
  assert.equal((await post(base,'/'+h.data.code+'/next',{token:g.data.token})).status,403,'só o líder escolhe');
  const next=await post(base,'/'+h.data.code+'/next',{token:h.data.token,mode:'next'});
  assert.equal(next.status,200);assert.equal(next.data.config.map,'payon');assert.equal(next.data.phase,'playing');
  assert.notEqual(next.data.world.id,first.data.world.id);
  await new Promise(r=>setTimeout(r,1500));
  const retry=await post(base,'/'+h.data.code+'/next',{token:h.data.token,mode:'retry'});
  assert.equal(retry.data.config.map,'payon');
 }finally{child.kill();fs.rmSync(data,{recursive:true,force:true})}
});
test('V22.1: baú de elite vale para todos do grupo (cada um escolhe o seu)',async()=>{
 const {makeWorld,tickWorld,command}=await import('file://'+path.join(root,'authoritative-world.mjs'));
 const w=makeWorld('sewer','normal',[{id:'a',profile:{job:'sword'}},{id:'b',profile:{job:'mage'}}]);
 const a=w.players.get('a'),b=w.players.get('b');w.spawnAt=999;b.x=a.x+400;
 w.pickups.push({uid:'c-1',kind:'chest',x:a.x,y:a.y,amount:2},{uid:'c-2',kind:'chest',x:a.x,y:a.y,amount:3});
 tickWorld(w,.05);
 assert.equal(a.rewardChoices.length,3);assert.equal(b.rewardChoices.length,3,'quem não pegou também escolhe');
 assert.equal(b.chestQueue.length,1,'segundo baú fica na fila');
 command(w,'b',{reward:{seq:1,id:b.rewardChoices[0].id}});
 assert.equal(b.rewardChoices.length,3);assert.equal(b.rewardChoices[0].grade,3);
});
