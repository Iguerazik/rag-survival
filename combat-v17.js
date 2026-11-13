'use strict';
/**
 * Combat micro-FX synced to action frame groups of the existing classic
 * Ragnarok character sheets. Adds cast charging, release and weapon sweeps
 * without modifying hitboxes, damage or sprite licensing.
 */
const CombatV17=(()=>{
  const TAU=Math.PI*2;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const spellColor=(id,kind)=>{
    if(/fire|meteor|ignition|magnum|flame|cartterm|crimson|comet/i.test(id))return '#ff9455';
    if(/frost|ice|stormgust|cold|water|freeze/i.test(id))return '#93ddff';
    if(/lightning|vermilion|thunder|chain|jupiter|ray/i.test(id))return '#b2a0ff';
    if(/heal|sanctuary|holy|bless|adoramus|magnus|judex/i.test(id))return '#f9eaa9';
    if(/poison|venom|acid/i.test(id))return '#bce37f';
    return kind==='cast'?'#b1d1ff':'#f6dcaa';
  };
  function circle(ctx,r,start,end){ctx.beginPath();ctx.arc(0,0,r,start,end);ctx.stroke()}
  function draw(ctx,actor,pose,now,scale=1){
    if(!pose?.active)return;
    const p=clamp(pose.progress||0,0,.999);
    const color=spellColor(pose.skillId||'',pose.kind);
    ctx.save();ctx.translate(actor.x,actor.y);ctx.scale(scale,scale/.73);
    if(pose.kind==='cast'){
      // Three stages: formation, channeling, release. Stable pixel-leaning runes.
      const charge=Math.min(1,p/.68),fade=p>.78?1-(p-.78)/.22:1;
      ctx.globalAlpha=.2+.55*clamp(fade,0,1);ctx.strokeStyle=color;ctx.lineWidth=1.5;
      ctx.translate(0,-3);ctx.save();ctx.scale(1,.52);
      for(const r of [26+charge*5,36+charge*4])circle(ctx,r,0,TAU);
      for(let i=0;i<8;i++){
        const angle=i*TAU/8+now*.75;
        const r=32+charge*5;ctx.save();ctx.translate(Math.cos(angle)*r,Math.sin(angle)*r);
        ctx.rotate(angle+Math.PI/4);ctx.strokeRect(-3,-3,6,6);ctx.restore();
      }
      ctx.restore();
      for(let i=0;i<5;i++){
        const angle=i*TAU/5+now*1.6, radius=10+charge*17;
        ctx.fillStyle=i%2?'#fdf6d4':color;ctx.fillRect(Math.round(Math.cos(angle)*radius)-2,Math.round(-17+Math.sin(angle)*7-charge*10),3,3);
      }
      if(p>.68){ctx.globalAlpha=.7*(1-p)/.32;ctx.lineWidth=2.3;circle(ctx,27+(p-.68)*60,0,TAU)}
    }else if(pose.type==='bow'){
      // Arrow release flare. The actual projectile comes from game.fireShot().
      if(p>.51&&p<.77){const alpha=Math.sin((p-.51)/.26*Math.PI);ctx.globalAlpha=alpha*.75;
        ctx.fillStyle='#fff6ce';const side=[1,2,3].includes(actor.dir)?-1:1;
        const x=side*17,y=-26;ctx.fillRect(x-2,y-5,4,10);ctx.fillRect(x-5,y-2,10,4)}
    }else{
      // Slash arc visible only in the contact stage; one sweep per attack.
      const impact=pose.impact||.55;
      if(p>impact-.18&&p<impact+.20){
        const alpha=Math.sin(clamp((p-(impact-.18))/.38,0,1)*Math.PI);
        ctx.globalAlpha=alpha*.72;ctx.strokeStyle=color;ctx.lineWidth=pose.type==='axe'?5:pose.type==='dagger'?2.4:3.4;
        const mirrored=[1,2,3].includes(actor.dir)?-1:1;
        ctx.scale(mirrored,1);circle(ctx,25,-Math.PI*.95+p*.6,-Math.PI*.10+p*.6);
      }
    }
    ctx.restore();
  }
  function reaction(ctx,actor,now,scale=1){
    if(actor.hp<=0){ctx.save();ctx.globalAlpha=.28;ctx.fillStyle='#1b0b23';ctx.fillRect(actor.x-10,actor.y-37,20,3);ctx.restore();return}
    if(!actor.hitFlash||actor.hitFlash<=now)return;
    const alpha=clamp((actor.hitFlash-now)/.24,0,1);
    ctx.save();ctx.globalAlpha=alpha*.85;ctx.strokeStyle='#ff9b9b';ctx.lineWidth=2;
    const y=actor.y-23*scale;
    ctx.beginPath();ctx.moveTo(actor.x-18,y-9);ctx.lineTo(actor.x-10,y+4);ctx.moveTo(actor.x+18,y-9);ctx.lineTo(actor.x+10,y+4);ctx.stroke();
    ctx.restore();
  }
  return {draw,reaction,spellColor};
})();
