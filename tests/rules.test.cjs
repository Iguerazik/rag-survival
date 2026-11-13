const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
function context(){const c=vm.createContext({bosses:{mvp:{}},skillLevel:(talents,id)=>talents[id]?.level||0});vm.runInContext(fs.readFileSync(path.join(root,'roguelike.js'),'utf8')+'\nthis.combos=RuneCombos;',c);return c;}
test('every recipe needs learned skills, correct family, preparation and a bounded cooldown',()=>{
 const c=context();assert.equal(c.combos.recipes.length,30);
 for(const r of c.combos.recipes){
  const run={line:r.family,time:1,talents:{[r.first]:{level:2},[r.second]:{level:2}}};
  const target={hp:100,elite:'elite'},state={};
  assert.equal(c.combos.trigger(state,{id:r.second},target,run).some(v=>v.id===r.id),false);
  c.combos.trigger(state,{id:r.first},target,run);
  assert.equal(c.combos.trigger(state,{id:r.second},target,run).some(v=>v.id===r.id),true);
  c.combos.trigger(state,{id:r.first},target,run);
  assert.equal(c.combos.trigger(state,{id:r.second},target,run).some(v=>v.id===r.id),false);
 }
});
test('boss combinations cannot trigger on common enemies or expired preparation',()=>{
 const c=context(),r=c.combos.recipes[0];const run={line:r.family,time:1,talents:{[r.first]:{level:2},[r.second]:{level:2}}};
 const state={};c.combos.trigger(state,{id:r.first},{hp:100},run);
 assert.equal(c.combos.trigger(state,{id:r.second},{hp:100},run).length,0);
 run.time=8;assert.equal(c.combos.trigger(state,{id:r.second},{hp:100,elite:true},run).length,0);
});
test('all difficulties retain a bounded population for one to six players',()=>{
 const c=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(root,'difficulty.js'),'utf8')+'\nthis.difficulty=RunDifficulty;',c);
 for(const id of Object.keys(c.difficulty.modes))for(let players=1;players<=6;players++){const f=c.difficulty.factors(id,players);assert.ok(f.maxMobs>0&&f.maxMobs<=400);}
});
test('elemental tables preserve source orientation, four levels and MVP weaknesses',()=>{
 const c=vm.createContext({mobElements:{moonlight:'fire',baphomet:'shadow',poring:'water'}});
 vm.runInContext(fs.readFileSync(path.join(root,'elements.js'),'utf8')+'\nthis.elements=Elemental;',c);
 assert.equal(c.elements.matrices.length,4);
 for(const table of c.elements.matrices){assert.equal(table.length,10);for(const row of table){assert.equal(row.length,10);for(const rate of row)assert.ok(rate>=0&&rate<=2);}}
 assert.equal(c.elements.factor('water','moonlight'),2);assert.equal(c.elements.factor('fire','moonlight'),0);assert.equal(c.elements.factor('holy','baphomet'),1.75);
});
test('wing rates are bounded, butterfly is rarer, and neither has starting stock',()=>{
 const c=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(root,'run-items.js'),'utf8')+'\nthis.items=RunRelics;',c);
 for(const rate of Object.values(c.items.dropRates)){assert.ok(rate.flywing>rate.butterflywing);for(const n of Object.values(rate))assert.ok(n>=0&&n<=1);}
 assert.equal(c.items.dropRates.common.butterflywing,0);assert.equal(c.items.dropRates.common.flywing,.0004);
});
test('all 37 monster properties match the checked database records',()=>{
 const c=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(root,'cards.js'),'utf8')+fs.readFileSync(path.join(root,'elements.js'),'utf8')+'\nthis.elements=Elemental;',c);
 const expected=JSON.parse(fs.readFileSync(path.join(__dirname,'monster-properties.json'),'utf8'));
 assert.equal(Object.keys(expected).length,37);for(const [id,p]of Object.entries(expected)){assert.equal(c.elements.property(id).element,p.element,id);assert.equal(c.elements.property(id).level,p.level,id);}
 assert.equal(c.elements.skillElement({id:'comet'}),'neutral');
});
