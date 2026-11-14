const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const net=require('node:net');
const zlib=require('node:zlib');
const {launch,findBrowser}=require('./helpers/cdp.cjs');
const root=path.join(__dirname,'..');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function startServer(extra={}){
 const data=fs.mkdtempSync(path.join(os.tmpdir(),'midgard-v27-'));
 const port=30000+Math.floor(Math.random()*15000);
 const child=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,PORT:String(port),HOST:'127.0.0.1',DATA_DIR:data,ALLOW_GUEST_MULTIPLAYER:'1',...extra},stdio:'ignore'});
 const base='http://127.0.0.1:'+port;
 for(let i=0;i<100;i++){try{if((await fetch(base+'/api/health')).ok)return {child,base,data,port}}catch{}await sleep(40)}
 child.kill();throw new Error('Servidor não iniciou');
}
const post=async(base,url,obj)=>{const r=await fetch(base+'/api/coop/rooms'+url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(obj)});return {status:r.status,data:await r.json()}};
async function match(base){
 const h=await post(base,'',{profile:{job:'sword'}}),g=await post(base,'/'+h.data.code+'/join',{profile:{job:'mage'}});
 await post(base,'/'+h.data.code+'/ready',{token:g.data.token,ready:true});
 assert.equal((await post(base,'/'+h.data.code+'/start',{token:h.data.token})).status,200);
 return h.data;
}
/** Cliente WebSocket cru (sem máscara de saída comprimida), que descomprime COM contexto como o navegador. */
function rawClient(port,extensions){
 return new Promise((resolve,reject)=>{
  const c=net.connect(port,'127.0.0.1',()=>c.write('GET /api/coop/ws HTTP/1.1\r\nHost: 127.0.0.1:'+port+'\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\nSec-WebSocket-Version: 13\r\nSec-WebSocket-Extensions: '+extensions+'\r\n\r\n'));
  let buf=Buffer.alloc(0),header=null;const messages=[],inflater=zlib.createInflateRaw();let compressedBytes=0;
  const pending=[];let busy=false;
  const drain=()=>{if(busy||!pending.length)return;busy=true;const p=pending.shift();const out=[];const on=d=>out.push(d);inflater.on('data',on);
   inflater.write(Buffer.concat([p,Buffer.from([0,0,0xff,0xff])]));inflater.flush(zlib.constants.Z_SYNC_FLUSH,()=>{inflater.off('data',on);messages.push(JSON.parse(Buffer.concat(out).toString()));busy=false;drain();});};
  c.on('data',d=>{buf=Buffer.concat([buf,d]);
   if(!header){const i=buf.indexOf('\r\n\r\n');if(i<0)return;header=buf.subarray(0,i).toString();buf=buf.subarray(i+4);resolve(api);}
   while(buf.length>=2){const b0=buf[0],b1=buf[1];let len=b1&0x7f,off=2;if(len===126){if(buf.length<4)return;len=buf.readUInt16BE(2);off=4}else if(len===127){if(buf.length<10)return;len=Number(buf.readBigUInt64BE(2));off=10}
    if(buf.length<off+len)return;const payload=buf.subarray(off,off+len);buf=buf.subarray(off+len);
    if((b0&0x0f)!==1)continue;
    if(b0&0x40){compressedBytes+=payload.length;pending.push(Buffer.from(payload));drain();}else messages.push(JSON.parse(payload.toString()));}
  });
  c.on('error',reject);
  const send=obj=>{const p=Buffer.from(JSON.stringify(obj)),mask=Buffer.from([1,2,3,4]);const h=p.length<126?Buffer.from([0x81,0x80|p.length]):Buffer.from([0x81,0x80|126,p.length>>8,p.length&255]);
   const m=Buffer.from(p.map((x,i)=>x^mask[i&3]));c.write(Buffer.concat([h,mask,m]));};
  const api={get header(){return header},messages,send,close:()=>c.destroy(),get compressedBytes(){return compressedBytes}};
 });
}

