const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
async function start(env){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'midgard-solo-'));const port=30000+Math.floor(Math.random()*15000);
 const child=spawn(process.execPath,['server.mjs'],{cwd:path.join(__dirname,'..'),env:{...process.env,PORT:String(port),DATA_DIR:dir,HOST:'127.0.0.1',...env},stdio:'ignore'});
 const base='http://127.0.0.1:'+port;
 for(let i=0;i<100;i++){try{if((await fetch(base+'/api/health')).ok)return {child,base,dir}}catch{}await new Promise(r=>setTimeout(r,40))}
 throw new Error('servidor não iniciou');
}
const put=(t,cookie,body)=>fetch(t.base+'/api/account/progress',{method:'PUT',headers:{'Content-Type':'application/json','X-Midgard-Request':'1',Cookie:cookie},body:JSON.stringify(body)});
async function account(t,name){
 const r=await fetch(t.base+'/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json','X-Midgard-Request':'1'},body:JSON.stringify({username:name,email:name+'@x.test',nickname:'N '+name,password:'senha123'})});
 assert.equal(r.status,201,'senha de 8 caracteres é aceita');const cookie=r.headers.get('set-cookie').split(';')[0];
 const snap=await (await fetch(t.base+'/api/account/progress',{headers:{Cookie:cookie}})).json();return {cookie,snap};
}
test('V22.3: progresso do solo conta na conta (com limites de plausibilidade)',async()=>{
 const t=await start({STRICT_ONLINE_PROGRESS:'1'});
 try{
  const {cookie,snap}=await account(t,'solopl');
  const d=snap.data,j=d.journeys.sword;
  const run={...d,zeny:1850,album:{poring:1},journeys:{...d.journeys,sword:{...j,base:9,job:7,baseXp:20}},campaign:{sword:{cleared:{sewer:true}}}};
  const ok=await put(t,cookie,{revision:snap.revision,data:run});assert.equal(ok.status,200);
  const after=await (await fetch(t.base+'/api/account/progress',{headers:{Cookie:cookie}})).json();
  assert.equal(after.data.journeys.sword.base,9);assert.equal(after.data.zeny,1850);
  const forged=await put(t,cookie,{revision:after.revision,data:{...after.data,zeny:9_999_999}});assert.equal(forged.status,403);
  const levels=await put(t,cookie,{revision:after.revision,data:{...after.data,journeys:{...after.data.journeys,sword:{...after.data.journeys.sword,base:150}}}});
  assert.equal(levels.status,403);
 }finally{t.child.kill();fs.rmSync(t.dir,{recursive:true,force:true})}
});
test('V22.3: STRICT_ONLINE_PROGRESS=2 mantém o bloqueio total antigo',async()=>{
 const t=await start({STRICT_ONLINE_PROGRESS:'2'});
 try{
  const {cookie,snap}=await account(t,'lockedpl');
  const r=await put(t,cookie,{revision:snap.revision,data:{...snap.data,zeny:10}});assert.equal(r.status,403);
  const settings=await put(t,cookie,{revision:snap.revision,data:{...snap.data,muted:true}});assert.equal(settings.status,200);
 }finally{t.child.kill();fs.rmSync(t.dir,{recursive:true,force:true})}
});
