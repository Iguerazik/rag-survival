/** V18 online identities: SQLite (Node 22.13+), scrypt, hashed session identifiers. */
import { grantMvpItem } from './server-gear.mjs';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, createHash, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
const scrypt = promisify(scryptCallback);
const hash = token => createHash('sha256').update(token).digest('hex');
const DAY=86_400_000, SESSION_TTL=7*DAY;
const BUDGET = {N:32768,r:8,p:3,maxmem:64*1024*1024};
const sidCookie='midgard_sid';
const blocked = new Map();
const sanitize = value => String(value??'').normalize('NFC').trim();
const nicknameKey = name => sanitize(name).toLocaleLowerCase('pt-BR');
export function accountStore(dataDir){
 fs.mkdirSync(dataDir,{recursive:true,mode:0o700});
 const db = new DatabaseSync(path.join(dataDir,'midgard.sqlite'));
 db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
   CREATE TABLE IF NOT EXISTS accounts (
     id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE COLLATE NOCASE,
     email TEXT NOT NULL UNIQUE COLLATE NOCASE, nickname TEXT NOT NULL,
     nickname_key TEXT NOT NULL UNIQUE, pw_hash TEXT NOT NULL, created_at INTEGER NOT NULL);
   CREATE TABLE IF NOT EXISTS sessions (
     token_hash TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
     expires_at INTEGER NOT NULL);
   CREATE TABLE IF NOT EXISTS progress (
     account_id TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
     snapshot TEXT NOT NULL DEFAULT '{}', revision INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL);
   CREATE INDEX IF NOT EXISTS session_expiry ON sessions(expires_at);`);
 db.exec(`CREATE TABLE IF NOT EXISTS coop_awards (
    run_id TEXT NOT NULL, account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    zeny INTEGER NOT NULL, kills INTEGER NOT NULL, level INTEGER NOT NULL,
    map TEXT NOT NULL, difficulty TEXT NOT NULL, win INTEGER NOT NULL,
    cards TEXT NOT NULL DEFAULT '[]', awarded_at INTEGER NOT NULL,
    PRIMARY KEY(run_id,account_id));
    CREATE INDEX IF NOT EXISTS coop_awards_by_player ON coop_awards(account_id,awarded_at);`);
 const insertAward=db.prepare(`INSERT OR IGNORE INTO coop_awards
   (run_id,account_id,zeny,kills,level,map,difficulty,win,cards,awarded_at) VALUES(?,?,?,?,?,?,?,?,?,?)`);
 // V23.6: tabela de recordes. Tabela NOVA (CREATE IF NOT EXISTS): contas e progresso existentes não mudam.
 db.exec(`CREATE TABLE IF NOT EXISTS run_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT, account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    mode TEXT NOT NULL, line TEXT NOT NULL, map TEXT NOT NULL, difficulty TEXT NOT NULL,
    level INTEGER NOT NULL, kills INTEGER NOT NULL, seconds INTEGER NOT NULL, win INTEGER NOT NULL, at INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS run_scores_by_player ON run_scores(account_id,level,kills);`);
 const insertScore=db.prepare('INSERT INTO run_scores(account_id,mode,line,map,difficulty,level,kills,seconds,win,at) VALUES(?,?,?,?,?,?,?,?,?,?)');
 const LINES=new Set(['sword','mage','archer','acolyte','merchant','thief']),DIFFS=new Set(['story','easy','normal','hard','nightmare']);
 function recordScore(id,mode,s){
   const seconds=Math.max(0,Math.min(1800,Math.floor(Number(s.seconds)||0))),level=Math.max(1,Math.min(200,Math.floor(Number(s.level)||1)));
   const kills=Math.max(0,Math.min(30+seconds*12,Math.floor(Number(s.kills)||0)));
   if(!LINES.has(String(s.line))||!DIFFS.has(String(s.difficulty))||!/^[a-z]{2,16}$/.test(String(s.map)))return false;
   insertScore.run(id,mode,String(s.line),String(s.map),String(s.difficulty),level,kills,seconds,s.win?1:0,Date.now());return true;
 }
 // Melhor partida de cada conta (por nível da run, depois abates) e vitórias por conta.
 const topByLevel=db.prepare(`SELECT a.nickname,s.mode,s.line,s.map,s.difficulty,s.level,s.kills,s.seconds,s.win,s.at FROM run_scores s JOIN accounts a ON a.id=s.account_id
   WHERE s.id=(SELECT id FROM run_scores x WHERE x.account_id=s.account_id ORDER BY level DESC,kills DESC,seconds ASC LIMIT 1) ORDER BY s.level DESC,s.kills DESC LIMIT 20`);
 const topByKills=db.prepare(`SELECT a.nickname,s.mode,s.line,s.map,s.difficulty,s.level,s.kills,s.seconds,s.win,s.at FROM run_scores s JOIN accounts a ON a.id=s.account_id
   WHERE s.id=(SELECT id FROM run_scores x WHERE x.account_id=s.account_id ORDER BY kills DESC,level DESC LIMIT 1) ORDER BY s.kills DESC LIMIT 20`);
 const topByWins=db.prepare(`SELECT a.nickname,SUM(s.win) AS wins,COUNT(*) AS runs,MAX(s.level) AS level FROM run_scores s JOIN accounts a ON a.id=s.account_id
   GROUP BY s.account_id HAVING wins>0 ORDER BY wins DESC,level DESC LIMIT 20`);
 const awardsByUser=db.prepare('SELECT run_id,zeny,kills,level,map,difficulty,win,cards,awarded_at FROM coop_awards WHERE account_id=? ORDER BY awarded_at DESC LIMIT 30');
 const trustedProgress=db.prepare('UPDATE progress SET snapshot=?,revision=revision+1,updated_at=? WHERE account_id=?');
 // V22.2: EXP de Base/Classe do personagem também vale nas partidas online (mesma fórmula do solo,
 // calculada AQUI no servidor a partir dos dados da partida verificada — o navegador não envia EXP).
 const STAGE_CAPS=[[99,50],[99,50],[99,10],[99,50],[99,70],[200,70]];
 const levelCost=(level,job)=>Math.floor(job?15+.095*Math.pow(level,1.56):18+.14*Math.pow(level,1.58));
 const levelPoints=level=>level<100?Math.floor(level/5)+3:Math.floor(level/10)+13;
 const num=(v,d=0)=>Number.isFinite(Number(v))?Number(v):d;
 function awardJourney(journey,kills,seconds,victory){
  const next={...journey};
  const stage=Math.max(0,Math.min(5,Math.floor(num(next.stage)))),[baseCap,jobCap]=STAGE_CAPS[stage];
  next.base=Math.max(1,Math.floor(num(next.base,1)));next.job=Math.max(1,Math.floor(num(next.job,1)));
  next.baseXp=Math.max(0,num(next.baseXp));next.jobXp=Math.max(0,num(next.jobXp));next.points=Math.max(0,Math.floor(num(next.points)));
  next.proofs=Math.floor(num(next.proofs))+(victory?1:0);
  next.baseXp+=Math.floor(1.5*(kills*3.6+seconds*.36+135*Number(!!victory)));
  next.jobXp+=Math.floor(1.5*(kills*2.2+seconds*.24+90*Number(!!victory)));
  let guard=0;
  while(next.base<baseCap&&next.baseXp>=levelCost(next.base)&&guard++<400){next.baseXp-=levelCost(next.base);next.points+=levelPoints(next.base);next.base++;}
  while(next.job<jobCap&&next.jobXp>=levelCost(next.job,true)&&guard++<800)next.jobXp-=levelCost(next.job++,true);
  if(next.base>=baseCap)next.baseXp=0;
  if(next.job>=jobCap)next.jobXp=0;
  return next;
 }
 function grantCoop(id,runId,award){
   // Idempotente: reconexão/reenvio da última mensagem não duplica Zeny nem cartas.
   db.exec('BEGIN IMMEDIATE');
   try{
     const zeny=Math.max(0,Math.min(100000,Math.floor(award.zeny||0)));
     const cards=Array.isArray(award.cards)?award.cards.filter(x=>typeof x==='string'&&/^[a-z0-9_]{2,40}$/.test(x)).slice(0,12):[];
     const inserted=insertAward.run(runId,id,zeny,Math.max(0,Math.floor(award.kills||0)),Math.max(1,Math.floor(award.level||1)),
       String(award.map),String(award.difficulty),award.win?1:0,JSON.stringify(cards),Date.now());
     if(inserted.changes){
       recordScore(id,'online',award);
       const current=snapshot(id),data=current.data||{};
       data.zeny=Math.min(2_000_000_000,Math.max(0,Number(data.zeny)||0)+zeny);
       data.best=Math.max(Number(data.best)||0,720*Number(!!award.win));
       const lineId=String(award.line);
       if(data.journeys&&typeof data.journeys==='object'&&data.journeys[lineId]&&typeof data.journeys[lineId]==='object'){
         const seconds=Math.max(0,Math.min(1800,num(award.seconds)));
         // As hordas do online são maiores que as do solo: os abates que contam para EXP seguem o ritmo do solo (até 2 por segundo).
         const kills=Math.max(0,Math.min(5000,30+seconds*2,Math.floor(num(award.kills))));
         const before=data.journeys[lineId],stage=Math.max(0,Math.min(5,Math.floor(num(before.stage))));
         const next=awardJourney(before,kills,seconds,!!award.win);
         // Metas de mudança de classe também contam no online: melhor nível de run, fendas e Prova da Guilda.
         const old=before.runRecords?.[stage]||{};
         next.runRecords={...(before.runRecords||{}),[stage]:{bestLevel:Math.max(num(old.bestLevel),Math.min(200,Math.floor(num(award.level,1)))),rifts:num(old.rifts)+Math.max(0,Math.min(6,Math.floor(num(award.rifts))))}};
         if(Number.isInteger(award.trial)&&award.trial===stage)next.guildTrials={...(before.guildTrials||{}),[stage]:true};
         data.journeys={...data.journeys,[lineId]:next};
       }
       if(award.win){
         const line=String(award.line),map=String(award.map),difficulty=String(award.difficulty);
         const c=data.campaign?.[line]||{};
         data.campaign={...(data.campaign||{}),[line]:{...c,cleared:{...(c.cleared||{}),[map]:true},
           clearsByDifficulty:{...(c.clearsByDifficulty||{}),[difficulty]:{...(c.clearsByDifficulty?.[difficulty]||{}),[map]:true}}}};
       }
       if(cards.length){data.album={...(data.album||{})};for(const card of cards)data.album[card]=(Number(data.album[card])||0)+1;}
       // V23 Etapa 3: descobertas da partida online valem os mesmos pontos do Códex do solo, só na 1ª vez:
       // evolução do Códex 240, combinação de habilidades 120, combinação de bênçãos 75 (+18 por evolução ativa na vitória, até 100).
       const ids=(list,re)=>Array.isArray(list)?[...new Set(list.filter(x=>typeof x==='string'&&re.test(x)))].slice(0,40):[];
       const disc=award.discoveries&&typeof award.discoveries==='object'?award.discoveries:{};
       const found={...(data.codexFound||{})},synergies={...(data.runSynergies||{})};let coins=0;
       for(const key of ids(disc.codex,/^[a-z]{3,16}$/))if(!found[key]){found[key]=true;coins+=240;}
       for(const key of ids(disc.combos,/^rune-\d{1,3}$/))if(!found[key]){found[key]=true;coins+=120;}
       for(const key of ids(disc.synergies,/^v14-\d{1,3}$/))if(!synergies[key]){synergies[key]=true;coins+=75;}
       if(award.win)coins+=Math.min(100,ids(disc.active,/^[a-z]{3,16}$/).length*18);
       if(coins||Object.keys(found).length!==Object.keys(data.codexFound||{}).length){
         data.codexFound=found;data.runSynergies=synergies;data.codexCoins=Math.max(0,Number(data.codexCoins)||0)+Math.min(5000,coins);
       }
       // V23 Etapa 5: asas ganhas e usadas na partida e poções compradas que foram usadas.
       const count=v=>Math.max(0,Math.min(50,Math.floor(Number(v)||0)));
       if(award.wings&&typeof award.wings==='object'){
         const wings={flywing:0,butterflywing:0,...(data.wings||{})};
         for(const kind of ['flywing','butterflywing'])wings[kind]=Math.max(0,Math.min(999,(Number(wings[kind])||0)+count(award.wings.gained?.[kind])-count(award.wings.used?.[kind])));
         data.wings=wings;
       }
       if(award.potionsUsed)data.healPotions=Math.max(0,(Number(data.healPotions)||0)-count(award.potionsUsed));
       // V23 Etapa 4: equipamento permanente escolhido no tesouro do MVP (só em vitória; o servidor gerou as opções).
       if(award.win&&award.item&&typeof award.item==='object'&&typeof award.item.id==='string'){
         const granted=grantMvpItem(data,{id:award.item.id,affixes:award.item.affixes},award.map);
         if(granted.item){data.items=granted.items;data.zeny=Math.min(2_000_000_000,(Number(data.zeny)||0)+Math.max(0,Math.min(1000,granted.zeny)));}
       }
       trustedProgress.run(JSON.stringify(data),Date.now(),id);
     }
     db.exec('COMMIT');return inserted.changes===1;
   }catch(e){db.exec('ROLLBACK');throw e}
 }
 // V23 Etapa 5: quem sai no meio da partida online não leva prêmio, mas o que gastou (asas e poções) sai do estoque.
 function spendConsumables(id,award){
   const count=v=>Math.max(0,Math.min(50,Math.floor(Number(v)||0)));
   const used=award?.wings&&typeof award.wings==='object'?award.wings:{},potions=count(award?.potionsUsed);
   if(!count(used.flywing)&&!count(used.butterflywing)&&!potions)return false;
   db.exec('BEGIN IMMEDIATE');
   try{
     const data=snapshot(id).data||{};
     const wings={flywing:0,butterflywing:0,...(data.wings||{})};
     for(const kind of ['flywing','butterflywing'])wings[kind]=Math.max(0,(Number(wings[kind])||0)-count(used[kind]));
     data.wings=wings;data.healPotions=Math.max(0,(Number(data.healPotions)||0)-potions);
     trustedProgress.run(JSON.stringify(data),Date.now(),id);
     db.exec('COMMIT');return true;
   }catch(e){db.exec('ROLLBACK');throw e}
 }
 const byUsername=db.prepare('SELECT * FROM accounts WHERE username = ? COLLATE NOCASE');
 const byEmail=db.prepare('SELECT id FROM accounts WHERE email = ? COLLATE NOCASE');
 const byNick=db.prepare('SELECT id FROM accounts WHERE nickname_key = ?');
 const getSession=db.prepare('SELECT a.id, a.username, a.nickname, a.created_at FROM sessions s JOIN accounts a ON a.id=s.account_id WHERE s.token_hash=? AND s.expires_at>?');
 const starterByJob={sword:'sword',mage:'rod',archer:'bow',acolyte:'rod',merchant:'axe',thief:'knife'};
 function freshProgress(){
  const items=[],journeys={};
  for(const [job,weapon] of Object.entries(starterByJob)){
   const gear={};
   for(const id of [weapon,'cottonshirt']){
    const uid='s'+randomBytes(10).toString('hex');
    const item={uid,id,cards:[],refine:0,upgrades:{},affixes:{}};
    items.push(item);gear[id===weapon?'weapon':'armor']=uid;
   }
   journeys[job]={v:2,stage:0,base:1,job:1,baseXp:0,jobXp:0,points:0,
     stats:{str:1,agi:1,vit:1,int:1,dex:1,luk:1},proofs:0,guildTrials:{},gear};
  }
  return {selected:'sword',items,journeys,campaign:{},album:{},zeny:0};
 }
 const insertSession=db.prepare('INSERT INTO sessions(token_hash,account_id,expires_at) VALUES(?,?,?)');
 const progressById=db.prepare('SELECT snapshot,revision,updated_at FROM progress WHERE account_id=?');
 const updateProgress=db.prepare('UPDATE progress SET snapshot=?,revision=revision+1,updated_at=? WHERE account_id=? AND revision=?');
 const view=row=>row&&({id:row.id,username:row.username,nickname:row.nickname,createdAt:row.created_at});
 const attempts=(key,max,window)=>{const now=Date.now();let x=blocked.get(key);if(!x||now>x.until)x={count:0,until:now+window};x.count++;blocked.set(key,x);return x.count<=max};
 // V24: atrás do proxy do Railway todos chegam pelo mesmo IP interno; com TRUST_PROXY=1 o limite de tentativas usa o IP real.
 const clientIp=req=>{
  if(process.env.TRUST_PROXY==='1'){
   const real=String(req.headers['x-real-ip']||'').trim()||String(req.headers['x-forwarded-for']||'').split(',')[0].trim();
   if(real&&real.length<=64)return real;
  }
  return req.socket.remoteAddress||'local';
 };
 function cookie(req){const raw=req.headers.cookie||'';const m=raw.match(/(?:^|;\s*)midgard_sid=([a-f0-9]{64})(?:;|$)/);return m?.[1]||''}
 function current(req){const token=cookie(req);return token?view(getSession.get(hash(token),Date.now())):null}
 function secure(req){return !!req.socket.encrypted || (process.env.TRUST_PROXY==='1'&&req.headers['x-forwarded-proto']==='https')}
 function setCookie(req,res,token){res.setHeader('Set-Cookie',`${sidCookie}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${Math.floor(SESSION_TTL/1000)}${secure(req)?'; Secure':''}`)}
 function clearCookie(req,res){res.setHeader('Set-Cookie',`${sidCookie}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secure(req)?'; Secure':''}`)}
 function send(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data))}
 async function body(req){let chunks=[],size=0;for await(const part of req){size+=part.length;if(size>500_000)throw Object.assign(new Error('Dados muito grandes'),{status:413});chunks.push(part)}let object;try{object=JSON.parse(Buffer.concat(chunks).toString('utf8'))}catch{throw Object.assign(new Error('JSON inválido'),{status:400})}if(!object||typeof object!=='object'||Array.isArray(object))throw Object.assign(new Error('Formato inválido'),{status:400});return object}
 function rateLimit(req,name,max,window){return attempts(name+':'+clientIp(req),max,window)}
 const passOk=p=>typeof p==='string'&&p.length>=8&&p.length<=128&&Buffer.byteLength(p)<=256;
 const validateNames=(data)=>{
  const username=sanitize(data.username).toLowerCase(), email=sanitize(data.email).toLowerCase(), nickname=sanitize(data.nickname);
  if(!/^[a-z][a-z0-9_]{2,19}$/.test(username))return {error:'Usuário: 3–20 caracteres, letras, números e _ (comece com letra).'};
  if(email.length>254||!/^\S+@\S+\.\S+$/.test(email))return {error:'Informe um e-mail válido.'};
  if(nickname.length<3||nickname.length>24||!/^[\p{L}\p{N} _-]+$/u.test(nickname))return {error:'Nick: 3–24 caracteres, letras, números, espaços, _ ou -.'};
  if(!passOk(data.password))return {error:'A senha deve ter entre 8 e 128 caracteres.'};
  return {username,email,nickname};
 };
 async function derive(password,salt){return (await scrypt(password,Buffer.from(salt,'hex'),64,BUDGET)).toString('hex')}
 function createSession(req,res,id){const token=randomBytes(32).toString('hex');insertSession.run(hash(token),id,Date.now()+SESSION_TTL);setCookie(req,res,token)}
 function snapshot(id){const row=progressById.get(id);if(!row)return {data:{},revision:0};let data={};try{data=JSON.parse(row.snapshot)}catch{};return {data,revision:row.revision,updatedAt:row.updated_at}}
 const PROTECTED_KEYS=['zeny','album','campaign','journeys','items','codexCoins','codexFound','petsOwned','petUpgrades','found','cleared','best'];
 function lockedKeys(data,trusted){
  for(const k of PROTECTED_KEYS)if(JSON.stringify(data[k]??null)!==JSON.stringify(trusted[k]??null))
    return 'O servidor protege recompensas permanentes. Progresso econômico online somente via partidas verificadas.';
  return '';
 }
 /** Limites por gravação: folgados para uma partida solo inteira, mas barram valores fabricados. */
 function implausible(data,trusted){
  const n=v=>Number.isFinite(Number(v))?Number(v):0;
  const sum=o=>o&&typeof o==='object'?Object.values(o).reduce((t,v)=>t+Math.max(0,n(v)),0):0;
  if(n(data.zeny)<0||n(data.zeny)>2_000_000_000)return 'Zeny inválido.';
  if(n(data.zeny)-n(trusted.zeny)>80_000)return 'Ganho de Zeny grande demais para uma partida. O progresso não foi salvo.';
  if(sum(data.album)-sum(trusted.album)>12)return 'Cartas demais de uma vez. O progresso não foi salvo.';
  if(n(data.codexCoins)-n(trusted.codexCoins)>1500)return 'Pontos de Códex demais de uma vez. O progresso não foi salvo.';
  if((Array.isArray(data.items)?data.items.length:0)-(Array.isArray(trusted.items)?trusted.items.length:0)>40)return 'Itens demais de uma vez. O progresso não foi salvo.';
  for(const [line,j] of Object.entries(data.journeys||{})){
   if(!j||typeof j!=='object')return 'Personagem inválido.';
   const old=trusted.journeys?.[line]||{stage:0,base:1,job:1};
   const stage=n(j.stage),base=n(j.base),job=n(j.job);
   if(stage<0||stage>5||base<1||base>200||job<1||job>70)return 'Nível de personagem inválido.';
   if(stage-n(old.stage)>1)return 'Mudança de classe inválida.';
   const caps=STAGE_CAPS[Math.max(0,Math.min(5,Math.floor(stage)))];
   if(base>caps[0]||job>caps[1])return 'Nível acima do limite da classe.';
   if(stage===n(old.stage)){
    // Compara a EXP acumulada (não o nível): níveis baixos sobem muitos de uma vez, o que é legítimo.
    const total=(level,xp,jobLine)=>{let t=Math.max(0,n(xp));for(let l=1;l<Math.min(200,Math.floor(level));l++)t+=levelCost(l,jobLine);return t;};
    if(total(base,j.baseXp,false)-total(n(old.base)||1,old.baseXp,false)>14000||total(job,j.jobXp,true)-total(n(old.job)||1,old.jobXp,true)>9000)
      return 'Ganho de EXP grande demais para uma partida. O progresso não foi salvo.';
   }
  }
  return '';
 }
 function validSnapshot(obj){
  if(!obj||Array.isArray(obj)||typeof obj!=='object')return false;
  // Reject unknown top-level state fields; do not persist passwords, sessions, arbitrary HTML, etc.
  const keys=new Set(['activePet','album','best','campaign','codexCoins','codexFound','combatMode','difficulty','flyConfig','found','healPotions','items','journeyMode','journeys','muted','petUpgrades','petsOwned','runSynergies','selected','selectedMap','wings','zeny','cleared']);
  if(Object.keys(obj).some(k=>!keys.has(k)))return false;
  if(obj.items!==undefined&&(!Array.isArray(obj.items)||obj.items.length>1200))return false;
  if(obj.journeys!==undefined&&(!obj.journeys||typeof obj.journeys!=='object'||Array.isArray(obj.journeys)))return false;
  return true;
 }
 async function route(req,res,url){
  const endpoint=url.pathname;
  if(process.env.REQUIRE_HTTPS==='1'&&!secure(req))return send(res,426,{error:'Esta hospedagem exige HTTPS. Acesse pelo endereço seguro.'});
  try{
   if(endpoint==='/api/auth/me'&&req.method==='GET'){
     const user=current(req);return send(res,200,{account:user,progress:user?snapshot(user.id):null});
   }
   if(endpoint==='/api/auth/register'&&req.method==='POST'){
     if(!rateLimit(req,'register',25,3_600_000))return send(res,429,{error:'Muitas tentativas. Tente mais tarde.'});
     const input=await body(req), names=validateNames(input);
     if(names.error)return send(res,400,{error:names.error});
     if(byUsername.get(names.username)||byEmail.get(names.email)||byNick.get(nicknameKey(names.nickname)))return send(res,409,{error:'Usuário, e-mail ou nick já cadastrado.'});
     const salt=randomBytes(16).toString('hex');const encoded=salt+':'+await derive(input.password,salt);
     const id=randomBytes(16).toString('hex');const now=Date.now();
     try{
       db.exec('BEGIN IMMEDIATE');
       db.prepare('INSERT INTO accounts(id,username,email,nickname,nickname_key,pw_hash,created_at) VALUES(?,?,?,?,?,?,?)')
         .run(id,names.username,names.email,names.nickname,nicknameKey(names.nickname),encoded,now);
       db.prepare('INSERT INTO progress(account_id,snapshot,revision,updated_at) VALUES(?,?,0,?)').run(id,JSON.stringify(freshProgress()),now);
       db.exec('COMMIT');
     }catch(error){try{db.exec('ROLLBACK')}catch{};if(String(error).includes('UNIQUE'))return send(res,409,{error:'Usuário, e-mail ou nick já cadastrado.'});throw error}
     createSession(req,res,id);
     return send(res,201,{account:{id,username:names.username,nickname:names.nickname,createdAt:now}});
   }
   if(endpoint==='/api/auth/login'&&req.method==='POST'){
     if(!rateLimit(req,'login-ip',48,15*60_000))return send(res,429,{error:'Muitas tentativas. Tente mais tarde.'});
     const input=await body(req), username=sanitize(input.username).toLowerCase();
     if(!rateLimit(req,'login:'+username,8,15*60_000))return send(res,429,{error:'Muitas tentativas de login. Tente mais tarde.'});
     const row=byUsername.get(username);let valid=false;
     if(row&&typeof input.password==='string'&&Buffer.byteLength(input.password)<=256){
       const [salt,expected]=row.pw_hash.split(':');const actual=await derive(input.password,salt);
       valid=timingSafeEqual(Buffer.from(actual,'hex'),Buffer.from(expected,'hex'));
     }
     if(!valid)return send(res,401,{error:'Usuário ou senha incorretos.'});
     createSession(req,res,row.id);
     return send(res,200,{account:view(row)});
   }
   if(endpoint==='/api/auth/logout'&&req.method==='POST'){
     const old=cookie(req);if(old)db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hash(old));clearCookie(req,res);
     return send(res,200,{ok:true});
   }
   // V23.6: tabela de recordes (pública) e envio do resultado de uma partida solo.
   if(endpoint==='/api/account/scores'&&req.method==='GET')return send(res,200,{level:topByLevel.all(),kills:topByKills.all(),wins:topByWins.all()});
   const me=current(req);if(!me)return send(res,401,{error:'Entre na conta para acessar o progresso online.'});
   if(endpoint==='/api/account/scores'&&req.method==='POST'){
     if(!rateLimit(req,'score',40,3_600_000))return send(res,429,{error:'Muitos envios. Tente mais tarde.'});
     const input=await body(req);if(!recordScore(me.id,'solo',input))return send(res,400,{error:'Resultado inválido.'});
     return send(res,201,{ok:true});
   }
   if(endpoint==='/api/account/progress'&&req.method==='GET')return send(res,200,snapshot(me.id));
   if(endpoint==='/api/account/coop-rewards'&&req.method==='GET')return send(res,200,{awards:awardsByUser.all(me.id)});
   if(endpoint==='/api/account/progress'&&req.method==='PUT'){
     if(!rateLimit(req,'save:'+me.id,500,3_600_000))return send(res,429,{error:'Muitas gravações. Aguarde.'});
     const input=await body(req);const serialized=JSON.stringify(input.data);
     if(typeof serialized!=='string')return send(res,400,{error:'Dados de progresso inválidos.'});
     if(!Number.isSafeInteger(input.revision)||input.revision<0||!validSnapshot(input.data)||serialized.length>250_000)
       return send(res,400,{error:'Dados de progresso inválidos ou muito grandes.'});
     // V22.3: o progresso do SOLO também conta na conta. Em vez de bloquear tudo, o servidor só recusa
     // saltos impossíveis numa única gravação (Zeny, cartas, itens e níveis fora do que uma partida dá).
     //   STRICT_ONLINE_PROGRESS=1 (padrão): solo conta, com limites de plausibilidade.
     //   STRICT_ONLINE_PROGRESS=2: bloqueio total antigo (só partidas online verificadas alteram a economia).
     //   STRICT_ONLINE_PROGRESS=0: sem verificação (legado, inseguro).
     const mode=process.env.STRICT_ONLINE_PROGRESS??'1';
     if(mode!=='0'){
       const trusted=snapshot(me.id).data;
       const problem=mode==='2'?lockedKeys(input.data,trusted):implausible(input.data,trusted);
       if(problem)return send(res,403,{error:problem});
     }
     const result=updateProgress.run(serialized,Date.now(),me.id,input.revision);
     if(result.changes!==1)return send(res,409,{error:'Progresso alterado em outra aba. Recarregue para evitar perder dados.',progress:snapshot(me.id)});
     return send(res,200,{ok:true,revision:input.revision+1});
   }
   return send(res,404,{error:'API inexistente.'});
  }catch(error){if(error.status)return send(res,error.status,{error:error.message});console.error('accounts:',error);return send(res,500,{error:'Erro interno da conta.'})}
 }
 function cleanup(){db.prepare('DELETE FROM sessions WHERE expires_at<?').run(Date.now());for(const [key,value] of blocked)if(Date.now()>value.until)blocked.delete(key)}
 /** V24: cópia consistente do banco (VACUUM INTO) para backup, sem parar o servidor. */
 function backupTo(file){fs.rmSync(file,{force:true});db.prepare('VACUUM INTO ?').run(file);return fs.statSync(file).size;}
 function counts(){const c=t=>db.prepare('SELECT COUNT(*) AS n FROM '+t).get().n;return {accounts:c('accounts'),progress:c('progress'),coopAwards:c('coop_awards'),scores:c('run_scores')};}
 function close(){try{db.exec('PRAGMA wal_checkpoint(TRUNCATE)');}catch{}try{db.close();}catch{}}
 /** V24.1 (admin): apaga contas pelo nome de usuário exato; progresso, sessões, prêmios e recordes saem junto (ON DELETE CASCADE). */
 function removeAccounts(usernames){
  const names=[...new Set((Array.isArray(usernames)?usernames:[]).map(x=>String(x||'').trim()).filter(x=>x&&x.length<=40))].slice(0,50);
  const del=db.prepare('DELETE FROM accounts WHERE username=?');let removed=0;
  db.exec('BEGIN IMMEDIATE');try{for(const n of names)removed+=Number(del.run(n).changes||0);db.exec('COMMIT');}catch(e){try{db.exec('ROLLBACK')}catch{};throw e}
  return {requested:names.length,removed};
 }
 return {route,current,snapshot,cleanup,grantCoop,spendConsumables,backupTo,counts,close,removeAccounts};
}
