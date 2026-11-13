'use strict';
const RuneAugments=(()=>{
 let current=null;
 const isArea=s=>['blast','self','meteor','zone','chain','line'].includes(s.style)||['storm','magnum','shower','wall'].includes(s.id);
 function mods(id){return run.skillMods?.[id]||{};}
 function available(){return run.hero.tree.filter(s=>s.slot&&skillLevel(run.talents,s.id)>0&&!['heal','guard','boost','haste'].includes(s.style)).flatMap(s=>{
  const keys=isArea(s)?['wide','split']:['split','splash'];
  return keys.filter(k=>(mods(s.id)[k]||0)<2).map(key=>({kind:'rune',item:{skillId:s.id,key,name:({'split':'Cadeia Rúnica','splash':'Propagação','wide':'Área Amplificada'}[key])+' · '+s.name,desc: key==='split'?'Acertos desta habilidade ganham +1 salto de cadeia (máx. 2 melhorias).':key==='splash'?'Espalha 25% do dano em até três inimigos próximos; máx. 2 melhorias.':'Raio +12% e potência +8% por melhoria; máx. 2.'}}));
 });}
 function aim(player,range,skill,preferred){if(!isArea(skill)||preferred?.riftSeal||run.rift?.active)return preferred;
  const alive=run.mobs.filter(m=>m.hp>0&&distance(player,m)<range);if(alive.length<4)return preferred;
  const step=Math.max(1,Math.floor(alive.length/14));const candidates=alive.filter((_,i)=>i%step===0).slice(0,14);if(preferred&&!candidates.includes(preferred))candidates.push(preferred);
  const radius=((skill.radius||100)+skillLevel(run.talents,skill.id)*5)*RuneAugments.radius(skill.id);let best=preferred,score=-1;
  for(const m of candidates){let n=0;for(const other of alive)if(distance(m,other)<radius)n++;const value=n+(m.elite||bosses[m.id]?3:0)+(distance(m,player)<170?2:0);if(value>score){score=value;best=m;}}
  return best;
 }
 function grant(offer){run.skillMods??={};run.skillMods[offer.skillId]??={};run.skillMods[offer.skillId][offer.key]=(run.skillMods[offer.skillId][offer.key]||0)+1;}
 function onHit(enemy,dealt,opts){
  if(dealt<=0||opts.fromParty||opts.relicProc||opts.chainProc||enemy.riftSeal||run.level<3)return;
  const now=run.time;if((run.chainNext||0)>now)return;run.chainNext=now+1.1;
  const rank=mods(opts.skillId).split||0,hops=2+rank;let origin=enemy;const hit=new Set([enemy.uid]);run.chainArcs??=[];
  for(let i=0;i<hops;i++){
   let next=null,best=165;
   for(const mob of run.mobs){if(mob.hp<=0||hit.has(mob.uid)||mob.riftSeal)continue;const d=distance(origin,mob);if(d<best){best=d;next=mob;}}
   if(!next)break;hit.add(next.uid);run.chainArcs.push({x:origin.x,y:origin.y,tx:next.x,ty:next.y,until:now+.24});
   hurt(next,dealt*(.45+rank*.06)*Math.pow(.78,i),{chainProc:true,relicProc:true,element:opts.element||Elemental.current||Elemental.weapon()});origin=next;
  }
  const splash=mods(opts.skillId).splash||0;
  if(splash){let count=0;for(const mob of run.mobs){if(count>=3)break;if(mob.hp<=0||mob===enemy||mob.riftSeal||distance(mob,enemy)>65+splash*15)continue;hurt(mob,dealt*(.20+splash*.05),{chainProc:true,relicProc:true,element:opts.element||Elemental.current||Elemental.weapon()});count++;}}
  if(run.chainArcs.length>18)run.chainArcs.splice(0,run.chainArcs.length-18);
 }
 function draw(){run.chainArcs=(run.chainArcs||[]).filter(a=>a.until>run.time);if(!run.chainArcs.length)return;ctx.save();ctx.strokeStyle='#a9f3ff';ctx.lineWidth=2.5;for(const a of run.chainArcs){ctx.beginPath();ctx.moveTo(a.x,a.y-9);ctx.lineTo((a.x+a.tx)/2+8,(a.y+a.ty)/2-16);ctx.lineTo(a.tx,a.ty-9);ctx.stroke();}ctx.restore();}
 return {isArea,available,aim,grant,onHit,draw,remaining:hero=>hero.tree.filter(s=>s.slot&&!['heal','guard','boost','haste'].includes(s.style)).reduce((n,s)=>n+Math.max(0,4-Object.values(mods(s.id)).reduce((a,b)=>a+b,0)),0),radius:id=>1+.12*(mods(id).wide||0),power:id=>1+.08*(mods(id).wide||0),get current(){return current;},set current(v){current=v;}};
})();
const ZonePressure=(()=>{
 function guardianHp(){const stage=run.hero.stage??run.journey.stage??0;const threat=(1+Math.max(0,run.journey.base-1)/70)*(1+stage*.18)*(1+run.mapTier*.9);return Math.round(Math.max(3200,2600*threat)*RunDifficulty.factors(run.difficulty,run.coop?run.party.length+1:1).hp);}

 function fieldElite(index){const id=expeditions[run.map].roster[index%expeditions[run.map].roster.length];const e=spawn(id,true);e.elite=index===3?'miniBoss':'elite';e.type={...e.type,name:(e.elite==='miniBoss'?'Comandante ':'Veterano ')+e.type.name,patterns:index%2?['line','circle']:['circle','summons'],attacks:index%2?['Investida do Comandante','Ruptura Circular']:['Ruptura Circular','Chamar Reforços'],speed:Math.max(60,e.type.speed*.9),damage:e.type.damage*1.25};e.hp=e.max=guardianHp()*(e.elite==='miniBoss'?.58:.35);e.pattern=0;e.attack=run.time+3;announce(e.type.name+' entrou na horda!',5);}
 function tick(){
  if(run.guest||run.inMvp||run.pendingMvp||run.player.hp<=0)return;
  const local=run.time-run.mapStart;run.fieldEvents??={};
  for(let i=0;i<7;i++){if(local>=(i+1)*90&&!run.fieldEvents[i]){run.fieldEvents[i]=true;fieldElite(i);break;}}
  run.nextPickupLocal??=55;
  if(local>=run.nextPickupLocal){run.nextPickupLocal+=65;const kinds=['healing','xpMagnet','zenyCache','goldMagnet'];const seq=run.pickupSeq||0;run.pickupSeq=seq+1;const a=Math.random()*TAU;const pos=nearestWalkable({x:run.player.x+Math.cos(a)*230,y:run.player.y+Math.sin(a)*230});if(run.chests.filter(c=>c.timed).length<5)run.chests.push({uid:'timed-'+run.mapStart+'-'+seq,...pos,kind:kinds[seq%3],timed:true,expires:run.time+95});}
 }
 return {tick,guardianHp,fieldElite};
})();
const ProgressionGoals=(()=>{
 // V24.1: meta de nível de run no máximo 30 em cada classe (com o modo infinito pós-MVP, 30 é alcançável).
 const levels=[30,30,15,30,30];
 function canAdvance(p){const r=p.runRecords?.[p.stage]||{};return (r.bestLevel||0)>=(levels[p.stage]||0)&&(p.stage!==4||(r.rifts||0)>=2);}
 function record(level=0,rift=false){if(!run?.career)return;const profile=journeyOf(run.line);if(profile.stage!==run.journey.stage)return;const old=profile.runRecords?.[profile.stage]||{};const next={bestLevel:Math.max(old.bestLevel||0,level),rifts:(old.rifts||0)+(rift?1:0)};if(next.bestLevel===old.bestLevel&&next.rifts===old.rifts)return;const records={...profile.runRecords,[profile.stage]:next};saveJourney(run.line,{...profile,runRecords:records});run.journey={...run.journey,runRecords:records};}
 function text(p){const r=p.runRecords?.[p.stage]||{};return 'Melhor nível de run nesta classe: '+(r.bestLevel||0)+'/'+(levels[p.stage]||'—')+(p.stage===4?' · Fendas vencidas na transclasse: '+(r.rifts||0)+'/2':'');}
 return {levels,canAdvance,record,text};
})();
const ItemQuality=(()=>{
 const tiers={1:{name:'Comum',color:'#aeb7c4',count:0},2:{name:'Incomum',color:'#6ebf8b',count:1},3:{name:'Raro',color:'#70b8f4',count:2},4:{name:'Épico',color:'#c5a0ff',count:3}};
 function roll(id){const t=itemDb[id].tier,pool=['vit','dex','luk','agi',...(itemDb[id].classes?.includes('mage')?['int']:['str'])];const result={};for(let i=0;i<tiers[t].count;i++){const key=pool.splice(Math.random()*pool.length|0,1)[0];result[key]=Math.max(1,t-1);}return result;}
 function describe(item){const labels={str:'FOR',agi:'AGI',vit:'VIT',int:'INT',dex:'DES',luk:'SOR'};return Gear.describe(item.id)+(Object.keys(item.affixes||{}).length?' · Opções: '+Object.entries(item.affixes).map(([k,v])=>(labels[k]||k)+' +'+v).join(', '):'')+(item.cards?.length?' · '+item.cards.map(id=>cardDb[id]?.name||id).join(', '):'');}
 function list(item){const ul=document.createElement('ul');ul.className='item-stat-list';const parts=Gear.describe(item.id).split(' · ');for(const text of parts){const li=document.createElement('li');li.textContent=text;ul.append(li);}const labels={str:'FOR',agi:'AGI',vit:'VIT',int:'INT',dex:'DES',luk:'SOR'};for(const [key,n]of Object.entries(item.affixes||{})){const li=document.createElement('li');li.className='item-option';li.textContent='Opção: '+(labels[key]||key)+' +'+n;ul.append(li);}for(const [k,n]of Object.entries(item.upgrades||{})){const li=document.createElement('li');li.textContent='Forja: '+(['str','agi','vit','int','dex','luk'].includes(k)?labels[k]+' +'+n:k==='regen'?'regeneração +'+(n*.48).toFixed(2)+'/s':k==='hp'?'HP +'+(n*1.8).toFixed(1)+'%':k==='damage'?'dano físico +'+(n*2.5)+'%':k==='magic'?'dano mágico +'+(n*2.5)+'%':'movimento +'+n+'%');ul.append(li);}for(const id of item.cards||[]){const li=document.createElement('li');li.textContent=(cardDb[id]?.name||id)+': '+(cardDb[id]?.text||'');ul.append(li);}if(item.refine){const d=itemDb[item.id];const li=document.createElement('li');li.textContent='Refino +'+item.refine+': '+(d.type==='weapon'?'ATK +'+item.refine*(3+d.tier*2)+' · MATK +'+item.refine*(2+d.tier):'DEF +'+item.refine*1.25);ul.append(li);}return ul;}
 return {tiers,roll,describe,list};
})();
const ZenyServices=(()=>{
 function live(){return !!run&&!['menu','ended'].includes(mode);}
 function balance(){return (saved.zeny||0)+(live()?run.zeny:0);}
 function spend(n){if(balance()<n)return false;const onRun=live()?Math.min(run.zeny,n):0;if(live())run.zeny-=onRun;persist({zeny:(saved.zeny||0)-(n-onRun)});return true;}
 const refineCost=item=>(40+itemDb[item.id].tier*20)*Math.pow((item.refine||0)+1,2);
 function refine(item){if((item.refine||0)>=8||!spend(refineCost(item)))return false;updateItem(item.uid,{refine:(item.refine||0)+1});return true;}
 function buyPotion(){if(!spend(180))return false;persist({healPotions:(saved.healPotions||0)+1});return true;}
 function buyReroll(){if(!live()||run.rerollBoughtMap===run.mapStart||!spend(500+run.mapTier*150))return false;run.rerolls=(run.rerolls??3)+1;run.rerollBoughtMap=run.mapStart;return true;}
 function usePotion(){if(run?.authoritative){if(mode==='inventory'){closeInventory();mode='play';}return queueOnlineItem('potion');}if(!live()||run.player.hp<=0||mode==='inventory'&&run.inventoryPreviousMode!=='play'||!['play','inventory'].includes(mode)||(run.potionNext||0)>run.time||!(saved.healPotions>0)||run.player.hp>=maxHp())return false;persist({healPotions:saved.healPotions-1});run.player.hp=Math.min(maxHp(),run.player.hp+maxHp()*.25);run.potionNext=run.time+30;if(mode==='inventory')closeInventory();effect('heal',run.player.x,run.player.y,40,'#b0ffd0');return true;}
 function render(list,refresh){list.classList.add('run-item-grid');const heading=document.createElement('p');heading.className='run-help';heading.textContent='Saldo disponível: '+balance()+' Zeny. Refino garantido até +8: 0% de chance de quebrar, preserva cartas e opções. Poções: 180 z. Sorteio extra: um por expedição.';list.append(heading);
 const services=document.createElement('div');services.className='service-actions';const potion=button('Comprar poção · 180 z','',()=>{buyPotion();refresh();});potion.disabled=balance()<180;services.append(potion);if(live()){const reroll=button('Comprar sorteio · '+(500+run.mapTier*150)+' z','',()=>{buyReroll();refresh();});reroll.disabled=run.rerollBoughtMap===run.mapStart||balance()<500+run.mapTier*150;reroll.title=run.rerollBoughtMap===run.mapStart?'Sorteio desta expedição já comprado':'Compra um sorteio extra para a run';services.append(reroll);}list.append(services);
 for(const item of items().sort((a,b)=>itemDb[b.id].tier-itemDb[a.id].tier)){const row=document.createElement('article');row.className='service-row';const copy=document.createElement('div'),name=document.createElement('strong'),detail=document.createElement('p');name.textContent=Gear.label(item)+' · T'+itemDb[item.id].tier;detail.textContent=ItemQuality.describe(item);copy.append(name,detail);const action=button((item.refine||0)>=8?'Refino máximo +8':'Refinar para +'+((item.refine||0)+1)+' · '+refineCost(item)+' z · 100% de sucesso, não quebra','',()=>{refine(item);refresh();});action.disabled=(item.refine||0)>=8||balance()<refineCost(item);row.append(Gear.sprite(item.id),copy,action);list.append(row);}
 }
 return {balance,spend,refineCost,refine,buyPotion,buyReroll,usePotion,render};
})();
const LootReview=(()=>{
 function inventory(){const section=document.createElement('section');section.className='loot-inventory';const title=document.createElement('h3');title.textContent='Seu inventário · '+jobs[run.hero.id].name;section.append(title);const active=document.createElement('div');active.className='loot-artifacts';for(const slot of ['ring1','ring2','necklace']){const relic=RunRelics.relics[run.relics?.[slot]];if(relic){const row=document.createElement('p');row.textContent=relic.name+' · '+relic.desc;active.append(row);}}if(active.childElementCount)section.append(active);
 const list=document.createElement('div');list.className='loot-owned-list';const owned=[...items()];for(const item of Object.values(run.gear).filter(Boolean))if(!owned.some(v=>v.uid===item.uid))owned.unshift(item);
 for(const item of owned.filter(it=>Gear.canEquip(it.id,run.line,run.journey.stage)).sort((a,b)=>itemDb[b.id].tier-itemDb[a.id].tier)){const row=document.createElement('article');row.dataset.tier=itemDb[item.id].tier;const name=document.createElement('strong'),desc=document.createElement('p');name.textContent=Gear.label(item)+(Object.values(run.gear).some(i=>i?.uid===item.uid)?' · EQUIPADO':'')+' · T'+itemDb[item.id].tier;desc.textContent=ItemQuality.describe(item);row.append(Gear.sprite(item.id),name,ItemQuality.list(item));list.append(row);}if(!list.children.length)list.textContent='Nenhum equipamento compatível guardado.';section.append(list);return section;}
 function wrap(...nodes){const layout=document.createElement('div');layout.className='loot-dual';const offers=document.createElement('section');offers.className='loot-offers';const heading=document.createElement('h3');heading.textContent='Recompensas e comparação';offers.append(heading,...nodes);layout.append(inventory(),offers);return layout;}
 return {inventory,wrap};
})();
