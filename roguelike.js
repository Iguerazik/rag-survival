'use strict';
// Original combinations inspired by Rune-Midgard; no external assets required.
const RuneCombos = (() => {
  const recipes = [
    ['sword','Ruptura de Tyr','provoke','bash','boss'], ['sword','Forja de Muspelheim','magnum','bash','wave'],
    ['mage','Choque de Jotunheim','frost','fire','boss'], ['mage','Tempestade de Geffen','wall','storm','wave'],
    ['archer','Olho de Ullr','concentration','arrows','boss'], ['archer','Cerco de Payon','charge','shower','wave'],
    ['acolyte','Julgamento de Odin','blessing','holy','boss'], ['acolyte','Luz de Prontera','heal','holy','wave'],
    ['merchant','Martelo de Einbroch','cartrev','mammon','boss'], ['merchant','Roda da Forja','mammon','cartrev','wave'],
    ['thief','Execução de Morroc','sand','envenom','boss'], ['thief','Névoa Venenosa','envenom','sand','wave'],
    ['sword','Lança de Valquíria','joint','pierce','boss'], ['mage','Ruptura do Inverno','stormgust','napalm','wave'],
    ['archer','Caçada do Falcão','falcon','precise','boss'], ['acolyte','Exorcismo de Glast Heim','judex','adoramus','wave'],
    ['merchant','Forja de Thor','overthrust','cartterm','boss'], ['thief','Sentença do Algoz','grimtooth','sonicblow','boss'],
    ['sword','Sentença Rúnica','joint','bowling','boss'], ['sword','Chamas de Muspelheim','dragon','ignition','wave'],
    ['mage','Convergência Arcana','lightning','crimson','boss'], ['mage','Chuva de Meteoros','crimson','comet','wave'],
    ['archer','Marca do Sentinela','wargstrike','aimed','boss'], ['archer','Vendaval de Payon','aimed','arrowstorm','wave'],
    ['acolyte','Sentença de Odin','praefatio','adoramus','boss'], ['acolyte','Aurora de Prontera','adoramus','judex','wave'],
    ['merchant','Artilharia de Einbroch','axeboom','armcannon','boss'], ['merchant','Furacão da Forja','axeboom','axetornado','wave'],
    ['thief','Ceifa de Morroc','sonicblow','souldestroyer','boss'], ['thief','Espiral de Loki','rolling','ripper','wave'],
  ].map(([family,name,first,second,role],i)=>({id:'rune-'+i,family,name,first,second,role}));
  function trigger(state, skill, target, run) {
    state.ready ??= {}; state.cooldowns ??= {};
    const activated=[];
    for(const r of recipes) {
      if(r.family!==run.line) continue;
      const key=r.id;
      if(skill.id===r.second && (state.ready[key]??-Infinity)>=run.time && (state.cooldowns[key]??0)<=run.time && target?.hp>0 &&
        skillLevel(run.talents,r.first)>=2 && skillLevel(run.talents,r.second)>=2) {
        if(r.role==='boss' && !(target.elite || target.specialBoss || bosses[target.id])) continue;
        activated.push(r); delete state.ready[key]; state.cooldowns[key]=run.time+10;
      }
      if(skill.id===r.first) state.ready[key]=run.time+6;
    }
    return activated;
  }
  return {recipes,trigger};
})();

function runeCast(skill,level,target,center) {
  run.runeState ??= {};
  for(const recipe of RuneCombos.trigger(run.runeState,skill,target,run)) {
    const power=(skill.damage>1?skill.damage:60)*(1+(level-1)*.29)*powerBonus();
    const targets=recipe.role==='boss'?[target]:run.mobs.filter(e=>e.hp>0 && distance(e,center)<145)
      .sort((a,b)=>distance(a,center)-distance(b,center)).slice(0,5);
    for(const enemy of targets) hurt(enemy,power*(recipe.role==='boss'?.65:.38));
    SkillFX.play(recipe.role==='boss'?'bash':'storm',{x:center.x,y:center.y,from:run.player,radius:145});
    run.shout={name:recipe.name,at:run.time+1.8,color:'#ffe3a3'};
    if(!saved.codexFound?.[recipe.id]) {
      persist({codexFound:{...saved.codexFound,[recipe.id]:true},codexCoins:(saved.codexCoins||0)+120});
      announce('Combinação descoberta: '+recipe.name+' · +120 Códex',4);
    }
  }
}

