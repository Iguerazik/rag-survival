 'use strict';
/* V14: draws from a RUN-ONLY deck. Permanent Ragnarok gear lives exclusively in MVP rewards. */
const RuneLoot = (() => {
  const perks = {
    temper:{name:'Lâmina Temperada',icon:'bash',grade:1,classes:['sword','merchant','thief','archer'],bonus:{atkPct:.038},cap:4,desc:'Dano físico +3,8% por nível.'},
    onslaught:{name:'Frenesi de Combate',icon:'doubleattack',grade:1,bonus:{aspdPct:.036},cap:4,desc:'Velocidade de ataque +3,6% por nível.'},
    ember:{name:'Brasas Persistentes',icon:'fire',grade:1,bonus:{atkPct:.026,spellPct:.026},cap:4,desc:'Dano físico e mágico +2,6% por nível.'},
    arcana:{name:'Foco Arcano',icon:'napalm',grade:1,classes:['mage','acolyte'],bonus:{spellPct:.042},cap:4,desc:'Dano mágico +4,2% por nível.'},
    serenity:{name:'Mente Serena',icon:'focus',grade:1,bonus:{spRegen:.13},cap:4,desc:'Recuperação de SP +0,13 por nível.'},
    vitality:{name:'Vigor de Yggdrasil',icon:'recovery',grade:1,bonus:{hpPct:.05},cap:4,desc:'HP máximo +5% por nível.'},
    shelter:{name:'Pele de Pedra',icon:'endure',grade:1,bonus:{vit:1,damageResist:.012},cap:4,desc:'VIT +1 e resistência a dano +1,2% por nível.'},
    renew:{name:'Seiva Viva',icon:'heal',grade:1,bonus:{hpRegen:.45},cap:4,desc:'Regeneração de HP +0,45/s por nível.'},
    agility:{name:'Passos do Vento',icon:'agiup',grade:1,bonus:{speed:.022,flee:2},cap:4,desc:'Movimento +2,2% e FLEE +2 por nível.'},
    accuracy:{name:'Olho de Caçador',icon:'concentration',grade:1,bonus:{dex:2,hit:3},cap:4,desc:'DES +2 e HIT +3 por nível.'},
    luck:{name:'Fio da Sorte',icon:'falcon',grade:1,bonus:{luk:2,crit:2},cap:4,desc:'SOR +2 e CRIT +2 por nível.'},
    devotion:{name:'Guarda Rúnica',icon:'assumptio',grade:1,bonus:{def:3,mdef:2},cap:4,desc:'DEF +3 e MDEF +2 por nível.'},
    greed:{name:'Bolso de Poring',icon:'pushcart',grade:1,bonus:{zeny:.08},cap:4,desc:'Chance adicional de Zeny +8% por nível.'},
    magnet:{name:'Ímã de Poring',icon:'cartrev',grade:1,bonus:{pickupRadius:16},cap:4,desc:'Alcance de coleta +16 por nível.'},
    wisdom:{name:'Leitura de Runas',icon:'mastery',grade:1,bonus:{xpBonus:.055},cap:4,desc:'EXP obtida +5,5% por nível.'},
    bastion:{name:'Bastião de Prontera',icon:'praefatio',grade:2,bonus:{hpPct:.065,vit:2},cap:4,desc:'HP +6,5%, VIT +2 por nível.'},
    battlemage:{name:'Runa de Geffen',icon:'lightning',grade:2,classes:['mage','acolyte'],bonus:{spellPct:.06,int:2},cap:3,desc:'MATK +6%, INT +2 por nível.'},
    hunter:{name:'Marca de Payon',icon:'aimed',grade:2,classes:['archer','thief'],bonus:{crit:3,dex:2},cap:3,desc:'CRIT +3 e DES +2 por nível.'},
    smith:{name:'Forja de Einbroch',icon:'overthrust',grade:2,classes:['merchant','sword'],bonus:{atkPct:.06,str:2},cap:3,desc:'Dano físico +6% e FOR +2 por nível.'},
    evasion:{name:'Reflexo Sombrio',icon:'dodge',grade:2,bonus:{agi:3,flee:6},cap:3,desc:'AGI +3 e FLEE +6 por nível.'},
    pulse:{name:'Pulso Arcano',icon:'storm',grade:2,bonus:{cooldownReduction:.027},cap:4,desc:'Reduz a recarga em 2,7% por nível.'},
    prism:{name:'Prisma Elemental',icon:'frost',grade:2,bonus:{spellPct:.037,crit:2},cap:3,desc:'MATK +3,7%, CRIT +2 por nível.'},
    fervor:{name:'Juramento do Caçador',icon:'vulture',grade:2,bonus:{bossDamage:.06},cap:4,desc:'Dano contra elites e MVPs +6% por nível.'},
    growth:{name:'Raízes Profundas',icon:'sanctuary',grade:2,bonus:{hpRegen:.65,hpPct:.022},cap:3,desc:'Regenera +0,65 HP/s e amplia HP máximo em 2,2%.'},
    snow:{name:'Geada Retardante',icon:'stormgust',grade:2,bonus:{slowChance:.08},cap:3,desc:'Golpes podem desacelerar inimigos por 2s.'},
    firemark:{name:'Marca Incandescente',icon:'crimson',grade:2,bonus:{igniteChance:.075},cap:3,desc:'Golpes podem aplicar queimadura ao longo do tempo.'},
    drain:{name:'Sangue Vital',icon:'envenom',grade:2,bonus:{lifesteal:.008},cap:3,desc:'Rouba 0,8% do dano causado como HP por nível (com limite).'},
    thunder:{name:'Eco do Trovão',icon:'vermilion',grade:3,bonus:{procShock:.05},cap:3,desc:'Acertos podem criar um raio que salta para outro inimigo.'},
    guardian:{name:'Pacto da Valquíria',icon:'holy',grade:3,bonus:{hpPct:.08,damageResist:.018},cap:3,desc:'HP +8% e resistência a dano +1,8% por nível.'},
    tempest:{name:'Tempestade Ancestral',icon:'comet',grade:3,classes:['mage','acolyte'],bonus:{spellPct:.07,cooldownReduction:.035},cap:3,desc:'Magia +7% e recarga -3,5% por nível.'},
    tyr:{name:'Fúria de Tyr',icon:'ignition',grade:3,classes:['sword','merchant','thief','archer'],bonus:{atkPct:.08,aspdPct:.03},cap:3,desc:'Dano físico +8% e ASPD +3% por nível.'},
    eternal:{name:'Essência de Ymir',icon:'blessing',grade:3,bonus:{hpPct:.09,hpRegen:.75},cap:2,desc:'HP +9% e recuperação +0,75 HP/s por nível.'},
    treasure:{name:'Destino Afortunado',icon:'owl',grade:3,bonus:{xpBonus:.08,zeny:.12},cap:2,desc:'EXP +8% e chance de Zeny +12% por nível.'},
  };
  const recipes=[
    ['Estilhaços de Muspelheim','ember','firemark',{atkPct:.04,spellPct:.04}],
    ['Muralha de Niflheim','snow','devotion',{damageResist:.035,hpPct:.035}],
    ['Chamas de Geffen','arcana','firemark',{spellPct:.075}],
    ['Olhos de Ullr','accuracy','hunter',{crit:7,atkPct:.035}],
    ['Lâmina das Valquírias','temper','fervor',{bossDamage:.14}],
    ['Fúria de Midgard','onslaught','tyr',{aspdPct:.08}],
    ['Pulso Primordial','pulse','prism',{spellPct:.065}],
    ['Vida da Floresta','growth','vitality',{hpPct:.07,hpRegen:1}],
    ['Escudo do Guardião','shelter','guardian',{damageResist:.055}],
    ['Presságio do Tesouro','greed','magnet',{zeny:.12,pickupRadius:25}],
    ['Oráculo de Juno','wisdom','serenity',{xpBonus:.1}],
    ['Véu da Caçada','agility','evasion',{flee:14,speed:.045}],
    ['Tempestade Runica','thunder','tempest',{procShock:.10}],
    ['Juramento de Sangue','drain','temper',{lifesteal:.008}],
    ['Herança de Ymir','eternal','renew',{hpRegen:1.2}],
    ['Armadura de Einbroch','smith','bastion',{def:12,atkPct:.05}],
  ].map(([name,a,b,bonus],i)=>({id:'v14-'+i,name,a,b,bonus}));
  const bnames={str:'FOR',agi:'AGI',vit:'VIT',int:'INT',dex:'DES',luk:'SOR',atkPct:'Dano físico',spellPct:'Dano mágico',hpPct:'HP máximo',hpRegen:'Regeneração HP',speed:'Movimento',aspdPct:'Velocidade de ataque',crit:'CRIT',def:'DEF',mdef:'MDEF'};
  const forgeStats={str:1,agi:1,vit:1,int:1,dex:1,luk:1,atkPct:.022,spellPct:.022,hpPct:.018,hpRegen:.34,aspdPct:.018,crit:2};
  function initial(){return {perks:{},forged:{},claimed:0,offered:0,synergies:[],history:[]};}
  function state(){ if(!run) return initial(); return run.lootDraft??=initial(); }
  function rank(s,id){return Math.max(0,Number(s.perks?.[id]||0));}
  function completed(s){return recipes.filter(r=>rank(s,r.a)>0 && rank(s,r.b)>0);}
  function familyOk(p,family){return !p.classes || p.classes.includes(family);}
  function options(s,ctx,random=Math.random){
    const stage=Math.max(0,Math.min(9,Number(ctx.mapTier)||0));
    const maxGrade=stage>=5?3:stage>=2?2:ctx.source==='elite'||ctx.source==='maze'||ctx.source==='rift'?2:1;
    const list=Object.entries(perks).filter(([id,p])=>familyOk(p,ctx.family)&&rank(s,id)<p.cap&&(p.grade<=maxGrade || ctx.source==='mvp'));
    const picked=[];
    while(picked.length<3 && list.length){
      const weights=list.map(([id,p])=>{
        const current=rank(s,id),matches=recipes.some(r=>(r.a===id&&rank(s,r.b))||(r.b===id&&rank(s,r.a)));
        const earlyXp=['wisdom','greed','magnet'].includes(id);
        const focus=ctx.focus && ctx.focus===p.grade?1.25:1;
        const grade=Math.pow(p.grade,ctx.source==='elite'||ctx.source==='maze'||ctx.source==='rift'?1.2:-.9);
        return Math.max(.01,(current?1.2:1.7)*(matches?2.2:1)*(earlyXp&&ctx.time>400?.17:1)*grade*focus);
      });
      const sum=weights.reduce((a,b)=>a+b,0);let roll=Math.max(0,Math.min(.999999,random()))*sum;
      let index=weights.findIndex(w=>(roll-=w)<0);if(index<0)index=list.length-1;
      const [id]=list.splice(index,1)[0];picked.push(id);
    }
    return picked;
  }
  function apply(s,id){const p=perks[id];if(!p||rank(s,id)>=p.cap)return {ok:false,discovered:[]};const old=new Set(completed(s).map(r=>r.id));s.perks[id]=(s.perks[id]||0)+1;s.claimed++;s.history.push({id,rank:s.perks[id]});
    const discovered=completed(s).filter(r=>!old.has(r.id));s.synergies=completed(s).map(r=>r.id);return {ok:true,discovered};}
  function bonuses(s=state()) {
    const total={};
    for(const [id,count]of Object.entries(s.perks||{})){
      const p=perks[id];if(!p)continue;
      for(const [stat,value]of Object.entries(p.bonus||{}))total[stat]=(total[stat]||0)+value*Math.min(p.cap,Math.max(0,count));
    }
    for(const forge of Object.values(s.forged||{}))for(const [stat,value]of Object.entries(forge||{}))total[stat]=(total[stat]||0)+value*(forgeStats[stat]||0);
    for(const recipe of completed(s))for(const [stat,value]of Object.entries(recipe.bonus))total[stat]=(total[stat]||0)+value;
    total.damageResist=Math.min(.42,total.damageResist||0);total.lifesteal=Math.min(.035,total.lifesteal||0);total.cooldownReduction=Math.min(.31,total.cooldownReduction||0);
    return total;
  }
  function forgeOptions(s,gear,random=Math.random) {
    const options=[];
    for(const [slot,item]of Object.entries(gear||{}))if(item){const existing=s.forged?.[slot]||{};
      for(const key of Object.keys(forgeStats))if((existing[key]||0)<4)options.push({slot,id:item.id,key,level:(existing[key]||0)+1});}
    // Equal chance of upgrading any slot, not repeatedly only one item.
    const choices=[];while(choices.length<3 && options.length){const i=Math.min(options.length-1,Math.floor(random()*options.length));choices.push(...options.splice(i,1));}
    return choices;
  }
  function forgePick(s,choice) {if(!choice||!(choice.key in forgeStats))return false;
    const f=s.forged[choice.slot]??={};if((f[choice.key]||0)>=4)return false;f[choice.key]=(f[choice.key]||0)+1;return true;}
  function icon(id){const p=perks[id];const el=document.createElement('img');el.src='assets/ro/skill-'+p.icon+'.png';el.alt='';el.loading='lazy';return el;}
  function finishPick(chest,title){run.claimedChests.add(chest.uid);run.chests=run.chests.filter(c=>c.uid!==chest.uid);mode='play';ui.dialog.hidden=true;refreshStatus();announce(title,4);canvas.focus({preventScroll:true});}
  function discover(list){if(!list.length)return;const found={...(saved.runSynergies||{})};let count=0;for(const recipe of list)if(!found[recipe.id]){found[recipe.id]=true;count++;}
    if(count)persist({runSynergies:found,codexCoins:(saved.codexCoins||0)+count*75});
  }
  function choose(chest) {
    if(run.claimedChests.has(chest.uid))return;
    const s=state(),source=chest.kind==='maze'?'maze':chest.kind==='elite'?'elite':chest.kind==='relic'?'rift':'common';
    const ids=chest.runChoices??=options(s,{source,mapTier:run.mapTier,family:run.line,time:run.time});
    if(!ids.length){run.zeny+=60+run.mapTier*18;finishPick(chest,'Baú convertido em Zeny · seu baralho está completo.');return;}
    mode='chest';const grid=document.createElement('div');grid.className='rune-draft-grid';
    for(const id of ids) {const p=perks[id],current=rank(s,id);const buttonEl=button('','rune-draft-card grade-'+p.grade,()=>{
        const result=apply(s,id);if(!result.ok)return;
        discover(result.discovered);finishPick(chest,'✦ '+p.name+' · '+s.perks[id]+'/'+p.cap+(result.discovered.length?' · COMBO: '+result.discovered.map(r=>r.name).join(', '):''));
      });
      const badge=document.createElement('span');badge.className='rune-draft-grade';badge.textContent=({1:'COMUM',2:'INCOMUM',3:'RARO'})[p.grade];
      const title=document.createElement('strong');title.textContent=p.name;
      const detail=document.createElement('small');detail.textContent=p.desc;
      const progress=document.createElement('span');progress.className='rune-draft-level';progress.textContent=(current?'EVOLUIR':'NOVO IMBUIMENTO')+' · '+(current+1)+'/'+p.cap;
      const next=recipes.find(r=>r.a===id&&rank(s,r.b)||r.b===id&&rank(s,r.a));
      if(next){const hint=document.createElement('em');hint.textContent='✧ Combinação possível: '+next.name;buttonEl.append(hint);}
      buttonEl.prepend(badge,icon(id),title,detail,progress);grid.append(buttonEl);
    }
    showDialog(source==='elite'?'TESOURO DO ELITE':source==='maze'?'RECOMPENSA DO LABIRINTO':source==='rift'?'RELICÁRIO RÚNICO':'ESCOLHA DA RUN',
      'Escolha uma bênção para esta expedição',
      'Escolha 1 entre 3. Repetir uma bênção aumenta seu nível até o limite. Tudo aqui é TEMPORÁRIO: nada irá encher seu armazém.',
      [grid]);
  }
  function forge(chest) {
    if(run.claimedChests.has(chest.uid))return;
    const s=state(),choices=chest.forgeChoices??=forgeOptions(s,run.gear);if(!choices.length){run.zeny+=30;finishPick(chest,'Forja sem equipamento: +30 Zeny.');return;}
    mode='chest';const grid=document.createElement('div');grid.className='rune-draft-grid';
    for(const ch of choices){const el=button('','rune-draft-card forge',()=>{
        if(!forgePick(s,ch))return;finishPick(chest,'Forja temporária · '+(itemDb[ch.id]?.name||ch.id)+' · '+bnames[ch.key]+' +'+ch.level+'/4');
      });const title=document.createElement('strong');title.textContent=itemDb[ch.id]?.name||ch.id;
      const text=document.createElement('small');text.textContent=bnames[ch.key]+' · aprimoramento '+ch.level+'/4';
      const img=Gear.sprite(ch.id);img.alt='';el.append(img,title,text);grid.append(el);
    }
    showDialog('FORJA DA EXPEDIÇÃO','Fortaleça seu equipamento nesta run','A forja modifica o poder do equipamento somente até o fim da expedição. Seu equipamento permanente não será alterado.',[grid]);
  }
  function renderInventory(list){
    if(!run)return;const s=state(),section=document.createElement('section');section.className='rune-build-inventory';const title=document.createElement('h3');title.textContent='✦ Construção da run — '+Object.keys(s.perks).length+' bênçãos';section.append(title);
    const tip=document.createElement('p');tip.textContent='As bênçãos e os aprimoramentos da forja desaparecem ao encerrar a expedição. Equipamentos permanentes são encontrados nos MVPs.';section.append(tip);
    const grid=document.createElement('div');grid.className='rune-build-grid';
    for(const [id,count]of Object.entries(s.perks)){
      const entry=document.createElement('div');entry.className='rune-build-entry';entry.append(icon(id));const copy=document.createElement('span');const name=document.createElement('strong');name.textContent=perks[id].name+' '+count+'/'+perks[id].cap;const sub=document.createElement('small');sub.textContent=perks[id].desc;copy.append(name,sub);entry.append(copy);grid.append(entry);
    }if(!grid.childElementCount){const none=document.createElement('p');none.textContent='Ainda não escolheu bênçãos. Procure baús azuis e elites.';grid.append(none);}
    section.append(grid);
    const combos=completed(s);if(combos.length){const label=document.createElement('h4');label.textContent='Combinações ativas ('+combos.length+')';section.append(label);for(const recipe of combos){const pill=document.createElement('div');pill.className='rune-combo-pill';pill.textContent='✦ '+recipe.name;section.append(pill);}}
    if(Object.keys(s.forged).length){const title=document.createElement('h4');title.textContent='Forja temporária';section.append(title);for(const [slot,bonuses]of Object.entries(s.forged)){const row=document.createElement('p');row.textContent=(gearSlots[slot]?.name||slot)+': '+Object.entries(bonuses).map(([stat,rank])=>bnames[stat]+' '+rank+'/4').join(' · ');section.append(row);}}
    list.append(section);
  }
  function summary(){if(!run)return '';const s=state();return 'Bênçãos '+Object.keys(s.perks).length+' · Combos '+completed(s).length;}
  function onDamage(enemy,damage,opts={}){
    if(!run||damage<=0||opts.fromParty||opts.relicProc||opts.lootProc||enemy.hp<=0||enemy.riftSeal)return;
    const bonus=bonuses(),t=run.time;
    if(bonus.lifesteal){const gain=Math.min(damage*bonus.lifesteal,Math.max(0,maxHp()-run.player.hp),maxHp()*.015);run.player.hp+=gain;}
    if(bonus.slowChance && Math.random()<bonus.slowChance) enemy.slow=Math.max(enemy.slow||0,.4);
    if(bonus.igniteChance&&Math.random()<bonus.igniteChance){enemy.poison={until:t+2.4,next:t+.6,power:Math.max(1,damage*.085),color:'#ff9d72',element:'fire'};}
    if(bonus.procShock && Math.random()<bonus.procShock && (run.runeShockNext||0)<=t){run.runeShockNext=t+.9;const nearby=run.mobs.filter(e=>e!==enemy&&e.hp>0&&distance(e,enemy)<125).slice(0,1);for(const target of nearby)hurt(target,damage*.24,{lootProc:true,element:'wind'});}
  }
  return {bnames,forgeStats,perks,recipes,initial,rank,completed,options,apply,bonuses,forgeOptions,forgePick,choose,forge,renderInventory,summary,onDamage};
})();
