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
 function record(level=0,rift=false){if(!run?.career)return;const profile=journeyOf(run.line);if(profile.stage!==run.journey.stage||playStageOf(profile)!==profile.stage)return;const old=profile.runRecords?.[profile.stage]||{};const next={bestLevel:Math.max(old.bestLevel||0,level),rifts:(old.rifts||0)+(rift?1:0)};if(next.bestLevel===old.bestLevel&&next.rifts===old.rifts)return;const records={...profile.runRecords,[profile.stage]:next};saveJourney(run.line,{...profile,runRecords:records});run.journey={...run.journey,runRecords:records};}
 function text(p){const r=p.runRecords?.[p.stage]||{};return 'Melhor nível de run nesta classe: '+(r.bestLevel||0)+'/'+(levels[p.stage]||'—')+(p.stage===4?' · Fendas vencidas na transclasse: '+(r.rifts||0)+'/2':'');}
 return {levels,canAdvance,record,text};
})();
const ItemQuality=(()=>{
 const tiers={1:{name:'Comum',color:'#aeb7c4',count:0},2:{name:'Incomum',color:'#6ebf8b',count:1},3:{name:'Raro',color:'#70b8f4',count:2},4:{name:'Épico',color:'#c5a0ff',count:3}};
 function roll(id){const t=itemDb[id].tier,pool=['vit','dex','luk','agi',...(itemDb[id].classes?.includes('mage')?['int']:['str'])];const result={};for(let i=0;i<tiers[t].count;i++){const key=pool.splice(Math.random()*pool.length|0,1)[0];result[key]=Math.max(1,t-1);}return result;}
 function describe(item){const labels={str:'FOR',agi:'AGI',vit:'VIT',int:'INT',dex:'DES',luk:'SOR'};return Gear.describe(item.id)+(Object.keys(item.affixes||{}).length?' · Opções: '+Object.entries(item.affixes).map(([k,v])=>(labels[k]||k)+' +'+v).join(', '):'')+(item.cards?.length?' · '+item.cards.map(id=>cardDb[id]?.name||id).join(', '):'');}
 function list(item){const ul=document.createElement('ul');ul.className='item-stat-list';const parts=Gear.describe(item.id).split(' · ');for(const text of parts){const li=document.createElement('li');li.textContent=text;ul.append(li);}const labels={str:'FOR',agi:'AGI',vit:'VIT',int:'INT',dex:'DES',luk:'SOR'};for(const [key,n]of Object.entries(item.affixes||{})){const li=document.createElement('li');li.className='item-option';li.textContent='Opção: '+(labels[key]||key)+' +'+n;ul.append(li);}for(const [k,n]of Object.entries(item.upgrades||{})){const li=document.createElement('li');li.textContent='Forja: '+(['str','agi','vit','int','dex','luk'].includes(k)?labels[k]+' +'+n:k==='regen'?'regeneração +'+(n*.48).toFixed(2)+'/s':k==='hp'?'HP +'+(n*1.8).toFixed(1)+'%':k==='damage'?'dano físico +'+(n*2.5)+'%':k==='magic'?'dano mágico +'+(n*2.5)+'%':'movimento +'+n+'%');ul.append(li);}for(const id of item.cards||[]){const li=document.createElement('li');li.textContent=(cardDb[id]?.name||id)+': '+(cardDb[id]?.text||'');ul.append(li);}if(item.refine){const d=itemDb[item.id],per=RefineRules.perLevel(d),r=RefineRules.level(item);const li=document.createElement('li');li.className='item-refine-line refine-band-'+RefineRules.tier(r);li.textContent='Refino +'+r+': '+(d.type==='weapon'?'ATQ +'+r*per.atk+' · ATQM +'+r*per.matk:'DEF +'+(r*per.def).toLocaleString('pt-BR'));ul.append(li);}return ul;}
 return {tiers,roll,describe,list};
})();
const ZenyServices=(()=>{
 function live(){return !!run&&!['menu','ended'].includes(mode);}
 function balance(){return (saved.zeny||0)+(live()?run.zeny:0);}
 function spend(n){if(balance()<n)return false;const onRun=live()?Math.min(run.zeny,n):0;if(live())run.zeny-=onRun;persist({zeny:(saved.zeny||0)-(n-onRun)});return true;}
 /* ===== V24 · FORJA até +10 =====
  * Regras, chances, custos e bônus: RefineRules (items.js). Com conta, o SERVIDOR sorteia e grava (POST /api/account/refine);
  * sem conta (solo neste navegador), as mesmas regras rodam aqui com crypto.getRandomValues. A forja fica no menu principal. */
 const R=RefineRules;
 const forge={uid:null,busy:false,confirm:false,feedback:null};
 const TYPE_NAMES={weapon:'Arma',armor:'Armadura',shield:'Escudo',garment:'Capa',shoes:'Calçado',headgear:'Chapéu',accessory:'Acessório'};
 const STAT_NAMES={atk:'ATQ',matk:'ATQM',def:'DEF'};
 const fmt=n=>Number(n).toLocaleString('pt-BR',{maximumFractionDigits:2});
 const zeny=n=>Math.round(n).toLocaleString('pt-BR')+' Zeny';
 const pctText=x=>x.toLocaleString('pt-BR',{maximumFractionDigits:2})+'%';
 const refineCost=item=>R.preview(item).cost||0;
 const randomUnit=()=>{const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]/4294967296;};
 const requestId=()=>(crypto.randomUUID?crypto.randomUUID():Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('')).replace(/[^A-Za-z0-9_-]/g,'');
 function adoptServer(progress){
  if(!progress?.data)return;
  saved=progress.data;try{localStorage.setItem(SAVE,JSON.stringify(saved));}catch{}
  window.MidgardAccount?.adopt(progress);
 }
 /** Uma tentativa. Devolve {result, from, to, cost, gain} ou lança Error com a mensagem para o jogador. */
 async function attempt(item){
  if(live())throw new Error('A forja fica no menu principal: termine ou saia da expedição para refinar.');
  const from=R.level(item);
  if(window.MidgardAccount?.signedIn()){
   if(!(await window.MidgardAccount.settle()))throw new Error('Seu progresso ainda não foi salvo na nuvem. Aguarde a sincronização e tente de novo.');
   const body={uid:item.uid,from,requestId:requestId(),revision:window.MidgardAccount.currentRevision()};
   let lastError=null;
   // Queda de conexão: repete a MESMA requisição (mesmo requestId) — o servidor devolve o resultado já gravado, sem cobrar de novo.
   for(let tryNo=0;tryNo<3;tryNo++){
    try{
     const response=await fetch('/api/account/refine',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json','X-Midgard-Request':'1'},body:JSON.stringify(body),signal:AbortSignal.timeout(10000)});
     const out=await response.json().catch(()=>({}));
     if(out.progress)adoptServer(out.progress);
     if(!response.ok)throw Object.assign(new Error(out.error||'A forja não respondeu.'),{final:true});
     return out;
    }catch(error){if(error.final)throw error;lastError=error;await new Promise(r=>setTimeout(r,600*(tryNo+1)));}
   }
   throw new Error('Sem conexão com o servidor. Se a tentativa chegou a ser feita, o resultado aparece ao reabrir a forja. ('+(lastError?.message||'erro de rede')+')');
  }
  // Sem conta: mesmas regras, sorteio local.
  const out=R.attempt(item,saved.zeny||0,randomUnit,from);
  if(!out.ok)throw new Error(R.errors[out.error]||'Refino recusado.');
  const change={zeny:Math.max(0,(saved.zeny||0)-out.cost)};
  if(out.result==='broken'){
   change.items=items().filter(x=>x.uid!==item.uid);
   const journeys={...saved.journeys};
   for(const [line,j] of Object.entries(journeys))if(j?.gear&&Object.values(j.gear).includes(item.uid))journeys[line]={...j,gear:Object.fromEntries(Object.entries(j.gear).filter(([,u])=>u!==item.uid))};
   change.journeys=journeys;
  }else change.items=items().map(x=>x.uid===item.uid?out.item:x);
  persist(change);
  return {...out,uid:item.uid};
 }
 /** Compatível com a V23 (refino direto, usado por scripts antigos): agora passa pela forja com risco. */
 function refine(item){attempt(item).catch(()=>{});return true;}
 function buyPotion(){if(!spend(180))return false;persist({healPotions:(saved.healPotions||0)+1});return true;}
 function buyReroll(){if(!live()||run.rerollBoughtMap===run.mapStart||!spend(500+run.mapTier*150))return false;run.rerolls=(run.rerolls??3)+1;run.rerollBoughtMap=run.mapStart;return true;}
 function usePotion(){if(run?.authoritative){if(mode==='inventory'){closeInventory();mode='play';}return queueOnlineItem('potion');}if(!live()||run.player.hp<=0||mode==='inventory'&&run.inventoryPreviousMode!=='play'||!['play','inventory'].includes(mode)||(run.potionNext||0)>run.time||!(saved.healPotions>0)||run.player.hp>=maxHp())return false;persist({healPotions:saved.healPotions-1});run.player.hp=Math.min(maxHp(),run.player.hp+maxHp()*.25);run.potionNext=run.time+30;if(mode==='inventory')closeInventory();effect('heal',run.player.x,run.player.y,40,'#b0ffd0');return true;}
 const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 function itemName(item){return itemDb[item.id].name+(R.level(item)?' +'+R.level(item):'');}
 function forgeList(refresh){
  const all=items().filter(x=>itemDb[x.id]).sort((a,b)=>R.level(b)-R.level(a)||itemDb[b.id].tier-itemDb[a.id].tier);
  if(!forge.uid||!all.some(x=>x.uid===forge.uid))forge.uid=all[0]?.uid||null;
  const list=el('div','forge-items');list.setAttribute('role','listbox');list.setAttribute('aria-label','Equipamentos para refinar');
  for(const item of all){
   const b=button('', 'forge-item'+(item.uid===forge.uid?' active':''),()=>{if(forge.busy)return;forge.uid=item.uid;forge.confirm=false;forge.feedback=null;refresh();});
   b.setAttribute('role','option');b.setAttribute('aria-selected',String(item.uid===forge.uid));
   b.dataset.band=String(R.tier(R.level(item)));
   const owner=typeof equippedBy==='function'?equippedBy(item.uid):null;
   b.append(Gear.sprite(item.id,R.level(item)),el('span','forge-item-name',itemName(item)),el('small','',TYPE_NAMES[itemDb[item.id].type]+' · T'+itemDb[item.id].tier+(owner?' · equipado':'')));
   list.append(b);
  }
  if(!all.length)list.append(el('p','forge-empty','Nenhum equipamento guardado. Derrote MVPs para encontrar equipamentos permanentes.'));
  return {list,item:all.find(x=>x.uid===forge.uid)||null};
 }
 function statTable(p){
  const table=el('table','forge-compare');const head=el('tr');for(const t of ['Atributo','Atual','Após +'+p.to,'Ganho'])head.append(el('th','',t));
  const thead=el('thead');thead.append(head);const tbody=el('tbody');
  for(const key of Object.keys(p.after)){
   const row=el('tr');const gain=p.gain[key]||0;
   row.append(el('th','',STAT_NAMES[key]||key),el('td','',fmt(p.current[key]||0)),el('td','forge-after',fmt(p.after[key])),el('td',gain?'forge-gain':'',gain?'+'+fmt(gain)+' '+(STAT_NAMES[key]||key):'—'));
   tbody.append(row);
  }
  table.append(thead,tbody);return table;
 }
 function oddsBox(o){
  const box=el('div','forge-odds');box.setAttribute('aria-label','Probabilidades da tentativa');
  const bar=el('div','forge-odds-bar');
  for(const [k,cls,label] of [['success','ok','Sucesso'],['failKeep','keep','Falha sem quebra'],['destroy','broke','Destruição']]){
   const seg=el('i','forge-seg '+cls);seg.style.width=(o.percent[k])+'%';seg.title=label+': '+pctText(o.percent[k]);bar.append(seg);
  }
  const legend=el('ul','forge-odds-legend');
  for(const [k,cls,label] of [['success','ok','Chance de sucesso'],['failKeep','keep','Chance de falha sem quebra'],['destroy','broke','Chance efetiva de destruição']]){
   const li=el('li',cls);li.append(el('span','',label+': '),el('strong','',pctText(o.percent[k])));legend.append(li);
  }
  box.append(bar,legend);return box;
 }
 function feedbackBox(){
  const f=forge.feedback;if(!f)return null;
  const box=el('div','forge-feedback forge-'+f.kind);box.setAttribute('role','status');box.setAttribute('aria-live','polite');
  box.append(el('strong','',f.title));if(f.text)box.append(el('p','',f.text));
  if(f.gains&&Object.keys(f.gains).length){const ul=el('ul','forge-gains');for(const [k,v] of Object.entries(f.gains))ul.append(el('li','','+'+fmt(v)+' '+(STAT_NAMES[k]||k)));box.append(ul);}
  return box;
 }
 async function run_(item,refresh){
  forge.busy=true;forge.confirm=false;forge.feedback={kind:'busy',title:'Forjando…',text:'Aguarde o resultado.'};refresh();
  const name=itemDb[item.id].name;
  try{
   const out=await attempt(item);
   if(out.result==='success')forge.feedback={kind:'success',title:'✦ SUCESSO! '+name+' agora é +'+out.to+'.',text:'Atributos aumentados:',gains:out.gain};
   else if(out.result==='fail')forge.feedback={kind:'fail',title:'✖ Falhou. '+name+' continua +'+out.from+'.',text:zeny(out.cost)+' foram consumidos. O equipamento não foi danificado.'};
   else {forge.feedback={kind:'broken',title:'☠ '+name+' +'+out.from+' foi DESTRUÍDO.',text:'A tentativa de +'+out.to+' quebrou o equipamento. '+zeny(out.cost)+' foram consumidos.'};forge.uid=null;}
   if(out.replay)forge.feedback.text=(forge.feedback.text||'')+' (resultado recuperado após a reconexão; o Zeny foi descontado uma única vez)';
  }catch(error){forge.feedback={kind:/insuficiente/i.test(error.message)?'zeny':/máximo/i.test(error.message)?'max':'error',title:error.message};}
  finally{forge.busy=false;refresh();if(mode==='menu'&&typeof renderJourney==='function')try{renderJourney();}catch{}}
 }
 function forgePanel(refresh){
  const panel=el('section','forge-panel');panel.setAttribute('aria-label','Forja de refinamento');
  const head=el('header','forge-head');head.append(el('h3','','⚒ Forja de Refinamento'),el('small','','Refine até +'+R.MAX+'. Cada tentativa consome o custo em Zeny, com sucesso ou não. A partir de +5 o equipamento pode ser destruído.'));
  panel.append(head);
  const {list,item}=forgeList(refresh);
  const detail=el('div','forge-detail');
  const fb=feedbackBox();
  if(!item){detail.append(fb||el('p','forge-empty','Selecione um equipamento.'));panel.append(list,detail);return panel;}
  const data=itemDb[item.id],from=R.level(item),p=R.preview(item);
  const card=el('div','forge-selected');card.dataset.band=String(R.tier(from));
  const icon=Gear.sprite(item.id,from);icon.classList.add('forge-icon');
  const info=el('div','forge-info');
  info.append(el('strong','forge-name',itemName(item)),el('span','forge-meta',ItemQuality.tiers[data.tier].name+' · '+TYPE_NAMES[data.type]+' · Refino atual: +'+from));
  if(item.cards?.length)info.append(el('span','forge-cards','Cartas: '+item.cards.map(id=>cardDb[id]?.name||id).join(', ')));
  card.append(icon,info);detail.append(card);
  if(!p.ok){
   detail.append(el('div','forge-feedback forge-max','★ Refinamento máximo alcançado (+'+R.MAX+').'));
   const t=el('p','forge-max-stats','Atributos: '+Object.entries(p.current||{}).map(([k,v])=>(STAT_NAMES[k]||k)+' '+fmt(v)).join(' · '));detail.append(t);
   if(fb)detail.append(fb);panel.append(list,detail);return panel;
  }
  detail.append(el('p','forge-step','+'+p.from+'  →  +'+p.to),statTable(p),oddsBox(p.odds));
  const have=window.MidgardAccount?.signedIn()?(saved.zeny||0):(saved.zeny||0),enough=have>=p.cost;
  const cost=el('div','forge-cost'+(enough?'':' short'));
  cost.append(el('span','','Custo desta tentativa: '),el('strong','',zeny(p.cost)),el('span','forge-balance',' · Seu Zeny: '+zeny(have)));
  detail.append(cost);
  if(live())detail.append(el('p','forge-note','A forja fica no menu principal. Termine ou saia da expedição para refinar.'));
  const risky=p.odds.destroy>0;
  const actions=el('div','forge-actions');
  if(forge.confirm&&risky){
   const warn=el('div','forge-confirm');warn.setAttribute('role','alertdialog');
   warn.append(el('strong','','Este refinamento pode destruir permanentemente seu equipamento. Deseja continuar?'),
    el('p','','Chance efetiva de destruição: '+pctText(p.odds.percent.destroy)+'. Se quebrar, '+(item.cards?.length?'o item e as cartas encaixadas serão perdidos':'o item será perdido')+' para sempre.'));
   const yes=button('Sim, refinar para +'+p.to,'forge-go danger',()=>run_(item,refresh));
   const no=button('Cancelar','forge-cancel',()=>{forge.confirm=false;refresh();});
   const row=el('div','forge-confirm-actions');row.append(yes,no);warn.append(row);actions.append(warn);
  }else{
   const go=button(enough?'Refinar para +'+p.to+' · '+zeny(p.cost):'Zeny insuficiente · faltam '+zeny(p.cost-have),'forge-go'+(risky?' risky':''),()=>{
    if(forge.busy)return;
    if(!enough){forge.feedback={kind:'zeny',title:'Zeny insuficiente: faltam '+zeny(p.cost-have)+'.'};refresh();return;}
    if(risky){forge.confirm=true;forge.feedback=null;refresh();return;}
    run_(item,refresh);
   });
   go.disabled=forge.busy||!enough||live();actions.append(go);
  }
  detail.append(actions);if(fb)detail.append(fb);
  panel.append(list,detail);return panel;
 }
 function render(list,refresh){list.classList.add('run-item-grid');const heading=document.createElement('p');heading.className='run-help';heading.textContent='Saldo disponível: '+balance().toLocaleString('pt-BR')+' Zeny. Forja até +'+R.MAX+' com chance de falha e de quebra; refino preserva cartas e opções. Poções: 180 z. Sorteio extra: um por expedição.';list.append(heading);
 const services=document.createElement('div');services.className='service-actions';const potion=button('Comprar poção · 180 z','',()=>{buyPotion();refresh();});potion.disabled=balance()<180;services.append(potion);if(live()){const reroll=button('Comprar sorteio · '+(500+run.mapTier*150)+' z','',()=>{buyReroll();refresh();});reroll.disabled=run.rerollBoughtMap===run.mapStart||balance()<500+run.mapTier*150;reroll.title=run.rerollBoughtMap===run.mapStart?'Sorteio desta expedição já comprado':'Compra um sorteio extra para a run';services.append(reroll);}list.append(services);
 list.append(forgePanel(refresh));
 }
 return {balance,spend,refineCost,refine,attempt,buyPotion,buyReroll,usePotion,render,forgeState:forge};
})();
const LootReview=(()=>{
 function inventory(){const section=document.createElement('section');section.className='loot-inventory';const title=document.createElement('h3');title.textContent='Seu inventário · '+jobs[run.hero.id].name;section.append(title);const active=document.createElement('div');active.className='loot-artifacts';for(const slot of ['ring1','ring2','necklace']){const relic=RunRelics.relics[run.relics?.[slot]];if(relic){const row=document.createElement('p');row.textContent=relic.name+' · '+relic.desc;active.append(row);}}if(active.childElementCount)section.append(active);
 const list=document.createElement('div');list.className='loot-owned-list';const owned=[...items()];for(const item of Object.values(run.gear).filter(Boolean))if(!owned.some(v=>v.uid===item.uid))owned.unshift(item);
 for(const item of owned.filter(it=>Gear.canEquip(it.id,run.line,run.journey.stage)).sort((a,b)=>itemDb[b.id].tier-itemDb[a.id].tier)){const row=document.createElement('article');row.dataset.tier=itemDb[item.id].tier;const name=document.createElement('strong'),desc=document.createElement('p');name.textContent=Gear.label(item)+(Object.values(run.gear).some(i=>i?.uid===item.uid)?' · EQUIPADO':'')+' · T'+itemDb[item.id].tier;desc.textContent=ItemQuality.describe(item);row.append(Gear.sprite(item.id),name,ItemQuality.list(item));list.append(row);}if(!list.children.length)list.textContent='Nenhum equipamento compatível guardado.';section.append(list);return section;}
 function wrap(...nodes){const layout=document.createElement('div');layout.className='loot-dual';const offers=document.createElement('section');offers.className='loot-offers';const heading=document.createElement('h3');heading.textContent='Recompensas e comparação';offers.append(heading,...nodes);layout.append(inventory(),offers);return layout;}
 return {inventory,wrap};
})();
