const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const cx=vm.createContext({});
vm.runInContext(read('run-loot.js')+'\nthis.RuneLoot=RuneLoot;',cx);
const R=cx.RuneLoot;
test('V14: each chest draws exactly 3 distinct valid temporary choices',()=>{
 const s=R.initial();
 for(const family of ['mage','archer','sword','acolyte','merchant','thief']){
  const ids=R.options(s,{mapTier:2,family,source:'elite',time:60},()=>.4);
  assert.equal(ids.length,3);assert.equal(new Set(ids).size,3);
  for(const id of ids){assert.ok(R.perks[id]);assert.ok(!R.perks[id].classes||R.perks[id].classes.includes(family));}
 }
});
test('V14: a single perk cannot overlevel, completed combinations award once',()=>{
 const s=R.initial();
 for(let i=0;i<R.perks.ember.cap;i++)assert.equal(R.apply(s,'ember').ok,true);
 assert.equal(R.apply(s,'ember').ok,false);
 let r=R.apply(s,'firemark');assert.equal(r.discovered.length,1);
 assert.equal(r.discovered[0].name,'Estilhaços de Muspelheim');
 r=R.apply(s,'firemark');assert.equal(r.discovered.length,0);
 assert.ok(R.bonuses(s).spellPct>.0);
});
test('V14: forging is run-only and cannot increase above level 4',()=>{
 const s=R.initial();const gear={weapon:{id:'bow'}};
 const choices=R.forgeOptions(s,gear,()=>.35);
 assert.equal(choices.length,3);
 const a=choices[0];for(let i=0;i<4;i++)assert.equal(R.forgePick(s,a),true);
 assert.equal(R.forgePick(s,a),false);
 assert.ok(R.bonuses(s)[a.key]>0);
});
test('V14: every perk icon exists, as do all class starter weapon assets',()=>{
 for(const p of Object.values(R.perks))assert.ok(fs.existsSync(path.join(root,'assets','ro',`skill-${p.icon}.png`)),p.icon);
 const g=vm.createContext({});vm.runInContext(read('items.js').split('const ItemQuality =')[0]+'\nthis.starterGear=starterGear;this.itemDb=itemDb;',g);
 for(const line of Object.keys(g.starterGear)){
  const weapon=g.starterGear[line].find(id=>g.itemDb[id].type==='weapon');
  assert.ok(weapon, line);assert.ok(fs.existsSync(path.join(root,'assets','items',weapon+'.png')),weapon);
 }
});
test('V14: weapon renderer is configured to use the currently equipped weapon, including cooperative data',()=>{
 assert.match(read('game.js'),/WeaponVisual\.draw\(ctx,actor,run\.gear\?\.weapon\?\.id(?: \|\| run\.serverWeapon)?,run\.time/);
 assert.match(read('game.js'),/WeaponVisual\.draw\(ctx,actor,actor\.weapon,run\.time/);
 assert.match(read('engine/core.mjs'),/weapon=\{sword:/);
 assert.match(read('index.html'),/weapon-visual\.js\?v=(?:1[467]|21)/);
});
