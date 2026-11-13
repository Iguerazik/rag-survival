const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const url=file=>require('node:url').pathToFileURL(path.join(root,file)).href;
const engine=()=>import(url('authoritative-world.mjs')).then(()=>import(url('engine/core.mjs')));
const member=(id,job,stats={},extra={})=>({id,profile:{job,classId:job},character:{base:60,stage:0,guildTrials:{0:true,4:true},stats:{str:30,agi:30,vit:30,int:30,dex:30,luk:1,...stats},...extra}});

test('V23: lista de monstros com carta do motor é a mesma do cardDb (cards.js)',async()=>{
 const {CARD_MONSTERS}=await import(url('engine/cards-data.mjs'));
 const ctx={monsters:{},bosses:{},renewalMobs:{},roSpriteData:{},Art:{draw(){},ready:()=>Promise.resolve()},document:{createElement:()=>({getContext:()=>({})})}};
 vm.createContext(ctx);vm.runInContext(read('cards.js')+';this.cardDb=cardDb;',ctx);
 assert.deepEqual([...CARD_MONSTERS].sort(),Object.keys(ctx.cardDb).sort());
});

test('V23: carta só cai de monstro que TEM carta (fim da "carta fantasma" do online) e a taxa continua 0,035%',async()=>{
 const core=await engine();
 const w=core.makeWorld('sewer','normal',[member('a','sword')],{seed:99});
 const p=w.players.get('a');
 const kill=(id,n)=>{let cards=0;for(let i=0;i<n;i++){const m=core.testing.spawn(w,id,{at:{x:p.x,y:p.y}});core.testing.defeated(w,m,p);w.mobs=[];
   const found=w.pickups.filter(o=>o.kind==='card');cards+=found.length;w.pickups=[];}return cards;};
 assert.equal(kill('thief_female',30000),0,'Gatuna não tem carta');
 assert.equal(kill('thief_male',30000),0,'Gatuno não tem carta');
 const drain=kill('drainliar',60000); // esperado ≈ 21 (0,035%)
 assert.ok(drain>=8&&drain<=40,'Drainliar continua com 0,035%: '+drain);
 assert.match(read('engine/core.mjs'),/CARDS\.has\(m\.id\)&&rand\(world\)<\(m\.cardRate\?\?\(m\.elite==='mvp'\?\.0075:m\.elite==='miniBoss'\?\.0008:m\.elite\?\.00045:\.00035\)\)/);
});

test('V23: SOR segue a regra do solo — CRIT, Esquiva Perfeita, HIT e FLEE; a sorte NÃO mexe em drop',async()=>{
 const core=await engine();
 const c=core.deriveCharacter('sword',{base:50,stats:{str:40,agi:30,vit:20,int:1,dex:25,luk:31}});
 assert.equal(c.critPct,1+Math.floor(31*.3));            // 10
 assert.equal(c.perfectDodge,1+Math.floor(31/10));       // 4
 assert.equal(c.hit,175+50+25+Math.floor(31/3));         // 260
 assert.equal(c.flee,100+50+30+Math.floor(31/5));        // 186
 const mage=core.deriveCharacter('mage',{base:50,stats:{luk:99,int:80}});
 const w=core.makeWorld('sewer','normal',[member('m','mage',{luk:99}),member('t','thief',{luk:40},{stage:1}),member('s','sword',{luk:40})],{seed:3});
 core.tickWorld(w,.05);
 assert.equal(mage.magic,true);
 assert.equal(core.critChance(w.players.get('m')),0,'magia não crita (regra do solo)');
 assert.equal(core.critChance(w.players.get('t')),2*core.critChance(w.players.get('s')),'Katar (Mercenário) dobra a chance de crítico');
 // A palavra "luk"/SOR não aparece em nenhuma conta de drop do motor.
 const drops=read('engine/core.mjs').slice(read('engine/core.mjs').indexOf('function defeated('),read('engine/core.mjs').indexOf('const targetable='));
 assert.doesNotMatch(drops,/luk|critPct|perfectDodge/);
});

test('V23: crítico só no ataque básico (×1,4), habilidade não crita, e ataque básico pode errar contra FLEE alto',async()=>{
 const core=await engine();
 const w=core.makeWorld('shadow','normal',[member('a','sword',{dex:1,luk:1})],{seed:11}),p=w.players.get('a');
 core.tickWorld(w,.05);
 const mob=core.testing.spawn(w,'deviruchi',{at:{x:p.x+30,y:p.y}});
 let miss=0,crit=0;for(let i=0;i<4000;i++){const r=core.testing.basicStrike(w,p,mob);if(r.miss)miss++;if(r.crit)crit++;}
 assert.ok(miss>200,'personagem de DES 1 erra monstro de nível alto ('+miss+'/4000)');
 assert.ok(crit>0&&crit<120,'CRIT ~1% com SOR 1 ('+crit+'/4000)');
 assert.equal(core.CRIT_MULT,1.4);
 // simula um pouco e confere os eventos: nenhum acerto de habilidade marcado como crítico
 const sim=core.makeWorld('sewer','normal',[member('k','thief',{luk:90},{stage:1})],{seed:5});
 const seen=[];for(let i=0;i<1200;i++){core.command(sim,'k',{auto:true,dx:0,dy:0});core.tickWorld(sim,.05);for(const e of sim.events)if(e.type==='hit')seen.push(e);sim.events.length=0;}
 assert.ok(seen.some(e=>!e.skill&&e.crit),'ataque básico crita com SOR alta');
 assert.ok(!seen.some(e=>e.skill&&e.skill!=='doubleattack'&&e.crit),'habilidade não crita');
});

