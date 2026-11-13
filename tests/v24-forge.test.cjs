// V24: forja até +10 — regras centrais (RefineRules), servidor autoritativo, transação, compatibilidade e anti-exploração.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const plain=x=>JSON.parse(JSON.stringify(x)); // objetos do vm têm protótipos de outro contexto
function rules(){const ctx=vm.createContext({console});for(const f of ['cards.js','items.js'])vm.runInContext(read(f),ctx,{filename:f});
 vm.runInContext('this.__={R:RefineRules,Gear,itemDb}',ctx);return ctx.__;}

test('V24 forja: tabela definitiva — limite +10, chances e custos centralizados; quebra é condicional à falha',()=>{
 const {R}=rules();
 assert.equal(R.MAX,10);assert.equal(R.DUPLICATE_CAP,8);
 const want={1:[100,0,500],2:[100,0,1000],3:[95,0,2000],4:[90,0,4000],5:[80,5,8000],6:[70,10,16000],7:[55,20,35000],8:[40,30,75000],9:[25,35,120000],10:[15,50,220000]};
 for(const [lv,[s,b,c]] of Object.entries(want)){
  const o=R.odds(+lv);
  assert.equal(o.percent.success,s);assert.equal(o.cost,c);assert.equal(Math.round(o.breakOnFail*100),b);
  assert.ok(Math.abs(o.success+o.failKeep+o.destroy-1)<1e-12,'três resultados somam 100%');
 }
 // Exemplo do pedido: tentativa de +8 → 40% sucesso, 42% falha sem quebra, 18% destruição.
 assert.deepEqual(plain(R.odds(8).percent),{success:40,failKeep:42,destroy:18});
 assert.deepEqual(plain(R.odds(9).percent),{success:25,failKeep:48.75,destroy:26.25});
 assert.equal(R.odds(11),null,'não existe +11');
});

test('V24 forja: um sorteio u ∈ [0,1) cobre exatamente os 3 resultados, nas proporções da tabela (sem depender da sorte)',()=>{
 const {R}=rules();const N=200000;
 for(let lv=1;lv<=10;lv++){
  const n={success:0,fail:0,broken:0};for(let i=0;i<N;i++)n[R.outcome(lv,(i+.5)/N)]++;
  const o=R.odds(lv);
  assert.ok(Math.abs(n.success/N-o.success)<1e-4,`+${lv} sucesso`);
  assert.ok(Math.abs(n.fail/N-o.failKeep)<1e-4,`+${lv} falha sem quebra`);
  assert.ok(Math.abs(n.broken/N-o.destroy)<1e-4,`+${lv} destruição`);
 }
 // fronteiras: +9 (25% / quebra 35% da falha → quebra até u = 0,5125)
 assert.equal(R.outcome(9,0),'success');assert.equal(R.outcome(9,.2499),'success');
 assert.equal(R.outcome(9,.25),'broken');assert.equal(R.outcome(9,.512),'broken');assert.equal(R.outcome(9,.513),'fail');assert.equal(R.outcome(9,.9999),'fail');
 for(const lv of [1,2,3,4])for(const u of [0,.5,.9999])assert.notEqual(R.outcome(lv,u),'broken','+1 a +4 nunca quebram');
});

test('V24 forja: +0 → +10, bloqueio acima de +10, Zeny insuficiente, custo cobrado uma vez e resultado sem contradição',()=>{
 const {R}=rules();
 let item={uid:'x',id:'claymore',refine:0,cards:['hydra'],upgrades:{},affixes:{str:2}},zeny=10_000_000,spent=0;
 for(let to=1;to<=10;to++){
  const out=R.attempt(item,zeny,()=>0,to-1);
  assert.equal(out.ok,true);assert.equal(out.result,'success');assert.equal(out.to,to);assert.equal(out.cost,R.TABLE[to][2]);
  zeny-=out.cost;spent+=out.cost;item=out.item;
  assert.equal(item.refine,to);assert.deepEqual(plain(item.cards),['hydra'],'refino preserva cartas');assert.deepEqual(plain(item.affixes),{str:2},'e opções');
 }
 assert.equal(spent,500+1000+2000+4000+8000+16000+35000+75000+120000+220000);
 assert.equal(R.attempt(item,1e9,()=>0,10).error,'max','não passa de +10');
 assert.equal(R.attempt({...item,refine:4},7999,()=>0,4).error,'zeny','sem Zeny suficiente');
 assert.equal(R.attempt({...item,refine:4},8000,()=>0,4).ok,true,'Zeny exato basta');
 assert.equal(R.attempt({...item,refine:4},1e9,()=>0,3).error,'stale','nível esperado diferente (clique duplo/aba antiga)');
 const fail=R.attempt({...item,refine:6},1e9,()=>.99,6);assert.equal(fail.result,'fail');assert.equal(fail.item.refine,6);assert.deepEqual(plain(fail.gain),{});
 const broke=R.attempt({...item,refine:9},1e9,()=>.5,9);assert.equal(broke.result,'broken');assert.equal(broke.item,null);
});