test('V27: WebSocket comprime COM contexto (servidor → cliente) e cada quadro descomprime certo na ordem',async()=>{
 const {child,base,data,port}=await startServer();
 try{
  const room=await match(base);
  const c=await rawClient(port,'permessage-deflate; client_max_window_bits');
  assert.match(c.header,/permessage-deflate/);
  assert.doesNotMatch(c.header,/server_no_context_takeover/,'servidor guarda o contexto da compressão');
  assert.match(c.header,/client_no_context_takeover/);
  c.send({t:'hello',code:room.code,token:room.token});
  await sleep(1500);
  const snaps=c.messages.filter(m=>m.t==='s'&&m.world);
  assert.ok(snaps.length>=15,'recebeu snapshots ('+snaps.length+')');
  assert.ok(c.compressedBytes>0,'quadros comprimidos');
  for(const s of snaps)assert.ok(s.world.self&&Array.isArray(s.world.mobs));
  c.close();
  // pedido do navegador sem contexto → volta ao modo antigo
  const d=await rawClient(port,'permessage-deflate; server_no_context_takeover');
  assert.match(d.header,/server_no_context_takeover/);d.close();
 }finally{child.kill();fs.rmSync(data,{recursive:true,force:true})}
});

test('V27: monstros no WebSocket — campos fixos só na 1ª vez; a forma curta remonta igual à completa; resync manda tudo',async()=>{
 const {child,base,data,port}=await startServer({WS_DEFLATE:'0'});
 try{
  const room=await match(base);
  const c=await rawClient(port,'x-none');
  c.send({t:'hello',code:room.code,token:room.token});
  await sleep(2500);
  const snaps=c.messages.filter(m=>m.t==='s'&&m.world?.mobs?.length);
  assert.ok(snaps.length>=10,'snapshots com monstros');
  assert.ok(snaps.every(s=>s.world.mk===1),'marcados como compactos');
  const first=new Map();let short=0;
  for(const s of snaps)for(const m of s.world.mobs){
   if(m.length>9){first.set(m[0],m);continue;}
   assert.equal(m.length,9);short++;
   assert.ok(first.has(m[0]),'forma curta só depois da completa (uid '+m[0]+')');
  }
  assert.ok(short>0,'quadros seguintes usam a forma curta');
  // resync: o próximo quadro volta a trazer todos completos
  c.messages.length=0;c.send({t:'resync'});await sleep(400);
  const after=c.messages.filter(m=>m.t==='s'&&m.world?.mobs?.length);
  assert.ok(after.some(s=>s.world.mobs.every(m=>m.length>9)),'resync devolve a lista completa');
  c.close();
 }finally{child.kill();fs.rmSync(data,{recursive:true,force:true})}
});

test('V27: navegador real — WebSocket com contexto + coop.js remonta os monstros no formato antigo',async t=>{
 if(!findBrowser()){t.skip('Chrome/Edge não encontrado');return;}
 const {child,base,data}=await startServer();
 const browser=await launch({width:1000,height:700});
 if(!browser){child.kill();t.skip('navegador não abriu');return;}
 try{
  const room=await match(base);
  await browser.goto(base+'/');
  const r=await browser.evaluate(`new Promise(res=>{const ws=new WebSocket('ws://'+location.host+'/api/coop/ws');const got=[];
   ws.onopen=()=>ws.send(JSON.stringify({t:'hello',code:${JSON.stringify(room.code)},token:${JSON.stringify(room.token)}}));
   ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.t!=='s'||!m.world?.mobs)return;const raw=m.world.mobs.map(x=>x.length);Coop.expandMobs(ws,m.world);got.push({raw,full:m.world.mobs,mk:m.world.mk});
    if(got.length>=30){ws.close();res(JSON.stringify({ext:ws.extensions,got}));}};})`).then(JSON.parse);
  assert.match(r.ext,/permessage-deflate/);
  assert.doesNotMatch(r.ext,/server_no_context_takeover/);
  assert.ok(r.got.some(g=>g.raw.some(n=>n===9)),'chegou forma curta');
  // remontado: sempre 17 campos, tipo e HP máximo presentes, posição atualizada
  for(const g of r.got){assert.equal(g.mk,undefined);for(const m of g.full){assert.equal(m.length,17);assert.equal(typeof m[1],'string');assert.ok(m[5]>0);}}
  const uid=r.got[0].full[0]?.[0];const track=r.got.map(g=>g.full.find(m=>m[0]===uid)).filter(Boolean);
  assert.ok(track.length>5&&track.every(m=>m[1]===track[0][1]),'o mesmo monstro mantém tipo/campos fixos');
  assert.deepEqual(browser.errors,[]);
 }finally{await browser.close();child.kill();fs.rmSync(data,{recursive:true,force:true})}
});
