const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
test('V17: all 31 playable class sprites have original or generated attack + casting groups',()=>{
 const context=vm.createContext({});
 for(const name of ['assets/ro/sprites.js','assets/ro/renewal-sprites.js','assets/ro/v17-cast-actions.js'])
  vm.runInContext(read(name)+';this.roSpriteData=roSpriteData;',context);
 const playable=['sword','mage','archer','acolyte','merchant','thief','highnovice','highsword','highmage','higharcher','highacolyte','highmerchant','highthief','knight','wizard','hunter','priest','blacksmith','assassin','lordknight','highwizard','sniper','highpriest','whitesmith','assassincross','runeknight','warlock','ranger','archbishop','mechanic','guillotine'];
 assert.equal(playable.length,31);
 for(const id of playable){
  const data=context.roSpriteData[id];assert.ok(data,id);
  for(const dir of [0,2,4,6]){
   assert.ok(data.actions[40+dir],`no attack: ${id} dir=${dir}`);
   const cast=data.actions[88+dir];assert.ok(cast,`no cast: ${id} dir=${dir}`);
   const png=fs.readFileSync(path.join(root,'assets','ro',id+'.png'));
   const h=png.readUInt32BE(20);assert.ok((cast[0]+1)*data.h<=h,`cast outside PNG: ${id}`);
  }
 }
});
