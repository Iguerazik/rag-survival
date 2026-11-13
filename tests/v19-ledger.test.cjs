const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawn}=require('node:child_process');
async function start(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'midgard-ledger-'));
 const port=31000+Math.floor(Math.random()*9000);
 const child=spawn(process.execPath,['server.mjs'],{cwd:path.join(__dirname,'..'),env:{...process.env,PORT:String(port),DATA_DIR:dir,HOST:'127.0.0.1',STRICT_ONLINE_PROGRESS:'1'},stdio:'ignore'});
 const base='http://127.0.0.1:'+port;
 for(let i=0;i<100;i++){try{if((await fetch(base+'/api/health')).ok)return {dir,child,base};}catch{}await new Promise(r=>setTimeout(r,40))}
 child.kill();throw new Error('Servidor não iniciou');
}
async function register(base,user){
 const r=await fetch(base+'/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json','X-Midgard-Request':'1'},body:JSON.stringify({username:user,email:user+'@example.test',nickname:'Nick '+user,password:'Senha-super-segura-1234567'})});
 assert.equal(r.status,201);return r.headers.get('set-cookie').split(';')[0];
}
test('V19: recompensas idempotentes; saldo e desbloqueio por linhagem persistem em SQLite',async()=>{
 const t=await start();
 try{
  const cookie=await register(t.base,'playerledger');
  // O grant de partidas terminadas só existe como função interna do backend.
  const mod=await import('../accounts.mjs');const a=mod.accountStore(t.dir);
  const id=a.current({headers:{cookie}})?.id;
  assert.ok(id);
  const reward={zeny:90,kills:18,level:5,map:'sewer',difficulty:'normal',line:'archer',win:true,cards:['poring']};
  assert.equal(a.grantCoop(id,'run-1',reward),true);
  assert.equal(a.grantCoop(id,'run-1',reward),false);
  let snap=a.snapshot(id);assert.equal(snap.data.zeny,90);assert.equal(snap.data.album.poring,1);
  assert.equal(snap.data.campaign.archer.cleared.sewer,true);
  assert.equal(snap.data.campaign.sword,undefined);
  // V22.2: a partida online também dá EXP de Base/Classe ao personagem da linhagem usada.
  assert.ok(snap.data.journeys.archer.base>1,'Base subiu');assert.ok(snap.data.journeys.archer.job>1,'Classe subiu');
  assert.equal(snap.data.journeys.archer.proofs,1);assert.equal(snap.data.journeys.sword.base,1);
  let history=await fetch(t.base+'/api/account/coop-rewards',{headers:{Cookie:cookie}});
  assert.equal((await history.json()).awards.length,1);
  const forged=await fetch(t.base+'/api/account/progress',{method:'PUT',headers:{'Content-Type':'application/json','X-Midgard-Request':'1',Cookie:cookie},body:JSON.stringify({revision:snap.revision,data:{...snap.data,zeny:990000,campaign:{}}})});
  assert.equal(forged.status,403);
  assert.equal(a.snapshot(id).data.zeny,90);
  assert.equal(a.grantCoop(id,'run-2',{...reward,seconds:600,kills:120}),true);
  assert.ok(a.snapshot(id).data.journeys.archer.base>snap.data.journeys.archer.base,'EXP acumula entre partidas');
 } finally {t.child.kill();fs.rmSync(t.dir,{recursive:true,force:true});}
});
