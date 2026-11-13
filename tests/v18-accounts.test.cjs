const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
async function launch(dataDir){
 const port=24000+Math.floor(Math.random()*15000);
 const env={...process.env,PORT:String(port),HOST:'127.0.0.1',DATA_DIR:dataDir,ALLOW_GUEST_MULTIPLAYER:'0',STRICT_ONLINE_PROGRESS:'0'};
 const child=spawn(process.execPath,['server.mjs'],{cwd:root,env,stdio:'ignore'});
 const base='http://127.0.0.1:'+port;
 for(let i=0;i<120;i++){
  try{if((await fetch(base+'/api/health')).ok)return {child,base}}catch{}
  if(child.exitCode!==null)throw new Error('O servidor encerrou na inicialização');
  await new Promise(resolve=>setTimeout(resolve,50));
 }
 child.kill();throw new Error('Timeout inicializando servidor');
}
async function post(base,route,data,cookie='',method='POST',extras={}){
 const res=await fetch(base+route,{method,headers:{'Content-Type':'application/json','X-Midgard-Request':'1',...(cookie?{Cookie:cookie}:{}),...extras},body:JSON.stringify(data)});
 return {status:res.status,data:await res.json(),cookie:res.headers.get('set-cookie')?.split(';')[0]};
}
const guest={items:[],journeys:{sword:{stage:0,base:12,job:10}},zeny:735,campaign:{},codexCoins:12};
test('V18: cadastro, senha protegida, sessão, nick único, salvamento, conflito, logout, persistência no reinício',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'midgard-v18-'));
 let {child,base}=await launch(directory);
 try{
  let res=await post(base,'/api/coop/rooms',{profile:{name:'Intruso'}});assert.equal(res.status,401);
  res=await post(base,'/api/auth/register',{username:'roguser',email:'ro@example.com',nickname:'Guerreiro <script>',password:'longa-senha-ro-123'});assert.equal(res.status,400);
  res=await post(base,'/api/auth/register',{username:'roguser',email:'ro@example.com',nickname:'Guerreiro Azul',password:'curta'});assert.equal(res.status,400);
  const one=await post(base,'/api/auth/register',{username:'roguser',email:'ro@example.com',nickname:'Guerreiro Azul',password:'longa-senha-ro-123'});
  assert.equal(one.status,201,JSON.stringify(one));const cookie=one.cookie;
  assert.ok(cookie?.startsWith('midgard_sid='));
  const sqliteFile=path.join(directory,'midgard.sqlite');assert.ok(fs.statSync(sqliteFile).size>0);
  const dbRaw=fs.readFileSync(sqliteFile).toString('latin1');assert.equal(dbRaw.includes('longa-senha-ro-123'),false);
  assert.equal((await post(base,'/api/auth/register',{username:'roguser2',email:'ro2@example.com',nickname:'guerreiro azul',password:'longa-senha-ro-123'})).status,409);
  const wrong=await post(base,'/api/auth/login',{username:'roguser',password:'wrong-password-12'});assert.equal(wrong.status,401);
  const login=await post(base,'/api/auth/login',{username:'ROGUSER',password:'longa-senha-ro-123'});assert.equal(login.status,200);assert.notEqual(login.cookie,cookie);
  const me=await (await fetch(base+'/api/auth/me',{headers:{Cookie:cookie}})).json();assert.equal(me.account.nickname,'Guerreiro Azul');assert.equal(me.progress.revision,0);
  let save=await post(base,'/api/account/progress',{revision:0,data:guest},cookie,'PUT');assert.equal(save.status,200);assert.equal(save.data.revision,1);
  save=await post(base,'/api/account/progress',{revision:0,data:{zeny:0}},cookie,'PUT');assert.equal(save.status,409);
  assert.equal((await post(base,'/api/account/progress',{revision:1,data:{secretKey:'hack'}},cookie,'PUT')).status,400);
  const data=await (await fetch(base+'/api/account/progress',{headers:{Cookie:cookie}})).json();assert.equal(data.data.zeny,735);assert.equal(data.revision,1);
  const html=await (await fetch(base+'/',{headers:{Cookie:cookie}})).text();assert.match(html,/"nickname":"Guerreiro Azul"/);assert.match(html,/"zeny":735/);
  const cross=await post(base,'/api/account/progress',{revision:1,data:{zeny:0}},cookie,'PUT',{Origin:'https://attacker.invalid'});assert.equal(cross.status,403);
  const reqNoHeader=await fetch(base+'/api/account/progress',{method:'PUT',headers:{Cookie:cookie,'Content-Type':'application/json'},body:'{}'});assert.equal(reqNoHeader.status,403);
  const secretFile=await fetch(base+'/data/midgard.sqlite');assert.equal(secretFile.status,404);
  const scriptFile=await fetch(base+'/accounts.mjs');assert.equal(scriptFile.status,404);
  const coop=await post(base,'/api/coop/rooms',{profile:{name:'Falso nome',job:'archer'}},cookie);
  assert.equal(coop.status,200);const room=await post(base,'/api/coop/rooms/'+coop.data.code+'/sync',{token:coop.data.token},cookie);
  assert.equal(room.data.members[0].profile.name,'Guerreiro Azul');
  const dup=await post(base,'/api/coop/rooms/'+coop.data.code+'/join',{profile:{name:'Duplicado'}},cookie);assert.equal(dup.status,409);
  const logout=await post(base,'/api/auth/logout',{},cookie);assert.equal(logout.status,200);
  assert.equal((await post(base,'/api/account/progress',{revision:1,data:guest},cookie,'PUT')).status,401);
  child.kill();await new Promise(resolve=>child.once('exit',resolve));
  ({child,base}=await launch(directory));
  const after=await post(base,'/api/auth/login',{username:'roguser',password:'longa-senha-ro-123'});assert.equal(after.status,200);
  const pers=await (await fetch(base+'/api/account/progress',{headers:{Cookie:after.cookie}})).json();assert.equal(pers.data.zeny,735);assert.equal(pers.revision,1);
 }finally{child.kill('SIGTERM');fs.rmSync(directory,{recursive:true,force:true})}
});
test('V18: seis contas distintas compartilham sala; nick vem da conta e token de outra conta não serve',async()=>{
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'midgard-v18-six-'));
 const {child,base}=await launch(directory);
 try{
   const cookies=[];
   for(let i=0;i<6;i++){
    const registered=await post(base,'/api/auth/register',{username:'player'+i,email:'player'+i+'@example.test',nickname:'Herói '+i,password:'senha-de-teste-segura-18'});
    assert.equal(registered.status,201);cookies.push(registered.cookie);
   }
   const lead=await post(base,'/api/coop/rooms',{profile:{name:'Trollando',job:'sword'},config:{map:'sewer',difficulty:'easy'}},cookies[0]);
   assert.equal(lead.status,200);
   const teammates=[];
   for(let i=1;i<6;i++){
    const joined=await post(base,'/api/coop/rooms/'+lead.data.code+'/join',{profile:{name:'FALSO'+i,job:'archer'}},cookies[i]);
    assert.equal(joined.status,200);teammates.push(joined.data);
   }
   const overflow=await post(base,'/api/coop/rooms/'+lead.data.code+'/join',{profile:{name:'Trol'}},cookies[0]);assert.equal(overflow.status,409);
   assert.equal((await post(base,'/api/coop/rooms/'+lead.data.code+'/sync',{token:lead.data.token},cookies[1])).status,401);
   for(let i=1;i<6;i++) assert.equal((await post(base,'/api/coop/rooms/'+lead.data.code+'/ready',{token:teammates[i-1].token,ready:true},cookies[i])).status,200);
   const game=await post(base,'/api/coop/rooms/'+lead.data.code+'/start',{token:lead.data.token},cookies[0]);
   assert.equal(game.status,200);assert.deepEqual(game.data.members.map(m=>m.profile.name),Array.from({length:6},(_,i)=>'Herói '+i));
   assert.equal((await post(base,'/api/account/progress',{revision:0,data:{zeny:45}},cookies[0],'PUT')).status,200);
   const other=await (await fetch(base+'/api/account/progress',{headers:{Cookie:cookies[1]}})).json();assert.equal(other.data.zeny,0);
 }finally{child.kill('SIGTERM');fs.rmSync(directory,{recursive:true,force:true})}
});