const ExpeditionQuest = (() => {
  const themes={sewer:'Relíquia dos Esgotos',payon:'Talismã dos Ancestrais',maze:'Selo de Yggdrasil',orc:'Estandarte dos Orcs',geffen:'Runas de Geffen',payonfield:'Santuário da Floresta',glast:'Correntes Esquecidas',mine:'Cristal da Mina',temple:'Sigilo do Templo',shadow:'Semente das Sombras'};
  function init() {
    run.contract={stage:0,charge:0,eliteKills:0,route:null,done:false};
  }
  function ensure(){if(!run.contract)init();return run.contract;}
  function tick(dt) {
    const q=ensure();
    if(run.guest || run.inMvp || run.portal || run.player.hp<=0 || q.done)return;
    if(!q.node){const p=nearestWalkable({x:run.player.x+100,y:run.player.y});q.node={x:p.x,y:p.y};}
    if(q.stage===1 && q.eliteKills>=q.goal){q.stage=2;q.charge=0;q.node=null;announce('Comandantes derrotados! Localize o selo e consagre a relíquia.',5);return;}
    if(q.stage===1)return;
    // V22.5: antes, ficar no selo não fazia nada enquanto a rota não fosse escolhida no painel (parecia quebrado).
    // Agora, depois de 3 s no selo sem rota escolhida, a rota "Relíquia" é assumida automaticamente.
    if(!q.route){
      if(distance(run.player,q.node)>=138){q.autoRoute=0;return;}
      q.autoRoute=(q.autoRoute||0)+dt;
      if(q.autoRoute<3)return; // 3 s parado no selo sem escolher: assume a rota da Relíquia
      q.route='relic';combatNote('Rota da Relíquia escolhida automaticamente · fique perto do selo para investigar.');
    }
    // An accessible channeling mission: progress is cumulative, not an impossible
    // 10-second flawless streak in a densely populated Survivors arena.
    const close=distance(run.player,q.node)<138;
    if(close && run.time >= (q.damagePauseUntil||0))q.charge+=dt;
    else if(!close)q.charge=Math.max(0,q.charge-dt*.12);
    if(q.charge<(q.stage===0?6:10))return;
    q.charge=0;
    if(q.stage===0){q.stage=1;q.goal=q.route==='relic'?3:2;run.chests.push({uid:'investigation-'+run.mapStart,x:run.player.x+24,y:run.player.y,kind:'relic'});announce('Rastro revelado: derrote '+q.goal+' elites. Aproxime-se dos comandantes marcados em dourado.',5);}
    else {q.done=true;run.quest=true;run.xp+=q.route==='relic'?90:40;
      run.chests.push({uid:'contract-'+run.mapStart,x:run.player.x+24,y:run.player.y,kind:q.route==='relic'?'elite':'upgrade'});
      announce(q.route==='relic'?'Relíquia recuperada · +90 EXP e baú de elite!':'Selo purificado · +40 EXP, forja e +12% de dano contra o MVP!',6);}
  }
  function hud(){
    if(run.authoritative){
      // V22.5: a missão da expedição (investigar → caçar elites → consagrar) também existe no online, para o grupo.
      const title=document.getElementById('quest-title');if(title)title.textContent=themes[run.map]||'Expedição Cooperativa';
      const text=document.getElementById('quest-text'),bar=document.getElementById('quest-progress'),q=run.contract;
      // Etapa 5: rota da missão (Purificar ou Relíquia) também vale no motor; qualquer jogador pode escolher.
      let choices=document.getElementById('contract-routes');
      if(!choices){choices=document.createElement('div');choices.id='contract-routes';document.getElementById('quest-text').after(choices);}
      if(!choices.childElementCount)for(const [id,label] of [['seal','Purificar · bônus contra MVP'],['relic','Relíquia · +1 elite e tesouro']]){
        const b=document.createElement('button');b.textContent=label;b.onclick=()=>{run.coopRoute=id;};choices.append(b);}
      choices.hidden=!q||!!q.route||q.done||q.stage!==0||!!run.rift?.active||run.inMvp;
      const trial=run.onlineTrial===1?' · Prova da Guilda pendente':run.onlineTrial===2?' · Prova da Guilda ✓':'';
      if(run.rift?.active)return;
      // Etapa 4: portal do MVP aos 12:00; o grupo inteiro entra junto na arena.
      if(run.portal&&!run.inMvp){if(text)text.textContent='Portal do MVP aberto! Pise na luz roxa'+(run.local?'':': o grupo inteiro entra junto')+'.'+trial;if(bar){bar.max=1;bar.value=1;}return;}
      if(run.mvpActive){if(text)text.textContent=(run.local?'Derrote o MVP na arena.':'Derrote o MVP final com sua equipe.')+trial;if(bar){bar.max=1;bar.value=1;}return;}
      if(run.riftPortal){if(text)text.textContent='Fenda aberta! Pise no portal violeta: TODO o grupo entra junto na arena.';return;}
      if(!q||q.done){if(text)text.textContent=(q?.done?'Missão concluída · ':'')+'Sobrevivam até 12:00 · elites a cada 2 minutos.'+trial;if(bar){bar.max=720;bar.value=Math.min(720,Math.max(0,run.time-run.mapStart));}return;}
      const need=q.stage===0?6:10;
      if(!q.route&&q.stage===0){if(text)text.textContent='Escolha a rota abaixo ou fique 3 s no selo "Investigar"'+trial;if(bar){bar.max=need;bar.value=0;}return;}
      if(text)text.textContent=(q.stage===1?'Caçar elites: '+q.eliteKills+'/'+q.goal:(q.stage===0?'Investigar':'Consagrar')+' · fiquem perto do selo marcado no mapa · '+Math.floor(q.charge)+'/'+need+'s')+trial;
      if(bar){bar.max=q.stage===1?q.goal:need;bar.value=q.stage===1?q.eliteKills:q.charge;}
      return;
    }
    const q=ensure();const title=document.getElementById('quest-title');if(title)title.textContent=themes[run.map]||'Contrato da Guilda';
    let choices=document.getElementById('contract-routes');
    if(!choices){choices=document.createElement('div');choices.id='contract-routes';document.getElementById('quest-text').after(choices);}
    choices.hidden=!!q.route || !!run.guest;
    if(!choices.childElementCount) for(const [id,label] of [['seal','Purificar · bônus contra MVP'],['relic','Relíquia · +1 elite e tesouro']]) {
      const b=document.createElement('button');b.textContent=label;b.onclick=()=>{if(run.guest)return;ensure().route=id;};choices.append(b);
    }
    document.getElementById('quest-text').textContent=q.done?'Contrato concluído · recompensa concedida':!q.route?(run.guest?'O anfitrião escolhe o contrato':'Escolha o destino abaixo ou fique 3 s no selo "Investigar"'):q.stage===1?'Caçar comandantes: '+q.eliteKills+'/'+q.goal:
      (q.stage===0?'Investigar':'Consagrar')+' · canalize perto do selo (dano atrasa apenas 0,5s) · '+Math.floor(q.charge)+'/'+(q.stage===0?6:10)+'s';
    const bar=document.getElementById('quest-progress');bar.max=q.stage===1?q.goal:q.stage===0?6:10;bar.value=q.done?bar.max:q.stage===1?q.eliteKills:q.charge;
  }
  function draw(){const q=run.contract;if(!q?.node || q.done || q.stage===1 || run.inMvp || run.portal)return;
    ring(q.node.x,q.node.y,138,'#d3b37766',2);ring(q.node.x,q.node.y,44,'#d3b377',3);ring(q.node.x,q.node.y,31,'#c7ddff',2);
    ctx.save();ctx.fillStyle='#103052ee';ctx.fillRect(q.node.x-58,q.node.y-74,116,25);ctx.strokeStyle='#b6e7ff';ctx.strokeRect(q.node.x-58,q.node.y-74,116,25);ctx.fillStyle='#fff7d8';ctx.font='bold 14px Tahoma';ctx.textAlign='center';ctx.fillText(q.stage===0?'Investigar':'Consagrar',q.node.x,q.node.y-56);ctx.restore();
  }
  return {init,ensure,tick,hud,draw};
})();

