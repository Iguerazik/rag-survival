const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const dir=path.resolve(__dirname,'..');
const src=file=>fs.readFileSync(path.join(dir,file),'utf8');
function makeContext(){
  const saved={wings:{flywing:1},flyConfig:{enabled:false}};
  const run={time:100,player:{x:0,y:0,hp:100,immunity:0},mapTier:1,field:{nav:Array(100).fill(1)},mobs:[],goldDrops:[],gems:[],xp:0,zeny:0,chests:[],claimedChests:new Set(),bonus:{},difficulty:'easy',inMvp:false};
  const s={saved,run,mode:'play',Math,TAU:Math.PI*2,distance:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),
    cellCenter:i=>({x:i*100,y:0}),MazeWarps:{roomAt:()=>0},
    nearestWalkable:p=>p,RunDifficulty:{get:()=>({xp:1})},Codex:{petBonuses:()=>({goldBonus:0})},
    announce:()=>{},SkillFX:{play:()=>{}},persist:patch=>Object.assign(saved,patch),
    bosses:{},maxHp:()=>100,moveRoute:[],moveTarget:undefined,nextFlow:0,
    refreshStatus:()=>{},refresh:()=>{},button:()=>{},ctx:{},ring:()=>{},
  };
  const ctx=vm.createContext(s);
  vm.runInContext(src('run-items.js')+'\nthis.Relics=RunRelics;',ctx);
  return {s,ctx,relics:ctx.Relics};
}
test('V15 - collection magnet clears every gem and coin and grants them once',()=>{
 const {s,relics}=makeContext();s.run.gems.push({xp:12},{xp:30});s.run.goldDrops.push({amount:6},{amount:9});
 assert.equal(relics.claimPickup({uid:'xp-1',kind:'xpMagnet'}),true);
 assert.equal(s.run.gems.length,0);assert.equal(s.run.xp,42);
 assert.equal(relics.claimPickup({uid:'z-1',kind:'goldMagnet'}),true);
 assert.equal(s.run.goldDrops.length,0);assert.equal(s.run.zeny,15);
 relics.claimPickup({uid:'xp-1',kind:'xpMagnet'});relics.claimPickup({uid:'z-1',kind:'goldMagnet'});
 assert.equal(s.run.xp,42);assert.equal(s.run.zeny,15);
});
test('V15 - fly wing schedules existing commander, does not spawn a duplicate',()=>{
 const {s,relics}=makeContext();
 const boss={uid:42,hp:500,elite:'miniBoss',id:'boss',x:100,y:0};s.run.mobs.push(boss);
 assert.equal(relics.fly(),true);
 assert.equal(s.run.flyPursuers[0],42);assert.equal(s.run.bossPursuitAt,103.4);
 assert.equal(s.run.mobs.length,1);assert.equal(s.saved.wings.flywing,0);
});
test('V15 - guild mission accumulates channeling time after taking damage',()=>{
 const s={run:{time:30,guest:false,inMvp:false,portal:null,player:{x:0,y:0,hp:100},map:'sewer',contract:null},
    nearestWalkable:p=>p,distance:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),announce:()=>{},
    document:{getElementById:()=>({after(){},childElementCount:1})},};
 const ctx=vm.createContext(s);vm.runInContext(src('roguelike.js')+'\nthis.Q=ExpeditionQuest;',ctx);
 const q=ctx.Q;q.init();s.run.contract={route:'seal',stage:2,charge:4,node:{x:0,y:0},eliteKills:2,done:false,damagePauseUntil:30.5};
 q.tick(.1);assert.equal(s.run.contract.charge,4);
 s.run.time=30.6;q.tick(.5);assert.equal(s.run.contract.charge,4.5);
 s.run.contract.node={x:10000,y:10000};q.tick(.5);assert.ok(s.run.contract.charge>4);
});
test('V15 - rift performance budgets and equipment UI overrides load',()=>{
 assert.match(src('roguelike.js'),/run\.shots\.length>90/);
 assert.match(src('roguelike.js'),/run\.effects\.length>36/);
 assert.match(src('skillfx.js'),/run\?\.rift\?\.active \? 28/);
 assert.match(src('ro-windows.js'),/ro-v15-slot-label/);
 assert.match(src('index.html'),/v15-polish\.css\?v=15/);
 assert.ok(src('v15-polish.css').includes('ro-paper-doll'));
});