test('V23: esquiva do jogador usa Esquiva Perfeita + FLEE contra o HIT do monstro (multidão reduz FLEE)',async()=>{
 const core=await engine();
 const w=core.makeWorld('sewer','normal',[member('a','thief',{agi:99,luk:50})],{seed:8}),p=w.players.get('a');
 core.tickWorld(w,.05);
 const mob=core.testing.spawn(w,'thief_female',{at:{x:p.x+20,y:p.y}});
 const rate=contacts=>{p.contacts=contacts;let n=0;for(let i=0;i<5000;i++)if(core.testing.evades(w,p,mob))n++;return n/5000;};
 const alone=rate(1),crowd=rate(9);
 assert.ok(alone>.3,'AGI 99 esquiva bastante sozinho ('+alone+')');
 assert.ok(crowd<alone,'cercado por 9 monstros esquiva menos ('+crowd+' < '+alone+')');
 assert.ok(crowd>=.05,'Esquiva Perfeita (SOR) continua valendo no meio da multidão');
});

test('V23: forja da expedição não mostra mais "undefined" (todo atributo tem nome)',()=>{
 const ctx={run:null,document:{createElement:()=>({})}};vm.createContext(ctx);
 vm.runInContext(read('run-loot.js')+';this.RuneLoot=RuneLoot;',ctx);
 const {bnames,forgeStats}=ctx.RuneLoot;
 for(const key of Object.keys(forgeStats))assert.ok(typeof bnames[key]==='string'&&bnames[key].length>1,'nome da forja para '+key);
 assert.equal(bnames.aspdPct,'Velocidade de ataque');
});

test('V23: pets usam o sprite dos monstros (Poring, Lunático, Bafomé Jr., Esporo, Sohee) e o Poporing é o Poring tingido de verde',()=>{
 const code=read('codex.js');
 assert.match(code,/poring:\{ id:'poring' \}, lunatic:\{ id:'lunatic' \}, baphometjr:\{ id:'baphometjr' \}, poporing:\{ id:'poring', tint:'#59c95f' \}, familiar:\{ id:'spore' \}, alice:\{ id:'sohee', scale:\.5 \}/);
 for(const id of ['poring','lunatic','baphometjr','spore','sohee']){
  assert.ok(fs.existsSync(path.join(root,'assets/ro',id+'.png')),'folha de sprite '+id);
  assert.ok(fs.existsSync(path.join(root,'assets/monsters',id+'.gif')),'retrato do Bestiário '+id);
 }
 assert.match(code,/Art\.draw\(ctx,sprite\.id,action,frame/);
 // Familiar/Alice viraram Esporo/Sohee mantendo a chave do save (quem comprou não perde o pet).
 assert.match(code,/familiar: \{ name:'Esporo', price:2050/);assert.match(code,/alice: \{ name:'Sohee', price:3050/);
 assert.match(read('game.js'),/Codex\.petImage\(id\)/);
});

test('V23: solo = sala local de 1 jogador com o MESMO motor; servidor só entrega .mjs da pasta engine/',()=>{
 const html=read('index.html'),game=read('game.js'),server=read('server.mjs');
 assert.ok(html.indexOf('engine/browser.mjs')<html.indexOf('game.js?v='),'motor carregado antes do game.js');
 assert.ok(html.indexOf('local-room.js')<html.indexOf('game.js?v='));
 assert.match(game,/authoritative: true, local: online !== true/);
 assert.match(game,/if\(run\.local\)LocalRoom\.frame\(run\.localRoom,dt,packPlayer,receiveAuthoritativeWorld/);
 assert.match(game,/const serverOwned=run\.authoritative&&!run\.local;/);
 assert.match(read('engine/browser.mjs'),/import \* as core from '\.\/core\.mjs'/);
 assert.match(read('authoritative-world.mjs'),/import \* as engine from '\.\/engine\/core\.mjs'/);
 assert.match(server,/if\(ext==='\.mjs'&&segments\[0\]!=='engine'\)return send\(res,404/);
 assert.doesNotMatch(read('authoritative-world.mjs'),/function (spawn|hurtMob|tickWorld)\b/,'nenhuma regra fica fora do motor');
});