const EliteRifts = (() => {
  const keys=['mobs','shots','zones','gems','potions','goldDrops','cardDrops','chests','effects','particles','numbers'];
  const variants=[
    {name:'Selo Rúnico',text:'Destrua os três selos para remover a proteção de 70% do guardião. Desvie das fissuras no chão.',patterns:['line','circle']},
    {name:'Ritual Amaldiçoado',text:'A cada 12 segundos uma nova maldição aparece. Desvie dos círculos e derrote o conjurador antes de 90 segundos.',patterns:['circle','ring']},
    {name:'Cerco do Comandante',text:'O comandante convoca reforços limitados. Priorize o comandante e evite as investidas em linha.',patterns:['line','summons']},
  ];
  function offer(index,kind) {
    if(run.rift?.active || run.riftPortal)return;
    const point=nearestWalkable({x:run.player.x+95,y:run.player.y+45});
    run.riftPortal={x:point.x,y:point.y,index,kind,expires:run.time+110};
    announce('Fenda da Guilda aberta · aproxime-se para aceitar uma missão opcional.',5);
  }
  function prompt(){
    if(run.guest || run.rift?.active || !run.riftPortal)return;
    const v=variants[run.riftPortal.index%3];mode='pause';
    showDialog('MISSÃO OPCIONAL',v.name,v.text+' Recompensa: escolha um imbuimento temporário e cura de 15%. O tempo da expedição fica suspenso. Tempo esgotado: retorna sem recompensa. Ficar sem HP pode encerrar a run; dano e SP gastos permanecem.',[
      button('Entrar na fenda','',()=>{mode='play';ui.dialog.hidden=true;enter();}),
      button('Continuar expedição','',()=>{mode='play';ui.dialog.hidden=true;})]);
  }
  function enter(){
    const portal=run.riftPortal;if(!portal)return;
    const savedWorld={x:run.player.x,y:run.player.y};for(const key of keys){savedWorld[key]=run[key];run[key]=[];}
    run.rift={active:true,start:run.time,index:portal.index,kind:portal.kind,savedWorld,ward:!portal.mvp,nextCurse:run.time+12,phase:0,reinforceAt:run.time+8,clearedSeals:0};
    run.chainArcs=[];run.riftPortal=null;run.inMvp=true;run.player.x=0;run.player.y=160;run.player.immunity=1.5;$('map-title').textContent='Fenda da Guilda';
    moveRoute=[];moveTarget=undefined;run.castPending=null;SkillFX.clear();
    const v=portal.mvp?{name:bosses[portal.boss].name,text:'Derrote o MVP e seus reforços em até 120s. Carta: 1% por vitória.',patterns:bosses[portal.boss].patterns}:variants[portal.index%3];
    const roster=expeditions[run.map].roster.filter(id=>monsters[id].speed>0);
    const e=spawn(portal.mvp?portal.boss:roster[(portal.index+Math.floor(portal.index/3))%roster.length],true);
    e.x=0;e.y=-110;e.elite=portal.kind;e.riftBoss=true;
    e.type={...e.type,name:portal.mvp?e.type.name:'Guardião '+e.type.name,patterns:v.patterns,attacks:v.patterns.map(k=>k==='line'?'Fissura Rúnica':k==='summons'?'Convocar Guerreiros':'Maldição Rúnica'),speed:Math.max(95,Math.min(125,e.type.speed*1.1))};
    e.hp=e.max=ZonePressure.guardianHp()*(portal.kind==='miniBoss'?1.25:1);
    if(portal.mvp){run.rift.mvp=true;run.rift.ward=false;e.hp=e.max=Math.max(e.hp,ZonePressure.guardianHp()*1.5);}
    e.pattern=0;e.attack=run.time+3;run.rift.uid=e.uid;run.boss=e;
    if(run.rift.ward)for(let i=0;i<3;i++){const s=spawn(expeditions[run.map].roster[0],true);s.riftSeal=true;s.x=Math.cos(i*TAU/3)*210;s.y=Math.sin(i*TAU/3)*210;s.hp=s.max=Math.max(110,e.max*.05);s.type={...s.type,name:'Selo Rúnico',speed:0,damage:0};}
    announce(v.name+' · '+v.text,8);
  }
  function leave(success){
    const r=run.rift;if(!r?.active)return;
    const lootChest={uid:'rift-'+r.start,x:r.savedWorld.x+28,y:r.savedWorld.y,kind:'relic'};
    const utility=r.won?run.chests.filter(c=>RunRelics.names[c.kind]):[];const cards=r.won?[...run.cardDrops]:[];
    const elapsed=run.time-r.start;
    for(const key of keys){run[key]=r.savedWorld[key];for(const obj of run[key])for(const prop of ['expires','until','next','attack'])if(typeof obj[prop]==='number')obj[prop]+=elapsed;}
    if(run.runeState)run.runeState={};
    run.player.x=r.savedWorld.x;run.player.y=r.savedWorld.y;run.player.hp=Math.max(1,run.player.hp);run.player.immunity=2;
    run.chainArcs=[];run.inMvp=false;run.rift={active:false};$('map-title').textContent=expeditions[run.map].name;run.castPending=null;moveRoute=[];moveTarget=undefined;run.boss=null;SkillFX.clear();
    if(success){if(!r.mvp)ProgressionGoals.record(run.level,true);for(const c of utility)run.chests.push({...c,x:run.player.x+40,y:run.player.y+15});for(const c of cards)run.cardDrops.push({...c,x:run.player.x-20,y:run.player.y});run.chests.push(lootChest);run.player.hp=Math.min(maxHp(),run.player.hp+maxHp()*.15);const q=ExpeditionQuest.ensure();if(q.stage===1)q.eliteKills++;}
    announce(success?'Fenda concluída · relicário de imbuimento liberado!':'Retorno da fenda · missão falhou, sem recompensa.',5);
  }
  function tick(dt){
    if(run.guest)return;
    if(run.riftPortal && (run.time>run.riftPortal.expires || run.portal))run.riftPortal=null;
    // Pisar no portal abre a confirmação (antes era preciso achar o botão no painel).
    if(run.riftPortal && !run.rift?.active && mode==='play' && run.player.hp>0){
      const gap=distance(run.player,run.riftPortal);
      if(gap<34 && !run.riftPortal.prompted){run.riftPortal.prompted=true;moveRoute=[];moveTarget=undefined;prompt();}
      else if(gap>80)run.riftPortal.prompted=false;
    }
    const r=run.rift;if(!r?.active)return;
    run.mapStart+=dt;
    if(r.index%3===1 && run.time>=r.nextCurse){r.nextCurse=run.time+10;const boss=run.mobs.find(e=>e.uid===r.uid);if(boss)boss.attack=Math.min(boss.attack,run.time);}
    if(r.mvp && run.time>=(r.nextAdds||r.start+5) && run.mobs.filter(e=>e.hp>0).length<9){r.nextAdds=run.time+9;for(let i=0;i<2;i++){const e=spawn(expeditions[run.map].roster[1],true);e.summoned=true;}}
    const boss=run.mobs.find(e=>e.uid===r.uid);
    if(boss && !r.mvp && !r.phase && boss.hp<=boss.max*.55 && boss.hp>0){
      r.phase=2;r.ward=true;for(const seal of run.mobs)if(seal.riftSeal)seal.hp=0;for(let i=0;i<3;i++){const e=spawn(expeditions[run.map].roster[0],true);e.riftSeal=true;e.x=Math.cos(i*TAU/3)*215;e.y=Math.sin(i*TAU/3)*215;e.hp=e.max=Math.max(100,boss.max*.025);e.type={...e.type,name:'Selo da Segunda Fase',speed:0,damage:0};}
      boss.attack=run.time+1.5;announce('FASE II · Quebre os três selos enquanto evita o guardião!',6);
    }
    if(!r.mvp && boss && run.time>=r.reinforceAt){
      r.reinforceAt=run.time+12;const living=run.mobs.reduce((n,e)=>n+(e.hp>0),0);
      if(living<9 && !r.ward) for(let i=0;i<Math.min(2,9-living);i++){const e=spawn(expeditions[run.map].roster[(i+r.index)%expeditions[run.map].roster.length],true);e.summoned=true;e.hp*=1.45;e.max=e.hp;}
    }

    // Budget the short, intense encounter to prevent effect and projectile overload.
    // Keep the boss and puzzle seals; remove oldest ordinary summons first.
    if(run.mobs.length>14){let overflow=run.mobs.length-14;run.mobs=run.mobs.filter(e=>!e.summoned || overflow--<=0);}
    if(run.shots.length>90)run.shots.splice(0,run.shots.length-90);
    if(run.effects.length>36)run.effects.splice(0,run.effects.length-36);
    if(run.particles.length>90)run.particles.splice(0,run.particles.length-90);
    if(r.ward&&!run.mobs.some(e=>e.riftSeal&&e.hp>0)){r.ward=false;r.clearedSeals++;announce('SELÖ ROMPIDO · o Guardião está vulnerável! Fase '+(r.phase||1),4);}
    if(r.won || boss?.hp<=0)leave(true);
    else if(run.player.hp<=0){leave(false);run.player.hp=0;}
    else if(run.time-r.start>(r.mvp?120:90))leave(false);
  }
  function hud(){
    let b=document.getElementById('rift-enter');if(!b){b=document.createElement('button');b.id='rift-enter';b.type='button';b.onclick=()=>run?.authoritative?requestOnline():prompt();document.getElementById('quest-text').after(b);}
    if(run.authoritative){
      // Online: a fenda é compartilhada. Quem entrar leva o grupo inteiro (validado pelo servidor).
      b.hidden=!run.riftPortal || !!run.rift?.active || run.player.hp<=0;
      if(!b.hidden){const far=distance(run.player,run.riftPortal)>150;
        b.textContent=far?'✧ Fenda aberta · vá até o portal violeta':'✧ Entrar na fenda com o grupo · '+variants[(run.riftPortal.index||0)%3].name;
        b.disabled=far;}
      if(run.rift?.cleared){document.getElementById('quest-text').textContent='Guardião derrotado! Recolha os prêmios e saia pelo portal no centro com E · '+Math.max(0,Math.ceil(run.rift.left||0))+'s';return;}
      if(run.rift?.active){const left=Math.max(0,Math.ceil(90-(run.time-run.rift.start)));
        document.getElementById('quest-text').textContent=(run.rift.ward?(run.rift.phase===2?'Fase II: destrua os novos selos!':'Destrua os três selos rúnicos para enfraquecer o guardião.'):'Guardião vulnerável! Derrote-o com o grupo.')+' · '+left+'s';}
      return;
    }
    b.hidden=run.guest || !run.riftPortal || !!run.rift?.active;
    if(!b.hidden){b.textContent='Fenda opcional · '+variants[run.riftPortal.index%3].name;b.disabled=distance(run.player,run.riftPortal)>110;}
    if(run.rift?.active)document.getElementById('quest-text').textContent=(run.rift.mvp?'Fenda MVP · carta 1% por vitória':run.rift.phase===2?(run.rift.ward?'Fase II: destrua os três selos para ferir o guardião!':'Fase II: guardião vulnerável!'):variants[run.rift.index%3].text)+' · '+Math.max(0,Math.ceil((run.rift.mvp?120:90)-(run.time-run.rift.start)))+'s';
  }
  function draw(){if(run.riftPortal && !run.inMvp){drawPortal(run.riftPortal);ctx.save();ctx.fillStyle='#fff0c2';ctx.font='bold 13px serif';ctx.textAlign='center';ctx.fillText('Fenda da Guilda',run.riftPortal.x,run.riftPortal.y-48);ctx.restore();}}
  function requestOnline(){
    if(!run?.authoritative||!run.riftPortal||distance(run.player,run.riftPortal)>150)return;
    run.coopRiftEnter=(run.coopRiftEnter||0)+1;combatNote('Abrindo a fenda para o grupo…');
  }
  function enterMvp(){const ids=Object.keys(bosses);run.riftPortal={x:run.player.x,y:run.player.y,index:1,kind:'miniBoss',mvp:true,boss:ids[Math.random()*ids.length|0]};enter();}
  return {offer,prompt,enter,enterMvp,leave,tick,hud,draw,requestOnline};
})();
