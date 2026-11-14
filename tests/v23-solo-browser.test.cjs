const {test}=require('node:test');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {launch,findBrowser}=require('./helpers/cdp.cjs');
const root=path.resolve(__dirname,'..');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function startServer(){
 const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'midgard-v23-'));
 const port=26000+Math.floor(Math.random()*12000);
 const child=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,PORT:String(port),HOST:'127.0.0.1',DATA_DIR:dataDir},stdio:'ignore'});
 const base='http://127.0.0.1:'+port;
 for(let i=0;i<120;i++){try{if((await fetch(base+'/api/health')).ok)return {child,base,dataDir};}catch{}await sleep(50);}
 child.kill();throw new Error('Timeout inicializando servidor');
}

test('V23: servidor entrega o motor (engine/*.mjs e server-maps.json) mas nunca o código do servidor',async()=>{
 const {child,base,dataDir}=await startServer();
 try{
  for(const ok of ['/engine/core.mjs','/engine/dmath.mjs','/engine/cards-data.mjs','/engine/browser.mjs','/server-maps.json','/local-room.js'])
   assert.equal((await fetch(base+ok)).status,200,ok);
  assert.match((await fetch(base+'/engine/core.mjs')).headers.get('content-type'),/javascript/);
  for(const no of ['/server.mjs','/accounts.mjs','/authoritative-world.mjs','/ws.mjs','/tests/helpers/parity.html','/data/midgard.sqlite'])
   assert.equal((await fetch(base+no)).status,404,no);
 }finally{child.kill();fs.rmSync(dataDir,{recursive:true,force:true});}
});

test('V23: SOLO no navegador roda o motor único (sala local), a 20 passos/s, e grava EXP/Zeny no fim da partida',async t=>{
 if(!findBrowser()||typeof WebSocket!=='function'){t.skip('Chrome/Edge não encontrado: teste do solo no navegador não pôde rodar');return;}
 const {child,base,dataDir}=await startServer();
 const browser=await launch({width:1280,height:800});
 if(!browser){child.kill();t.skip('O navegador não abriu em modo sem janela');return;}
 try{
  await browser.goto(base+'/');
  for(let i=0;i<60&&!(await browser.evaluate('!!window.MidgardEngine?.ok'));i++)await sleep(100);
  assert.equal(await browser.evaluate('window.MidgardEngine.ok'),true,'motor carregou no navegador');
  const before=await browser.evaluate('JSON.stringify({j:journeyOf(selected),z:saved.zeny||0})').then(JSON.parse);
  await browser.evaluate("document.getElementById('start').click()");
  // O jogador do teste escolhe a 1ª opção de habilidade sempre que aparece.
  await browser.evaluate("window.__pick=setInterval(()=>{const b=document.querySelector('#coop-server-upgrades:not([hidden]) button');if(b)b.click();},50)");
  await sleep(6000);
  const s=await browser.evaluate('({mode,local:run.local,auth:run.authoritative,coop:run.coop,kills:run.kills,steps:run.localRoom.steps,time:run.time,slots:[...run.localRoom.world.players.get("solo").slots],tree:document.getElementById("tree-button").hidden})');
  assert.equal(s.mode,'play');assert.equal(s.local,true);assert.equal(s.auth,true);assert.equal(s.coop,false);
  assert.equal(s.tree,true,'árvore fixa escondida dentro da run');
  assert.ok(s.kills>0,'matou monstros no solo ('+s.kills+')');
  // V27: com a suíte inteira rodando em paralelo (vários navegadores) o quadro pode atrasar; o teto continua 20/s.
  assert.ok(s.steps>=60&&s.steps<=140,'cerca de 20 passos do motor por segundo ('+s.steps+' em ~6 s)');
  // V24.1: com uma escolha aberta a partida CONTINUA e o herói anda (pedido do jogador), como no online.
  await browser.evaluate("clearInterval(window.__pick);(()=>{const w=run.localRoom.world,p=w.players.get('solo');w.pickups.push({uid:'xp-escolha',kind:'xp',x:p.x,y:p.y,amount:p.needed+1});})()");
  await sleep(800);
  assert.equal(await browser.evaluate("document.getElementById('coop-server-upgrades').hidden"),false,'painel de escolha aberto');
  const t0=await browser.evaluate('run.localRoom.world.time'),x0=await browser.evaluate("run.localRoom.world.players.get('solo').x");
  await browser.send('Input.dispatchKeyEvent',{type:'keyDown',key:'d',code:'KeyD',windowsVirtualKeyCode:68});await sleep(1000);
  await browser.send('Input.dispatchKeyEvent',{type:'keyUp',key:'d',code:'KeyD',windowsVirtualKeyCode:68});
  assert.ok(await browser.evaluate('run.localRoom.world.time')>t0+.5,'o motor segue durante a escolha');
  assert.ok(Math.abs(await browser.evaluate("run.localRoom.world.players.get('solo').x")-x0)>20,'o herói se move durante a escolha');
  assert.equal(await browser.evaluate("document.getElementById('coop-server-upgrades').hidden"),false,'a escolha continua aberta até o jogador decidir');
  // V24.1: trocar de aba/janela não pausa mais
  await browser.evaluate("window.dispatchEvent(new Event('blur'))");await sleep(200);
  assert.equal(await browser.evaluate('mode'),'play','perder o foco não pausa');
  await browser.evaluate("window.__pick=setInterval(()=>{const b=document.querySelector('#coop-server-upgrades:not([hidden]) button');if(b)b.click();},50)");
  assert.ok(s.slots.length>=1,'começa com a habilidade inicial do catálogo do RO');
  // Fim da partida: o motor decide (HP do jogador zera dentro do motor) e o navegador grava o progresso do solo.
  await browser.evaluate('(()=>{const p=run.localRoom.world.players.get("solo");p.hp=0;p.zeny+=37;})()');
  await sleep(600);
  const after=await browser.evaluate('JSON.stringify({mode,j:journeyOf(selected),z:saved.zeny||0,title:document.getElementById("dialog")?.textContent||""})').then(JSON.parse);
  assert.equal(after.mode,'ended');
  assert.ok(after.j.baseXp>before.j.baseXp||after.j.base>before.j.base,'EXP de Base gravada');
  assert.ok(after.z>=before.z+37,'Zeny da partida gravado');
  assert.deepEqual(browser.errors,[]);
 }finally{await browser.close();child.kill();fs.rmSync(dataDir,{recursive:true,force:true});}
});

