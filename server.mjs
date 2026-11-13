/**
 * RAG SURVIVAL (antigo Ecos de Rune-Midgard) — simulação autoritativa do combate no servidor.
 * O servidor valida os comandos, simula o mundo e distribui recompensas.
 * Módulo multiplayer ainda em beta: nem todas as regras solo foram migradas.
 */
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { accountStore } from './accounts.mjs';
import { makeWorld, command, tickWorld, snapshotWorld, inputView, clock } from './authoritative-world.mjs';
import { acceptWebSocket } from './ws.mjs';
import { gearForAccount } from './server-gear.mjs';
import { petFromSave } from './engine/core.mjs';
import { readFileSync, mkdirSync } from 'node:fs';
const fs_mkdir=dir=>mkdirSync(dir,{recursive:true,mode:0o700});
const APP_VERSION=JSON.parse(readFileSync(new URL('./package.json',import.meta.url),'utf8')).version;
const APP_NAME='RAG SURVIVAL';
import { applyPendingRestore, adminRoutes } from './data-admin.mjs';
const DATA_ROOT=process.env.DATA_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)),'data');
fs_mkdir(DATA_ROOT);
applyPendingRestore(DATA_ROOT); // V24: troca do banco enviado por /api/admin/restore (o anterior vai para backups/)
const accounts=accountStore(DATA_ROOT);
const ALLOW_GUEST_MULTIPLAYER=process.env.ALLOW_GUEST_MULTIPLAYER==='1';
const TEST_WIN_AT=Number(process.env.MIDGARD_TEST_WIN_AT)||0;

const root=path.dirname(fileURLToPath(import.meta.url));
const PORT=Number(process.env.PORT||3000);
const BIND=process.env.HOST||'0.0.0.0';
const MAX_PLAYERS=6;
const MEMBER_TTL=30_000;
const LOBBY_TTL=6*3_600_000; // salas no lobby expiram; partidas em andamento vivem enquanto houver jogadores
const MAX_ROOMS=Number(process.env.MAX_ROOMS||150);
const MAPS=new Set(['sewer','payon','maze','orc','geffen','payonfield','glast','mine','temple','shadow']);
const DIFFICULTIES=new Set(['easy','normal','hard','nightmare']);
const ORDER=['sewer','payon','maze','orc','geffen','payonfield','glast','mine','temple','shadow'];
const PATCH='24.0';
// V24: simulação a 60 ticks/s (TICK_RATE) e snapshots de rede a 20/s (SNAPSHOT_RATE), como antes.
// Os prazos do motor seguem a grade de 50 ms da V23 (timerGrid), então o ritmo do jogo não muda.
const TICK_RATE=Math.max(20,Math.min(120,Math.round(Number(process.env.TICK_RATE)||60)));
const SNAPSHOT_RATE=Math.max(5,Math.min(TICK_RATE,Math.round(Number(process.env.SNAPSHOT_RATE)||20)));
const TICK_STEP=1/TICK_RATE;
const SNAP_EVERY=Math.max(1,Math.round(TICK_RATE/SNAPSHOT_RATE)); // ticks entre dois snapshots (60/20 = 3)
const WORLD_OPTS=TICK_STEP<.05-1e-9?{timerGrid:.05}:{};
const DATA_DIR=process.env.DATA_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)),'data');
function canEnter(member,map,difficulty){
 if(!member.userId)return ALLOW_GUEST_MULTIPLAYER;
 const record=accounts.snapshot(member.userId).data||{};
 const line=member.profile.job;
 const campaign=record.campaign?.[line]||{};
 const prev=ORDER[ORDER.indexOf(map)-1];
 if(prev && !campaign.cleared?.[prev])return false;
 if(difficulty==='hard'&&!ORDER.every(id=>campaign.clearsByDifficulty?.normal?.[id]))return false;
 if(difficulty==='nightmare'&&!ORDER.every(id=>campaign.clearsByDifficulty?.hard?.[id]))return false;
 return true;
}