test('V24 forja: prévia = atributos realmente aplicados após o sucesso, para todos os equipamentos e níveis (inclui +9 e +10)',()=>{
 const {R,Gear,itemDb}=rules();
 const slotOf={weapon:'weapon',armor:'armor',shield:'shield',garment:'garment',shoes:'shoes',headgear:'headgear',accessory:'accessory1'};
 let checked=0;
 for(const [id,data] of Object.entries(itemDb)){
  for(let r=0;r<10;r++){
   const item={uid:'u',id,refine:r,cards:[],upgrades:{},affixes:{}},p=R.preview(item);
   const slot=slotOf[data.type],before=Gear.bonuses({[slot]:item}),after=Gear.bonuses({[slot]:{...item,refine:r+1}});
   if(data.type==='weapon'){
    assert.equal(after.weaponAtk-before.weaponAtk,p.gain.atk,`${id} +${r+1} ATQ`);
    assert.equal(after.weaponMatk-before.weaponMatk,p.gain.matk,`${id} +${r+1} ATQM`);
    assert.equal(p.after.atk,after.weaponAtk);assert.equal(p.gain.def,undefined,'arma não ganha DEF do refino');
   }else{
    assert.ok(Math.abs((after.def-before.def)-p.gain.def)<1e-9,`${id} +${r+1} DEF`);
    assert.equal(p.gain.atk,undefined,'armadura/escudo/acessório não ganham ATQ');assert.equal(p.gain.matk,undefined);
   }
   checked++;
  }
 }
 assert.ok(checked>=600);
 // o servidor aceita +9/+10 ao montar o equipamento (antes era cortado em +8)
 const eq=Gear.equipped({stage:1,gear:{weapon:'w'}},[{uid:'w',id:'claymore',refine:10,cards:[],upgrades:{},affixes:{}}],'sword');
 assert.equal(eq.weapon.refine,10);
 assert.equal(Gear.equipped({stage:1,gear:{weapon:'w'}},[{uid:'w',id:'claymore',refine:99}],'sword').weapon.refine,10,'valor fabricado é limitado a +10');
});

test('V24 forja: equipamentos antigos continuam iguais — cópia repetida do MVP sobe até +8 e depois vira Zeny',()=>{
 const {Gear}=rules();
 const list=[{uid:'a',id:'claymore',refine:7,cards:['hydra'],upgrades:{},affixes:{}}];
 const up=Gear.grantItem(list,{id:'claymore'},3,'novo');assert.equal(up.item.refine,8);assert.equal(up.items.length,1);
 const zeny=Gear.grantItem(up.items,{id:'claymore'},3,'novo2');assert.equal(zeny.item.refine,8,'a cópia não leva a +9');assert.ok(zeny.zeny>0);
 const ten=Gear.grantItem([{uid:'t',id:'claymore',refine:10}],{id:'claymore'},3,'x');assert.equal(ten.item.refine,10);assert.ok(ten.zeny>0,'+10 recebe Zeny e não perde refino');
});

/* ===================== servidor ===================== */
async function start(data,extra={}){
 const port=30000+Math.floor(Math.random()*15000);
 const child=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,PORT:String(port),HOST:'127.0.0.1',DATA_DIR:data,MIDGARD_AUTO_UPDATE:'0',NODE_ENV:'test',...extra},stdio:'ignore'});
 const base='http://127.0.0.1:'+port;
 for(let i=0;i<120;i++){try{if((await fetch(base+'/api/health')).ok)return {child,base}}catch{}await sleep(40)}
 child.kill();throw new Error('Servidor não iniciou');
}
const stop=async s=>{s.child.kill();await new Promise(r=>s.child.once('exit',r));};
async function api(base,url,body,cookie,method='POST'){
 const r=await fetch(base+url,{method,headers:{'Content-Type':'application/json','X-Midgard-Request':'1',...(cookie?{Cookie:cookie}:{})},body:body===undefined?undefined:JSON.stringify(body)});
 return {status:r.status,data:await r.json().catch(()=>({})),cookie:(r.headers.get('set-cookie')||'').split(';')[0]};
}
/** Conta com Zeny e equipamentos gravados direto no banco (como se viessem de partidas anteriores). */
async function seededAccount(data,{zeny,items,gear}){
 let s=await start(data);
 const reg=await api(s.base,'/api/auth/register',{username:'ferreiro',email:'f@example.com',nickname:'Ferreiro',password:'senha-longa-123'});
 assert.equal(reg.status,201);await stop(s);
 const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync(path.join(data,'midgard.sqlite'));
 const row=db.prepare('SELECT account_id,snapshot FROM progress').get();const snap=JSON.parse(row.snapshot);
 snap.zeny=zeny;snap.items=[...snap.items,...items];snap.journeys.sword.gear={...snap.journeys.sword.gear,...gear};
 db.prepare('UPDATE progress SET snapshot=? WHERE account_id=?').run(JSON.stringify(snap),row.account_id);db.close();
}
const rid=n=>'teste-forja-'+String(n).padStart(4,'0');

