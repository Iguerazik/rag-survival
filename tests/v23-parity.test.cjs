const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {launch,findBrowser}=require('./helpers/cdp.cjs');
const root=path.join(__dirname,'..');
const url=file=>require('node:url').pathToFileURL(path.join(root,file)).href;

async function nodeEngine(){
 const core=await import(url('engine/core.mjs'));
 const {CARD_MONSTERS,MOB_ELEMENTS}=await import(url('engine/cards-data.mjs'));
 core.configure({maps:JSON.parse(fs.readFileSync(path.join(root,'server-maps.json'),'utf8')),
  catalog:JSON.parse(fs.readFileSync(path.join(root,'online-skills.json'),'utf8')),cards:CARD_MONSTERS,elements:MOB_ELEMENTS});
 return core;
}
/** Servidor estático mínimo só para o teste (o server.mjs do jogo não entrega a pasta tests/). */
function staticServer(){
 const types={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.json':'application/json'};
 const server=http.createServer((req,res)=>{
  const rel=decodeURIComponent(new URL(req.url,'http://x').pathname).replace(/^\/+/,'');
  const file=path.resolve(root,rel);
  if(!file.startsWith(root+path.sep)||!types[path.extname(file)]||!fs.existsSync(file)){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'Content-Type':types[path.extname(file)]});res.end(fs.readFileSync(file));
 });
 return new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve(server)));
}

test('V23: o motor de combate não depende do DOM nem do Node (mesmo arquivo no servidor e no navegador)',()=>{
 for(const file of ['engine/core.mjs','engine/dmath.mjs','engine/cards-data.mjs']){
  const code=fs.readFileSync(path.join(root,file),'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm,'');
  for(const banned of [/\bimport\b[^;]*['"]node:/,/\brequire\(/,/\bprocess\./,/\bBuffer\b/,/\bdocument\./,/\bwindow\./,/\blocalStorage\b/,/\bfs\./])
   assert.doesNotMatch(code,banned,file+' não pode usar '+banned);
 }
 // Math.sin/cos/pow/atan2/exp/log/hypot variam entre versões do V8: o motor usa engine/dmath.mjs.
 const engineCode=fs.readFileSync(path.join(root,'engine/core.mjs'),'utf8');
 assert.doesNotMatch(engineCode,/Math\.(sin|cos|tan|pow|atan2?|exp|log|hypot|cbrt|sinh|cosh)\(/);
 assert.match(engineCode,/from '\.\/dmath\.mjs'/);
 // Todo sorteio da simulação passa pela semente do mundo.
 const sim=fs.readFileSync(path.join(root,'engine/core.mjs'),'utf8');
 const randoms=sim.match(/Math\.random\(\)/g)||[];
 assert.equal(randoms.length,1,'só a criação do mundo sem semente pode usar Math.random');
 assert.match(sim,/opts\.seed\)\?\(opts\.seed\|0\):\(Math\.random\(\)/);
});

test('V23: mesma semente + mesmos comandos = mesmo resultado no Node (repetível) e semente diferente muda o jogo',async()=>{
 const core=await nodeEngine();
 const {run}=await import(url('tests/helpers/parity-scenario.mjs'));
 const a=run(core),b=run(core),c=run(core,{seed:7});
 assert.deepEqual(a,b);
 assert.notEqual(a.final,c.final);
 assert.ok(a.kills>40,'o cenário precisa ter combate de verdade ('+a.kills+' abates)');
 assert.ok(a.levels[0]>3&&a.levels[1]>3,'os dois jogadores sobem de nível');
 assert.ok(a.blessings[0]>=1&&a.blessings[1]>=1,'o cenário escolhe bênçãos (Etapa 3)');
 assert.ok(a.mvpArena&&a.strikes>=3,'o cenário luta contra o MVP na arena (Etapa 4): '+a.strikes+' golpes com aviso');
});

test('V23: PARIDADE — o motor rodando no navegador (Chrome/Edge) produz exatamente o mesmo resultado do Node',async t=>{
 if(!findBrowser()||typeof WebSocket!=='function'){t.skip('Chrome/Edge não encontrado nesta máquina: paridade no navegador não pôde ser verificada');return;}
 const core=await nodeEngine();
 const {run}=await import(url('tests/helpers/parity-scenario.mjs'));
 const expected=run(core);
 const server=await staticServer();
 const browser=await launch();
 if(!browser){server.close();t.skip('O navegador não abriu em modo sem janela');return;}
 try{
  await browser.goto('http://127.0.0.1:'+server.address().port+'/tests/helpers/parity.html');
  const got=await browser.evaluate('window.parity');
  assert.ok(/Chrome|Edg/.test(got.userAgent),'rodou num navegador de verdade');
  delete got.userAgent;
  assert.deepEqual(got,expected);
  assert.deepEqual(browser.errors,[]);
 }finally{await browser.close();server.close();}
});
