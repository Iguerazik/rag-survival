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
 const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'midgard-v27v-'));
 const port=26000+Math.floor(Math.random()*12000);
 const child=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,PORT:String(port),HOST:'127.0.0.1',DATA_DIR:dataDir},stdio:'ignore'});
 const base='http://127.0.0.1:'+port;
 for(let i=0;i<120;i++){try{if((await fetch(base+'/api/health')).ok)return {child,base,dataDir};}catch{}await sleep(50);}
 child.kill();throw new Error('Timeout inicializando servidor');
}

test('V27: qualidade gráfica (Auto/Alta/Leve) muda só a resolução do campo; FPS opcional; cortina com o nome do mapa',async t=>{
 if(!findBrowser()||typeof WebSocket!=='function'){t.skip('Chrome/Edge não encontrado');return;}
 const {child,base,dataDir}=await startServer();
 const browser=await launch({width:1200,height:760});
 if(!browser){child.kill();t.skip('O navegador não abriu');return;}
 try{
  await browser.send('Emulation.setDeviceMetricsOverride',{width:1200,height:760,deviceScaleFactor:2,mobile:false});
  await browser.goto(base+'/');
  for(let i=0;i<60&&!(await browser.evaluate('!!window.MidgardEngine?.ok'));i++)await sleep(100);
  assert.equal(await browser.evaluate('Graphics.mode()'),'auto','padrão: automático');
  // Opções → seção Gráficos
  await browser.evaluate("document.getElementById('nav-settings').click()");
  const modes=await browser.evaluate("[...document.querySelectorAll('#controls-dialog .graphics-mode')].map(b=>b.textContent+':'+b.classList.contains('active'))");
  assert.deepEqual(modes,['Automático:true','Alta:false','Leve:false']);
  await browser.evaluate("document.getElementById('controls-done').click()");
  await browser.evaluate("document.getElementById('start').click()");
  await browser.evaluate("window.__pick=setInterval(()=>{const b=document.querySelector('#coop-server-upgrades:not([hidden]) button');if(b)b.click();},80)");
  await sleep(250);
  const card=await browser.evaluate("({shown:!document.getElementById('scene-card').hidden,text:document.getElementById('scene-card').textContent,veil:!!document.getElementById('scene-veil')})");
  assert.ok(card.shown&&card.veil,'cortina e cartão do mapa aparecem ao entrar');
  assert.match(card.text,/Expedição/);
  const cssW=await browser.evaluate('canvas.clientWidth');
  assert.equal(await browser.evaluate('canvas.width'),Math.round(cssW*1.6),'Alta/Auto: 1,6× numa tela 2×');
  await browser.evaluate("Graphics.setMode('low')");
  assert.equal(await browser.evaluate('canvas.width'),Math.round(cssW*1),'Leve: 1×');
  assert.equal(await browser.evaluate("document.documentElement.classList.contains('gfx-light')"),true);
  await browser.evaluate("Graphics.setMode('auto');Graphics._test.force(3)");
  assert.equal(await browser.evaluate('canvas.width'),Math.round(cssW*.8),'Auto no degrau mais baixo: 0,8×');
  await browser.evaluate("Graphics.setMode('auto')");
  assert.equal(await browser.evaluate("document.documentElement.classList.contains('gfx-light')"),false);
  // FPS na partida
  await browser.evaluate('Graphics.setFps(true)');await sleep(900);
  const fps=await browser.evaluate("({shown:!document.getElementById('fps-meter')?.hidden,text:document.getElementById('fps-meter')?.textContent||''})");
  assert.ok(fps.shown,'contador de FPS visível na partida');assert.match(fps.text,/\d+ FPS · Auto/);
  await sleep(1800);
  assert.equal(await browser.evaluate("document.getElementById('scene-card').hidden"),true,'o cartão some sozinho');
  assert.equal(await browser.evaluate("mode"),'play','a cortina não pausa a partida');
  await browser.evaluate('clearInterval(window.__pick);menu()');await sleep(200);
  assert.equal(await browser.evaluate("document.getElementById('fps-meter').hidden"),true,'FPS some no menu');
  await browser.evaluate('Graphics.setFps(false)');
  assert.deepEqual(browser.errors,[]);
 }finally{await browser.close();child.kill();fs.rmSync(dataDir,{recursive:true,force:true});}
});