test('V24 forja ONLINE: servidor decide, cobra uma vez, repete pedido sem cobrar de novo, recusa abas antigas e persiste',async()=>{
 const data=fs.mkdtempSync(path.join(os.tmpdir(),'rag-forja-'));
 await seededAccount(data,{zeny:1_000_000,items:[{uid:'espada',id:'claymore',refine:0,cards:['hydra'],upgrades:{},affixes:{}}],gear:{weapon:'espada'}});
 // rolagens fixas (só fora de produção): sucesso, sucesso, falha, ...
 let s=await start(data,{RAG_TEST_REFINE_ROLLS:'0,0,0.999,0'});
 try{
  let login=await api(s.base,'/api/auth/login',{username:'ferreiro',password:'senha-longa-123'});const cookie=login.cookie;
  let prog=(await api(s.base,'/api/account/progress',undefined,cookie,'GET')).data;
  const zeny0=prog.data.zeny;
  // 1) +0 → +1 (sucesso)
  let r=await api(s.base,'/api/account/refine',{uid:'espada',from:0,requestId:rid(1),revision:prog.revision},cookie);
  assert.equal(r.status,200);assert.equal(r.data.result,'success');assert.equal(r.data.item.refine,1);assert.equal(r.data.zeny,zeny0-500);
  assert.deepEqual(r.data.gain,{atk:11,matk:6});
  // 2) mesma requisição de novo (reconexão): devolve o mesmo resultado sem cobrar outra vez
  const again=await api(s.base,'/api/account/refine',{uid:'espada',from:0,requestId:rid(1),revision:prog.revision},cookie);
  assert.equal(again.status,200);assert.equal(again.data.replay,true);assert.equal(again.data.zeny,zeny0-500);
  // 3) revisão antiga (outra aba) → 409 sem cobrar
  const stale=await api(s.base,'/api/account/refine',{uid:'espada',from:1,requestId:rid(2),revision:prog.revision},cookie);
  assert.equal(stale.status,409);assert.equal(stale.data.progress.data.zeny,zeny0-500);
  prog=r.data.progress;
  // 4) nível esperado errado (clique duplo) → 409
  assert.equal((await api(s.base,'/api/account/refine',{uid:'espada',from:0,requestId:rid(3),revision:prog.revision},cookie)).status,409);
  // 5) cinco cliques simultâneos com a mesma revisão: só UM vale
  const burst=await Promise.all([4,5,6,7,8].map(n=>api(s.base,'/api/account/refine',{uid:'espada',from:1,requestId:rid(n),revision:prog.revision},cookie)));
  assert.equal(burst.filter(x=>x.status===200).length,1,'uma tentativa só');
  const ok=burst.find(x=>x.status===200).data;assert.equal(ok.item.refine,2);assert.equal(ok.zeny,zeny0-500-1000);
  prog=ok.progress;
  // 6) +3 com rolagem 0,999 → falha sem quebra (cobra 2.000 e o item fica +2)
  r=await api(s.base,'/api/account/refine',{uid:'espada',from:2,requestId:rid(9),revision:prog.revision},cookie);
  assert.equal(r.data.result,'fail');assert.equal(r.data.item.refine,2);assert.equal(r.data.zeny,zeny0-3500);prog=r.data.progress;
  // 7) equipamento inexistente / de outro jogador
  assert.equal((await api(s.base,'/api/account/refine',{uid:'nao-existe',from:0,requestId:rid(10),revision:prog.revision},cookie)).status,404);
  assert.equal((await api(s.base,'/api/account/refine',{uid:'espada',from:2,requestId:rid(11),revision:prog.revision})).status,401,'sem login não refina');
  // 8) o navegador não consegue fabricar refino +9 nem baixar refino por save
  // V25.8: o save não é mais recusado (isso travava a nuvem); o servidor só corrige o refino para o valor dele.
  const fake=JSON.parse(JSON.stringify(prog.data));fake.items.find(x=>x.uid==='espada').refine=9;fake.muted=true;
  let put=await api(s.base,'/api/account/progress',{revision:prog.revision,data:fake},cookie,'PUT');assert.equal(put.status,200);
  prog=(await api(s.base,'/api/account/progress',undefined,cookie,'GET')).data;
  assert.equal(prog.data.items.find(x=>x.uid==='espada').refine,2,'+9 fabricado volta para +2');assert.equal(prog.data.muted,true,'o resto do save foi gravado');
  const fake2=JSON.parse(JSON.stringify(prog.data));fake2.items.find(x=>x.uid==='espada').refine=1;
  put=await api(s.base,'/api/account/progress',{revision:prog.revision,data:fake2},cookie,'PUT');assert.equal(put.status,200);
  prog=(await api(s.base,'/api/account/progress',undefined,cookie,'GET')).data;
  assert.equal(prog.data.items.find(x=>x.uid==='espada').refine,2,'refino não baixa por save antigo');
  // 9) o equipamento refinado vale na partida online (o servidor lê da conta)
  const gear=await import(require('node:url').pathToFileURL(path.join(root,'server-gear.mjs')).href);
  assert.equal(gear.equippedForAccount(prog.data,'sword').weapon.refine,2);
 }finally{await stop(s);}
 // 10) persistência depois de reiniciar
 s=await start(data);
 try{
  const login=await api(s.base,'/api/auth/login',{username:'ferreiro',password:'senha-longa-123'});
  const prog=(await api(s.base,'/api/account/progress',undefined,login.cookie,'GET')).data;
  assert.equal(prog.data.items.find(x=>x.uid==='espada').refine,2);assert.equal(prog.data.zeny,1_000_000-3500);
 }finally{await stop(s);fs.rmSync(data,{recursive:true,force:true});}
});

