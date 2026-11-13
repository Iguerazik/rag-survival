const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=f=>fs.readFileSync(path.join(root,f),'utf8');
const cx=vm.createContext({});
vm.runInContext(source('expedition.js')+'\n'+source('campaign.js')+'\nthis.Campaign=Campaign;this.order=mapOrder;this.zones=expeditions;',cx);
const {Campaign,order,zones}=cx;
test('V13 expands campaign to 10 distinct areas with a progression order',()=>{
 assert.equal(order.length,10);
 assert.equal(new Set(order.map(id=>zones[id].name)).size,10);
 assert.deepEqual(Array.from(order.slice(-4)),['glast','mine','temple','shadow']);
});
test('new characters start with two difficulty choices and first zone',()=>{
 const save={campaign:{}};
 for(const line of ['sword','mage','archer','merchant','acolyte','thief']){
  assert.equal(Campaign.mapUnlocked(save,line,order[0]),true);
  assert.equal(Campaign.mapUnlocked(save,line,order[1]),false);
  for(const id of ['easy','normal']) assert.equal(Campaign.difficultyUnlocked(save,line,id),true);
  for(const id of ['hard','nightmare','story']) assert.equal(Campaign.difficultyUnlocked(save,line,id),false);
 }
});
test('clears belong only to the chosen character; not shared across all classes',()=>{
 let s={campaign:{}};
 s.campaign=Campaign.markCleared(s,'mage','sewer','easy');
 assert.equal(Campaign.mapUnlocked(s,'mage','payon'),true);
 assert.equal(Campaign.mapUnlocked(s,'sword','payon'),false);
 assert.equal(Campaign.difficultyUnlocked(s,'mage','hard'),false);
});
test('hard unlocks after clearing every Normal zone for ONE character, nightmare after Hard',()=>{
 let s={campaign:{}};
 for(const id of order) s.campaign=Campaign.markCleared(s,'sword',id,'normal');
 assert.equal(Campaign.difficultyUnlocked(s,'sword','hard'),true);
 assert.equal(Campaign.difficultyUnlocked(s,'sword','nightmare'),false);
 assert.equal(Campaign.difficultyUnlocked(s,'mage','hard'),false);
 for(const id of order) s.campaign=Campaign.markCleared(s,'sword',id,'hard');
 assert.equal(Campaign.difficultyUnlocked(s,'sword','nightmare'),true);
 assert.equal(Campaign.validDifficulty(s,'mage','hard'),'normal');
});
test('legacy V12 progress attaches to selected character only',()=>{
 const save=Campaign.migrate({selected:'archer',cleared:{sewer:true,payon:true}},'archer');
 assert.equal(Campaign.mapUnlocked(save,'archer','maze'),true);
 assert.equal(Campaign.mapUnlocked(save,'mage','payon'),false);
 assert.equal(Campaign.difficultyUnlocked(save,'archer','hard'),false);
});
test('new stats are earned on base levels, not frontloaded at character creation',()=>{
 const s=vm.createContext({});vm.runInContext(source('status.js')+'\nthis.R=RO;',s);
 assert.equal(s.R.startPoints(0),0);assert.equal(s.R.startPoints(2),60); // V25.4: renascimento com 60 pontos
 assert.ok(s.R.totalPoints(0,10)>s.R.totalPoints(0,1));
 assert.ok(s.R.levelPoints(20)>s.R.levelPoints(1));
});
test('all Codex recipe skills and gear have bundled icon assets',()=>{
 const found=Array.from(source('codex.js').matchAll(/skill:'([^']+)', item:'([^']+)'/g));
 assert.ok(found.length>=18);
 for(const [,skill,item]of found){
  assert.ok(fs.existsSync(path.join(root,'assets/ro/skill-'+skill+'.png')),skill);
  assert.ok(fs.existsSync(path.join(root,'assets/items/'+item+'.png')),item);
 }
 const seq=source('roguelike.js').match(/const recipes\s*=\s*\[([\s\S]*?)\]\.map/);
 assert.ok(seq,'RuneCombos recipes exist');
 const pairs=Array.from(seq[1].matchAll(/\['(?:sword|mage|archer|acolyte|merchant|thief)','[^']+','([^']+)','([^']+)'/g));
 assert.ok(pairs.length>=20);
 for(const [,one,two]of pairs)for(const skill of [one,two]) assert.ok(fs.existsSync(path.join(root,'assets/ro/skill-'+skill+'.png')),skill);
});
test('the V13 UI wires visible RuneCombo images, real equipment comparisons and no D shortcut',()=>{
 assert.ok(source('game.js').includes('visuals.append(first,arrow,second)'));
 assert.ok(source('game.js').includes('compareEquipment(item,currentLine,inGame)'));
 assert.ok(source('index.html').includes('id="run-codex"'));
 assert.ok(!/id="run-codex"[^>]*>[^<]*<img[^>]*>[^<]*<span>[^<]*<\/span><kbd>D<\/kbd>/.test(source('index.html')));
});
test('all new dungeon layouts build, spawn on walkable floor, and have broad playable space',()=>{
 const canvasCtx={createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4)};},putImageData(){}};
 const env=vm.createContext({document:{createElement(){return {getContext(){return canvasCtx;}};}}});
 vm.runInContext(source('mapgen.js')+'\nthis.buildMap=MapGen.build;',env);
 for(const id of ['glast','mine','temple','shadow']){
   const map=env.buildMap(id);
   assert.equal(map.theme,id);
   assert.ok(map.w>=200 && map.h>=200);
   const xy=map.spawn.map(pos=>Math.floor((pos+map.w*map.cell/2)/map.cell));
   assert.equal(map.nav[xy[1]*map.w+xy[0]],1,`${id}: spawn must be walkable`);
   assert.ok(map.nav.reduce((a,n)=>a+n,0)>13000,`${id}: enough open area`);
 }
});
