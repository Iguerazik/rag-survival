'use strict';
/* Client-inspired character & equipment windows. Original template BMPs were provided by the user,
   converted to transparent PNGs so browsers can render them. Read-only while exploring; no save mutation. */
const ROClientWindows = (()=>{
  const get=id=>document.getElementById(id);
  const dialog=get('character-dialog');
  const body=get('character-dialog-body');
  let tab='equipment';
  let previousMode=null;
  const statNames={str:['FOR','Ataque físico e carga'],agi:['AGI','Esquiva e velocidade de ataque'],vit:['VIT','Vida e resistência'],int:['INT','Dano mágico e SP'],dex:['DES','Acerto, ataques à distância e cast'],luk:['SOR','Crítico e esquiva perfeita']};
  const asset='assets/ro-skin/';
  const make=(tag,klass='',txt)=>{const el=document.createElement(tag);if(klass)el.className=klass;if(txt!==undefined)el.textContent=txt;return el;};
  const getLine=()=>run&&mode!=='menu'&&mode!=='ended'?run.line:selected;
  const getProfile=line=>run&&mode!=='menu'&&mode!=='ended'&&run.line===line ?run.journey:(journeyMode==='training'?trainingJourney(line):journeyOf(line));
  function profileName(line,profile){return jobs[jobLines[line][profile.stage]]?.name||'Aventureiro';}
  function title(){get('character-dialog-heading').textContent=tab==='equipment'?'Equipamentos do personagem':'Informações do personagem';}
  function button(label,action,klass='') {const b=make('button','ro-client-button '+klass,label);b.type='button';b.addEventListener('click',action);return b;}
  function switchTo(callback){
    close();
    // Switching to another modal must restore play before openInventory captures its previous mode.
    if(run&&mode==='character')mode='play';
    callback();
  }
  function render(){
    if(!body)return;
    title();
    const line=getLine(),profile=getProfile(line),stage=profile.stage??0;
    const displayedGear=run&&mode!=='menu'&&mode!=='ended'&&run.line===line?run.gear:gearOf(profile);
    const stat=RO.derive(jobs[jobLines[line][stage]],profile,Gear.bonuses(displayedGear));
    const tabs=make('nav','ro-client-tabs');tabs.setAttribute('aria-label','Abas do personagem');
    for(const [name,label,icon] of [['equipment','⚔ Equipamento','btn_equip_off.png'],['stats','✧ Atributos','btn_status_off.png']]){
      const b=button(label,()=>{tab=name;render();},tab===name?'selected':'');
      b.setAttribute('aria-pressed',String(tab===name));
      const img=make('img');img.src=asset+icon;img.alt='';img.setAttribute('aria-hidden','true');b.prepend(img);tabs.append(b);
    }
    const upper=make('div','ro-client-heading');
    const left=make('div'); left.append(make('b','',profileName(line,profile)),make('small','','Nível base '+profile.base+' · Nv. classe '+profile.job+' · '+(profile.points||0)+' pontos livres'));
    const money=make('strong','ro-zeny','◆ '+(saved.zeny||0).toLocaleString('pt-BR')+' z');upper.append(left,money);
    const main=make('div','ro-client-main');
    if(tab==='equipment') {
      const paper=make('section','ro-paper-doll');paper.setAttribute('aria-label','Slots de equipamento');
      const avatar=make('div','ro-paper-avatar');avatar.append(Art.portrait(jobs[jobLines[line][stage]].id));paper.append(avatar);
      const coords={headgear:['14%','16%'],weapon:['14%','39%'],garment:['14%','62%'],accessory1:['14%','84%'],armor:['86%','16%'],shield:['86%','39%'],shoes:['86%','62%'],accessory2:['86%','84%']};
      for(const [slot,meta] of Object.entries(gearSlots)) {
        const item=displayedGear[slot];const b=button('',()=>{
          const inRun=!!run&&mode!=='menu'&&mode!=='ended';
          switchTo(()=>inRun?openInventory():openGearDialog(slot));
        },'ro-slot'+(item?' filled':''));
        b.dataset.slot=slot;
        b.style.left=coords[slot][0];b.style.top=coords[slot][1];
        b.title=meta.name+(item?' — '+Gear.label(item):' — vazio')+' · clique para gerenciar';
        const slotName=make('span','ro-v15-slot-label',meta.name);b.append(slotName);
        if(item){const sprite=Gear.sprite(item.id);sprite.setAttribute('aria-hidden','true');b.append(sprite);}else b.append(make('span','','+'));
        b.setAttribute('aria-label',b.title);paper.append(b);
      }
      const side=make('section','ro-gear-details');side.append(make('h3','','Conjunto equipado'));
      for(const [slot,meta] of Object.entries(gearSlots)){
        const equipped=displayedGear[slot];const row=make('div','ro-gear-row');row.append(make('span','',meta.name),make('strong','',equipped?Gear.label(equipped):'Vazio'));side.append(row);
        if(equipped?.cards?.length){const cardLine=make('small','ro-gear-cards','▣ '+equipped.cards.map(x=>cardDb[x]?.name||x).join(' · '));side.append(cardLine);}
      }
      side.append(make('p','ro-hint','Clique em um slot para equipar, desequipar ou encaixar cartas. As cartas fortalecem seus equipamentos.'));
      main.append(paper,side);
    } else {
      const portrait=make('div','ro-status-art');portrait.append(Art.portrait(jobs[jobLines[line][stage]].id));
      const statPanel=make('section','ro-stats-panel');statPanel.append(make('h3','','Status Renewal'));
      const stats=make('div','ro-attributes');
      for(const [key,[label,help]] of Object.entries(statNames)){
        const row=make('div','ro-attr');row.title=help;
        row.append(make('abbr','',label),make('strong','',String(stat.raw[key])));
        const bonus=stat.extra[key];row.append(make('span','ro-bonus',bonus?'+'+bonus:''));
        if(!run&&journeyMode==='career'){
          const cost=RO.raiseCost(stat.raw[key]);
          const add=button('+',()=>{addStat(key);render();},'ro-stat-plus');add.disabled=profile.points<cost||stat.raw[key]>=RO.statCap(stage);
          add.title='Aumentar '+label+' · custa '+cost+' pontos';row.append(add);
        }
        stats.append(row);
      }
      statPanel.append(stats);
      const vitals=make('section','ro-vitals');
      const hero=jobs[jobLines[line][stage]];
      const hpMaximum=run&&mode!=='menu'&&run.line===line?Math.round(run.maxHp):Math.round(hero.hp*stat.hpMul);
      const spMaximum=run&&mode!=='menu'&&run.line===line?Math.round(run.maxSp):Math.round(hero.sp*stat.spMul);
      for(const [label,value,max,type] of [['HP',run&&mode!=='menu'?Math.round(run.player.hp):hpMaximum,hpMaximum,'hp'],['SP',run&&mode!=='menu'?Math.round(run.player.sp):spMaximum,spMaximum,'sp']]){
        const block=make('div','ro-vital');const top=make('div','ro-vital-text');
        top.append(make('b','',label),make('span','',value+' / '+max));
        const track=make('div','ro-vital-track '+type);const fill=make('i');fill.style.width=(100*Math.max(0,Math.min(1,value/Math.max(1,max))))+'%';track.append(fill);
        block.append(top,track);vitals.append(block);
      }
      const info=make('p','ro-hint','Clique em + para distribuir pontos entre as expedições. Reset disponível na jornada abaixo do seletor de classes.');
      statPanel.append(vitals,info);
      const totals=make('section','ro-derived');totals.append(make('h3','','Combate'));
      const derived=[['ATK',stat.statusAtk+' + '+stat.weapon],['MATK',stat.statusMatk+' + '+stat.weaponMatk],['DEF',stat.softDef+' + '+stat.hardDef],['MDEF',stat.softMdef+' + '+stat.hardMdef],['HIT',stat.hit],['FLEE',stat.flee],['CRIT',stat.crit],['ASPD',Math.round(stat.aspd*10)/10]];
      for(const [key,value] of derived){const row=make('div','ro-gear-row');row.append(make('span','',key),make('strong','',String(value)));totals.append(row);}
      const foot=make('p','ro-hint','FOR: dano • AGI: velocidade/esquiva • VIT: HP • INT: magia/SP • DES: precisão/cast • SOR: crítico');
      totals.append(foot);
      const statsSide=make('div','ro-stats-left');statsSide.append(portrait,statPanel);
      main.append(statsSide,totals);
    }
    const actions=make('footer','ro-client-footer');
    actions.append(button('🎒 Abrir inventário',()=>switchTo(openInventory)));
    actions.append(button('▣ Álbum de cartas',()=>switchTo(openAlbum)));
    actions.append(button('Fechar',close,'ro-close-client'));
    body.replaceChildren(tabs,upper,main,actions);
  }
  function open(which='equipment') {
    if(!dialog||dialog.open)return;
    tab=which;
    if(run&&mode==='play'){previousMode='play';mode='character';}
    else previousMode=null;
    render();dialog.showModal();
  }
  function close(){if(dialog?.open) dialog.close();}
  dialog?.addEventListener('close',()=>{
    if(previousMode==='play'&&run&&mode==='character'){mode='play';canvas.focus({preventScroll:true});}
    previousMode=null;
  });
  dialog?.addEventListener('cancel',e=>{e.preventDefault();close();});
  get('character-dialog-close')?.addEventListener('click',close);
  for(const [id,which] of [['nav-status','stats'],['nav-equipment','equipment'],['hud-status','stats'],['hud-equipment','equipment'],['menu-character-status','stats'],['menu-character-equipment','equipment']]) get(id)?.addEventListener('click',()=>open(which));
  return {open,close,render};
})();
