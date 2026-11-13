'use strict';
// Codex progression and pet bonuses are self-contained, local-save systems.
// Original game-specific combinations, not claimed as official Gravity rules.
const Codex = (() => {
  const recipes = {
    winter: { name:'Inverno Arcano', skill:'stormgust', item:'arcwand', description:'Nevasca + Cajado Arcano', bonus:{ spellPct:.10, hpRegen:.4 } },
    thunder: { name:'Trovão Aprimorado', skill:'vermilion', item:'staff', description:'Ira de Thor + Cajado', bonus:{ spellPct:.08, agi:2 } },
    abyss: { name:'Eclipse do Mago', skill:'napalm', item:'wand', description:'Vulcão Napalm + Varinha', bonus:{ int:3 } },
    falling: { name:'Cometa Astral', skill:'comet', item:'arcwand', description:'Cometa + Cajado Arcano', bonus:{ spellPct:.13 } },
    meteor: { name:'Meteoro Vivo', skill:'crimson', item:'staff', description:'Meteoro Escarlate + Cajado', bonus:{ spellPct:.09, vit:2 } },
    shock: { name:'Condutor Rúnico', skill:'lightning', item:'wand', description:'Corrente Elétrica + Varinha', bonus:{ dex:3 } },
    knight: { name:'Lâmina Valente', skill:'bash', item:'tsurugi', description:'Golpe Fulminante + Tsurugi', bonus:{ str:3, atkPct:.04 } },
    bowling: { name:'Vórtice de Aço', skill:'bowling', item:'claymore', description:'Impacto de Tyr + Claymore', bonus:{ atkPct:.09 } },
    rune: { name:'Dragão da Forja', skill:'dragon', item:'claymore', description:'Sopro do Dragão + Claymore', bonus:{ atkPct:.08, hpRegen:.6 } },
    ignition: { name:'Brasa Imortal', skill:'ignition', item:'platearmor', description:'Impacto Flamejante + Armadura de Placas', bonus:{ vit:4 } },
    rain: { name:'Chuva de Flechas', skill:'shower', item:'arbalest', description:'Chuva de Flechas + Arbaleste', bonus:{ dex:3, atkPct:.04 } },
    archer: { name:'Olhar de Caçador', skill:'falcon', item:'gakkung', description:'Ataque Aéreo + Gakkung', bonus:{ crit:3 } },
    storm: { name:'Tempestade Veloz', skill:'arrowstorm', item:'gakkung', description:'Tempestade de Flechas + Gakkung', bonus:{ atkPct:.11 } },
    light: { name:'Luz de Ymir', skill:'heal', item:'rosary', description:'Curar + Rosário', bonus:{ hpRegen:1.2 } },
    sanctuary: { name:'Santuário Sagrado', skill:'magnus', item:'saintrobe', description:'Magnus Exorcismus + Túnica Sagrada', bonus:{ vit:3, int:3 } },
    forge: { name:'Fúria do Ferreiro', skill:'axetornado', item:'buster', description:'Tornado de Machado + Destruidor', bonus:{ str:3, atkPct:.06 } },
    shadows: { name:'Lâminas do Crepúsculo', skill:'rolling', item:'katar', description:'Lâminas de Loki + Katar', bonus:{ agi:4 } },
    sonic: { name:'Garra Sombria', skill:'sonicblow', item:'jur', description:'Lâminas Destruidoras + Jur', bonus:{ crit:5, atkPct:.03 } },
  };
  const pets = {
    poring: { name:'Poring', price:380, desc:'Pequeno coletor. HP regenerado +0,6/s.', color:'#eb93ab', bonus:{ hpRegen:.6 }, range:33 },
    lunatic: { name:'Lunático', price:820, desc:'Esquiva e velocidade de movimento +5%.', color:'#efdfc7', bonus:{ agi:2, speed:.05 }, range:42 },
    poporing: { name:'Poporing', price:1350, desc:'EXP recolhida +10% e VIT +2.', color:'#91d989', bonus:{ vit:2, xpBonus:.10 }, range:47 },
    familiar: { name:'Esporo', price:2050, desc:'Crítico +5 e FOR +3.', color:'#9b78b9', bonus:{ crit:5, str:3 }, range:52 },
    alice: { name:'Sohee', price:3050, desc:'INT +4 e regeneração de HP +1,8/s.', color:'#acc9e6', bonus:{ int:4, hpRegen:1.8 }, range:62 },
    baphometjr: { name:'Bafomé Jr.', price:4250, desc:'Dano +8%, agilidade +3.', color:'#a98bce', bonus:{ atkPct:.08, spellPct:.08, agi:3 }, range:70 },
  };
  const upgrades = {
    pickupGold: { name:'Coletar Zeny', price:210, max:1, desc:'O pet coleta moedas.' },
    pickupXp: { name:'Coletar EXP', price:390, max:1, desc:'O pet coleta cristais de experiência.' },
    pickupHeals: { name:'Coletar Cura', price:600, max:1, desc:'O pet recolhe poções quando falta HP.' },
    range: { name:'Ímã do Pet', price:450, max:4, desc:'Cada nível amplia o alcance de coleta em 22 unidades.' },
  };
  function defaults(save) { return { coins: Math.max(0,save.codexCoins||0), found:save.codexFound||{}, owned:save.petsOwned||{}, active:save.activePet||null, upgrades:save.petUpgrades||{} }; }
  function check(run, save) {
    const unlocked=[];
    run.combos ??= new Set();
    let reward=0;
    const found={ ...(save.codexFound||{}) };
    const equipped=new Set(Object.values(run.gear).filter(Boolean).map(item=>item.id));
    for (const [id, r] of Object.entries(recipes)) {
      if ((run.talents[r.skill]?.level||0)<2 || !equipped.has(r.item)) continue;
      if (!run.combos.has(id)) { run.combos.add(id); if (!found[id]) { found[id]=true; reward+=240; unlocked.push(r.name); } }
    }
    return { unlocked, update:reward ? { codexFound:found, codexCoins:(save.codexCoins||0)+reward } : null };
  }
  function comboBonuses(run) {
    const b={str:0,agi:0,vit:0,int:0,dex:0,luk:0,crit:0,atkPct:0,spellPct:0,hpRegen:0};
    for(const id of run.combos||[]) for(const [key,n] of Object.entries(recipes[id]?.bonus||{})) b[key]=(b[key]||0)+n;
    return b;
  }
  function petBonuses(save) { const id=save.activePet; return save.petsOwned?.[id]?pets[id]?.bonus||{}:{}; }
  function magnetRange(save) { const id=save.activePet; return save.petsOwned?.[id] ? (pets[id]?.range||35)+(save.petUpgrades?.range||0)*22 : 0; }
  function canCollect(save, type) { return !!save.activePet && !!save.petsOwned?.[save.activePet] && !!save.petUpgrades?.[type]; }
  function buyPet(save,id) { const p=pets[id]; if(!p||save.petsOwned?.[id]||(save.codexCoins||0)<p.price) return null;
    return { codexCoins:save.codexCoins-p.price, petsOwned:{...save.petsOwned,[id]:true}, activePet:id }; }
  function buyUpgrade(save,id) {const u=upgrades[id],level=save.petUpgrades?.[id]||0, price=u?.price*Math.pow(2,level);
    if(!u||level>=u.max||(save.codexCoins||0)<price||!save.petsOwned?.[save.activePet])return null;
    return {codexCoins:save.codexCoins-price, petUpgrades:{...save.petUpgrades,[id]:level+1}};
  }
  // V23: pets com o MESMO sprite dos monstros do jogo/Bestiário. Poporing usa o sprite do Poring tingido de verde.
  // V23: Familiar e Alice não tinham arte no jogo e viraram Esporo e Sohee (pets domesticáveis do RO com sprite).
  // A chave interna continua 'familiar'/'alice', então quem já comprou mantém o pet, o bônus e as melhorias.
  const petSprites = { poring:{ id:'poring' }, lunatic:{ id:'lunatic' }, baphometjr:{ id:'baphometjr' }, poporing:{ id:'poring', tint:'#59c95f' }, familiar:{ id:'spore' }, alice:{ id:'sohee', scale:.5 } };
  const petMotion = new Map();
  let tintCanvas = null;
  function petImage(id) { const s=petSprites[id]; return s ? 'assets/monsters/'+s.id+'.gif' : null; }
  function petImageFilter(id) { return petSprites[id]?.tint ? 'hue-rotate(250deg) saturate(1.25)' : ''; }
  function drawSprite(ctx,x,y,time,id,sprite) {
    const data=typeof roSpriteData!=='undefined'?roSpriteData[sprite.id]:null;
    if(!data||typeof Art==='undefined')return false;
    const m=petMotion.get(id)||{x,y,dir:0,walk:0};
    const dx=x-m.x,dy=y-m.y,moving=Math.hypot(dx,dy)>.35;
    if(moving){m.dir=((Math.round((Math.atan2(dy,dx)+Math.PI/2)/Math.PI*4)+8)%8);m.walk+=.25;}
    m.x=x;m.y=y;petMotion.set(id,m);
    const action=(moving?8:0)+m.dir,frame=moving?m.walk:time*5,scale=sprite.scale||.72;
    Art.shadow(ctx,x,y,11,5);
    if(!sprite.tint){ctx.save();ctx.translate(x,y);ctx.scale(1,1/.73);Art.draw(ctx,sprite.id,action,frame,0,0,scale);ctx.restore();return true;}
    // Tinta: desenha o sprite num canvas pequeno e pinta só os pixels do sprite (source-atop).
    const w=Math.ceil(data.w*scale)+4,h=Math.ceil(data.h*scale)+4;
    tintCanvas??=document.createElement('canvas');
    if(tintCanvas.width!==w||tintCanvas.height!==h){tintCanvas.width=w;tintCanvas.height=h;}
    const t=tintCanvas.getContext('2d');t.imageSmoothingEnabled=false;t.globalCompositeOperation='source-over';t.clearRect(0,0,w,h);
    Art.draw(t,sprite.id,action,frame,data.ox*scale+2,data.oy*scale+2,scale);
    t.globalCompositeOperation='source-atop';t.globalAlpha=.55;t.fillStyle=sprite.tint;t.fillRect(0,0,w,h);t.globalAlpha=1;t.globalCompositeOperation='source-over';
    ctx.save();ctx.translate(x,y);ctx.scale(1,1/.73);ctx.drawImage(tintCanvas,-(data.ox*scale+2),-(data.oy*scale+2));ctx.restore();
    return true;
  }
  function drawPet(ctx,x,y,time,id) {
    const p=pets[id];if(!p)return;
    if(petSprites[id]&&drawSprite(ctx,x,y,time,id,petSprites[id]))return;
    ctx.save();ctx.translate(x,y+Math.sin(time*4)*3);ctx.globalAlpha=.95;
    ctx.fillStyle='rgba(0,0,0,.24)';ctx.beginPath();ctx.ellipse(0,9,14,5,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=p.color;ctx.strokeStyle='#382e48';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(-13,1);ctx.quadraticCurveTo(-15,-16,0,-18);ctx.quadraticCurveTo(17,-17,13,2);ctx.quadraticCurveTo(7,13,-2,10);ctx.quadraticCurveTo(-11,12,-13,1);ctx.fill();ctx.stroke();
    ctx.fillStyle='#292a37';ctx.fillRect(-6,-4,3,3);ctx.fillRect(4,-4,3,3);
    if(id==='lunatic'){ctx.fillStyle=p.color;ctx.fillRect(-11,-29,7,20);ctx.fillRect(5,-29,7,20);}
    if(id==='familiar'||id==='baphometjr'){ctx.fillStyle=p.color;ctx.beginPath();ctx.moveTo(-11,-8);ctx.lineTo(-24,-18);ctx.lineTo(-22,4);ctx.moveTo(11,-8);ctx.lineTo(24,-18);ctx.lineTo(22,4);ctx.fill();}
    ctx.fillStyle='#fff6ef';ctx.fillRect(-2,2,4,2);ctx.restore();
  }
  return {recipes,pets,upgrades,defaults,check,comboBonuses,petBonuses,magnetRange,canCollect,buyPet,buyUpgrade,drawPet,petImage,petImageFilter};
})();
