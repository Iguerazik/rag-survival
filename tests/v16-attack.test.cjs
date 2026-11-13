const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const code=name=>fs.readFileSync(path.join(root,name),'utf8');
function animations(){
  const c=vm.createContext({itemDb:{bow:{kind:'Arco'},sword:{kind:'Espada'},axe:{kind:'Machado'},rod:{kind:'Cajado'},katar:{kind:'Katar'}},
    roSpriteData:{archer:{actions:{40:[16,5],42:[18,5],46:[22,5],88:[24,8]}},sword:{actions:{40:[16,5],42:[18,5],46:[22,5]}}}});
  vm.runInContext(code('combat-animations.js')+'\nthis.CombatAnimations=CombatAnimations;',c);
  return c.CombatAnimations;
}
test('V16: original eight-direction attack rows and monotonic non-looping frames',()=>{
  const a=animations();
  for(let dir=0;dir<8;dir++){
    const actor={dir};
    a.begin(actor,{now:7,weaponId:'sword',family:'sword',duration:.5});
    const f=[.02,.1,.22,.35,.48].map(t=>a.pose(actor,7+t,'sword',dir,0));
    assert.ok(f.every(p=>p.action===40+dir));
    assert.ok(f.every(p=>p.frame>=0&&p.frame<5));
    assert.ok(f.every((p,i)=>i===0||p.frame>=f[i-1].frame));
    assert.equal(a.pose(actor,7.51,'sword',dir,0).active,false);
  }
});
test('V16: bow holds a wind-up then releases arrow at the contact frame',()=>{
  const a=animations();const actor={dir:6};
  const anim=a.begin(actor,{now:10,weaponId:'bow',family:'archer'});
  assert.equal(anim.type,'bow');assert.ok(anim.impact>.5);
  assert.equal(a.pose(actor,10+.1,'archer',14,0).phase,'windup');
  assert.equal(a.pose(actor,10+anim.duration*.7,'archer',14,0).phase,'strike');
  assert.equal(a.snapshot(actor,10+anim.duration*.5).attack,true);
  assert.equal(a.snapshot(actor,10+anim.duration+1).attack,false);
});
test('V16: mage casting uses action group 88 instead of normal hit frames',()=>{
  const a=animations();const actor={dir:0};
  a.begin(actor,{now:0,weaponId:'rod',kind:'cast',duration:1.1,magic:true});
  const frame=a.pose(actor,.35,'archer',0,0);
  assert.equal(frame.action,88);assert.ok(frame.frame>=0&&frame.frame<8);
});
test('V16: game queues damage to the contact frame and draws front/back weapon layers',()=>{
  const src=code('game.js'),index=code('index.html');
  // V23: a fila de golpes até o quadro de impacto mora no motor (vale para solo e online).
  const core=code('engine/core.mjs'),anim=code('combat-animations.js');
  assert.match(core,/function resolveStrikes\(world,p,visible\)/);
  assert.match(core,/p\.strikes\.push\(\{at:world\.time\+(?:lag\(world,)?p\.animDuration\*\(IMPACT\[weaponType\(p\)\]/);
  // Os quadros de impacto do motor são os mesmos da animação desenhada.
  const shown=Object.fromEntries([...anim.matchAll(/(\w+):\s*\{ duration: [.0-9]+, impact: ([.0-9]+),/g)].map(m=>[m[1],Number(m[2])]));
  const engine=Object.fromEntries([...core.match(/const IMPACT=\{([^}]+)\}/)[1].matchAll(/(\w+):([.0-9]+)/g)].map(m=>[m[1],Number(m[2])]));
  assert.deepEqual(engine,shown);
  assert.match(src,/WeaponVisual\.draw\(ctx,actor,run\.gear\?\.weapon\?\.id(?: \|\| run\.serverWeapon)?,run\.time,\.92,motion,'back'\)/);
  assert.match(index,/combat-animations\.js\?v=(?:1[67]|21)/);
  assert.match(src,/CombatAnimations\.remotePose/);
  assert.match(code('engine/core.mjs'),/animProgress:/);
});
