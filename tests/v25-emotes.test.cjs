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
test('Emotes online: o servidor repassa o emote para a sala (lista fechada e limite de frequência), sem mexer no mundo',{skip:typeof WebSocket==='undefined'},async()=>{
 const {child,base,data,port}=await startServer();
 try{
  const h=await post(base,'',{profile:{job:'sword'}}),g=await post(base,'/'+h.data.code+'/join',{profile:{job:'mage'}});
  await post(base,'/'+h.data.code+'/ready',{token:g.data.token,ready:true});
  assert.equal((await post(base,'/'+h.data.code+'/start',{token:h.data.token})).status,200);
  const a=socket(port),b=socket(port);await a.open;await b.open;
  a.ws.send(JSON.stringify({t:'hello',code:h.data.code,token:h.data.token}));
  b.ws.send(JSON.stringify({t:'hello',code:h.data.code,token:g.data.token}));
  await a.next(m=>m.t==='s');await b.next(m=>m.t==='s');
  a.ws.send(JSON.stringify({t:'emote',id:'amor'}));
  const got=await b.next(m=>m.t==='emote');
  assert.equal(got.id,'amor');assert.equal(got.from,h.data.id||got.from);assert.ok(got.from);
  const echo=await a.next(m=>m.t==='emote');assert.equal(echo.from,got.from,'quem mandou também recebe (o cliente ignora o próprio)');
  // limite: um segundo emote logo em seguida é ignorado
  a.ws.send(JSON.stringify({t:'emote',id:'grr'}));
  await assert.rejects(b.next(m=>m.t==='emote',600));
  // emote fora da lista é ignorado
  await new Promise(r=>setTimeout(r,850));
  a.ws.send(JSON.stringify({t:'emote',id:'<img src=x>'}));
  await assert.rejects(b.next(m=>m.t==='emote',600));
  // depois do intervalo, outro emote válido passa
  a.ws.send(JSON.stringify({t:'emote',id:'positivo'}));
  assert.equal((await b.next(m=>m.t==='emote')).id,'positivo');
  // o mundo continua normal (snapshots seguem chegando)
  assert.ok(await b.next(m=>m.t==='s'));
  a.ws.close();b.ws.close();
 }finally{child.kill();fs.rmSync(data,{recursive:true,force:true})}
});
