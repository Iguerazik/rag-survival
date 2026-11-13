'use strict';
/**
 * Weapon attachments for the classic RO character sprite action rows.
 * Equipped icons are kept at a restrained size and moved through a
 * wind-up -> strike/release -> recovery timeline; no floating item card.
 */
const WeaponVisual = (() => {
  const cache = new Map();
  function source(id) {
    if (!id || typeof itemDb === 'undefined' || itemDb[id]?.type !== 'weapon') return null;
    if (!cache.has(id)) {
      const img = new Image(); img.src = 'assets/items/' + id + '.png'; cache.set(id, img);
    }
    const image = cache.get(id);
    return image.complete && image.naturalWidth > 0 ? image : null;
  }
  const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
  function draw(ctx, actor, weaponId, now, scale = .92, pose = null, layer = 'front') {
    if(!weaponId || (typeof itemDb!=='undefined' && itemDb[weaponId] && itemDb[weaponId].type!=='weapon'))return;
    // The hand silhouette renders independently of icon availability.
    const icon=source(weaponId);
    const type = CombatAnimations.weaponKind(weaponId);
    // Inventory icons are only used after cropping alpha and scaling to a small
    // held sprite, never shown as a giant floating inventory card.
    const sourceId=weaponId==='rod'?'staff':weaponId==='knife'?'dagger':weaponId;
    const held=icon||source(sourceId);
    const dir = ((pose?.active ? actor.combatAnim?.direction : actor.dir) ?? actor.dir ?? 0) & 7;
    const behind = dir >= 3 && dir <= 5;
    if ((behind ? 'back' : 'front') !== layer) return;
    const p = pose?.active ? clamp(pose.progress ?? 0, 0, 1) : -1;
    const isAttack = p >= 0 && pose?.kind !== 'cast';
    const isCast = p >= 0 && pose?.kind === 'cast';
    const left = dir === 1 || dir === 2 || dir === 3;
    const sign = left ? -1 : 1;
    const walking = !isAttack && !isCast && actor.walk;
    const bob = walking ? Math.sin(now*14)*1.0 : 0;
    const size = (type === 'bow' ? 22 : type === 'staff' ? 25 : type === 'axe' ? 24 : 21) * scale;
    // Face toward the camera (0), away (4), or sideways (2,6).
    const handX = dir === 0 ? 12 : dir === 4 ? 11 : dir === 2 || dir === 6 ? 14 : 12;
    const handY = dir === 4 ? -23 : -19;
    const lunge = isAttack ? Math.sin(p * Math.PI) * 3.4 : 0;
    let tilt = type === 'bow' ? -.14 : type === 'staff' ? -.25 : type === 'axe' ? .14 : .35;
    if (isAttack) {
      const impact = CombatAnimations.timelines[type]?.impact ?? .55;
      if (type === 'bow') tilt += -.14 * Math.sin(Math.PI*p);
      else if (p < impact) tilt -= .8 * (p / impact);
      else tilt += -.8 + 1.6 * Math.min(1,(p - impact)/Math.max(.1, 1-impact));
    } else if (isCast) tilt -= Math.sin(p*Math.PI)*.12;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(actor.x, actor.y);
    ctx.scale(1, 1/.73); // The same projection as actorSprite().
    ctx.translate(sign * (handX + lunge) * scale, (handY + bob) * scale);
    ctx.scale(sign, 1);
    ctx.rotate(tilt);
    ctx.shadowColor = '#101321'; ctx.shadowOffsetX = 1; ctx.shadowOffsetY = 1; ctx.shadowBlur = 0;
    if(held){
      const cacheKey='midgardSpriteBounds';
      let crop=held[cacheKey];
      if(!crop){
        try{
          const tmp=document.createElement('canvas');tmp.width=held.naturalWidth;tmp.height=held.naturalHeight;
          const t=tmp.getContext('2d',{willReadFrequently:true});t.drawImage(held,0,0);
          const pixels=t.getImageData(0,0,tmp.width,tmp.height).data;
          let minX=tmp.width,minY=tmp.height,maxX=-1,maxY=-1;
          for(let y=0;y<tmp.height;y++)for(let x=0;x<tmp.width;x++)if(pixels[(y*tmp.width+x)*4+3]>70){
            minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
          }
          crop=maxX<0?{x:0,y:0,w:tmp.width,h:tmp.height}:{x:minX,y:minY,w:maxX-minX+1,h:maxY-minY+1};
          held[cacheKey]=crop;
        }catch{crop={x:0,y:0,w:held.naturalWidth,h:held.naturalHeight};}
      }
      const maxSide=(type==='bow'?24:type==='staff'?29:type==='axe'?25:23)*scale;
      const factor=maxSide/Math.max(crop.w,crop.h),width=crop.w*factor,height=crop.h*factor;
      ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.shadowOffsetX=0;ctx.shadowOffsetY=0;
      ctx.drawImage(held,crop.x,crop.y,crop.w,crop.h,-width/2,-height/2,width,height);
      if(isCast && type==='staff'){
        ctx.strokeStyle='#98cbff';ctx.globalAlpha=.65*Math.sin(p*Math.PI);ctx.lineWidth=1.4;
        ctx.beginPath();ctx.arc(0,-height*.36,4+Math.sin(p*Math.PI)*3,0,Math.PI*2);ctx.stroke();
      }
      ctx.restore();
      return;
    }
    // Fallback for a missing asset; normally a cropped sprite is shown.
    ctx.lineCap='square';ctx.lineJoin='miter';
    ctx.strokeStyle='#261d28';ctx.lineWidth=3.8;
    if(type==='bow'){
      ctx.beginPath();ctx.moveTo(size*.13,-size*.48);ctx.quadraticCurveTo(-size*.58,0,size*.13,size*.47);ctx.stroke();
      ctx.strokeStyle='#b98348';ctx.lineWidth=2.8;ctx.beginPath();ctx.moveTo(size*.13,-size*.48);ctx.quadraticCurveTo(-size*.45,0,size*.13,size*.47);ctx.stroke();
    }else{
      const length=type==='staff'?size*.92:size*.70;
      ctx.beginPath();ctx.moveTo(0,size*.36);ctx.lineTo(0,-length);ctx.stroke();
      ctx.strokeStyle=type==='staff'?'#9e7155':'#b7a4a0';ctx.lineWidth=2.4;
      ctx.beginPath();ctx.moveTo(0,size*.34);ctx.lineTo(0,-length);ctx.stroke();
      ctx.fillStyle=type==='staff'?'#7ac9f4':type==='axe'?'#d5e3eb':'#e2e7e6';
      if(type==='axe'){ctx.fillRect(-size*.35,-length,size*.52,size*.29);ctx.fillStyle='#708b99';ctx.fillRect(-size*.33,-length+2,size*.15,size*.18);}
      else if(type==='staff'){ctx.beginPath();ctx.arc(0,-length,4,0,Math.PI*2);ctx.fill();}
      else{ctx.beginPath();ctx.moveTo(0,-length-size*.28);ctx.lineTo(-size*.12,-length);ctx.lineTo(size*.12,-length);ctx.closePath();ctx.fill();}
    }
    if (type === 'bow') {
      // Pull the string while preparing; the real projectile appears at the release frame.
      const drawBack = isAttack && p < .62 ? Math.sin(p / .62 * Math.PI*.5) : 0;
      ctx.strokeStyle = '#f6e7c0'; ctx.lineWidth = 1.4;
      ctx.beginPath();ctx.moveTo(-size*.13,-size*.44);
      ctx.lineTo(-size*.29-drawBack*4, -size*.03);
      ctx.lineTo(-size*.13,size*.40);ctx.stroke();
      if (isAttack && p < .62) {
        ctx.strokeStyle = '#dbd4aa'; ctx.lineWidth = 1.7;
        ctx.beginPath();ctx.moveTo(-size*.29-drawBack*4, -size*.03);
        ctx.lineTo(size*.42-drawBack*4, -size*.03);ctx.stroke();
      }
    }
    if (isAttack && type !== 'bow' && p >= .37 && p <= .78) {
      ctx.strokeStyle = type === 'staff' ? '#b7c6fc' : '#f4e1bd';
      ctx.lineWidth = 1.8;ctx.globalAlpha = Math.min(.56,Math.sin((p-.37)/.41*Math.PI)*.56);
      ctx.beginPath();ctx.arc(0, -size*.12, size*.48,-1.5,.4);ctx.stroke();
    }
    if (isCast && type === 'staff') {
      const pulse = Math.sin(p*Math.PI);
      ctx.globalAlpha = .5*pulse;
      ctx.strokeStyle='#a8d4ff';ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(0,-size*.45,7+pulse*4,0,Math.PI*2);ctx.stroke();
    }
    ctx.restore();
  }
  return {draw,source};
})();