const rooms=new Map();
const MIME={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.gif':'image/gif','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon','.ogg':'audio/ogg','.mp3':'audio/mpeg','.wav':'audio/wav','.md':'text/markdown'};
const makeId=()=>randomBytes(18).toString('hex');
const allowedNumber=(v,limit=100_000)=>Number.isFinite(Number(v))?Math.min(limit,Math.max(-limit,Number(v))):0;
const cleanName=s=>String(s||'Aventureiro').replace(/[<>\r\n\x00-\x1f]/g,'').trim().slice(0,24)||'Aventureiro';
const JOB_ALIASES={knight:'sword',highsword:'sword',lordknight:'sword',runeknight:'sword',
 wizard:'mage',highmage:'mage',highwizard:'mage',warlock:'mage',hunter:'archer',higharcher:'archer',sniper:'archer',ranger:'archer',
 priest:'acolyte',highacolyte:'acolyte',highpriest:'acolyte',archbishop:'acolyte',
 blacksmith:'merchant',highmerchant:'merchant',whitesmith:'merchant',mechanic:'merchant',
 assassin:'thief',highthief:'thief',assassincross:'thief',guillotine:'thief'};
const cleanId=p=>String(p||'sword').replace(/[^a-z0-9_]/gi,'').slice(0,32);
const profile=p=>{const raw=cleanId(p?.job),job=JOB_ALIASES[raw]||raw;
 return {name:cleanName(p?.name),job:['sword','mage','archer','acolyte','merchant','thief'].includes(job)?job:'sword',
 classId:cleanId(p?.classId||raw)};};
function code(){const alphabet='ABCDEFGHJKMNPQRSTUVWXYZ23456789';let value;do{value=Array.from(randomBytes(6),v=>alphabet[v%alphabet.length]).join('')}while(rooms.has(value));return value}
function send(res,status,obj){
 const payload=JSON.stringify(obj);
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Accept-Encoding'};
 // Cooperative world snapshots are often 20-100 kB; low-level gzip reduces tunnel traffic.
 if(payload.length>2000 && /\bgzip\b/.test(String(res.req?.headers['accept-encoding']||''))){
  headers['Content-Encoding']='gzip';res.writeHead(status,headers);res.end(gzipSync(payload,{level:1}));
 }else{res.writeHead(status,headers);res.end(payload)}
}
async function readJson(req){let buffer='',size=0;for await(const chunk of req){size+=chunk.length;if(size>1_000_000)throw new Error('Payload muito grande');buffer+=chunk.toString('utf8')}return JSON.parse(buffer||'{}')}
function removeMember(room,id){
 const member=room.members.get(id);if(!member)return;
 room.members.delete(id);
 // Etapa 5: saiu antes do fim → sem prêmio, mas asas e poções usadas são descontadas da conta (sem duplicar itens).
 const p=room.world?.players.get(id);
 if(p&&member.userId&&!room.world.finished){try{accounts.spendConsumables(member.userId,{wings:p.wingsUsed,potionsUsed:p.potionsUsed});}catch(err){console.error('Falha ao descontar itens usados:',err);}}
 if(room.world)room.world.players.delete(id);
 try{member.ws?.close(4001)}catch{}
 // Se o líder sair, a liderança passa para o próximo jogador em vez de derrubar a sala inteira.
 if(id===room.hostId&&room.members.size){const next=room.members.values().next().value;room.hostId=next.id;next.ready=true;}
}
function prune(room){
 const now=Date.now();
 for(const [id,member] of room.members){
  // Uma conexão WebSocket aberta mantém o jogador vivo mesmo sem enviar comandos.
  if(member.ws?.open&&now-member.ws.lastSeen<40_000)member.updated=Math.max(member.updated,now-MEMBER_TTL+5_000);
  if(now-member.updated>MEMBER_TTL)removeMember(room,id);
 }
 return room.members.size>0;
}
function roomExpired(room){return !prune(room)||(room.phase==='lobby'&&Date.now()-room.created>LOBBY_TTL)}
function findRoom(roomCode){const room=rooms.get(roomCode);if(!room)return null;if(roomExpired(room)){closeRoom(room);return null}return room}
function closeRoom(room){for(const m of room.members.values())try{m.ws?.close(4004)}catch{};rooms.delete(room.code)}
function findMember(room,secret){for(const p of room.members.values())if(p.token===secret)return p;return null}
function validSettings(settings,current){return {
  map:MAPS.has(settings?.map)?settings.map:current.map,
  difficulty:DIFFICULTIES.has(settings?.difficulty)?settings.difficulty:current.difficulty,
};}
function summary(room,requesterId=null,sinceEvent=0,opts={}){
 const world=room.world;
 return {code:room.code,phase:room.phase,config:room.config,
  world:world?snapshotWorld(world,requesterId,sinceEvent,opts):null,capacity:MAX_PLAYERS,hostId:room.hostId,
  members:[...room.members.values()].map(m=>({id:m.id,profile:m.profile,ready:m.ready,
    input:world?inputView(world,m.id):null}))};
}
/** Personagem da conta (nível de Base, atributos, estágio, provas) usado pelo servidor na partida. */
function characterOf(member){
 if(!member.userId)return null;
 const data=accounts.snapshot(member.userId).data||{},j=data.journeys?.[member.profile.job];
 // V23: equipamento e cartas também vêm da CONTA, somados pelo mesmo items.js/cards.js do navegador.
 let gear=null;try{gear=gearForAccount(data,member.profile.job);}catch(error){console.error('Falha ao ler equipamento:',error);}
 // Etapa 3: pet ativo e melhorias também vêm da CONTA (o motor calcula bônus e alcance pela tabela de pets).
 // Etapa 5: asas, poções compradas e a Asa de Mosca automática também vêm da conta.
 return j&&typeof j==='object'?{base:j.base,stats:j.stats,stage:j.stage,guildTrials:j.guildTrials,gear,pet:petFromSave(data),
  wings:data.wings||{},potions:data.healPotions||0,flyConfig:data.flyConfig||{}}:null;
}
const partyOf=room=>[...room.members.values()].map(member=>({...member,character:characterOf(member)}));
function grantFinalRewards(room){
 if(!room.world?.finished||room.rewarded)return;
 let failed=false;
 for(const member of room.members.values()){
  const p=room.world.players.get(member.id);
  if(member.userId&&p){try{accounts.grantCoop(member.userId,room.world.id,{
   zeny:p.zeny,kills:p.kills,level:p.level,map:room.config.map,difficulty:room.config.difficulty,seconds:clock(room.world),
   line:p.job,win:room.world.won,cards:p.cards,rifts:room.world.riftsDone||0,trial:p.trialDone,
   discoveries:{...p.discoveries,active:p.evolutions},item:room.world.won?p.mvpItem||null:null,
   wings:{gained:p.wingsGained,used:p.wingsUsed},potionsUsed:p.potionsUsed});}catch(err){failed=true;console.error('Falha ao registrar recompensa co-op:',err);}}
 }
 if(!failed){room.rewarded=true;room.phase='ended';}
}
async function roomsApi(req,res,parts){
 const account=accounts.current(req);
 if(!account && !ALLOW_GUEST_MULTIPLAYER)return send(res,401,{error:'Faça login para criar ou entrar em uma sala online.'});
 // V23.6: lista de salas abertas (ainda no lobby e com vaga) para entrar sem digitar o código.
 if(req.method==='GET'&&parts.length===0){
   const open=[...rooms.values()].filter(r=>r.phase==='lobby'&&r.members.size<MAX_PLAYERS&&r.members.size>0).map(r=>{
     const host=r.members.get(r.hostId);
     return {code:r.code,host:host?.profile?.name||'Aventureiro',players:r.members.size,capacity:MAX_PLAYERS,map:r.config.map,difficulty:r.config.difficulty,created:r.created};
   }).sort((a,b)=>b.created-a.created).slice(0,30).map(({created,...r})=>r);
   return send(res,200,{rooms:open});
 }
 if(req.method!=='POST')return send(res,405,{error:'Método não permitido'});
 let data;try{data=await readJson(req)}catch{return send(res,400,{error:'JSON inválido ou muito grande'})}
 if(parts.length===0){
   if(rooms.size>=MAX_ROOMS)return send(res,503,{error:'Limite de salas atingido'});
   const roomCode=code(),id=makeId(),secret=makeId();
   const room={code:roomCode,hostId:id,phase:'lobby',config:{map:'sewer',difficulty:'easy'},world:null,created:Date.now(),tick:0,
     members:new Map([[id,{id,token:secret,userId:account?.id||null,profile:{...profile(data.profile),name:account?.nickname||profile(data.profile).name},ready:true,input:null,updated:Date.now()}]])};
   room.config=validSettings(data.config,room.config);
   rooms.set(roomCode,room);
   return send(res,200,{code:roomCode,id,token:secret,capacity:MAX_PLAYERS});
 }
 const [roomCode,action]=parts,room=findRoom(roomCode);
 if(!room)return send(res,404,{error:'Sala não encontrada ou encerrada'});
 if(action==='join'){
   if(room.phase!=='lobby')return send(res,409,{error:'A partida já começou'});
   if(room.members.size>=MAX_PLAYERS)return send(res,409,{error:'Sala cheia (até seis pessoas)'});
   if(account&&[...room.members.values()].some(m=>m.userId===account.id))return send(res,409,{error:'Esta conta já entrou na sala.'});
   const id=makeId(),secret=makeId();
   room.members.set(id,{id,token:secret,userId:account?.id||null,profile:{...profile(data.profile),name:account?.nickname||profile(data.profile).name},ready:false,input:null,updated:Date.now()});
   return send(res,200,{code:roomCode,id,token:secret,capacity:MAX_PLAYERS});
 }
 const me=findMember(room,data.token);
 if(!me || me.userId!==(account?.id||null))return send(res,401,{error:'Sessão da sala inválida'});
 me.updated=Date.now();
 if(action==='leave'){
   removeMember(room,me.id);
   if(!room.members.size)closeRoom(room);
   return send(res,200,{ok:true});
 }
 if(action==='settings'){
   if(me.id!==room.hostId)return send(res,403,{error:'Só o líder escolhe mapa e dificuldade'});
   if(room.phase!=='lobby')return send(res,409,{error:'A partida já começou'});
   const next=validSettings(data.config,room.config);
   if(next.map!==room.config.map||next.difficulty!==room.config.difficulty){
     room.config=next;
     for(const member of room.members.values())member.ready=member.id===room.hostId;
   }
   return send(res,200,summary(room));
 }
 if(action==='ready'){
   if(room.phase!=='lobby')return send(res,409,{error:'A partida já começou'});
   me.ready=me.id===room.hostId?true:!!data.ready;
   return send(res,200,summary(room));
 }
 if(action==='start'){
   if(me.id!==room.hostId)return send(res,403,{error:'Só o líder pode iniciar'});
   if(updatePending)return send(res,503,{error:'O servidor está terminando uma atualização. Tente de novo em alguns segundos.'});
   if(room.phase!=='lobby')return send(res,409,{error:'A partida já começou'});
   if(room.members.size<2||![...room.members.values()].every(member=>member.ready))
     return send(res,409,{error:'É necessário ter 2 a 6 jogadores prontos'});
   for(const member of room.members.values())if(!canEnter(member,room.config.map,room.config.difficulty))
     return send(res,403,{error:`Mapa ou dificuldade bloqueados para o personagem ${member.profile.name}`});
   room.phase='playing';room.world=makeWorld(room.config.map,room.config.difficulty,partyOf(room),WORLD_OPTS);
   // Somente para testes locais: MIDGARD_TEST_RIFT_AT=10 abre a primeira fenda aos 10 s.
   if(Number(process.env.MIDGARD_TEST_RIFT_AT)>0)room.world.nextRiftAt=Number(process.env.MIDGARD_TEST_RIFT_AT);
   if(Number(process.env.MIDGARD_TEST_MVP_AT)>0)room.world.mvpAt=Number(process.env.MIDGARD_TEST_MVP_AT); // só para testes
   return send(res,200,summary(room));
 }
 if(action==='lobby'){
   // V22.5: depois da partida, a sala volta ao lobby e continua existindo para a próxima.
   if(room.phase==='playing'&&room.world&&!room.world.finished)return send(res,409,{error:'A partida ainda está em andamento'});
   if(room.world?.finished)grantFinalRewards(room);
   if(room.phase!=='lobby'){
     room.lastWon=!!room.world?.won;room.phase='lobby';room.world=null;room.rewarded=false;room.created=Date.now();
     for(const member of room.members.values()){member.ready=member.id===room.hostId;member.input=null;}
   }
   return send(res,200,summary(room));
 }
 if(action==='next'){
   // V22.1: ao fim do mapa o líder leva o grupo para o próximo mapa (vitória) ou tenta de novo.
   if(me.id!==room.hostId)return send(res,403,{error:'Só o líder escolhe o próximo mapa'});
   if(updatePending)return send(res,503,{error:'O servidor está terminando uma atualização. Tente de novo em alguns segundos.'});
   if(room.phase==='playing'&&!room.world?.finished)return send(res,409,{error:'A partida ainda está em andamento'});
   if(room.world?.finished)grantFinalRewards(room);
   const current=room.config.map,index=ORDER.indexOf(current);
   const map=data.mode!=='retry'&&(room.world?.won||(!room.world&&room.lastWon))&&index>=0&&index<ORDER.length-1?ORDER[index+1]:current;
   for(const member of room.members.values())if(!canEnter(member,map,room.config.difficulty))
     return send(res,403,{error:`Mapa bloqueado para o personagem ${member.profile.name}`});
   room.config={...room.config,map};room.rewarded=false;room.phase='playing';
   room.world=makeWorld(map,room.config.difficulty,partyOf(room),WORLD_OPTS);
   if(Number(process.env.MIDGARD_TEST_RIFT_AT)>0)room.world.nextRiftAt=Number(process.env.MIDGARD_TEST_RIFT_AT);
   if(Number(process.env.MIDGARD_TEST_MVP_AT)>0)room.world.mvpAt=Number(process.env.MIDGARD_TEST_MVP_AT); // só para testes
   return send(res,200,summary(room,me.id));
 }
 if(action!=='sync')return send(res,404,{error:'Ação inexistente'});
 if(data.profile&&room.phase==='lobby'){
   const changed={...profile(data.profile),name:account?.nickname||profile(data.profile).name};
   if(me.profile.name!==changed.name||me.profile.job!==changed.job){me.profile=changed;if(me.id!==room.hostId)me.ready=false}
 }
 if(room.phase==='playing'&&data.input&&typeof data.input==='object'){
   command(room.world,me.id,data.input);
   me.input=inputView(room.world,me.id);
 }
 // Informações de mundo, vida, dano, acertos e drop enviadas pelo cliente são ignoradas.
 if(room.world?.finished)grantFinalRewards(room);
 return send(res,200,summary(room,me.id,Number.isSafeInteger(data.input?.eventSeq)?data.input.eventSeq:0));
}
const server=http.createServer(async(req,res)=>{
 try{
   let url;try{url=new URL(req.url,'http://localhost')}catch{return send(res,400,{error:'URL inválida'})}
   const pathname=decodeURIComponent(url.pathname);
   if(req.method!=='GET'&&req.method!=='HEAD'){
     if(!sameOrigin(req)||req.headers['sec-fetch-site']==='cross-site')return send(res,403,{error:'Origem não autorizada'});
   }
   if(pathname.startsWith('/api/auth/')||pathname.startsWith('/api/account/')){
     if(req.method!=='GET'&&req.headers['x-midgard-request']!=='1')return send(res,403,{error:'Requisição não autorizada'});
     return accounts.route(req,res,url);
   }
   if(pathname.startsWith('/api/admin/'))return adminApi(req,res,pathname);
   if(pathname==='/api/version'&&req.method==='GET')return send(res,200,{name:APP_NAME,version:APP_VERSION,patch:PATCH,multiplayer:'servidor-autoritativo',transport:'websocket+http',accounts:true,progress:'sqlite',tickRate:TICK_RATE,snapshotRate:SNAPSHOT_RATE});
   if(pathname==='/api/health'&&req.method==='GET')return send(res,200,{ok:true,patch:PATCH,rooms:rooms.size,playing:[...rooms.values()].filter(r=>r.phase==='playing').length,players:[...rooms.values()].reduce((n,r)=>n+r.members.size,0),uptime:Math.round(process.uptime()),memoryMb:Math.round(process.memoryUsage().rss/1048576),tick:tickStats()});
   if(pathname==='/api/coop/rooms'||pathname.startsWith('/api/coop/rooms/'))
     return roomsApi(req,res,pathname.slice('/api/coop/rooms'.length).split('/').filter(Boolean));
   if(!['GET','HEAD'].includes(req.method))return send(res,405,{error:'Método não permitido'});
   const rel=pathname==='/'?'index.html':pathname.replace(/^\/+/, '');
   const filename=path.resolve(root,rel);
   // No source files outside of public game assets are served.
   const segments=rel.split('/');
   // V23: server-maps.json é público (o motor do solo usa a mesma grade de colisão do online).
   if((rel==='package.json'||rel==='V19_MANIFESTO.json') || segments.some(p=>p.startsWith('.')||p==='tests'||p==='tools'||p==='node_modules'||p==='data'||p==='server'))
     return send(res,404,{error:'Não encontrado'});
   const ext=path.extname(filename);
   // V23: só o motor do jogo (pasta engine/) é entregue como .mjs; o código do servidor nunca.
   if(ext==='.mjs'&&segments[0]!=='engine')return send(res,404,{error:'Não encontrado'});
   if(filename!==root&&!filename.startsWith(root+path.sep)||!MIME[ext])return send(res,404,{error:'Não encontrado'});
   let stat;try{stat=await fs.stat(filename)}catch{return send(res,404,{error:'Arquivo não encontrado'})}
   if(!stat.isFile())return send(res,404,{error:'Arquivo não encontrado'});
   res.writeHead(200,{'Content-Type':MIME[ext],'Cache-Control':/\.(html|m?js|css|json)$/.test(filename)?'no-store':'public, max-age=120','X-Content-Type-Options':'nosniff'});
   if(req.method==='HEAD'){res.end();return}
   if(rel==='index.html'){
     const me=accounts.current(req);
     const boot={account:me,progress:me?accounts.snapshot(me.id):null};
     const encoded=JSON.stringify(boot).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
     const html=(await fs.readFile(filename,'utf8')).replace('<!-- MIDGARD_AUTH_BOOTSTRAP -->','<script>window.MIDGARD_BOOTSTRAP='+encoded+';</script>');
     res.end(html);
   }else res.end(await fs.readFile(filename));
 }catch(error){console.error('server',error);if(!res.headersSent)send(res,500,{error:'Falha interna do servidor'});else res.end()}
});
const adminApi=adminRoutes({dataDir:DATA_ROOT,accounts,send,canRestart:()=>[...rooms.values()].every(idleRoom)});
function sameOrigin(req){
 const origin=req.headers.origin;if(!origin)return true;
 const expected=(req.socket.encrypted?'https':'http')+'://'+req.headers.host;
 const forwardExpected=process.env.TRUST_PROXY==='1' ? 'https://'+req.headers.host : expected;
 return origin===expected||origin===forwardExpected;
}
/* ---------- V22.1: WebSocket — o servidor EMPURRA o mundo SNAPSHOT_RATE vezes por segundo (20) e aplica comandos na hora ---------- */
const wsJson=(conn,obj)=>conn.send(JSON.stringify(obj));
function wsMessage(conn,text){
 const now=Date.now();
 if(now-conn.windowAt>1000){conn.windowAt=now;conn.count=0}
 if(++conn.count>150)return; // proteção simples contra inundação
 let msg;try{msg=JSON.parse(text)}catch{return}
 if(!msg||typeof msg!=='object')return;
 if(msg.t==='hello'){
  const room=findRoom(String(msg.code||'').slice(0,12));
  if(!room){wsJson(conn,{t:'error',status:404,error:'Sala não encontrada ou encerrada'});return conn.close(4404)}
  const me=typeof msg.token==='string'?findMember(room,msg.token):null;
  if(!me||me.userId!==conn.userId){wsJson(conn,{t:'error',status:401,error:'Sessão da sala inválida'});return conn.close(4401)}
  if(me.ws&&me.ws!==conn)try{me.ws.close(4000)}catch{}
  me.ws=conn;conn.member=me;conn.room=room;me.updated=now;
  conn.lastEvent=Number.isSafeInteger(msg.eventSeq)&&msg.eventSeq>=0?msg.eventSeq:0;conn.pickupRev=-1;
  pushTo(room,me,true);
  return;
 }
 const me=conn.member,room=conn.room;
 if(!me||!room||rooms.get(room.code)!==room||!room.members.has(me.id))return;
 me.updated=now;
 if(msg.t==='in'&&room.phase==='playing'&&room.world&&msg.input&&typeof msg.input==='object'){
  command(room.world,me.id,msg.input);me.input=inputView(room.world,me.id);
 }else if(msg.t==='ping')wsJson(conn,{t:'pong',c:Number.isFinite(msg.c)?msg.c:0});
}
function pushTo(room,member,force=false){
 const conn=member.ws;if(!conn?.open)return;
 // Cliente lento: descarta quadros em vez de acumular segundos de atraso no buffer.
 if(!force&&conn.buffered>192*1024)return;
 const world=room.world;
 // Mundo novo (próximo mapa / nova tentativa): a numeração de eventos recomeça.
 if(world&&conn.worldId!==world.id){conn.worldId=world.id;conn.lastEvent=0;conn.pickupRev=-1;force=true;}
 if(room.phase==='playing'&&world){
  const pickups=force||conn.pickupRev!==world.pickupRev||(room.snap||0)%8===0;
  const message={t:'s',...summary(room,member.id,conn.lastEvent,{cull:true,pickups})};
  // A posição/animação dos colegas já vem em world.players; a lista da sala só vai quando muda.
  const roster=message.members.map(m=>({id:m.id,profile:m.profile,ready:m.ready}));
  const signature=JSON.stringify(roster);
  if(force||signature!==conn.rosterSig||(room.snap||0)%40===0){message.members=roster;conn.rosterSig=signature;}else delete message.members;
  conn.lastEvent=world.lastEvent;if(pickups)conn.pickupRev=world.pickupRev;
  wsJson(conn,message);
 }else wsJson(conn,{t:'s',...summary(room,member.id,0)});
}
server.on('upgrade',(req,socket,head)=>{
 let url;try{url=new URL(req.url,'http://localhost')}catch{return socket.destroy()}
 if(url.pathname!=='/api/coop/ws'){socket.end('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n');return}
 if(!sameOrigin(req)){socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');return}
 const account=accounts.current(req);
 if(!account&&!ALLOW_GUEST_MULTIPLAYER){socket.end('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');return}
 const conn=acceptWebSocket(req,socket,head,{onMessage:wsMessage,onClose:c=>{if(c.member?.ws===c)c.member.ws=null}});
 if(!conn)return;
 Object.assign(conn,{userId:account?.id||null,member:null,room:null,lastEvent:0,pickupRev:-1,windowAt:Date.now(),count:0});
 setTimeout(()=>{if(conn.open&&!conn.member)conn.close(4408)},10_000).unref();
});
server.listen(PORT,BIND,()=>console.log(`RAG SURVIVAL V${PATCH} · porta ${PORT} (${BIND}) · ${TICK_RATE} ticks/s · snapshots ${SNAPSHOT_RATE}/s · até 6 jogadores · WebSocket ativo`));
setInterval(()=>{for(const room of rooms.values()){if(roomExpired(room)){closeRoom(room);continue}for(const m of room.members.values())try{m.ws?.ping()}catch{}}},10_000).unref();

/* ===== V24: laço de simulação a TICK_RATE (60) com passo FIXO de 1/60 s =====
 * setTimeout reprogramado pelo relógio real (sem deriva): se o processo engasgar, recupera até 5 ticks seguidos,
 * depois descarta o atraso (o relógio do mundo nunca dispara). Snapshot sai a cada SNAP_EVERY ticks (20/s). */
const TICK_SAMPLES=new Float64Array(3600);let tickSampleN=0,tickOver=0,tickCount=0,tickWindowStart=performance.now(),tickWindowCount=0,measuredTps=0,tickLag=0;
function recordTick(ms){TICK_SAMPLES[tickSampleN++%TICK_SAMPLES.length]=ms;if(ms>1000/TICK_RATE)tickOver++;tickCount++;}
function tickStats(){
 const n=Math.min(tickSampleN,TICK_SAMPLES.length),list=Array.from(TICK_SAMPLES.subarray(0,n)).sort((a,b)=>a-b);
 const q=x=>n?+list[Math.min(n-1,Math.floor(n*x))].toFixed(3):0;
 return {configured:TICK_RATE,snapshotRate:SNAPSHOT_RATE,measuredTps:+measuredTps.toFixed(2),budgetMs:+(1000/TICK_RATE).toFixed(2),
  samples:n,avgMs:n?+(list.reduce((a,b)=>a+b,0)/n).toFixed(3):0,p50Ms:q(.5),p95Ms:q(.95),p99Ms:q(.99),maxMs:n?+list[n-1].toFixed(2):0,overBudget:tickOver,total:tickCount,maxLateMs:+tickLag.toFixed(2)};
}
function simulationTick(){
 const started=performance.now();
 for(const room of rooms.values()){
  room.tick=(room.tick||0)+1;
  const snapshotTick=room.tick%SNAP_EVERY===0;
  if(room.phase==='playing'&&room.world){
   tickWorld(room.world,TICK_STEP);
   // Somente para testes automáticos: MIDGARD_TEST_WIN_AT=2 vence o mapa aos 2 s.
   if(TEST_WIN_AT>0&&!room.world.finished&&room.world.time>=TEST_WIN_AT){room.world.won=true;room.world.finished=true;room.world.phase='win';}
   if(room.world.finished)grantFinalRewards(room);
   if(snapshotTick){room.snap=(room.snap||0)+1;for(const member of room.members.values())pushTo(room,member);}
  }else if(room.tick%(SNAP_EVERY*10)===0)for(const member of room.members.values())pushTo(room,member);
 }
 const ms=performance.now()-started;
 if(rooms.size)recordTick(ms);
 return ms;
}
let nextTickAt=performance.now()+1000/TICK_RATE;
function loop(){
 const now=performance.now();
 // Sem nenhuma sala aberta não há o que simular: verifica de novo em 100 ms (economiza CPU parado no Railway).
 if(!rooms.size){nextTickAt=now+1000/TICK_RATE;tickWindowStart=now;tickWindowCount=0;measuredTps=0;setTimeout(loop,100).unref();return;}
 let steps=0;
 while(now>=nextTickAt&&steps<5){simulationTick();nextTickAt+=1000/TICK_RATE;steps++;tickWindowCount++;}
 if(now-nextTickAt>250){tickLag=Math.max(tickLag,now-nextTickAt);nextTickAt=now+1000/TICK_RATE;} // engasgo longo: não acumula atraso
 if(now-tickWindowStart>=1000){measuredTps=tickWindowCount*1000/(now-tickWindowStart);tickWindowStart=now;tickWindowCount=0;}
 setTimeout(loop,Math.max(0,nextTickAt-performance.now())).unref();
}
setTimeout(loop,0).unref();
// Registro periódico (logs do Railway): só quando há partida em andamento.
setInterval(()=>{if([...rooms.values()].some(r=>r.phase==='playing')){const t=tickStats();console.log(`[tick] ${t.measuredTps} TPS · média ${t.avgMs} ms · p95 ${t.p95Ms} · p99 ${t.p99Ms} · máx ${t.maxMs} · acima de ${t.budgetMs} ms: ${t.overBudget}/${t.total}`);}},60_000).unref();

setInterval(()=>accounts.cleanup(),60_000).unref();

/* ===== V23.6: atualização sem derrubar =====
 * Extrair uma versão nova por cima da pasta com o servidor aberto: o servidor percebe os arquivos novos, não deixa começar
 * partida nova e reinicia sozinho (código 75, o .cmd abre de novo) assim que NÃO houver partida em andamento.
 * Os lobbies são guardados e voltam depois do reinício; quem está neles reconecta sozinho. Arquivos do navegador
 * (html/js/css/json) já são entregues sem cache: valem no próximo F5. */
const SERVER_FILES=['server.mjs','accounts.mjs','authoritative-world.mjs','ws.mjs','server-gear.mjs','online-skills.json','server-maps.json','cards.js','items.js'];
const LOBBY_FILE=path.join(DATA_DIR,'lobbies-restart.json');
let filesSignature=null,changedAt=0,updatePending=false;
// Sem partida em andamento: no lobby, ou partida terminada com os prêmios já gravados.
const idleRoom=r=>r.phase==='lobby'||(r.phase==='ended'&&r.rewarded);
async function serverSignature(){
 let names=[...SERVER_FILES];try{names.push(...(await fs.readdir(path.join(root,'engine'))).filter(f=>f.endsWith('.mjs')).map(f=>'engine/'+f));}catch{}
 const parts=[];for(const f of names.sort()){try{const st=await fs.stat(path.join(root,f));parts.push(f+':'+st.size+':'+st.mtimeMs);}catch{parts.push(f+':-');}}
 return parts.join('|');
}
async function saveLobbies(){
 const list=[...rooms.values()].filter(r=>idleRoom(r)&&r.members.size).map(r=>({code:r.code,hostId:r.hostId,config:r.config,created:r.created,lastWon:r.phase==='lobby'?!!r.lastWon:!!r.world?.won,
   members:[...r.members.values()].map(m=>({id:m.id,token:m.token,userId:m.userId,profile:m.profile,ready:!!m.ready}))}));
 if(!list.length)return; // nada a guardar: não cria arquivo à toa
 try{await fs.writeFile(LOBBY_FILE,JSON.stringify({at:Date.now(),list}));}catch(err){console.error('Não foi possível guardar os lobbies:',err.message);}
}
async function restoreLobbies(){
 try{
  const raw=JSON.parse(await fs.readFile(LOBBY_FILE,'utf8'));await fs.rm(LOBBY_FILE,{force:true});
  if(!raw||Date.now()-raw.at>180_000)return;
  for(const r of raw.list||[])if(!rooms.has(r.code))rooms.set(r.code,{code:r.code,hostId:r.hostId,phase:'lobby',config:r.config,world:null,created:r.created,tick:0,lastWon:r.lastWon,
    members:new Map(r.members.map(m=>[m.id,{...m,ready:m.id===r.hostId,input:null,updated:Date.now()}]))});
  if(raw.list?.length)console.log('Atualização aplicada: '+raw.list.length+' lobby(s) restaurado(s).');
 }catch{}
}
await restoreLobbies();
if(process.env.MIDGARD_AUTO_UPDATE!=='0')setInterval(async()=>{
 const sig=await serverSignature();
 if(filesSignature===null){filesSignature=sig;return;}
 if(sig!==filesSignature){filesSignature=sig;changedAt=Date.now();
  if(!updatePending){updatePending=true;console.log('Atualização detectada: o servidor reinicia sozinho quando não houver partida em andamento.');}}
 // espera os arquivos pararem de mudar (extração terminada) e todas as partidas acabarem
 if(updatePending&&Date.now()-changedAt>=6000&&[...rooms.values()].every(idleRoom)){
  await saveLobbies();console.log('Reiniciando para aplicar a atualização…');process.exit(75);
 }
},2000).unref();

/* ===== V24: encerramento limpo (Railway envia SIGTERM em cada deploy/reinício) =====
 * Guarda os lobbies (voltam por até 3 min após o novo processo subir), fecha conexões e grava o WAL do SQLite. */
let shuttingDown=false;
async function shutdown(signal){
 if(shuttingDown)return;shuttingDown=true;
 console.log(`${signal} recebido: encerrando com segurança…`);
 try{for(const room of rooms.values())if(room.world?.finished)grantFinalRewards(room);}catch(err){console.error('Falha ao gravar prêmios no encerramento:',err);}
 // Na hospedagem (SAVE_LOBBIES_ON_EXIT=1, definido no Dockerfile) os lobbies sobrevivem ao deploy.
 if(process.env.SAVE_LOBBIES_ON_EXIT==='1')try{await saveLobbies();}catch{}
 for(const room of rooms.values())for(const m of room.members.values())try{m.ws?.close(1012)}catch{}
 server.close();
 accounts.close();
 setTimeout(()=>process.exit(0),300).unref();
}
process.on('SIGTERM',()=>shutdown('SIGTERM'));
process.on('SIGINT',()=>shutdown('SIGINT'));
process.on('unhandledRejection',err=>console.error('Promessa rejeitada sem tratamento:',err));
