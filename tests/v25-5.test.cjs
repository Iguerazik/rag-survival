const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const root=path.join(__dirname,'..');
const url=file=>require('node:url').pathToFileURL(path.join(root,file)).href;
const engine=()=>import(url('authoritative-world.mjs')).then(()=>import(url('engine/core.mjs')));
const account=(stage,gear)=>({items:[{uid:'g1',id:'gladius',refine:0,cards:[]},{uid:'g2',id:'gladius',refine:2,cards:['andre']},{uid:'d1',id:'dagger',refine:0,cards:[]},
 {uid:'k1',id:'katar',refine:0,cards:[]},{uid:'b1',id:'buckler',refine:0,cards:[]},{uid:'c1',id:'claymore',refine:0,cards:[]}],
 journeys:{thief:{v:2,stage,base:90,job:40,stats:{str:70,agi:70,vit:30,int:1,dex:40,luk:20},gear},sword:{v:2,stage:1,base:90,job:40,stats:{str:70},gear:{weapon:'g1',shield:'d1'}}}});

test('V25.5: Algoz equipa adaga/espada na mão esquerda (servidor e navegador usam a mesma regra)',async()=>{
 const G=await import(url('server-gear.mjs'));
 const dual=G.equippedForAccount(account(1,{weapon:'g1',shield:'g2'}),'thief');
 assert.equal(dual.shield?.id,'gladius','Mercenário com Gládio na mão esquerda');
 const b=G.gearForAccount(account(1,{weapon:'g1',shield:'g2'}),'thief');
 assert.equal(b.weaponAtk,105,'ATK da mão direita não soma a esquerda');
 assert.equal(b.offhandAtk,105+2*(3+4*2),'mão esquerda com refino');
 // Gatuno (1ª classe) e Espadachim não podem
 assert.equal(G.equippedForAccount(account(0,{weapon:'g1',shield:'g2'}),'thief').shield,undefined,'Gatuno não usa duas armas');
 assert.equal(G.equippedForAccount(account(1,{weapon:'g1',shield:'d1'}),'sword').shield,undefined,'Cavaleiro não usa duas armas');
 // Katar ocupa as duas mãos
 assert.equal(G.equippedForAccount(account(1,{weapon:'k1',shield:'g2'}),'thief').shield,undefined,'katar + mão esquerda não vale');
 // Escudo continua normal
 assert.equal(G.equippedForAccount(account(1,{weapon:'g1',shield:'b1'}),'thief').shield?.id,'buckler');
 assert.equal(G.gearForAccount(account(1,{weapon:'g1',shield:'b1'}),'thief').offhandAtk,0);
});

test('V25.5: duas armas aumentam o dano na run conforme a Perícia com Mão Esquerda; sem 2ª arma o golpe duplo cai pela metade',async()=>{
 const core=await engine();const G=await import(url('server-gear.mjs'));
 const make=gear=>{const data=account(1,gear);const ch={...data.journeys.thief,gear:G.gearForAccount(data,'thief')};
  const w=core.makeWorld('sewer','normal',[{id:'a',profile:{job:'thief',classId:'assassin'},character:ch}],{seed:1});w.spawnAt=1e9;w.mobs=[];return [w,w.players.get('a')];};
 const [w1,dual]=make({weapon:'g1',shield:'g2'}),[w2,shield]=make({weapon:'g1',shield:'b1'}),[w3,katar]=make({weapon:'k1'});
 for(const p of [dual,shield,katar])p.skills.lefthand=5;
 for(const [w,p] of [[w1,dual],[w2,shield],[w3,katar]])core.tickWorld(w,.05);
 assert.ok(dual.base.dualGain>.1,'ganho bruto das duas armas: '+dual.base.dualGain.toFixed(3));
 assert.ok(Math.abs(dual.st.dmg-shield.st.dmg-dual.base.dualGain*.65)<1e-9,'mão esquerda nv. 5 = 65% do ganho');
 assert.ok(Math.abs(dual.st.dbl-.20)<1e-9&&Math.abs(shield.st.dbl-.10)<1e-9,'golpe duplo: inteiro com 2 armas, metade com escudo');
 assert.ok(Math.abs(katar.st.dbl-.20)<1e-9,'katar ocupa as duas mãos: golpe duplo inteiro');
 // Balanço: duas Gládio com perícia 5 ficam na faixa de uma Katar (±15%), não muito acima
 const eff=p=>p.base.power*(1+p.st.dmg)*(1+p.st.dbl);
 const ratio=eff(dual)/eff(katar);
 assert.ok(ratio>.95&&ratio<1.15,'duas armas x katar: '+ratio.toFixed(3));
});