test('V23.6: SOLO no navegador — MVP no mapa, aviso no chão e item do tesouro gravado no save',async t=>{
 if(!findBrowser()||typeof WebSocket!=='function'){t.skip('Chrome/Edge não encontrado: teste do MVP no navegador não pôde rodar');return;}
 const {child,base,dataDir}=await startServer();
 const browser=await launch({width:1280,height:800});
 if(!browser){child.kill();t.skip('O navegador não abriu em modo sem janela');return;}
 try{
  await browser.goto(base+'/');
  for(let i=0;i<60&&!(await browser.evaluate('!!window.MidgardEngine?.ok'));i++)await sleep(100);
  await browser.evaluate("document.getElementById('start').click()");await sleep(1500);
  const W='run.localRoom.world',P=W+".players.get('solo')";
  // pula para os 12:00 (no motor) e protege o personagem
  await browser.evaluate(`(()=>{const w=${W};w.time=719.5;w.eliteAt=1e9;w.spawnAt=1e9;w.mobs=[];const p=${P};p.hp=p.max=1e5;})()`);await sleep(1200);
  assert.ok(await browser.evaluate('run.mobs.some(m=>!!bosses[m.id])'),'MVP apareceu no mapa');
  assert.equal(await browser.evaluate('run.inMvp'),false,'sem arena');
  let warned=false;for(let i=0;i<50&&!warned;i++){await sleep(120);warned=await browser.evaluate('run.mobs.some(m=>m.warning&&m.warning.kind)');}
  assert.ok(warned,'aviso no chão chegou na tela');
  // V23.7: com 1 HP o MVP passa direto pelas fases de 75/50/25% e chama reforços, que ficam mais perto do herói
  // e viram o alvo do ataque automático. O teste limpa os reforços para o golpe final cair no MVP (o que se testa aqui é o tesouro).
  await browser.evaluate(`${W}.mobs.find(m=>m.elite==='mvp').hp=1`);
  for(let i=0;i<60&&!(await browser.evaluate(`${P}.rewardChoices.length>0`));i++){
   await browser.evaluate(`(()=>{const w=${W};w.mobs=w.mobs.filter(m=>m.elite==='mvp'||m.hp<=0);})()`);await sleep(100);}
  const before=await browser.evaluate('items().length');
  assert.ok(await browser.evaluate(`${P}.rewardChoices.every(o=>o.stat==='gear')`),'tesouro com equipamento');
  // Espera o painel do TESOURO aparecer na tela antes de clicar (sem isso, sob carga, o clique podia cair num painel antigo escondido).
  for(let i=0;i<80&&!(await browser.evaluate("(()=>{const p=document.getElementById('coop-server-rewards');return !!p&&!p.hidden&&/Tesouro do MVP/.test(p.textContent)})()"));i++)await sleep(100);
  await browser.evaluate("document.querySelector('#coop-server-rewards:not([hidden]) button').click()");
  // V24.1: depois do tesouro começa o modo infinito; Esc → "Encerrar run e receber recompensas".
  for(let i=0;i<60&&(await browser.evaluate('run.endless'))==null;i++)await sleep(100);
  assert.notEqual(await browser.evaluate('run.endless'),null,'modo infinito começou');
  assert.equal(await browser.evaluate('mode'),'play','a partida continua no infinito');
  for(let i=0;i<30&&!/∞/.test(await browser.evaluate("document.getElementById('mvp-countdown').textContent"));i++)await sleep(100);
  assert.match(await browser.evaluate("document.getElementById('mvp-countdown').textContent"),/∞ Infinito/);
  await browser.evaluate('pause()');
  assert.ok(await browser.evaluate("(()=>{const b=[...ui.dialog.querySelectorAll('button')].find(b=>/Encerrar run/.test(b.textContent));if(b)b.click();return !!b;})()"),'botão Encerrar run');
  // Espera o fim da partida (até 8 s): com a suíte inteira rodando em paralelo, 1,2 s fixo às vezes não bastava.
  for(let i=0;i<80&&(await browser.evaluate('mode'))!=='ended';i++)await sleep(100);
  assert.equal(await browser.evaluate('mode'),'ended');
  assert.equal(await browser.evaluate('items().length'),before+1,'item novo no inventário (ou refino, se repetido)');
  assert.match(await browser.evaluate('ui.dialog.textContent'),/VITÓRIA[\s\S]*Itens: /);
  assert.deepEqual(browser.errors,[]);
 }finally{await browser.close();child.kill();fs.rmSync(dataDir,{recursive:true,force:true});}
});
