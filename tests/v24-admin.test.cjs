// V24: backup/restauração do banco por ADMIN_TOKEN (migração das contas para o Railway sem perder progresso).
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const root=path.join(__dirname,'..');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const TOKEN='t'.repeat(40);
async function start(data,extra={}){
 const port=30000+Math.floor(Math.random()*15000);
 const child=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,PORT:String(port),HOST:'127.0.0.1',DATA_DIR:data,MIDGARD_AUTO_UPDATE:'0',...extra},stdio:'ignore'});
 const base='http://127.0.0.1:'+port;
 for(let i=0;i<120;i++){try{if((await fetch(base+'/api/health')).ok)return {child,base}}catch{}await sleep(40)}
 child.kill();throw new Error('Servidor não iniciou');
}
const auth={Authorization:'Bearer '+TOKEN};
const register=(base,n)=>fetch(base+'/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json','X-Midgard-Request':'1'},body:JSON.stringify({username:'conta'+n,email:`c${n}@example.com`,nickname:'Conta '+n,password:'senha-longa-123'})});

test('V24: API administrativa fica desligada sem ADMIN_TOKEN e recusa token errado',async()=>{
 const data=fs.mkdtempSync(path.join(os.tmpdir(),'rag-admin-'));
 let s=await start(data);
 try{assert.equal((await fetch(s.base+'/api/admin/status',{headers:auth})).status,404);}finally{s.child.kill();await new Promise(r=>s.child.once('exit',r));}
 s=await start(data,{ADMIN_TOKEN:TOKEN});
 try{assert.equal((await fetch(s.base+'/api/admin/status',{headers:{Authorization:'Bearer errado'}})).status,401);}
 finally{s.child.kill();await new Promise(r=>s.child.once('exit',r));fs.rmSync(data,{recursive:true,force:true});}
});

test('V24: backup baixa o banco e a restauração migra as contas de outro servidor (sessões antigas descartadas)',async()=>{
 const a=fs.mkdtempSync(path.join(os.tmpdir(),'rag-admin-a-')),b=fs.mkdtempSync(path.join(os.tmpdir(),'rag-admin-b-'));
 let s=await start(a,{ADMIN_TOKEN:TOKEN});let file;
 try{
  for(const n of [1,2,3])assert.equal((await register(s.base,n)).status,201);
  const r=await fetch(s.base+'/api/admin/backup',{headers:auth});assert.equal(r.status,200);
  const bytes=Buffer.from(await r.arrayBuffer());assert.equal(bytes.subarray(0,16).toString('latin1'),'SQLite format 3\u0000');
  file=path.join(os.tmpdir(),'rag-admin-'+Date.now()+'.sqlite');fs.writeFileSync(file,bytes);
  assert.deepEqual(fs.readdirSync(a).filter(f=>f.startsWith('backup-tmp-')),[],'cópia temporária apagada');
 }finally{s.child.kill();await new Promise(r=>s.child.once('exit',r));}
 s=await start(b,{ADMIN_TOKEN:TOKEN});
 try{
  assert.equal((await fetch(s.base+'/api/admin/restore',{method:'POST',headers:auth,body:'nao e sqlite'})).status,400);
  const exited=new Promise(r=>s.child.once('exit',code=>r(code)));
  const res=await fetch(s.base+'/api/admin/restore',{method:'POST',headers:auth,body:fs.readFileSync(file)});
  assert.equal(res.status,202);assert.equal(await exited,75,'reinicia com código 75');
  s=await start(b,{ADMIN_TOKEN:TOKEN});
  const st=await (await fetch(s.base+'/api/admin/status',{headers:auth})).json();
  assert.equal(st.accounts,3);assert.equal(st.progress,3);
  assert.ok(fs.readdirSync(path.join(b,'backups')).some(f=>f.startsWith('antes-da-restauracao-')),'banco anterior guardado');
  // apagar contas de teste pelo nome (progresso e recordes saem junto)
  const del=await (await fetch(s.base+'/api/admin/delete-accounts',{method:'POST',headers:{...auth,'Content-Type':'application/json'},body:JSON.stringify({usernames:['conta3','nao_existe']})})).json();
  assert.deepEqual(del,{requested:2,removed:1});
  const st2=await (await fetch(s.base+'/api/admin/status',{headers:auth})).json();assert.equal(st2.accounts,2);assert.equal(st2.progress,2);
  const login=await fetch(s.base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json','X-Midgard-Request':'1'},body:JSON.stringify({username:'conta2',password:'senha-longa-123'})});
  assert.equal(login.status,200,'a conta migrada entra com a mesma senha');
 }finally{s.child.kill();await new Promise(r=>s.child.once('exit',r));for(const d of [a,b])fs.rmSync(d,{recursive:true,force:true});if(file)fs.rmSync(file,{force:true});}
});
