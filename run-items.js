'use strict';
// Rare permanent consumables; temporary jewellery never enters the saved equipment inventory.
const RunRelics = (() => {
  const dropRates={
    common:{flywing:.0004,butterflywing:0,xpMagnet:.0008,goldMagnet:.0006},
    elite:{flywing:.02,butterflywing:.001,xpMagnet:.04,goldMagnet:.03},
    miniBoss:{flywing:.04,butterflywing:.0025,xpMagnet:.08,goldMagnet:.06},
    mvp:{flywing:.06,butterflywing:.005,xpMagnet:.12,goldMagnet:.10},
  };
  const relics={
    flame:{name:'Colar de Brasão Ígneo',slot:'necklace',desc:'Imbuimento de Fogo: ataques e habilidades sem elemento fixo tornam-se Fogo.',element:'fire'},
    frost:{name:'Colar de Cristal Glacial',slot:'necklace',desc:'Imbuimento de Água: ataques e habilidades sem elemento fixo tornam-se Água.',element:'water'},
    gale:{name:'Colar de Vento de Payon',slot:'necklace',desc:'Imbuimento de Vento: ataques e habilidades sem elemento fixo tornam-se Vento.',element:'wind'},
    earth:{name:'Colar de Rocha de Einbroch',slot:'necklace',desc:'Imbuimento de Terra: ataques e habilidades sem elemento fixo tornam-se Terra.',element:'earth'},
    holy:{name:'Colar de Aspersio',slot:'necklace',desc:'Imbuimento Sagrado: ataques e habilidades sem elemento fixo tornam-se Sagrado.',element:'holy'},
    morroc:{name:'Anel de Morroc',slot:'ring',desc:'Imbuimento Sanguíneo: rouba 2,5% do dano real como HP. Cura total por roubo limitada a 1,5% do HP máximo por segundo.',drain:.025},
    ullr:{name:'Anel de Ullr',slot:'ring',desc:'Imbuimento da Caçada: dano +18% contra elites e MVPs.',boss:.18},
    niflheim:{name:'Anel de Niflheim',slot:'ring',desc:'Imbuimento do Eco: a cada 2s, um acerto replica 18% do dano em até 3 inimigos próximos.',echo:true},
    geffen:{name:'Colar de Geffen',slot:'necklace',desc:'Imbuimento Arcano: dano mágico +10% e recarga das habilidades -6%.',bonus:{spellPct:.10},cooldown:.06},
    valkyrie:{name:'Colar da Valquíria',slot:'necklace',desc:'Imbuimento da Tenacidade: HP máximo +10%.',bonus:{hpPct:.10}},
    payon:{name:'Colar de Payon',slot:'necklace',desc:'Imbuimento do Vento: movimento +7%, crítico +4.',bonus:{speed:.07,crit:4}},
    einbroch:{name:'Anel de Einbroch',slot:'ring',desc:'Imbuimento da Forja: dano físico +10%, velocidade de ataque +5%.',bonus:{atkPct:.10,aspdPct:.05}},
    odin:{name:'Colar de Odin',slot:'necklace',desc:'Imbuimento da Sabedoria: experiência recolhida +10%.',bonus:{xpBonus:.10}},
    poring:{name:'Anel de Poring',slot:'ring',desc:'Imbuimento da Sorte: SOR +4, crítico +3.',bonus:{luk:4,crit:3}},
    munak:{name:'Anel de Munak',slot:'ring',desc:'Imbuimento do Espírito: redução de dano físico de 4%.',bonus:{damageResist:.04}},
    payonmoon:{name:'Colar da Lua de Payon',slot:'necklace',desc:'Imbuimento Lunar: regeneração de HP +0,8 por segundo.',bonus:{hpRegen:.8}},
    prontera:{name:'Colar de Prontera',slot:'necklace',desc:'Imbuimento Real: DEF +8 e VIT +3.',bonus:{vit:3,def:8}},
    ygg:{name:'Colar da Folha de Yggdrasil',slot:'necklace',desc:'Imbuimento da Vida: HP máximo +7% e regeneração +0,6.',bonus:{hpPct:.07,hpRegen:.6}},
    glastblade:{name:'Anel de Glast Heim',slot:'ring',desc:'Imbuimento da Lâmina: FOR +3 e ATK físico +7%.',bonus:{str:3,atkPct:.07}},
    whisper:{name:'Anel de Sussurro',slot:'ring',desc:'Imbuimento da Esquiva: AGI +5 e FLEE +7.',bonus:{agi:5,flee:7}},
    clock:{name:'Colar do Tempo',slot:'necklace',desc:'Imbuimento da Aceleração: recarga das habilidades -8%.',cooldown:.08},
    rune:{name:'Anel do Rúnico',slot:'ring',desc:'Imbuimento Rúnico: INT +4 e MATK +7%.',bonus:{int:4,spellPct:.07}},
    falcon:{name:'Anel do Falcão',slot:'ring',desc:'Imbuimento da Pontaria: DES +5 e precisão +6.',bonus:{dex:5,hit:6}},
    guardian:{name:'Colar do Guardião',slot:'necklace',desc:'Imbuimento da Fortaleza: VIT +5 e HP máximo +5%.',bonus:{vit:5,hpPct:.05}},
    orc:{name:'Anel Orc',slot:'ring',desc:'Imbuimento da Fúria: dano físico +11%, esquiva -5.',bonus:{atkPct:.11,flee:-5}},
    chaos:{name:'Colar de Morroc Caótico',slot:'necklace',desc:'Imbuimento da Tempestade: MATK +12%, HP máximo -4%.',bonus:{spellPct:.12,hpPct:-.04}},
    wild:{name:'Anel Selvagem',slot:'ring',desc:'Imbuimento da Fera: movimento +4%, crítico +4.',bonus:{speed:.04,crit:4}},
    ember:{name:'Colar de Brasa',slot:'necklace',desc:'Imbuimento do Ardor: dano físico +6% e mágico +6%.',bonus:{atkPct:.06,spellPct:.06}},
    temple:{name:'Colar do Templo',slot:'necklace',desc:'Imbuimento Sagrado: defesa mágica +10 e regeneração de SP.',bonus:{mdef:10,spRegen:.3}},
  };
  const names={zenyCache:'Bolsa de Zeny',healing:'Poção de Cura',flywing:'Asa de Mosca',butterflywing:'Asa de Borboleta',xpMagnet:'Orbe de Experiência',goldMagnet:'Ímã de Zeny'};
  function equipped(){return Object.values(run?.relics||{}).map(id=>relics[id]).filter(Boolean);}
  function weaponElement(){return equipped().find(r=>r.element)?.element||'neutral';}
  function bonuses(){const bonus={};for(const r of equipped())for(const [k,v]of Object.entries(r.bonus||{}))bonus[k]=(bonus[k]||0)+v;return bonus;}
  function cooldown(){return equipped().reduce((n,r)=>n+(r.cooldown||0),0);}
  function modify(enemy,amount,opts){if(opts.fromParty||opts.relicProc)return amount;
    return amount*(1+((enemy.elite||enemy.specialBoss||bosses[enemy.id])?equipped().reduce((n,r)=>n+(r.boss||0),0):0));}
  function healFromDamage(amount){
    if(!run || amount<=0 || run.player.hp<=0)return 0;
    const bucket=Math.floor(run.time);if(run.drainBucket!==bucket){run.drainBucket=bucket;run.drainUsed=0;}
    const gain=Math.max(0,Math.min(amount,maxHp()*.015-(run.drainUsed||0),maxHp()-run.player.hp));
    run.drainUsed=(run.drainUsed||0)+gain;run.player.hp+=gain;return gain;
  }
  function onDamage(enemy,amount,opts){
    if(opts.fromParty||opts.relicProc||enemy.riftSeal||amount<=0)return;
    const list=equipped(),drain=Math.min(.04,list.reduce((n,r)=>n+(r.drain||0),0));
    if(drain)healFromDamage(amount*drain);
    if(list.some(r=>r.echo) && (run.echoNext||0)<=run.time){
      run.echoNext=run.time+2;
      const nearby=run.mobs.filter(e=>e!==enemy&&e.hp>0&&distance(e,enemy)<100).sort((a,b)=>distance(a,enemy)-distance(b,enemy)).slice(0,3);
      for(const e of nearby){effect('mark',e.x,e.y,24,'#d7bcff');hurt(e,amount*.18,{relicProc:true});}
    }
  }
  function rollDrops(enemy,random=Math.random){
    if(enemy.summoned || enemy.riftSeal || enemy.guildTrial)return;
    const tier=bosses[enemy.id]?'mvp':enemy.specialBoss||enemy.elite==='miniBoss'?'miniBoss':enemy.elite?'elite':'common';
    for(const [kind,chance]of Object.entries(dropRates[tier]))if(chance>0&&random()<chance&&run.chests.length<30)
      run.chests.push({uid:'utility-'+enemy.uid+'-'+kind,x:enemy.x+(kind==='flywing'?22:-22),y:enemy.y+26,kind,expires:run.time+100});
  }
  function claimPickup(chest){
    if(!names[chest.kind])return false;
    if(run.claimedChests.has(chest.uid))return true;
    run.claimedChests.add(chest.uid);
    if(chest.kind==='flywing'||chest.kind==='butterflywing'){
      const wings={flywing:0,butterflywing:0,...saved.wings};wings[chest.kind]++;persist({wings});
      announce(names[chest.kind]+' obtida! Ative em Inventário → Itens de run.',4);
    }else if(chest.kind==='zenyCache'){const amount=25+run.mapTier*10;run.zeny+=amount;announce('Bolsa de Zeny · +'+amount+' z',3);
    }else if(chest.kind==='healing'){run.player.hp=Math.min(maxHp(),run.player.hp+maxHp()*.25);announce('Poção de Cura · +25% HP',3);
    }else if(chest.kind==='xpMagnet'){
      // Splice the displayed array itself, not only a cached copy: no ghost crystals.
      const gems=run.gems.splice(0,run.gems.length);
      const total=gems.reduce((n,g)=>n+g.xp,0)*RunDifficulty.get(run.difficulty).xp*(1+(run.bonus.xpBonus||0));
      run.xp+=total;announce('Orbe de Experiência · recolheu '+Math.floor(total)+' EXP! Sem cristais restantes no chão.',4);
    }else{
      const coins=run.goldDrops.splice(0,run.goldDrops.length);
      const total=coins.reduce((n,g)=>n+Math.floor(g.amount*(1+(Codex.petBonuses(saved).goldBonus||0))),0);
      run.zeny+=total;announce('Ímã de Zeny · recolheu '+total+' z! Sem moedas restantes no chão.',4);
    }
    SkillFX.play('warp',{x:run.player.x,y:run.player.y});return true;
  }
  function drawPickup(chest){
    if(!names[chest.kind])return false;
    const color=chest.kind==='healing'?'#ff9f9f':chest.kind==='goldMagnet'||chest.kind==='zenyCache'?'#ffdf82':chest.kind==='xpMagnet'?'#9dffdc':'#d8c8ff';
    ring(chest.x,chest.y,13+Math.sin(run.time*4)*2,color,2);
    ctx.save();ctx.fillStyle=color;ctx.font='bold 12px Tahoma';ctx.textAlign='center';ctx.fillText(chest.kind==='healing'?'+HP':chest.kind==='xpMagnet'?'EXP':chest.kind==='goldMagnet'||chest.kind==='zenyCache'?'Z':'ASA',chest.x,chest.y+4);
    if(distance(chest,run.player)<190)ctx.fillText(names[chest.kind],chest.x,chest.y-24);ctx.restore();return true;
  }
  function consume(kind){const wings={flywing:0,butterflywing:0,...saved.wings};if(wings[kind]<1)return false;wings[kind]--;persist({wings});return true;}
  function canActivate(){return run && run.player.hp>0 && !run.pendingMvp && (mode==='play'||mode==='inventory'&&run.inventoryPreviousMode==='play');}
  function fly(automatic=false){
    if(run?.authoritative){if(mode==='inventory'){closeInventory();mode='play';}return queueOnlineItem('flywing');}
    if(!canActivate() || (run.flyNext||0)>run.time || (saved.wings?.flywing||0)<1)return false;
    const p=run.player;let destination=null;
    if(run.inMvp){for(let i=0;i<40;i++){const a=Math.random()*TAU,r=180+Math.random()*130,c={x:Math.cos(a)*r,y:Math.sin(a)*r};if(distance(c,p)>200){destination=c;break;}}}
    else{const f=run.field,room=f.warps?MazeWarps.roomAt(f,p.x,p.y):null;
      for(let i=0;i<160;i++){const index=Math.random()*f.nav.length|0;if(f.nav[index]!==1)continue;const c=cellCenter(index);
        if(distance(c,p)<280 || room!==null && MazeWarps.roomAt(f,c.x,c.y)!==room)continue;destination=c;break;}}
    if(!destination || !consume('flywing'))return false;
    Object.assign(p,destination);p.immunity=Math.max(p.immunity,2.5);run.flyNext=run.time+60;run.flyHealUntil=run.time+4;
    // Keep the actual pursuing bosses in the same encounter (no respawn/duplicates).
    // They only teleport after the player has had time to reposition and heal.
    run.flyPursuers=run.mobs.filter(e=>e.hp>0 && (e.elite || e.guildTrial || e.specialBoss || e.riftBoss || bosses[e.id])).map(e=>e.uid);
    run.bossPursuitAt=run.flyPursuers.length ? run.time+3.4 : 0;
    run.flyPursuitArena=!!run.inMvp;
    moveRoute=[];moveTarget=undefined;run.castPending=null;run.warpReady=run.time+2;nextFlow=0;
    if(mode==='inventory'){closeInventory();mode='play';}
    announce((automatic?'Asa de Mosca automática':'Asa de Mosca')+' · fuga e recuperação por 4s!',4);SkillFX.play('warp',{x:p.x,y:p.y});return true;
  }
  function tick(dt){
    if(run.flyHealUntil>run.time && run.player.hp>0)run.player.hp=Math.min(maxHp(),run.player.hp+maxHp()*.03*dt);
    const config={enabled:true,threshold:25,...saved.flyConfig};
    if(config.enabled && run.player.hp>0 && run.player.hp<maxHp()*Math.max(.05,Math.min(.5,config.threshold/100)))fly(true);
  }
  function butterfly(){
    if(run?.authoritative){if(mode==='inventory'){closeInventory();mode='play';}return queueOnlineItem('butterflywing');}
    if(!canActivate()||run.guest||run.inMvp||run.mvpActive||run.riftPortal||(saved.wings?.butterflywing||0)<1)return false;
    if(!consume('butterflywing'))return false;
    if(mode==='inventory')closeInventory();mode='play';EliteRifts.enterMvp();return true;
  }
  function choose(chest){
    mode='chest';const owned=new Set(Object.values(run.relics||{}));const pool=Object.keys(relics).sort((a,b)=>Number(owned.has(a))-Number(owned.has(b))||Math.random()-.5);
    // Always offer both wearable slots and prioritize relics not already owned.
    const rings=pool.filter(id=>relics[id].slot==='ring'),necks=pool.filter(id=>relics[id].slot==='necklace');
    const ids=chest.relicChoices??=[rings[0],necks[0],...pool.filter(id=>id!==rings[0]&&id!==necks[0])].slice(0,3),box=document.createElement('div');box.className='chest-choices';
    for(const id of ids){const r=relics[id],card=document.createElement('article');card.className='chest-choice';const title=document.createElement('strong');title.textContent=r.name;
      const detail=document.createElement('p');detail.textContent=r.desc+' Temporário: perdido ao morrer ou encerrar a run.';card.append(title,detail);
      const slots=r.slot==='ring'?['ring1','ring2']:['necklace'];for(const slot of slots){const old=relics[run.relics?.[slot]];
        card.append(button((slot==='necklace'?'Colar':slot==='ring1'?'Anel I':'Anel II')+(old?' · substituir '+old.name:' · equipar'),'',()=>{
          if(run.claimedChests.has(chest.uid))return;
          run.relics??={};run.relics[slot]=id;run.claimedChests.add(chest.uid);refreshStatus();run.player.hp=Math.min(maxHp(),run.player.hp);mode='play';ui.dialog.hidden=true;announce(r.name+' · imbuimento ativo nesta run!',4);
        }));}box.append(card);}
    const back=chest.equipmentChoices?button('← Voltar às opções de itens','loot-back',()=>{mode='play';openChest(chest);}):null;
    // V22.5: dá para descartar o relicário sem trocar nenhum imbuimento.
    const discard=button('Descartar relicário (não trocar nada)','secondary',()=>{if(run.claimedChests.has(chest.uid))return;run.claimedChests.add(chest.uid);mode='play';ui.dialog.hidden=true;combatNote('Relicário descartado.');});
    showDialog('RELICÁRIO DA GUILDA','Escolha um imbuimento','Dois anéis e um colar temporários. Substituir destrói o imbuimento anterior; a escolha não altera seus equipamentos permanentes.',[LootReview.wrap(...(back?[back]:[]),box),discard]);
  }
  function renderInventory(list,refresh){
    const help=document.createElement('p');help.className='run-help';help.textContent='Asas são consumíveis guardados na conta. Os dois anéis e o colar de run desaparecem ao morrer ou encerrar a partida.';list.append(help);
    const chain=document.createElement('p');chain.className='run-help';chain.textContent=run&&run.level>=3?'Cadeia Rúnica ativa: dois saltos a cada 1,1s. Ricochete e propagação podem ser melhorados ao subir de nível.':'Cadeia Rúnica: alcance o nível 3 da run para desbloquear dois saltos de dano.';list.append(chain);
    if(run?.skillMods)for(const [id,mods]of Object.entries(run.skillMods)){const row=document.createElement('p');row.className='run-help';row.textContent=(run.hero.tree.find(s=>s.id===id)?.name||id)+' · '+Object.entries(mods).map(([k,n])=>({wide:'Área',split:'Cadeia',splash:'Propagação'}[k])+' '+n+'/2').join(' · ');list.append(row);}
    const config={enabled:true,threshold:25,...saved.flyConfig};
    for(const kind of ['flywing','butterflywing']){
      const row=document.createElement('article');row.className='run-item';const info=document.createElement('div'),title=document.createElement('strong');title.textContent=names[kind]+' ×'+((run?.authoritative?run.onlineWings?.[kind]:saved.wings?.[kind])||0);
      const detail=document.createElement('p');detail.textContent=kind==='flywing'?'Teleporta aleatoriamente, concede 2,5s de proteção e recupera 12% do HP em 4s. Recarga: 60s.':'Consome a asa para desafiar um MVP aleatório numa fenda de 120s. Carta: 1% por vitória; sem garantia.';info.append(title,detail);
      const use=button('Usar','',()=>{(kind==='flywing'?fly():butterfly());refresh();});use.disabled=!canActivate() || !((run?.authoritative?run.onlineWings?.[kind]:saved.wings?.[kind])>0) || kind==='flywing'&&(run.flyNext||0)>run.time || kind==='butterflywing'&&(run.guest||run.inMvp||run.mvpActive||run.riftPortal);
      if(kind==='flywing'){
        const enabled=document.createElement('input');enabled.type='checkbox';enabled.checked=config.enabled;const label=document.createElement('label');label.append(enabled,' Usar automaticamente');
        const threshold=document.createElement('input');threshold.type='number';threshold.min=5;threshold.max=50;threshold.step=5;threshold.value=config.threshold;threshold.setAttribute('aria-label','Vida percentual para Asa de Mosca');
        const save=()=>{const n=Number(threshold.value);persist({flyConfig:{enabled:enabled.checked,threshold:Math.max(5,Math.min(50,Number.isFinite(n)?n:25))}});};enabled.onchange=threshold.onchange=save;
        const settings=document.createElement('div');settings.className='run-wing-settings';settings.append(label,' abaixo de ',threshold,'% HP');info.append(settings);
      }row.append(info,use);list.append(row);
    }
    const pot=document.createElement('article');pot.className='run-item';const potInfo=document.createElement('div');potInfo.textContent='Poção de Cura ×'+((run?.authoritative?run.onlinePotions:saved.healPotions)||0)+' · cura 25% do HP, recarga de 30s. Compre na Forja & Zeny.';pot.append(potInfo,button('Usar poção','',()=>{ZenyServices.usePotion();refresh();}));list.append(pot);
    for(const slot of ['ring1','ring2','necklace']){const r=relics[run?.relics?.[slot]];const row=document.createElement('article');row.className='run-item';const copy=document.createElement('div'),title=document.createElement('strong');title.textContent=(slot==='necklace'?'Colar':slot==='ring1'?'Anel I':'Anel II')+' · '+(r?.name||'Vazio');const desc=document.createElement('p');desc.textContent=r?.desc||'Obtenha imbuimentos nos relicários das missões e fendas.';copy.append(title,desc);row.append(copy);if(r&&run&&mode!=='ended')row.append(button('Descartar imbuimento','',()=>{delete run.relics[slot];refreshStatus();run.player.hp=Math.min(maxHp(),run.player.hp);refresh();}));list.append(row);}
  }
  function seedMap(){
    if(run.guest)return;
    const f=run.field;
    for(const kind of ['xpMagnet','goldMagnet'])for(let i=0;i<150;i++){const index=Math.random()*f.nav.length|0;if(f.nav[index]!==1)continue;const p=cellCenter(index);if(distance(p,run.player)<300)continue;run.chests.push({uid:'map-'+run.mapStart+'-'+kind,...p,kind});break;}
  }
  return {dropRates,relics,names,weaponElement,bonuses,cooldown,modify,onDamage,healFromDamage,rollDrops,claimPickup,drawPickup,fly,tick,butterfly,choose,renderInventory,seedMap};
})();
