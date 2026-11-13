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

test('V24.2: painel do administrador — quem está online (presença do menu/solo, conta x convidado, salas)',async()=>{
 const data=fs.mkdtempSync(path.join(os.tmpdir(),'rag-online-'));
 const s=await start(data,{ADMIN_TOKEN:TOKEN});
 const H={'Content-Type':'application/json','X-Midgard-Request':'1'};
 try{
  assert.equal((await fetch(s.base+'/api/admin/online')).status,401,'sem token não mostra nada');
  // convidado no menu
  assert.equal((await fetch(s.base+'/api/presence',{method:'POST',headers:H,body:JSON.stringify({id:'guest-abcdef12',mode:'menu'})})).status,200);
  assert.equal((await fetch(s.base+'/api/presence',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:'guest-abcdef12'})})).status,403,'exige o cabeçalho do jogo');
  // conta logada jogando solo
  const reg=await register(s.base,7);assert.equal(reg.status,201);const cookie=reg.headers.get('set-cookie').split(';')[0];
  await fetch(s.base+'/api/presence',{method:'POST',headers:{...H,Cookie:cookie},body:JSON.stringify({id:'acct-12345678',mode:'solo',map:'sewer',line:'mage',difficulty:'normal',level:12})});
  // sala criada
  const room=await (await fetch(s.base+'/api/coop/rooms',{method:'POST',headers:{...H,Cookie:cookie},body:JSON.stringify({profile:{name:'Amigo',job:'sword'},config:{map:'sewer',difficulty:'normal'}})})).json();
  const v=await (await fetch(s.base+'/api/admin/online',{headers:auth})).json();
  assert.equal(v.totals.open,2);assert.equal(v.totals.accounts,1);assert.equal(v.totals.guests,1);assert.equal(v.totals.solo,1);
  const acct=v.people.find(p=>p.account);assert.equal(acct.username,'conta7');assert.equal(acct.mode,'solo');assert.equal(acct.map,'sewer');assert.equal(acct.level,12);
  assert.ok(v.people.some(p=>!p.account&&p.mode==='menu'&&/^Convidado/.test(p.name)));
  assert.ok(room.code,'sala criada');{assert.equal(v.rooms.length,1);assert.equal(v.rooms[0].members[0].account,true);assert.equal(v.rooms[0].phase,'lobby');assert.equal(v.rooms[0].members[0].host,true);}
  assert.ok(v.server.tick&&v.server.memoryMb>0);
  assert.ok(!JSON.stringify(v).includes('127.0.0.1'),'sem IPs no painel');
  // página do painel é servida
  const page=await fetch(s.base+'/admin.html');assert.equal(page.status,200);assert.match(await page.text(),/noindex/);
 }finally{s.child.kill();await new Promise(r=>s.child.once('exit',r));fs.rmSync(data,{recursive:true,force:true});}
});