test('V24 forja ONLINE: quebra destrói e desequipa; item destruído não volta por save antigo; +10 é o máximo e recusa não cobra',async()=>{
 const data=fs.mkdtempSync(path.join(os.tmpdir(),'rag-forja-'));
 await seededAccount(data,{zeny:600_000,items:[
  {uid:'capa',id:'muffler',refine:4,cards:[],upgrades:{},affixes:{}},
  {uid:'dez',id:'claymore',refine:9,cards:[],upgrades:{},affixes:{}}],gear:{garment:'capa',weapon:'dez'}});
 // +5 com u=0,80 → (0,80-0,80)/0,20 = 0 < 5% → QUEBRA ; depois +10 com u=0 → sucesso
 const s=await start(data,{RAG_TEST_REFINE_ROLLS:'0.80,0'});
 try{
  const cookie=(await api(s.base,'/api/auth/login',{username:'ferreiro',password:'senha-longa-123'})).cookie;
  let prog=(await api(s.base,'/api/account/progress',undefined,cookie,'GET')).data;
  const before=JSON.parse(JSON.stringify(prog.data));
  let r=await api(s.base,'/api/account/refine',{uid:'capa',from:4,requestId:rid(20),revision:prog.revision},cookie);
  assert.equal(r.data.result,'broken');assert.equal(r.data.item,null);assert.equal(r.data.zeny,600_000-8000);
  prog=r.data.progress;
  assert.ok(!prog.data.items.some(x=>x.uid==='capa'),'item destruído');
  assert.equal(prog.data.journeys.sword.gear.garment,undefined,'e desequipado');
  // save antigo do navegador tentando trazer a capa de volta
  {const put=await api(s.base,'/api/account/progress',{revision:prog.revision,data:{...prog.data,items:before.items}},cookie,'PUT');assert.equal(put.status,200);
   prog=(await api(s.base,'/api/account/progress',undefined,cookie,'GET')).data;assert.ok(!prog.data.items.some(x=>x.uid==='capa'),'a capa destruída não volta');}
  // +9 → +10 (220.000)
  r=await api(s.base,'/api/account/refine',{uid:'dez',from:9,requestId:rid(21),revision:prog.revision},cookie);
  assert.equal(r.data.result,'success');assert.equal(r.data.item.refine,10);assert.equal(r.data.zeny,600_000-8000-220_000);prog=r.data.progress;
  r=await api(s.base,'/api/account/refine',{uid:'dez',from:10,requestId:rid(22),revision:prog.revision},cookie);
  assert.equal(r.status,400);assert.equal(r.data.code,'max');
  assert.equal(r.data.progress.data.zeny,372_000,'tentativa recusada não cobra Zeny');
 }finally{await stop(s);fs.rmSync(data,{recursive:true,force:true});}
});

