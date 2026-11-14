const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
async function launch(dataDir){
 const port=24000+Math.floor(Math.random()*15000);
 const child=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,PORT:String(port),HOST:'127.0.0.1',DATA_DIR:dataDir,ALLOW_GUEST_MULTIPLAYER:'0',MIDGARD_AUTO_UPDATE:'0'},stdio:'ignore'});
 const base='http://127.0.0.1:'+port;
 for(let i=0;i<120;i++){try{if((await fetch(base+'/api/health')).ok)return {child,base}}catch{}await new Promise(r=>setTimeout(r,50));}
 child.kill();throw new Error('Timeout');
}
async function post(base,route,data,cookie=''){
 const res=await fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json','X-Midgard-Request':'1',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(data)});
 return {status:res.status,data:await res.json().catch(()=>({})),cookie:res.headers.get('set-cookie')?.split(';')[0]};
}

test('V25.10: qualquer jogador sai da run online guardando o progresso; o grupo continua',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'midgard-leave-'));const {child,base}=await launch(dir);
 try{
  const cookies=[];
  for(let i=0;i<2;i++){const r=await post(base,'/api/auth/register',{username:'saida'+i,email:'saida'+i+'@example.test',nickname:'Saída '+i,password:'senha-de-teste-segura-25'});assert.equal(r.status,201);cookies.push(r.cookie);}
  const lead=await post(base,'/api/coop/rooms',{profile:{name:'A',job:'sword'},config:{map:'sewer',difficulty:'easy'}},cookies[0]);
  const mate=await post(base,'/api/coop/rooms/'+lead.data.code+'/join',{profile:{name:'B',job:'archer'}},cookies[1]);
  await post(base,'/api/coop/rooms/'+lead.data.code+'/ready',{token:mate.data.token,ready:true},cookies[1]);
  assert.equal((await post(base,'/api/coop/rooms/'+lead.data.code+'/start',{token:lead.data.token},cookies[0])).status,200);
  await new Promise(r=>setTimeout(r,2500)); // a run anda um pouco (tempo de partida conta EXP)
  const before=await (await fetch(base+'/api/account/progress',{headers:{Cookie:cookies[1]}})).json();
  // o jogador que NÃO é o líder sai salvando
  const left=await post(base,'/api/coop/rooms/'+lead.data.code+'/leave',{token:mate.data.token,save:true},cookies[1]);
  assert.equal(left.status,200);assert.equal(left.data.saved,true);
  const awards=await (await fetch(base+'/api/account/coop-rewards',{headers:{Cookie:cookies[1]}})).json();
  assert.equal(awards.awards.length,1,'prêmio registrado para quem saiu');
  const after=await (await fetch(base+'/api/account/progress',{headers:{Cookie:cookies[1]}})).json();
  assert.ok(after.revision>before.revision,'progresso da conta atualizado');
  // a sala continua com o líder jogando
  const sync=await post(base,'/api/coop/rooms/'+lead.data.code+'/sync',{token:lead.data.token},cookies[0]);
  assert.equal(sync.status,200);assert.equal(sync.data.phase,'playing');assert.equal(sync.data.members.length,1);
  // sair sem salvar continua possível (sem prêmio)
  const plain=await post(base,'/api/coop/rooms/'+lead.data.code+'/leave',{token:lead.data.token},cookies[0]);
  assert.equal(plain.data.saved,false);
  const leadAwards=await (await fetch(base+'/api/account/coop-rewards',{headers:{Cookie:cookies[0]}})).json();
  assert.equal(leadAwards.awards.length,0);
 }finally{child.kill('SIGTERM');fs.rmSync(dir,{recursive:true,force:true});}
});

test('V25.10: botão "Sair da run e salvar" para todos no online; cartas 10× mais raras no infinito',()=>{
 assert.match(read('game.js'),/Sair da run sozinho e salvar/);
 assert.match(read('coop.js'),/async function leaveSaving\(\)/);
 assert.match(read('engine/core.mjs'),/\*\(world\.endless\?\.1:1\)\)\{/);
});

test('V25.11: personagem travado na sala, só o líder encerra o infinito para todos, item do MVP não some no merge',()=>{
 const game=read('game.js'),server=read('server.mjs');
 assert.match(game,/function roomLocked\(\)/);
 assert.match(game,/if \(id !== selected && roomLocked\(\)\)/);
 assert.match(server,/if\(me\.id!==room\.hostId&&data\.input\.endRun\)/);
 assert.match(server,/if\(me\.id!==room\.hostId&&msg\.input\.endRun\)/);
 assert.match(game,/Sair da run sozinho e salvar/);
 assert.match(game,/\.\.\.\(Array\.isArray\(server\.items\)\?\{items:server\.items\}:\{\}\)/);
 assert.match(server,/grantMember\(room,me,!!room\.world\.endless\)/);
});