test('V24 forja ONLINE: Zeny insuficiente é recusado no servidor (o navegador não decide o saldo)',async()=>{
 const data=fs.mkdtempSync(path.join(os.tmpdir(),'rag-forja-'));
 await seededAccount(data,{zeny:7_999,items:[{uid:'bota',id:'boots',refine:4,cards:[],upgrades:{},affixes:{}}],gear:{}});
 const s=await start(data,{RAG_TEST_REFINE_ROLLS:'0'});
 try{
  const cookie=(await api(s.base,'/api/auth/login',{username:'ferreiro',password:'senha-longa-123'})).cookie;
  const prog=(await api(s.base,'/api/account/progress',undefined,cookie,'GET')).data;
  const r=await api(s.base,'/api/account/refine',{uid:'bota',from:4,requestId:rid(30),revision:prog.revision},cookie);
  assert.equal(r.status,400);assert.equal(r.data.code,'zeny');assert.equal(r.data.progress.data.zeny,7_999);
  assert.equal(r.data.progress.data.items.find(x=>x.uid==='bota').refine,4);
 }finally{await stop(s);fs.rmSync(data,{recursive:true,force:true});}
});

test('V24 forja no navegador (conta): a tela mostra a prévia, pede confirmação e o SERVIDOR grava o resultado',async t=>{
 const {launch,findBrowser}=require('./helpers/cdp.cjs');
 if(!findBrowser()){t.skip('Chrome/Edge não encontrado');return;}
 const data=fs.mkdtempSync(path.join(os.tmpdir(),'rag-forja-ui-'));
 await seededAccount(data,{zeny:200_000,items:[{uid:'espada',id:'claymore',refine:7,cards:[],upgrades:{},affixes:{}}],gear:{weapon:'espada'}});
 const s=await start(data,{RAG_TEST_REFINE_ROLLS:'0'}); // sucesso
 const browser=await launch({width:1280,height:900});
 if(!browser){await stop(s);t.skip('O navegador não abriu');return;}
 try{
  await browser.goto(s.base+'/');
  await browser.evaluate(`fetch('/api/auth/login',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-Midgard-Request':'1'},body:JSON.stringify({username:'ferreiro',password:'senha-longa-123'})}).then(r=>r.status)`);
  await browser.evaluate(`sessionStorage.setItem('midgard-tab-open','1')`);
  await browser.goto(s.base+'/');await sleep(1500);
  assert.equal(await browser.evaluate('MidgardAccount.signedIn()'),true);
  await browser.evaluate(`(()=>{inventoryCategory='services';ZenyServices.forgeState.uid='espada';openInventory();})()`);await sleep(300);
  const detail=await browser.evaluate(`document.querySelector('.forge-detail').innerText`);
  assert.match(detail,/\+7\s*→\s*\+8/);assert.match(detail,/Chance de sucesso: 40%/);assert.match(detail,/Chance de falha sem quebra: 42%/);
  assert.match(detail,/Chance efetiva de destruição: 18%/);assert.match(detail,/75\.000 Zeny/);assert.match(detail,/\+11 ATQ/);
  await browser.evaluate(`document.querySelector('.forge-go').click()`);await sleep(150);
  assert.match(await browser.evaluate(`document.querySelector('.forge-confirm').innerText`),/Este refinamento pode destruir permanentemente seu equipamento\. Deseja continuar\?/);
  await browser.evaluate(`document.querySelector('.forge-go.danger').click()`);
  for(let i=0;i<50&&!(await browser.evaluate(`!!document.querySelector('.forge-success')`));i++)await sleep(100);
  assert.match(await browser.evaluate(`document.querySelector('.forge-success').innerText`),/SUCESSO[\s\S]*\+11 ATQ[\s\S]*\+6 ATQM/);
  assert.equal(await browser.evaluate(`items().find(x=>x.uid==='espada').refine`),8);
  assert.equal(await browser.evaluate('saved.zeny'),125_000);
  // o servidor tem o mesmo resultado
  const cookie=(await api(s.base,'/api/auth/login',{username:'ferreiro',password:'senha-longa-123'})).cookie;
  const prog=(await api(s.base,'/api/account/progress',undefined,cookie,'GET')).data;
  assert.equal(prog.data.items.find(x=>x.uid==='espada').refine,8);assert.equal(prog.data.zeny,125_000);
  assert.deepEqual(browser.errors,[]);
 }finally{await browser.close();await stop(s);fs.rmSync(data,{recursive:true,force:true});}
});
