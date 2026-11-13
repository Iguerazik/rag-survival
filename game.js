'use strict';

const $ = id => document.getElementById(id);
const canvas = $('field');
const ctx = canvas.getContext('2d', { alpha: false });
const TAU = Math.PI * 2;
const FINAL_WAVE = 720;
const SAVE = window.MidgardAccount?.saveKey() || 'midgard-survivors-v1';
const monsters = {
  poring: { hp: 17, speed: 53, r: 11, damage: 8, xp: 1, color: '#ed9daf' },
  lunatic: { hp: 25, speed: 81, r: 11, damage: 10, xp: 2, color: '#f2cfd0' },
  fabre: { hp: 38, speed: 66, r: 13, damage: 13, xp: 2, color: '#c0e19b' },
  spore: { hp: 57, speed: 54, r: 15, damage: 17, xp: 3, color: '#f2aeae' },
  ...bosses,
  ...Object.fromEntries(Object.entries(renewalMobs).map(([id, [name, hp, speed, r, damage, xp, color]]) =>
    [id, { name, hp, speed, r, damage, xp, color }])),
};

function loadSave() {
  if(window.MidgardAccount?.signedIn())return window.MidgardAccount.initialSave();
  try { return JSON.parse(localStorage.getItem(SAVE)) ?? {}; }
  catch { return {}; }
}
let saved = loadSave();
let selected = jobLines[saved.selected] ? saved.selected : 'sword';
saved = Campaign.migrate(saved, selected);
try { localStorage.setItem(SAVE, JSON.stringify(saved)); } catch {}
let selectedMap = expeditions[saved.selectedMap] ? saved.selectedMap : mapOrder[0];
function mapUnlocked(id) { return Campaign.mapUnlocked(saved,selected,id); }
if (!mapUnlocked(selectedMap)) selectedMap = mapOrder[0];
let journeyMode = saved.journeyMode === 'training' ? 'training' : 'career';
let attributesExpanded = false;
let equipmentExpanded = false;
// A game starts with sound enabled after the user presses Jogar; stored preferences win.
let muted = saved.muted === true;
let combatMode = saved.combatMode === 'manual' ? 'manual' : 'auto';
let selectedDifficulty = Campaign.validDifficulty(saved,selected,saved.difficulty || 'easy');
let audio;
// V25.1 (visual): a arma desenhada por cima do sprite ficava feia; o sprite da classe já mostra o personagem.
const SHOW_WEAPON_OVERLAY=false;
let run;
let lastFrame = 0;
let mode = 'menu';
let viewport = { w: 1, h: 1 };
let activePointer;
let cursor;
let moveTarget;
let moveRoute = [];
const keys = new Set();
const ui = {
  classes: $('classes'), hp: $('hp-fill'), hpText: $('hp-text'), time: $('time'), stage: $('stage'),
  sp: $('sp-fill'), spText: $('sp-text'), note: $('combat-note'),
  kills: $('kills'), xp: $('xp-fill'), xpText: $('xp-text'), announcement: $('announcement'),
  boss: $('boss-hud'), bossFill: $('boss-fill'), dialog: $('overlay'), label: $('dialog-label'),
  title: $('dialog-title'), body: $('dialog-body'), actions: $('dialog-actions'), joy: $('joystick'),
};

function persist(change) {
  saved = { ...saved, ...change };
  try { localStorage.setItem(SAVE, JSON.stringify(saved)); } catch {}
  window.MidgardAccount?.queueSave(saved);
}
function timeText(seconds) {
  const rounded = Math.max(0, Math.floor(seconds));
  return [Math.floor(rounded / 60), rounded % 60].map(n => String(n).padStart(2, '0')).join(':');
}
const clamp = (value, low, high) => Math.max(low, Math.min(value, high));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function button(label, style, onClick) {
  const el = document.createElement('button');
  el.className = style;
  el.textContent = label;
  el.addEventListener('click', onClick);
  return el;
}

function store() { try { localStorage.setItem(SAVE, JSON.stringify(saved)); } catch {} window.MidgardAccount?.queueSave(saved); }
function journeyOf(line = selected) {
  let profile = saved.journeys?.[line];
  let changed = false;
  if (!profile || !stages[profile.stage]) { profile = newJourney(); changed = true; }
  if (profile.v !== 2) { profile = RO.migrate(profile); changed = true; }
  // V25.4: quem já renasceu antes recebe uma vez os 40 pontos a mais do renascimento.
  if (profile.stage >= 2 && !profile.rebirthBonus) { profile = { ...profile, points: (profile.points || 0) + 40, rebirthBonus: true }; changed = true; }
  if (!profile.gear) return withStarterGear(line, profile);
  if (changed) {
    saved = { ...saved, journeys: { ...saved.journeys, [line]: profile } };
    store();
  }
  return profile;
}
// New characters start with the class weapon and a Cotton Shirt; cards of the old loadout return to the album.
function withStarterGear(line, profile) {
  const list = [...items()];
  const gear = {};
  for (const id of starterGear[line] ?? []) {
    const item = Gear.newItem(id);
    list.push(item);
    gear[itemDb[id].type] = item.uid;
  }
  const nextAlbum = { ...album() };
  for (const id of Object.values(profile.cards ?? {})) nextAlbum[id] = (nextAlbum[id] ?? 0) + 1;
  const next = { ...profile, gear };
  delete next.cards;
  saved = { ...saved, items: list, album: nextAlbum, journeys: { ...saved.journeys, [line]: next } };
  store();
  return next;
}
function items() { return saved.items ?? []; }
// Venda é intencionalmente barata para não invalidar a economia da expedição.
function resaleValue(item) { const tier = itemDb[item.id]?.tier || 1; return 5 + 6*tier*tier + Math.max(0,item.refine||0)*4; }
function sellStored(uid, ask = true) {
  const item = itemByUid(uid);
  if (!item || equippedBy(uid)) return false;
  const price = resaleValue(item);
  const hasCards = !!item.cards?.length;
  if (ask && !window.confirm('Vender ' + Gear.label(item) + ' por ' + price + ' Zeny?' +
    (hasCards ? '\nAs cartas encaixadas serão devolvidas ao álbum.' : ''))) return false;
  const nextAlbum = { ...album() };
  for (const id of item.cards || []) nextAlbum[id]=(nextAlbum[id]||0)+1;
  persist({items:items().filter(value=>value.uid!==uid),album:nextAlbum,zeny:(saved.zeny||0)+price});
  if (run && mode !== 'menu') combatNote('Vendido ' + Gear.label(item) + ' por ' + price + ' Zeny.');
  return true;
}
// Limpeza em lote ignora itens em uso, refinados, com cartas, e raros (tier 3/4).
function disposableItems() { return items().filter(item => !equippedBy(item.uid) && (itemDb[item.id]?.tier||4)<=2 && !(item.refine||0) && !item.cards?.length); }
function sellDisposables() {
  const selected=disposableItems();if(!selected.length)return 0;
  const sum=selected.reduce((total,item)=>total+resaleValue(item),0);
  if(!window.confirm('Vender '+selected.length+' itens comuns não equipados por '+sum+' Zeny?\nItens refinados e com cartas são preservados.'))return 0;
  const ids=new Set(selected.map(item=>item.uid));
  persist({items:items().filter(item=>!ids.has(item.uid)),zeny:(saved.zeny||0)+sum});
  return selected.length;
}

function itemByUid(uid) { return items().find(item => item.uid === uid); }
function updateItem(uid, change) {
  persist({ items: items().map(item => item.uid === uid ? { ...item, ...change } : item) });
  // Recompute the run instantly when a socket/refinement is changed mid-dungeon.
  if (run?.gear) {
    let equipped=false;
    for(const [slot,item] of Object.entries(run.gear)){
      if(item?.uid===uid){run.gear[slot]={...item,...change};equipped=true;}
    }
    if(equipped && run.player){refreshStatus();run.player.hp=Math.min(run.player.hp,maxHp());run.player.sp=Math.min(run.player.sp,maxSp());}
  }
}
function gearOf(profile) {
  if (profile.gearItems) return profile.gearItems;
  const gear = {};
  for (const [slot, uid] of Object.entries(profile.gear ?? {})) {
    const item = itemByUid(uid);
    if (item) gear[slot] = item;
  }
  return gear;
}
function equippedBy(uid) {
  for (const [line, profile] of Object.entries(saved.journeys ?? {})) {
    for (const [slot, id] of Object.entries(profile.gear ?? {})) if (id === uid) return { line, slot };
  }
  return null;
}

function trainingJourney(line = selected) {
  const job = jobs[jobLines[line][5]];
  const build = RO.autoBuild(job.family, 5, 150);
  return { ...newJourney(5), base: 150, job: 70, stats: build.stats, points: build.points, gearItems: Gear.trainingGear(line) };
}
function statusFor(line, profile) {
  const job = jobs[jobLines[line][profile.stage]] ?? jobs[line];
  return RO.derive(job, profile, Gear.bonuses(gearOf(profile)));
}
function album() { return saved.album ?? {}; }
/** Tira todas as cartas de um item e devolve ao álbum (o item continua com os encaixes vazios). */
function removeCards(uid) {
  const item = itemByUid(uid); if (!item?.cards?.length) return false;
  const cards = [...item.cards];
  updateItem(uid, { cards: [] });
  const next = { ...album() };
  for (const id of cards) next[id] = (next[id] ?? 0) + 1;
  persist({ album: next, found: { ...saved.found, ...Object.fromEntries(cards.map(id => [id, true])) } });
  return true;
}
function addToAlbum(id, amount = 1) {
  const next = { ...album(), [id]: Math.max(0, (album()[id] ?? 0) + amount) };
  if (!next[id]) delete next[id];
  persist({ album: next, found: { ...saved.found, [id]: true } });
}
function saveJourney(line, profile) {
  persist({ journeys: { ...saved.journeys, [line]: profile } });
}
function selectedJob() {
  return jobs[jobLines[selected][journeyMode === 'training' ? 5 : journeyOf().stage]];
}
function renderMenu() {
  const list = Object.entries(jobLines).map(([id, route]) => {
    const hero = jobs[route[journeyMode === 'training' ? 5 : journeyOf(id).stage]];
    const el = button('', 'class', () => selectClass(id));
    el.dataset.hero = id;
    el.style.setProperty('--accent', hero.color);
    const portrait = document.createElement('span');
    portrait.className = 'portrait';
    portrait.setAttribute('aria-hidden', 'true');
    portrait.append(Art.portrait(hero.id));
    const copy = document.createElement('span');
    copy.innerHTML = '<strong>' + hero.name + '</strong><small>' + hero.role + '</small><span class="starter">' +
      (journeyMode === 'career' ? '→ ' + jobs[route[5]].name : hero.tree[0].name) + '</span>';
    el.append(portrait, copy);
    return el;
  });
  ui.classes.replaceChildren(...list);
  selectClass(selected);
  renderExpeditions();
  $('record').textContent = 'RECORDE · ' + timeText(saved.best ?? 0);
  updateSound();
}
function renderExpeditions() {
  const cards = Object.entries(expeditions).map(([id, expedition], index) => {
    const boss = bosses[expedition.boss];
    const open = mapUnlocked(id);
    const el = button('', 'expedition-card', () => {
      if (!mapUnlocked(id)) return;
      selectedMap = id;
      persist({ selectedMap });
      for (const card of $('expedition-options').children) card.setAttribute('aria-pressed', String(card.dataset.map === id));
    });
    el.dataset.map = id;
    el.dataset.locked = String(!open);
    el.disabled = !open;
    el.setAttribute('aria-pressed', String(id === selectedMap));
    el.style.setProperty('--mvp-color', expedition.color);
    const thumb = document.createElement('canvas');
    thumb.width = 106;
    thumb.height = 78;
    const tctx = thumb.getContext('2d');
    tctx.imageSmoothingEnabled = false;
    tctx.drawImage(MapGen.build(id).minimap, 0, 0, 106, 78);
    const previous = mapOrder[index - 1];
    const copy = document.createElement('span');
    copy.innerHTML = '<strong>' + (index + 1) + '. ' + expedition.name + '</strong><small>' + (open
      ? 'MVP · ' + boss.name + (Campaign.character(saved,selected).cleared?.[id] ? ' · derrotado ✓' : '')
      : '🔒 '+ jobs[jobLines[selected][journeyMode==='training'?5:journeyOf(selected).stage]].name + ': derrote '+bosses[expeditions[previous].boss].name + ' no mapa anterior') + '</small>';
    // Music details are available only inside the sound menu, not printed on each map card.
    const preview=document.createElement('img');preview.src='assets/monsters/'+expedition.boss+'.gif';preview.className='mvp-preview';preview.alt=boss.name;
    el.append(thumb, copy,preview);
    return el;
  });
  $('expedition-options').replaceChildren(...cards);
}

function renderJourney() {
  const container = $('journey');
  if (journeyMode === 'training') {
    const title = document.createElement('p');
    title.className = 'journey-note';
    title.textContent = 'Teste as habilidades da terceira classe em qualquer expedição. O treino usa um personagem nível 150 com atributos distribuídos automaticamente, separado da sua jornada.';
    container.replaceChildren(title, statusWindow(trainingJourney(), true));
    return;
  }
  const profile = journeyOf();
  const route = jobLines[selected];
  const rule = stages[profile.stage];
  const heading = document.createElement('div');
  heading.className = 'journey-title';
  heading.innerHTML = '<h3>Jornada · ' + selectedJob().name + '</h3><p>Base ' + profile.base + '/' + rule.baseCap +
    ' · Classe ' + profile.job + '/' + rule.jobCap + '</p>';
  const path = document.createElement('ol');
  path.className = 'journey-path';
  route.forEach((id, index) => {
    const item = document.createElement('li');
    if (index === profile.stage) item.setAttribute('aria-current', 'true');
    item.innerHTML = '<small>' + stages[index].name + '</small><strong>' + jobs[id].name + '</strong>';
    path.append(item);
  });
  const meters = document.createElement('div');
  meters.className = 'journey-meters';
  meters.innerHTML = '<label class="journey-meter">EXP de base<progress value="' +
    (profile.base >= rule.baseCap ? 1 : profile.baseXp / levelCost(profile.base)) + '"></progress></label>' +
    '<label class="journey-meter">EXP de classe<progress value="' +
    (profile.job >= rule.jobCap ? 1 : profile.jobXp / levelCost(profile.job, true)) + '"></progress></label>';
  const footer = document.createElement('div');
  footer.className = 'journey-footer';
  const note = document.createElement('p');
  note.className = 'journey-note';
  if (rule.nextJob) {
    const next = jobs[route[profile.stage + 1]].name;
    const action = button(profile.stage === 1 ? 'Renascer em Juno' : 'Tornar-se ' + next, 'primary', () => {
      if (profile.stage === 1) {
        const dialog = $('rebirth-dialog');
        dialog.returnValue = '';
        dialog.showModal();
      } else if (window.confirm('Prova de classe concluída! Confirmar a mudança para ' + next + '?')) completeClassChange();
    });
    action.disabled = !advanceJourney(profile);
    const marks=[1,2,2,3,5];
    const trial = JobTrials.forLine(selected,profile.stage);
    note.textContent = ProgressionGoals.text(profile)+' · '+(rule.nextBase > 1 ? 'Base ' + rule.nextBase + ' e classe ' : 'Nível de classe ') + rule.nextJob + ' + ' + marks[profile.stage] + ' selo(s) de MVP (você: ' + (profile.proofs||0) + ').' + (trial ? ' Prova de Guilda: '+trial.name+' — '+(profile.guildTrials?.[profile.stage]?'CONCLUÍDA ✓':'DERROTE O MINI-BOSS NA EXPEDIÇÃO (aparece após '+trial.kills+' abates).') : '');
    footer.append(note, action);
  } else {
    note.textContent = 'Terceira classe desbloqueada. Continue evoluindo os atributos nas expedições.';
    footer.append(note);
  }
  footer.append(button('📜 Guia de classes, Reborn e terceira classe', 'sound', () => window.openProgressionGuide?.()));
  const stats = statusWindow(profile);
  const equipment = equipmentWindow(profile);
  container.replaceChildren(heading, meters, path, footer, stats, equipment);
}
function addStat(key, times = 1) {
  let current = journeyOf();
  const cap = RO.statCap(current.stage);
  let changed = false;
  for (let i = 0; i < times; i++) {
    const value = current.stats[key] ?? 1;
    const cost = RO.raiseCost(value);
    if (value >= cap || current.points < cost) break;
    current = { ...current, migrated: false, points: current.points - cost, stats: { ...current.stats, [key]: value + 1 } };
    changed = true;
  }
  if (!changed) return;
  attributesExpanded = true;
  saveJourney(selected, current);
  renderJourney();
  $('journey').querySelector('[data-attribute="' + key + '"]')?.focus();
}
function statusWindow(profile, readonly = false) {
  const status = statusFor(selected, profile);
  const cap = RO.statCap(profile.stage);
  const stats = document.createElement('details');
  stats.className = 'journey-stats ro-status';
  stats.open = attributesExpanded;
  stats.addEventListener('toggle', () => { if (stats.isConnected) attributesExpanded = stats.open; });
  const summary = document.createElement('summary');
  summary.textContent = readonly ? 'Atributos do treino · nível base ' + profile.base : 'Atributos · ' + profile.points + ' ponto' + (profile.points === 1 ? '' : 's') + ' de status';
  const body = document.createElement('div');
  body.className = 'status-body';
  if (profile.migrated) {
    const note = document.createElement('p');
    note.className = 'status-migrated';
    note.textContent = 'Os atributos agora seguem as regras do Ragnarok. Seus pontos foram devolvidos: distribua de novo.';
    body.append(note);
  }
  const grid = document.createElement('div');
  grid.className = 'status-grid';
  for (const [key, label, desc] of attributes) {
    const value = profile.stats[key] ?? 1;
    const extra = status.extra[key];
    const cost = RO.raiseCost(value);
    const row = document.createElement('div');
    row.className = 'status-row';
    row.title = desc;
    row.innerHTML = '<strong>' + label + '</strong><span class="status-value">' + value +
      (extra ? '<small class="status-bonus">' + (extra > 0 ? '+' : '') + extra + '</small>' : '') + '</span>';
    const add = button('▲', 'attribute-add', event => addStat(key, event.shiftKey ? 10 : 1));
    add.dataset.attribute = key;
    add.setAttribute('aria-label', 'Aumentar ' + label + ' (custa ' + cost + ' pontos)');
    add.disabled = readonly || value >= cap || profile.points < cost;
    const price = document.createElement('small');
    price.className = 'status-cost';
    price.textContent = value >= cap ? 'máx.' : String(cost);
    row.append(add, price);
    grid.append(row);
  }
  const derived = document.createElement('dl');
  derived.className = 'status-derived';
  const entries = [
    ['ATK', status.statusAtk + ' + ' + status.weapon], ['MATK', status.statusMatk + ' + ' + status.weaponMatk],
    ['HIT', status.hit], ['CRIT', status.crit], ['DEF', status.softDef + ' + ' + status.hardDef],
    ['MDEF', status.softMdef + ' + ' + status.hardMdef], ['FLEE', status.flee + ' + ' + status.perfectDodge], ['ASPD', Math.floor(status.aspd)],
  ];
  derived.innerHTML = entries.map(([name, value]) => '<div><dt>' + name + '</dt><dd>' + value + '</dd></div>').join('');
  const foot = document.createElement('p');
  foot.className = 'status-foot';
  foot.innerHTML = 'Pontos de status <b>' + profile.points + '</b> · limite ' + cap + ' por atributo · <kbd>Shift</kbd>+clique sobe até 10';
  const guide=document.createElement('details'); guide.className='status-guide';
  guide.innerHTML='<summary>❔ O que faz cada atributo?</summary>' +
    '<dl><dt>FOR (STR)</dt><dd>ATK físico corpo a corpo, carga e ataque com certas armas.</dd>' +
    '<dt>AGI</dt><dd>Velocidade de ataques (ASPD), evasão (FLEE), agilidade.</dd>' +
    '<dt>VIT</dt><dd>Vida máxima, recuperação de HP e defesa física.</dd>' +
    '<dt>INT</dt><dd>Dano mágico (MATK), SP máximo, regeneração de SP e tempo de conjuração.</dd>' +
    '<dt>DES (DEX)</dt><dd>Precisão (HIT), ataques à distância, velocidade de conjuração.</dd>' +
    '<dt>SOR (LUK)</dt><dd>Chance de crítico, esquiva perfeita e pequenos bônus gerais.</dd></dl>' +
    '<p>ATK/MATK: dano físico/mágico · HIT: acerto · FLEE: esquiva · DEF/MDEF: defesa física/mágica · ASPD: indicador de velocidade dos ataques. Valores e escalas seguem uma adaptação Renewal para Survivors.</p>';
  const pointNote=document.createElement('small');pointNote.className='journey-points-note';
  pointNote.textContent=readonly?'Treino com distribuição automática.':'Os pontos são liberados ao subir de NÍVEL BASE ao concluir expedições. Cada nível concede pontos pela curva Renewal; V12 existentes mantêm seus pontos. Renascidos recebem 20 pontos iniciais adicionais.';
  body.append(grid, derived, foot, pointNote, guide);
  if(!readonly) {
    const spent=Object.values(profile.stats||{}).reduce((sum,value)=>{for(let v=1;v<value;v++)sum+=RO.raiseCost(v);return sum;},0);
    const price=profile.resets ? 350+Math.floor(profile.resets*200)+profile.stage*150 : 0;
    const reset=button('↺ Resetar atributos' + (price ? ' · '+price+' z' : ' · 1º grátis'),'sound',()=>{
      if(!window.confirm('Devolver '+spent+' pontos gastos? '+(price ? 'Custo: '+price+' zenys.' : 'Primeiro reset grátis.')))return;
      const latest=journeyOf();
      if((saved.zeny||0)<price){alert('Você precisa de mais Zeny para resetar.');return;}
      const refunded=Object.values(latest.stats||{}).reduce((sum,value)=>{for(let v=1;v<value;v++)sum+=RO.raiseCost(v);return sum;},0);
      if(price)persist({zeny:(saved.zeny||0)-price});
      saveJourney(selected,{...latest, stats:RO.baseStats(),points:latest.points+refunded,resets:(latest.resets||0)+1});
      attributesExpanded=true;renderJourney();
    });
    reset.disabled=!spent||(saved.zeny||0)<price;
    body.append(reset);
  }
  stats.append(summary, body);
  return stats;
}
function equipmentWindow(profile) {
  const box = document.createElement('details');
  box.className = 'journey-stats card-equipment';
  box.open = equipmentExpanded;
  box.addEventListener('toggle', () => { if (box.isConnected) equipmentExpanded = box.open; });
  const gear = gearOf(profile);
  const owned = Object.values(album()).reduce((a, b) => a + b, 0);
  const summary = document.createElement('summary');
  summary.textContent = 'Equipamento · ' + Object.keys(gear).length + ' de 8 · ' + items().length + ' itens no inventário · ' + owned + ' cartas no álbum';
  const grid = document.createElement('div');
  grid.className = 'slot-grid';
  const twoHanded = !!itemDb[gear.weapon?.id]?.twoHanded;
  for (const [slot, info] of Object.entries(gearSlots)) {
    const item = gear[slot];
    const blocked = slot === 'shield' && twoHanded;
    const cell = button('', 'card-slot gear-slot', () => openGearDialog(slot));
    cell.dataset.filled = String(!!item && !blocked);
    if (blocked) cell.disabled = true;
    const sockets = item ? Array.from({ length: itemDb[item.id].slots }, (_, i) => item.cards[i] ? '◆' : '◇').join('') : '';
    const slotName = slot === 'shield' && item && itemDb[item.id].type === 'weapon' ? 'Mão esquerda' : slot === 'shield' && selected === 'thief' && [1, 4, 5].includes(profile.stage) ? 'Escudo / Mão esq.' : info.name;
    cell.innerHTML = '<span><small>' + slotName + '</small><strong>' + (blocked ? 'Arma de duas mãos' : item ? Gear.label(item) : 'Vazio') +
      '</strong>' + (item && !blocked ? '<em>' + sockets + (item.cards.length ? ' ' + item.cards.map(id => cardDb[id].name.replace('Carta ', '')).join(', ') : '') + '</em>' : '') + '</span>';
    grid.append(cell);
  }
  const actions = document.createElement('div');
  actions.className = 'card-actions';
  actions.append(button('Álbum de cartas', 'sound', () => openAlbum()));
  const equippedBonuses = Gear.bonuses(gear);
  if(equippedBonuses.setNames.length){ const sets=document.createElement('p');sets.className='active-sets';sets.textContent='✦ Bônus de conjunto: '+equippedBonuses.setNames.join(' · '); actions.append(sets); }
  const zeny = document.createElement('span');
  zeny.className = 'zeny';
  zeny.textContent = (saved.zeny ?? 0).toLocaleString('pt-BR') + ' z';
  actions.append(zeny);
  box.append(summary, grid, actions);
  return box;
}
function equipItem(slot, uid) {
  const owner = equippedBy(uid);
  if (owner) {
    const other = saved.journeys[owner.line];
    const gear = { ...other.gear };
    delete gear[owner.slot];
    saved = { ...saved, journeys: { ...saved.journeys, [owner.line]: { ...other, gear } } };
  }
  const profile = journeyOf();
  const gear = { ...profile.gear, [slot]: uid };
  if (slot === 'weapon' && itemDb[itemByUid(uid).id].twoHanded) delete gear.shield;
  saveJourney(selected, { ...profile, gear });
  if(run?.career && run.line===selected && run.player && mode!=='menu'){
    run.journey={...run.journey,gear};
    run.gear=gearOf({...profile,gear});
    refreshStatus();run.player.hp=Math.min(run.player.hp,maxHp());run.player.sp=Math.min(run.player.sp,maxSp());
  }
}
function openGearDialog(slot, picking = false) {
  const dialog = $('card-dialog');
  $('card-back-to-inventory').hidden = false;
  const list = $('card-list');
  const profile = journeyOf();
  const gear = gearOf(profile);
  const current = gear[slot];
  // V25.5: no espaço do escudo, Mercenário/Algoz/Sicário também podem usar adaga ou espada (mão esquerda).
  const dual = slot === 'shield' && [1, 4, 5].includes(profile.stage) && selected === 'thief';
  const type = current ? itemDb[current.id].type : gearSlots[slot].type;
  $('card-dialog-title').textContent = 'Equipamento · ' + (dual ? 'Escudo ou arma da mão esquerda' : gearSlots[slot].name);
  $('card-dialog-note').textContent = current ? Gear.describe(current.id) : 'Nada equipado neste espaço. Os baús que caem dos monstros trazem novos itens.';
  const nodes = [];
  if (current) {
    const box = document.createElement('div');
    box.className = 'gear-current';
    const title = document.createElement('strong');
    title.textContent = Gear.label(current);
    const sockets = document.createElement('div');
    sockets.className = 'gear-sockets';
    for (let i = 0; i < itemDb[current.id].slots; i++) {
      const id = current.cards[i];
      const socket = button('', 'gear-socket', () => {
        if (id) {
          const cards = current.cards.filter((_, index) => index !== i);
          updateItem(current.uid, { cards });
          addToAlbum(id, 1);
          openGearDialog(slot);
          renderJourney();
        } else openGearDialog(slot, true);
      });
      socket.dataset.filled = String(!!id);
      if (id) socket.append(Cards.art(id, 30, 41));
      const text = document.createElement('span');
      text.textContent = id ? cardDb[id].name + ' · remover' : 'Encaixe vazio · escolher carta';
      socket.append(text);
      sockets.append(socket);
    }
    if (!itemDb[current.id].slots) sockets.textContent = 'Este item não tem encaixes.';
    box.append(Gear.sprite(current.id), title, sockets, button('Desequipar', 'sound', () => {
      const next = { ...profile.gear };
      delete next[slot];
      saveJourney(selected, { ...profile, gear: next });
      openGearDialog(slot);
      renderJourney();
    }));
    nodes.push(box);
    if (picking) {
      const cards = Object.entries(album()).filter(([id, count]) => count > 0 && cardDb[id]?.slot === type);
      const heading = document.createElement('h3');
      heading.className = 'gear-heading';
      heading.textContent = cards.length ? 'Cartas de ' + cardSlots[type].name.toLowerCase() + ' no álbum' : 'Nenhuma carta de ' + cardSlots[type].name.toLowerCase() + ' no álbum ainda.';
      nodes.push(heading);
      for (const [id, count] of cards) {
        const entry = button('', 'card-entry', () => {
          if (current.cards.length >= itemDb[current.id].slots) return;
          updateItem(current.uid, { cards: [...current.cards, id] });
          addToAlbum(id, -1);
          openGearDialog(slot);
          renderJourney();
        });
        entry.dataset.found = 'true';
        entry.append(Cards.art(id, 52, 70));
        const copy = document.createElement('span');
        copy.innerHTML = '<strong>' + cardDb[id].name + '</strong><small>' + count + ' no álbum</small><em>' + cardDb[id].text + '</em>';
        entry.append(copy);
        nodes.push(entry);
      }
    }
  }
  const options = items().filter(item => (itemDb[item.id].type === gearSlots[slot].type || dual && Gear.canOffhand(item.id, selected, profile.stage)) && item.uid !== current?.uid && item.uid !== (slot === 'shield' ? profile.gear?.weapon : null));
  const heading = document.createElement('h3');
  heading.className = 'gear-heading';
  heading.textContent = options.length ? 'Inventário' : 'Nenhum outro item deste tipo no inventário.';
  nodes.push(heading);
  for (const item of options) {
    const offhand = slot === 'shield' && itemDb[item.id].type === 'weapon';
    const allowed = offhand ? Gear.canOffhand(item.id, selected, profile.stage) && !itemDb[gear.weapon?.id]?.twoHanded : Gear.canEquip(item.id, selected, profile.stage);
    const owner = equippedBy(item.uid);
    const entry = button('', 'card-entry gear-entry', () => {
      if (!allowed) return;
      equipItem(slot, item.uid);
      openGearDialog(slot);
      renderJourney();
    });
    entry.disabled = !allowed;
    entry.dataset.found = 'true';
    const copy = document.createElement('span');
    copy.innerHTML = '<strong>' + Gear.label(item) + '</strong><small>' + (allowed ? (owner ? 'Em uso por ' + jobs[owner.line].name + ' · clique para trazer' : 'Clique para equipar') :
      itemDb[item.id].katar ? 'Katar: só Mercenário, Algoz e Sicário' : 'Não pode ser usado por esta classe') + '</small><em>' + ItemQuality.describe(item) +
      (item.cards.length ? ' · Cartas: ' + item.cards.map(id => cardDb[id].name).join(', ') : '') + '</em>';
    entry.append(Gear.sprite(item.id), copy);
    nodes.push(entry);
  }
  list.replaceChildren(...nodes);
  if (!dialog.open) dialog.showModal();
}

function openAlbum() {
  if(run && mode==='play'){run.inventoryPreviousMode='play';mode='inventory';}
  gearFromInventory = false;
  $('card-back-to-inventory').hidden = true;
  const dialog = $('card-dialog');
  $('card-dialog-title').textContent = 'Álbum de cartas';
  $('card-dialog-note').textContent = 'Cartas que você já encontrou. Elas caem raramente no chão ao derrotar monstros: passe por cima para pegar. Encaixe-as nos itens pelo equipamento.';
  const entries = Object.entries(cardDb).map(([id, card]) => {
    const count = album()[id] ?? 0;
    const found = saved.found?.[id] || count;
    const item = document.createElement('div');
    item.className = 'card-entry';
    item.dataset.found = String(!!found);
    item.append(found ? Cards.art(id, 52, 70) : document.createElement('i'));
    const copy = document.createElement('span');
    copy.innerHTML = '<strong>' + (found ? card.name : '???') + '</strong><small>' + cardSlots[card.slot].name +
      (card.mvp ? ' · MVP' : '') + ' · ' + count + ' no álbum</small><em>' + (found ? card.text : 'Ainda não encontrada.') + '</em>';
    item.append(copy);
    return item;
  });
  $('card-list').replaceChildren(...entries);
  if (!dialog.open) dialog.showModal();
}

function completeClassChange() {
  if (journeyMode !== 'career') return;
  const updated = advanceJourney(journeyOf());
  if (!updated) return;
  saveJourney(selected, updated);
  renderMenu();
  $('journey').querySelector('.primary:not(:disabled)')?.focus();
}
function renderControls() {
  $('controls-help').textContent = combatMode === 'manual'
    ? 'WASD, setas ou clique para mover · 1–5 para usar habilidades · T para abrir a árvore'
    : 'WASD, setas ou clique para mover · Habilidades atacam sozinhas · 1–3 para escolher melhorias';
}
for (const input of document.querySelectorAll('[name="combat-mode"]')) {
  input.checked = input.value === combatMode;
  input.addEventListener('change', () => {
    combatMode = input.value;
    persist({ combatMode });
    renderControls();
    selectClass(selected);
  });
}
for (const input of document.querySelectorAll('[name="journey-mode"]')) {
  input.checked = input.value === journeyMode;
  input.addEventListener('change', () => {
    journeyMode = input.value;
    persist({ journeyMode });
    renderMenu();
  });
}
$('rebirth-dialog').addEventListener('close', () => {
  if ($('rebirth-dialog').returnValue === 'rebirth') completeClassChange();
});
renderControls();

function updateDifficultyOptions() {
  const picker=$('difficulty');
  if(!picker)return;
  for(const option of picker.options){
    option.disabled=!Campaign.difficultyUnlocked(saved,selected,option.value);
    if(option.value==='hard')option.textContent=option.disabled?'🔒 Difícil · termine os 10 mapas no Normal':'Difícil — veteranos';
    if(option.value==='nightmare')option.textContent=option.disabled?'🔒 Pesadelo · termine os 10 mapas no Difícil':'Pesadelo — extremo';
  }
  selectedDifficulty=Campaign.validDifficulty(saved,selected,selectedDifficulty);
  picker.value=selectedDifficulty;
  const count=d=>mapOrder.filter(id=>Campaign.character(saved,selected).clearsByDifficulty?.[d]?.[id]).length;
  const left=Campaign.difficultyUnlocked(saved,selected,'hard')?
    (Campaign.difficultyUnlocked(saved,selected,'nightmare')?'Todas as dificuldades desbloqueadas!':`Para liberar Pesadelo: ${count('hard')}/${mapOrder.length} no Difícil.`):
    `Para liberar Difícil: ${count('normal')}/${mapOrder.length} no Normal.`;
  $('difficulty-hint').textContent=RunDifficulty.get(selectedDifficulty).hint+' · Fácil e Normal disponíveis desde o início. '+left;
}
// Prévia da árvore da classe no menu (só leitura).
function skillTree(job, talents, onSpend) {
  const grid = document.createElement('div');
  grid.className = 'tree-grid';
  for (const skill of job.tree) {
    const { id, name, desc, slot, cost, requires } = skill;
    const required = skillRequirement(job, skill);
    const level = talents ? skillLevel(talents, id) : skill.start ?? 0;
    const locked = !!required && (!talents || skillLevel(talents, required.id) < requires[1]);
    const cell = document.createElement(onSpend ? 'button' : 'div');
    cell.className = 'tree-node';
    cell.dataset.locked = String(locked);
    if (onSpend) {
      cell.type = 'button';
      cell.setAttribute('aria-disabled', String(locked || level >= SkillProgression.cap(run.mapTier) || run.points === 0));
      cell.addEventListener('click', () => onSpend(skill));
    }
    const badge = !slot ? 'PASSIVA' : (talents ? run.auto : combatMode === 'auto') ? 'AUTOMÁTICA' : 'TECLA ' + slot + ' · ' + cost + ' SP';
    const requirement = required ? 'Requer ' + required.name + ' nv. ' + requires[1] : level ? 'Disponível no início' : '';
    const subtitle = talents ? 'Nível ' + level + '/' + SkillProgression.cap(run.mapTier) + ' (máx. 10)' : requirement;
    cell.innerHTML = '<img class="tree-glyph" src="assets/ro/skill-' + id + '.png" alt=""><span class="tree-meta">' + badge +
      '</span><strong>' + name + '</strong><small>' + desc + '</small><span class="tree-requirement">' + subtitle +
      (talents && locked ? ' · ' + requirement : '') + '</span>';
    grid.append(cell);
  }
  return grid;
}
function selectClass(id) {
  selected = id;
  if (!mapUnlocked(selectedMap)) selectedMap=mapOrder[0];
  selectedDifficulty=Campaign.validDifficulty(saved,selected,selectedDifficulty);
  persist({selected,selectedMap,difficulty:selectedDifficulty});
  updateDifficultyOptions();
  for (const el of ui.classes.children) el.setAttribute('aria-pressed', String(el.dataset.hero === id));
  const tree = $('class-tree');
  const title = document.createElement('h3');
  const hero = selectedJob();
  title.id = 'class-tree-title';
  title.textContent = 'Árvore de habilidades · ' + hero.name;
  tree.replaceChildren(title, skillTree(hero));
  renderJourney();
  renderExpeditions();
}
function updateSound() {
  const label = muted ? 'Som desligado' : 'Som ligado';
  $('menu-sound').textContent = label;
  for (const id of ['menu-sound', 'game-sound']) {
    $(id).setAttribute('aria-pressed', String(!muted));
    $(id).setAttribute('aria-label', label);
  }
}
function tone(start, end, duration, type = 'triangle', volume = .045) {
  if (muted) return;
  try {
    audio ??= new AudioContext();
    if (audio.state === 'suspended') audio.resume().catch(() => {});
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(start, audio.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(end, audio.currentTime + duration);
    gain.gain.setValueAtTime(volume, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + duration);
  } catch {}
}
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  $('theme-color')?.setAttribute('content', theme === 'dark' ? '#101a24' : '#dae7ee');
  const label = theme === 'dark' ? 'Modo claro' : 'Modo escuro';
  $('menu-theme').textContent = label;
  for (const id of ['menu-theme', 'game-theme']) {
    $(id).setAttribute('aria-pressed', String(theme === 'dark'));
    $(id).title = 'Mudar para ' + label.toLowerCase();
  }
}
function toggleTheme() {
  const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem('midgard-theme', theme); } catch {}
  applyTheme(theme);
}
function toggleSound() {
  muted = !muted;
  persist({ muted });
  updateSound();
  BGM.setMuted(muted);
  tone(440, 660, .16);
}

function resize() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (!width || !height) return;
  const ratio = Math.min(1.6, window.devicePixelRatio || 1);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  viewport = { w: width, h: height };
  ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
  ctx.imageSmoothingEnabled = false;
}

function onlineMoveIntent(){
  let dx=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'))+(run.touch?.x||0);
  let dy=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'))+(run.touch?.y||0);
  if((Math.abs(dx)+Math.abs(dy))>.01){moveRoute=[];moveTarget=undefined;}
  else if(moveRoute?.length){
    while(moveRoute.length && distance(run.player,moveRoute[0])<14)moveRoute.shift();
    if(moveRoute.length){const aim=moveRoute[0],len=Math.hypot(aim.x-run.player.x,aim.y-run.player.y)||1;
      dx=(aim.x-run.player.x)/len;dy=(aim.y-run.player.y)/len;
    }else moveTarget=undefined;
  }
  const len=Math.max(1,Math.hypot(dx,dy));return {dx:dx/len,dy:dy/len};
}
function packPlayer() {
  // HP, dano, drops, EXP e inventário NUNCA são enviados. A posição vai como PREVISÃO e o servidor
  // valida velocidade e colisão (V22.1) — sem o "deslize" de esperar a resposta para andar.
  if(!run?.authoritative)return {};
  const moving=mode==='play'&&run.player.hp>0;
  const {dx,dy}=moving?onlineMoveIntent():{dx:0,dy:0};
  const out={dx,dy,attack:true,auto:run.auto,skill:run.coopSkill||0,skillSeq:run.coopSkillSeq||0,upgrade:run.coopUpgrade||null,reward:run.coopReward||null,
    eventSeq:run.authorityEventSeq||0,riftEnter:run.coopRiftEnter||0,item:run.coopItem||null,route:run.coopRoute||null,endRun:run.endRequest===true};
  if(run.serverSpawnSynced && run.player.hp>0){
    const seq=++run.mvSeq,x=Math.round(run.player.x*100)/100,y=Math.round(run.player.y*100)/100;
    out.mv={seq,x,y,warp:run.warpSeq||0};
    if(run.netOffset!=null)out.mv.t=Math.round(serverNow()*1000)/1000;
    // V23.6: carimbo no relógio do PRÓPRIO jogador (regular); os colegas reproduzem o movimento nesse ritmo exato.
    out.mv.ct=Math.round(performance.now())/1000;
    run.mvHistory.push({seq,x,y});if(run.mvHistory.length>300)run.mvHistory.shift();
  }
  return out;
}
/** V19: snapshot only from the server, not from the host's browser. */
/* V22.5: catálogo único das habilidades online (o MESMO arquivo que o servidor usa: online-skills.json). */
let onlineCatalog=null;
fetch('online-skills.json?v=22.5').then(r=>r.json()).then(data=>{onlineCatalog=data;if(run?.authoritative)run.onlineSkillSignature='';}).catch(()=>{});
const skillInfo=id=>onlineCatalog?.skills?.[id]||null;
const skillName=id=>skillInfo(id)?.n||id;
const EL_COLORS={fire:'#ff9455',water:'#93ddff',wind:'#c9b6ff',earth:'#d9b77a',holy:'#fff0a5',poison:'#bce37f',ghost:'#e6c6fa'};
const skillColor=id=>EL_COLORS[skillInfo(id)?.el]||'#f6dcaa';
const skillIconCache=new Map();
/** Ícone: usa assets/ro/skill-<ícone>.png quando existe; senão desenha um ícone próprio simples. */
function skillIconUrl(id){
  const info=skillInfo(id);
  if(info?.ic)return 'assets/ro/skill-'+info.ic+'.png';
  if(skillIconCache.has(id))return skillIconCache.get(id);
  const c=document.createElement('canvas');c.width=c.height=24;const g=c.getContext('2d');
  const kind=info?.k||'passive',grad=g.createLinearGradient(0,0,24,24);
  grad.addColorStop(0,skillColor(id));grad.addColorStop(1,'#27324b');
  g.fillStyle=grad;g.fillRect(0,0,24,24);g.strokeStyle='#0d1522';g.lineWidth=1;g.strokeRect(.5,.5,23,23);
  g.strokeStyle='#fff';g.lineWidth=2;g.lineCap='round';g.lineJoin='round';g.shadowColor='#0009';g.shadowBlur=2;g.beginPath();
  if(kind==='bolt'||kind==='ball'){g.moveTo(6,18);g.lineTo(17,7);g.lineTo(11,8);g.moveTo(17,7);g.lineTo(16,13);}
  else if(kind==='area'||kind==='self'||kind==='zone'){g.arc(12,12,7,0,TAU);g.moveTo(12,9);g.lineTo(12,15);g.moveTo(9,12);g.lineTo(15,12);}
  else if(kind==='melee'){g.moveTo(6,18);g.lineTo(18,6);g.moveTo(7,12);g.lineTo(12,17);}
  else if(kind==='trap'){g.moveTo(5,17);g.lineTo(12,7);g.lineTo(19,17);g.closePath();}
  else if(kind==='buff'){g.moveTo(12,18);g.lineTo(12,6);g.moveTo(7,11);g.lineTo(12,6);g.lineTo(17,11);}
  else if(kind==='debuff'){g.moveTo(12,6);g.lineTo(12,18);g.moveTo(7,13);g.lineTo(12,18);g.lineTo(17,13);}
  else if(kind==='heal'||kind==='healzone'||kind==='revive'){g.moveTo(12,6);g.lineTo(12,18);g.moveTo(6,12);g.lineTo(18,12);}
  else{g.arc(12,12,4,0,TAU);g.moveTo(12,4);g.lineTo(12,6);g.moveTo(12,18);g.lineTo(12,20);g.moveTo(4,12);g.lineTo(6,12);g.moveTo(18,12);g.lineTo(20,12);}
  g.stroke();
  const url=c.toDataURL();skillIconCache.set(id,url);return url;
}
function serverPanel(id,extraClass=''){
 let el=document.getElementById(id);
 if(!el){el=document.createElement('aside');el.id=id;el.className='coop-server-upgrades'+extraClass;el.setAttribute('aria-live','polite');document.body.append(el);}
 placeServerPanel(el);
 return el;
}
/** V25.3: o painel de escolha fica logo acima da barra MENU (canto inferior direito), sem cobri-la. */
function placeServerPanel(el){
 const bar=document.querySelector('.hud-actions');const r=bar&&!bar.hidden?bar.getBoundingClientRect():null;
 const bottom=r&&r.height>0&&r.top<innerHeight?Math.max(85,Math.round(innerHeight-r.top+10)):85;
 el.style.bottom=bottom+'px';el.style.maxHeight=Math.max(220,innerHeight-bottom-12)+'px';el.style.overflowY='auto';
}
addEventListener('resize',()=>{for(const id of ['coop-server-upgrades','coop-server-rewards']){const el=document.getElementById(id);if(el&&!el.hidden)placeServerPanel(el);}});
function offerButton(head,info,onPick,icon=''){
 const btn=document.createElement('button');btn.type='button';btn.className='coop-offer';
 // V23.6: ícone da habilidade/bênção/equipamento à esquerda, texto legível nos dois temas.
 if(icon){const img=document.createElement('img');img.src=icon;img.alt='';img.className='coop-offer-icon';btn.append(img);}
 const h=document.createElement('b');h.textContent=head;btn.append(h);
 if(info){const d=document.createElement('small');d.className='coop-offer-desc';d.textContent=info;btn.append(d);}
 btn.addEventListener('click',onPick);return btn;
}
/* V25.4: rastreio do Códex na partida — avisa quando a habilidade ou o equipamento oferecido faz parte
 * de uma combinação ainda não descoberta (habilidade nv. 2 + item equipado ao começar a run). */
function codexPending(){const found=saved.codexFound||{};return Object.entries(Codex.recipes).filter(([id])=>!found[id]);}
function codexWorn(){return new Set(Object.values(run?.gear||{}).filter(Boolean).map(it=>it.id));}
function codexSkillHint(skillId,nextLevel){
 const worn=codexWorn();
 const hits=codexPending().filter(([,r])=>r.skill===skillId);if(!hits.length)return '';
 return hits.map(([,r])=>'✧ Códex '+r.name+': '+(worn.has(r.item)?(nextLevel>=2?'COMPLETA a combinação!':'com '+(itemDb[r.item]?.name||r.item)+' equipado, falta o nv. 2'):'precisa de '+(itemDb[r.item]?.name||r.item)+' equipado')).join(' · ');
}
function codexItemHint(itemId){
 const hits=codexPending().filter(([,r])=>r.item===itemId);if(!hits.length)return '';
 return hits.map(([,r])=>'✧ Códex '+r.name+': equipe e leve '+(skillInfo(r.skill)?.n||r.skill)+' ao nv. 2').join(' · ');
}
/** Escolha de habilidade ao subir de nível. `seq` identifica a oferta: uma escolha antiga nunca esconde uma oferta nova. */
function serverUpgradeChoices(offers,seq=0,pending=0){
 const el=serverPanel('coop-server-upgrades');
 if(!offers.length){el.hidden=true;el.replaceChildren();el.dataset.offers='';run.coopUpgrade=null;return;}
 if(run.coopUpgrade&&run.coopUpgrade.offer===seq){el.hidden=true;return;} // aguardando o servidor confirmar
 run.coopUpgrade=null;
 const key=seq+'|'+offers.map(x=>x.id+':'+x.level).join('|')+'|'+(onlineCatalog?1:0);
 if(!el.hidden && el.dataset.offers===key)return;
 el.dataset.offers=key;el.hidden=false;el.replaceChildren();
 const title=document.createElement('strong');title.textContent='✦ Subiu de nível! Escolha uma habilidade'+(pending>1?' ('+pending+' escolhas)':'');el.append(title);
 const desc=document.createElement('small');desc.textContent='A partida continua: você pode se mover enquanto escolhe. '+'No máximo '+(onlineCatalog?.slots||5)+' habilidades ativas por run; passivas são livres.';el.append(desc);
 for(const offer of offers){
  const info=skillInfo(offer.id),name=info?.n||offer.name,passive=info?.k==='passive';
  // Etapa 3: runa de habilidade (Cadeia Rúnica, Propagação, Área Amplificada).
  // V25.2: Melhorias de treino (Aprendiz T. e 1ª transclasse) aparecem como MELHORIA, não como habilidade.
  const boon=!!info?.boon;
  const head=offer.rune?'RUNA · '+name+' · '+(offer.level+1)+'/2':boon?(offer.level?'MELHORIA · '+name+' · nível '+offer.level+' → '+(offer.level+1):'MELHORIA · '+name):offer.level?'Melhorar · '+name+' · nível '+offer.level+' → '+(offer.level+1):'NOVA · '+name+(passive?' (passiva)':'');
  const codex=offer.rune?'':codexSkillHint(offer.id,(offer.level||0)+1);
  const btn=offerButton(head,(offer.d||info?.d||'')+(codex?' · '+codex:''),()=>{run.coopUpgrade={id:offer.id,seq:++run.coopUpgradeSeq,offer:seq};el.hidden=true;},skillIconUrl(offer.id));
  if(codex)btn.classList.add('coop-offer-codex');
  el.append(btn);
 }
}
/** Baús: melhoria de atributo (elite) ou imbuimento (investigação e fenda). Cada jogador escolhe o seu. */
function serverRewardChoices(offers,seq=0,queued=0){
 const el=serverPanel('coop-server-rewards',' coop-server-rewards');
 if(!offers.length){el.hidden=true;el.replaceChildren();el.dataset.offers='';run.coopReward=null;return;}
 if(run.coopReward&&run.coopReward.offer===seq){el.hidden=true;return;}
 run.coopReward=null;
 const key=seq+'|'+offers.map(x=>x.id).join('|');
 if(!el.hidden&&el.dataset.offers===key)return;
 el.dataset.offers=key;el.hidden=false;el.replaceChildren();
 const relic=offers[0]?.stat==='relic',blessing=offers[0]?.stat==='blessing',gear=offers[0]?.stat==='gear',forge=offers[0]?.stat==='forge',grade=offers[0]?.grade||1;
 const title=document.createElement('strong');
 title.textContent=forge?'✦ Forja da expedição: fortaleça um equipamento (só nesta run)':grade==='maze'?'✦ Segredo do Labirinto: escolha uma bênção':gear?'♛ Tesouro do MVP: escolha 1 equipamento permanente':(relic?'♛ Relicário: escolha um imbuimento':(grade>=3?'♛ Tesouro do MVP':grade===2?'♢ Baú de elite':'♢ Baú azul')+': escolha uma bênção para a run')+(queued?' (+'+queued+' na fila)':'');el.append(title);
 const labels={maxHp:'Vida máxima',hpRegen:'Regeneração de HP',damage:'Dano',range:'Alcance',attackRate:'Velocidade de ataque',heal:'Poder de cura',speed:'Velocidade de movimento',maxSp:'SP máximo'};
 for(const offer of offers){
  const data=relic?onlineCatalog?.relics?.[offer.id]:null;
  // Sem números quebrados na tela: só o atributo (a força do bônus depende do baú).
  const head=relic?(data?.n||offer.id):(grade>=3?'+++ ':grade===2?'++ ':'+ ')+(labels[offer.stat]||offer.stat);
  if(forge){
   const b=offerButton(offer.n+' · '+RuneLoot.bnames[offer.key]+' · aprimoramento '+offer.level+'/4','A forja vale só até o fim da expedição; o item permanente não muda.',()=>{run.coopReward={id:offer.id,seq:++run.coopRewardSeq,offer:seq};el.hidden=true;});
   const img=Gear.sprite(offer.item);img.className='coop-gear-icon';b.prepend(img);el.append(b);continue;
  }
  if(gear){
   // Equipamento permanente (como o baú do MVP do solo): sprite, raridade e opções do item.
   const labels={str:'FOR',agi:'AGI',vit:'VIT',int:'INT',dex:'DES',luk:'SOR'};
   const opts=Object.entries(offer.affixes||{}).map(([k,v])=>(labels[k]||k)+' +'+v).join(', ');
   const owned=items().some(it=>it.id===offer.id);
   const text='T'+offer.tier+' '+(ItemQuality.tiers[offer.tier]?.name||'')+' · '+Gear.describe(offer.id)+(opts?' · Opções: '+opts:'')+(owned?' · Repetido: vira +1 de refino':'');
   const codex=codexItemHint(offer.id);
   const b=offerButton('♛ '+offer.n,text+(codex?' · '+codex:''),()=>{run.coopReward={id:offer.id,seq:++run.coopRewardSeq,offer:seq};el.hidden=true;});
   if(codex)b.classList.add('coop-offer-codex');
   const img=Gear.sprite(offer.id);img.className='coop-gear-icon';b.prepend(img);el.append(b);continue;
  }
  if(blessing){
   // Bênção da run (igual ao baú do solo): nome, raridade, nível atual e combinação possível.
   const tag=({1:'COMUM',2:'INCOMUM',3:'RARO'})[offer.g]||'';
   const text=(offer.d||'')+' · '+(offer.rank?'EVOLUIR':'NOVA')+' '+(offer.rank+1)+'/'+offer.cap+(offer.combo?' · ✧ Combinação possível: '+offer.combo:'');
   const b=offerButton('✦ '+offer.n+(tag?' · '+tag:''),text,()=>{run.coopReward={id:offer.id,seq:++run.coopRewardSeq,offer:seq};el.hidden=true;});
   if(offer.ic){const img=document.createElement('img');img.src='assets/ro/skill-'+offer.ic+'.png';img.alt='';img.className='coop-blessing-icon';b.prepend(img);}
   el.append(b);continue;
  }
  if(!relic){el.append(offerButton(head,'',()=>{run.coopReward={id:offer.id,seq:++run.coopRewardSeq,offer:seq};el.hidden=true;}));continue;}
  // Imbuimento: 2 anéis + 1 colar, como no solo. Escolher um espaço ocupado substitui o anterior.
  const card=document.createElement('div');card.className='coop-relic';
  const name=document.createElement('b');name.textContent=head;const text=document.createElement('small');text.className='coop-offer-desc';text.textContent=data?.d||'';card.append(name,text);
  for(const slot of data?.slot==='ring'?['ring1','ring2']:['necklace']){
   const old=onlineCatalog?.relics?.[run.onlineRelics?.[slot]];
   const b=document.createElement('button');b.type='button';
   b.textContent=(slot==='necklace'?'Colar':slot==='ring1'?'Anel I':'Anel II')+(old?' · substituir '+old.n:' · equipar');
   b.addEventListener('click',()=>{run.coopReward={id:offer.id,slot,seq:++run.coopRewardSeq,offer:seq};el.hidden=true;});card.append(b);
  }
  el.append(card);
 }
 const skip=document.createElement('button');skip.type='button';skip.className='coop-skip';
 skip.textContent=gear?'Não levar nenhum equipamento':relic?'Descartar relicário (não trocar nada)':'Pular (não escolher bênção)';
 skip.addEventListener('click',()=>{run.coopReward={id:'skip',seq:++run.coopRewardSeq,offer:seq};el.hidden=true;});el.append(skip);
}
/** Dica flutuante das habilidades (o "title" nativo demora e some no jogo). */
function skillTip(el,name,desc,extra=''){
  el.dataset.tipName=name;el.dataset.tipDesc=desc||'';el.dataset.tipExtra=extra;el.removeAttribute('title');
  if(el.dataset.tipBound)return;el.dataset.tipBound='1';
  const show=()=>{let tip=document.getElementById('skill-tip');
    if(!tip){tip=document.createElement('div');tip.id='skill-tip';tip.className='skill-tip';tip.setAttribute('role','tooltip');document.body.append(tip);}
    tip.replaceChildren();const n=document.createElement('strong');n.textContent=el.dataset.tipName;tip.append(n);
    if(el.dataset.tipDesc){const d=document.createElement('span');d.textContent=el.dataset.tipDesc;tip.append(d);}
    if(el.dataset.tipExtra){const x=document.createElement('small');x.textContent=el.dataset.tipExtra;tip.append(x);}
    tip.hidden=false;const r=el.getBoundingClientRect(),w=tip.offsetWidth,h=tip.offsetHeight;
    tip.style.left=Math.max(6,Math.min(innerWidth-w-6,r.left+r.width/2-w/2))+'px';tip.style.top=Math.max(6,r.top-h-8)+'px';};
  const hide=()=>{const tip=document.getElementById('skill-tip');if(tip)tip.hidden=true;};
  el.addEventListener('mouseenter',show);el.addEventListener('mouseleave',hide);el.addEventListener('focus',show);el.addEventListener('blur',hide);
}
/** Barra online: até 5 habilidades ativas (na ordem em que foram aprendidas) + passivas ao lado. */
function syncOnlineSkills(self){
 const skills=self.skills||{},slots=self.slots||[],max=onlineCatalog?.slots||5;
 const passives=Object.keys(skills).filter(id=>skillInfo(id)?.k==='passive');
 const relics=Object.values(self.relics||{});run.onlineRelics=self.relics||{};
 const signature=slots.map(id=>id+':'+skills[id]).join('|')+'#'+passives.map(id=>id+':'+skills[id]).join('|')+'#'+relics.join('|')+'#'+run.auto+(onlineCatalog?1:0);
 if(run.onlineSkillSignature===signature)return;
 run.onlineSkillSignature=signature;
 const nodes=[];
 for(let index=0;index<max;index++){
  const id=slots[index],b=button('', 'skill-slot',()=>useSkill(index+1));
  b.style.setProperty('--skill-color',run.hero.color);
  const key=document.createElement('span');key.className='skill-key';key.textContent=run.auto?'':String(index+1);
  const rank=document.createElement('b'),cooldown=document.createElement('i');
  if(!id){
   b.dataset.skill='';b.dataset.learned='false';b.setAttribute('aria-disabled','true');rank.textContent='–';b.append(key,rank,cooldown);
   skillTip(b,'Espaço livre','Ao subir de nível, escolha uma habilidade ativa para ocupar este espaço.','Até '+max+' habilidades ativas por run');
  }else{
   const info=skillInfo(id),level=skills[id]||0;
   b.dataset.skill=id;b.dataset.learned='true';b.setAttribute('aria-label',skillName(id)+' nível '+level+'. '+(info?.d||''));
   const icon=document.createElement('img');icon.className='skill-icon';icon.alt='';icon.src=skillIconUrl(id);
   icon.onerror=()=>{icon.onerror=null;icon.src='assets/ro/skill-mastery.png';};
   rank.textContent=level;b.append(key,icon,rank,cooldown);
   skillTip(b,skillName(id),info?.d,'Nível '+level+'/'+(info?.max||10)+(run.auto?' · automática':' · tecla '+(index+1)));
  }
  nodes.push(b);
 }
 $('skills').replaceChildren(...nodes);
 $('skill-count').textContent=slots.length+'/'+max;
 let row=document.getElementById('online-passives');
 if(!row){row=document.createElement('div');row.id='online-passives';row.className='online-passives';document.body.append(row);}
 row.hidden=!passives.length&&!relics.length;
 const chip=(src,label,name,desc,extra)=>{const c=document.createElement('span');c.className='online-passive';c.tabIndex=0;
  const img=document.createElement('img');img.alt='';img.src=src;img.onerror=()=>{img.onerror=null;img.src='assets/ro/skill-mastery.png';};
  const b=document.createElement('b');b.textContent=label;c.append(img,b);skillTip(c,name,desc,extra);return c;};
 row.replaceChildren(
  ...passives.map(id=>chip(skillIconUrl(id),skills[id],skillName(id),skillInfo(id)?.d,'Passiva · nível '+skills[id]+'/'+(skillInfo(id)?.max||10))),
  ...relics.map(id=>{const r=onlineCatalog?.relics?.[id];return chip('assets/ro/skill-assumptio.png','✦',r?.n||id,r?.d,'Imbuimento desta run');}));
}
/** V23: personagem do solo para o motor. Equipamento validado e somado pelo MESMO items.js/cards.js que o servidor usa. */
function localCharacter(){
  const j=run.journey;
  const gear=Gear.engineBonuses(Gear.equipped({gearItems:run.gear,stage:j.stage},null,run.line));
  // Etapa 3: o pet ativo vai para o motor (bônus e coleta calculados lá, igual ao online).
  return {base:j.base,stats:j.stats,stage:j.stage,guildTrials:run.career?j.guildTrials:{0:true,4:true},gear,pet:window.MidgardEngine.core.petFromSave(saved),
    wings:saved.wings||{},potions:saved.healPotions||0,flyConfig:saved.flyConfig||{}};
}
/** Equipamento + pet atual: se mudar no meio do solo, o motor recalcula. */
function localGearKey(){return JSON.stringify([run.gear,saved.activePet,saved.petsOwned?.[saved.activePet]?saved.petUpgrades:null]);}
/** Etapa 5: asas e poções são usadas pelo motor (solo e online); a tela só pede. */
function queueOnlineItem(kind){if(!run?.authoritative)return false;run.coopItemSeq=(run.coopItemSeq||0)+1;run.coopItem={kind,seq:run.coopItemSeq};return true;}
function persistWing(kind,delta){const wings={flywing:0,butterflywing:0,...saved.wings};wings[kind]=Math.max(0,(wings[kind]||0)+delta);persist({wings});}
/** Quem sou eu no mundo autoritativo: no online, o id da sala; no solo, o jogador da sala local. */
function selfId(){return run?.local?LocalRoom.ID:Coop.id();}
function updateOnlineRevive(world){
 const own=world.self,over=$('online-death-overlay'),hint=$('online-revive-hint');
 if(!own || !run?.coop){over.hidden=true;hint.hidden=true;return;}
 const dead=own.hp<=0;
 over.hidden=!dead;
 const bar=$('online-revive-progress');
 if(dead)bar.textContent=own.reviveProgress>0?'Ressurreição: '+Math.round(100*own.reviveProgress/(world.reviveSeconds||2.8))+'%':'Aguarde um aliado se aproximar para ressuscitar…';
 const me=world.players?.[selfId()];
 const near=Object.entries(world.players||{}).filter(([id,a])=>id!==selfId() && a.hp<=0 && me && Math.hypot(me.x-a.x,me.y-a.y)<(world.reviveRadius||66));
 hint.hidden=dead||!near.length;
 if(!hint.hidden){$('online-revive-meter').max=world.reviveSeconds||2.8;$('online-revive-meter').value=Math.min(world.reviveSeconds||2.8,near[0][1].reviveProgress||0);}
}
/* ---------- V22.1 netcode: relógio do servidor, interpolação e reconciliação ---------- */
function serverNow(){return performance.now()/1000+(run.netOffset??0);}
function netClockSync(simTime){
  const local=performance.now()/1000,candidate=simTime-local;
  if(run.netOffset==null||Math.abs(candidate-run.netOffset)>1.2)run.netOffset=candidate;
  // Sobe rápido (pacote menos atrasado) e desce devagar: estimativa estável e sem saltos.
  else run.netOffset+=(candidate-run.netOffset)*(candidate>run.netOffset?.08:.02);
  if(run.lastSnapshotAt){const gap=Math.min(1,local-run.lastSnapshotAt);run.snapshotGap=run.snapshotGap?run.snapshotGap*.9+gap*.1:gap;
    // V23.6: oscilação da rede (pacotes em rajadas pela internet/túnel): sobe na hora, desce devagar (~10 s).
    run.jitterPeak=Math.max(Math.abs(gap-run.snapshotGap),(run.jitterPeak||0)*.995);}
  run.lastSnapshotAt=local;
  // Atraso de interpolação: ritmo dos pacotes + oscilação, para o buffer nunca esvaziar (sem trancos).
  run.interpDelay=Math.min(.45,Math.max(.085,(run.snapshotGap||.05)*1.5+(run.jitterPeak||0)*1.3+.02));
}
/** Relógio de renderização: avança no ritmo real e só "desliza" ±12% para acompanhar a rede (sem trancos). */
function renderClock(){
  const now=performance.now()/1000,target=serverNow()-(run.interpDelay||.12);
  if(run.renderClock==null||Math.abs(target-run.renderClock)>.35){run.renderClock=target;run.renderClockAt=now;return target;}
  const dt=Math.max(0,Math.min(.1,now-run.renderClockAt));run.renderClockAt=now;
  run.renderClock+=dt*(1+Math.max(-.12,Math.min(.12,(target-run.renderClock)*3)));
  return run.renderClock;
}
function pushSample(list,t,x,y){
  if(list.length&&t<=list[list.length-1].t){const last=list[list.length-1];last.x=x;last.y=y;return list;}
  list.push({t,x,y});if(list.length>16)list.shift();return list;
}
function sampleAt(list,t){
  const n=list.length;if(!n)return null;
  if(n===1||t<=list[0].t)return {x:list[0].x,y:list[0].y,vx:0,vy:0};
  for(let i=1;i<n;i++){
    const a=list[i-1],b=list[i];
    if(t<=b.t){const span=Math.max(1e-3,b.t-a.t),k=Math.max(0,Math.min(1,(t-a.t)/span));
      return {x:a.x+(b.x-a.x)*k,y:a.y+(b.y-a.y)*k,vx:(b.x-a.x)/span,vy:(b.y-a.y)/span};}
  }
  const a=list[n-2],b=list[n-1],span=Math.max(1e-3,b.t-a.t),vx=(b.x-a.x)/span,vy=(b.y-a.y)/span,ahead=Math.min(.12,t-b.t);
  return {x:b.x+vx*ahead,y:b.y+vy*ahead,vx,vy};
}
const remoteSamples=new Map();
function reconcileSelf(self){
  const p=run.player;
  if(!run.serverSpawnSynced || self.warpSeq!==run.warpSeq){
    // Teleporte do servidor (início, entrada/saída da fenda): aceita a posição oficial.
    p.x=self.x;p.y=self.y;run.warpSeq=self.warpSeq||0;run.mvHistory=[];run.serverSpawnSynced=true;
    moveRoute=[];moveTarget=undefined;return;
  }
  const h=run.mvHistory,index=h.findIndex(e=>e.seq===self.mvSeq);
  if(index>=0){
    const e=h[index],ex=self.x-e.x,ey=self.y-e.y;
    if(ex*ex+ey*ey>1.5){
      // O servidor cortou um passo (parede/velocidade): desloca o presente pela mesma diferença.
      for(let k=index+1;k<h.length;k++){h[k].x+=ex;h[k].y+=ey;}
      const nx=p.x+ex,ny=p.y+ey;
      if(walkable(nx,ny)){p.x=nx;p.y=ny;}else{p.x=self.x;p.y=self.y;h.length=0;return;}
    }
    h.splice(0,index+1);
  }else if(!h.length && Math.hypot(p.x-self.x,p.y-self.y)>40){p.x=self.x;p.y=self.y;}
}
function setOnlineArena(world){
  const inArena=!!world.arena;
  if(inArena===!!run.inMvp)return;
  run.inMvp=inArena;remoteSamples.clear();remoteAppearance.clear();
  run.effects=[];run.numbers=[];run.onlineProjectiles=[];run.mobs=[];SkillFX.clear();moveRoute=[];moveTarget=undefined;
  $('map-title').textContent=inArena?(world.mvpArena?'Arena do MVP · '+bosses[expeditions[run.map].boss].name:'Fenda da Guilda'):expeditions[run.map].name;
}
function receiveAuthoritativeWorld(world){
  if(!run?.authoritative)return;
  // V23 Etapa 4: o fim chega no mesmo pacote dos últimos eventos (item do tesouro, carta): processa tudo e só então encerra.
  const ending=world.phase==='win'||world.phase==='loss';
  if(ending&&mode==='ended')return;
  if(ending&&world.self){run.kills=world.self.kills;run.zeny=world.self.zeny;}
  if(!world.self||!Array.isArray(world.mobs)){if(ending)finish(world.phase==='win');return;}
  if(run.worldId && world.id && world.id!==run.worldId)return; // snapshot do mundo anterior
  run.worldId=world.id||run.worldId;
  const self=world.self, p=run.player, simTime=Number.isFinite(world.simTime)?world.simTime:world.time;
  netClockSync(simTime);
  if(run.local)run.interpDelay=.06; // sala local: sem rede, só o atraso mínimo para interpolar entre dois passos
  setOnlineArena(world);
  const speed=self.speed||run.hero.speed;
  run.serverMoveSpeed=speed;
  run.netRtt=world.net?.rtt||run.netRtt||0;
  reconcileSelf(self);
  const mine=world.players?.[selfId()];
  if(mine?.weapon)run.serverWeapon=mine.weapon;
  p.hp=self.hp;p.sp=self.sp;run.authoritativeMaxHp=self.max;run.authoritativeMaxSp=self.maxSp;run.onlineBuffs=Array.isArray(self.buffs)?self.buffs:[];
  if(!(keys.size||Math.abs(run.touch?.x||0)+Math.abs(run.touch?.y||0)>.08))p.dir=self.dir;
  serverUpgradeChoices(self.choices||[],self.choiceSeq||0,self.pendingUps||0);serverRewardChoices(self.rewardChoices||[],self.rewardOffer||0,self.chestQueue||0);syncOnlineSkills(self);
  if(self.blessings){const b=self.blessings;if(run.lootDraft?.perks!==b.perks)run.lootDraft={perks:b.perks,forged:{},claimed:0,offered:0,synergies:b.synergies||[],history:[]};}
  if(self.evolutions)run.combos=new Set(self.evolutions);run.onlineMods=self.mods||{};
  if(self.wings){run.onlineWings=self.wings;run.onlinePotions=self.potions;run.flyNext=run.time+(self.flyIn||0);run.potionNext=run.time+(self.potionIn||0);}
  if(world.maze&&run.mazeEvent)Object.assign(run.mazeEvent,{active:!!world.maze.active,defeated:!!world.maze.defeated,room:world.maze.room});
  run.onlineCds=self.cds||{};run.onlineCdsAt=performance.now();run.onlineZones=world.zones||[];run.contract=world.contract||null;run.onlineTrial=self.trial||0;
  run.level=self.level;run.xp=self.xp;run.needed=self.needed;run.kills=world.kills;run.zeny=self.zeny;
  run.wave=world.wave;run.mvpActive=!!world.mvpActive;run.endless=Number.isFinite(world.endless)?world.endless:null;
  if(Number.isFinite(world.mapStart))run.mapStart=world.mapStart;
  if(run.time<simTime-1||run.time>simTime+1)run.time=simTime;
  run.riftPortal=world.riftPortal||null;run.portal=world.rift?.exit||null;run.mvpArena=!!world.mvpArena;
  run.rift=world.rift?{active:true,index:world.rift.index,phase:world.rift.phase,ward:world.rift.ward,uid:world.rift.uid,mvp:!!world.rift.mvp,
    cleared:!!world.rift.exit,left:world.rift.left,start:simTime-(90-world.rift.left),online:true}:null;
  updateOnlineRevive(world);
  for(const [id,view] of Object.entries(world.players||{})){
    if(id===selfId())continue;
    let entry=remoteSamples.get(id);
    if(!entry||entry.warp!==view.warp)remoteSamples.set(id,entry={warp:view.warp,list:[],lag:0});
    // Usa o carimbo de quando o colega ESTEVE ali (mt); a diferença média vira atraso extra de exibição.
    const stamp=Number.isFinite(view.mt)?Math.min(simTime,view.mt):simTime;
    const lag=Math.max(0,Math.min(.6,simTime-stamp));
    // V23.6: alvo = pico recente do atraso desse colega (sobe na hora, desce devagar, meia-vida ~5 s).
    // O atraso aplicado anda até o alvo com velocidade limitada em renderRemote: sem acelerar/frear o boneco a cada pacote.
    if(Number.isFinite(view.ct)){
      // V23.6: posições no relógio do colega. d = chegada − carimbo (diferença de relógio + atraso da rede).
      // Menor d visto (sobe devagar para seguir a deriva do relógio) + pico recente da oscilação = quanto atrasar a exibição.
      const arrive=performance.now()/1000,d=arrive-view.ct;
      if(entry.mode!=='ct'){entry.mode='ct';entry.list=[];entry.minD=d;entry.jit=0;entry.off=d+.06;entry.offTarget=entry.off;entry.lastCt=-Infinity;}
      if(view.ct>entry.lastCt){
        entry.lastCt=view.ct;
        entry.minD=Math.min(d,entry.minD+.0005);
        entry.jit=Math.max(d-entry.minD,entry.jit*.993);
        entry.offTarget=entry.minD+entry.jit+.04;
        pushSample(entry.list,view.ct,view.x,view.y);
      }
      continue;
    }
    if(entry.mode==='ct'){entry.mode=null;entry.list=[];} // sem carimbo (caído): recomeça no relógio do servidor
    if(!entry.list.length){entry.lag=lag;entry.lagTarget=lag;}
    else entry.lagTarget=Math.max(lag,(entry.lagTarget??lag)*.993);
    pushSample(entry.list,stamp,view.x,view.y);
  }
  if(Array.isArray(world.pickups)){
    run.gems=[];run.potions=[];run.goldDrops=[];run.cardDrops=[];run.chests=[];
    for(const [uid,kind,x,y,amount,id] of world.pickups){
      if(kind==='xp')run.gems.push({uid,x,y,xp:amount});
      else if(kind==='zeny')run.goldDrops.push({uid,x,y,amount});
      else if(kind==='card' && cardDb[id])run.cardDrops.push({uid,id,x,y,born:simTime});
      else if(kind==='potion')run.potions.push({uid,x,y});
      else if(kind==='sppotion')run.potions.push({uid,x,y,sp:true});
      else if(kind==='chest')run.chests.push({uid,x,y,mvp:amount>=3,kind:amount==='maze'?'maze':amount===2?'elite':'server'});
      else if(kind==='relic')run.chests.push({uid,x,y,mvp:true,kind:'server',relic:true});
      else if(kind==='xpmagnet')run.chests.push({uid,x,y,kind:'xpMagnet'});
      // Etapa 5: itens de campo do solo, asas e baú verde da forja.
      else if(kind==='healing')run.chests.push({uid,x,y,kind:'healing'});
      else if(kind==='zenycache')run.chests.push({uid,x,y,kind:'zenyCache'});
      else if(kind==='flywing'||kind==='butterflywing')run.chests.push({uid,x,y,kind});
      else if(kind==='forge')run.chests.push({uid,x,y,kind:'upgrade'});
      else if(kind==='zenymagnet')run.chests.push({uid,x,y,kind:'goldMagnet'});
    }
  }
  const old=new Map(run.mobs.map(m=>[m.uid,m]));
  run.mobs=world.mobs.map(([uid,id,x,y,hp,max,dir,warning,strike,slow,elite,specialBoss,riftBoss,riftSeal,actorName,actorDamage,tele])=>{
    const prev=old.get(uid); const base=monsters[id]||monsters.poring;
    const name=actorName||(riftBoss?'Guardião '+(base.name||id):elite==='riftGuard'?'Sentinela '+(base.name||id):elite==='miniBoss'&&!bosses[id]?'Elite '+(base.name||id):base.name||id);
    const samples=pushSample(prev?.samples||[],simTime,x,y);
    // Golpe de contato do monstro: inicia a animação de ataque (ação 16) uma vez por golpe.
    const attackStart=warning&&!prev?.attackActive?performance.now():prev?.attackStart||0;
    return {uid,id,type:{...base,damage:actorDamage??base.damage,name},attackActive:!!warning,attackStart,
      x:prev?.x??x,y:prev?.y??y,samples,hp,max,dir,
      // Etapa 4: aviso no chão vindo do motor (linha, círculo, anel) e clarão do golpe.
      warning:Array.isArray(tele)?{kind:tele[0],x:tele[1],y:tele[2],radius:tele[3],angle:tele[4],since:tele[5],at:tele[6]}:null,
      strike:prev?.strike&&prev.strike.until>run.time?prev.strike:null,elite,specialBoss:false,riftBoss:!!riftBoss,riftSeal:!!riftSeal,
      slow:slow===2?1:0,ailment:slow||0,phase:uid%6,hit:(prev&&hp<prev.hp?0.22:Math.max(0,(prev?.hit||0)-.05)),
      lastDamaged:prev&&hp<prev.hp?simTime:(prev?.lastDamaged??-999),
      walking:prev?.walking||false,walkHold:prev?.walkHold||0,walkTick:prev?.walkTick||0};
  });
  run.boss=run.mobs.find(m=>bosses[m.id]&&m.hp>0)||run.mobs.find(m=>m.riftBoss&&m.hp>0)||run.mobs.find(m=>m.elite==='miniBoss'&&m.hp>0)||null;
  const newEvents=(world.events||[]).filter(e=>e.seq>(run.authorityEventSeq||0));
  let damageLabels=0;
  const nameOf=id=>id===selfId()?'Você':(run.party.find(m=>m.id===id)?.profile?.name||'Um aliado');
  for(const e of newEvents){
    run.authorityEventSeq=Math.max(run.authorityEventSeq||0,e.seq);
    if(e.type==='hurt'&&e.player===selfId()){p.hitFlash=run.time+.24;burst(p.x,p.y,'#ff9e8b',6);tone(122,79,.2,'triangle',.075);}
    if(e.type==='downed'&&e.player===selfId())announce('Você caiu! Um aliado pode ficar perto de você para ressuscitar.',5);
    if(e.type==='revived'&&e.player===selfId())announce('Você foi ressuscitado! 3 segundos de proteção.',4);
    if(e.type==='revived'&&e.by===selfId())announce('Companheiro ressuscitado! ✚',3);
    if(e.type==='elite'&&!world.arena)announce('⚔ ELITE APARECEU! Derrote-o para receber recompensas.',4);
    if(e.type==='boss')announce('⚔ MVP invocado! A luta final começou.',5);
    if(e.type==='levelUp'&&e.player===selfId()){
      popup(p.x,p.y-43,'NÍVEL '+e.level,'#ffdf8d',14);
      if(e.healed)popup(p.x+18,p.y-25,'+'+e.healed+' HP','#82f5ad',12);
      tone(522,783,.2);
    }
    if(e.type==='combat' && e.player===selfId() && Number.isFinite(e.animSeq) && e.animSeq>run.selfAnimSeq){
      run.selfAnimSeq=e.animSeq;
      CombatAnimations.begin(p,{now:performance.now()/1000-Math.min(.16,Math.max(0,simTime-e.at)),
       kind:e.kind,type:e.weaponType,duration:e.duration,skillId:e.skill,dir:e.dir});
    }
    if(e.type==='hit' && e.x!=null && e.y!=null){
      if(e.by===selfId() && damageLabels++<5 && run.numbers.length<11)popup(e.x+((e.target||0)%3-1)*8,e.y-21,String(e.damage)+(e.crit?'!':''),e.crit?'#ffb35c':'#ffefaa',e.crit?14:11);
      if(run.effects.length<14)effect(e.area?'blast':'slash',e.x,e.y,e.area?42:18,'#ffd978');
    }
    if(e.type==='skillCast'){
      const loc=e.player===selfId()?p:(world.players?.[e.player]||{x:e.x,y:e.y});
      const name=skillName(e.skill)||e.name;
      if(e.player===selfId())run.shout={name,at:run.time+1.3,color:skillColor(e.skill)};
      else if(run.numbers.length<14)popup(loc.x,loc.y-65,name,'#fff3c9',12);
    }
    if(e.type==='projectile'){
      if(run.onlineProjectiles.length<24)run.onlineProjectiles.push({at:performance.now(),duration:e.duration||.25,
        x:e.fromX,y:e.fromY,toX:e.toX,toY:e.toY,skill:e.skill||'fire'});
    }
    if(e.type==='skillFail'&&e.player===selfId()){const name=skillInfo(e.skill)?.n||'Habilidade';
      combatNote(name+': '+({cooldown:'recarregando',sp:'SP insuficiente',full:'ninguém precisa de cura',active:'já está ativa',range:'nenhum inimigo ao alcance'}[e.reason]||'não pode ser usada agora')+'.');}
    if(e.type==='skillEffect'){
      // Efeito no lugar onde a habilidade ACERTA (antes também tocava em cima de quem conjurava).
      const info=skillInfo(e.skill),radius=e.rad||(e.style==='area'?95:52);
      if(e.style==='pulse'&&run.effects.length>10){/* pulsos de área não lotam a tela */}
      else if(!SkillFX.play(info?.fx||e.skill,{x:e.x,y:e.y,from:{x:e.x-55,y:e.y+22},radius})){
       effect(e.style==='buff'||e.style==='debuff'?'ring':'blast',e.x,e.y,Math.max(34,radius*.9),skillColor(e.skill));
      }
    }
    if(e.type==='healed'&&e.x!=null){
      if(run.numbers.length<12)popup(e.x,e.y-42,'+'+Math.round(e.amount||0)+' HP','#8dfbb6',12);
      SkillFX.play('heal',{x:e.x,y:e.y,radius:44});
    }
    if(e.type==='dodged'&&e.player===selfId())popup(p.x,p.y-44,'Esquivou','#bfe6ff',12);
    if(e.type==='blocked'&&e.player===selfId())popup(p.x,p.y-44,'Bloqueado','#e9e1ff',12);
    if(e.type==='trial')announce('PROVA DE GUILDA: '+e.name+' apareceu! Derrote-o para liberar a evolução da classe.',7);
    if(e.type==='trialDone'&&!run.local)announce('Prova da Guilda concluída: '+e.name+' derrotado! ✦',6);
    if(e.type==='contract')announce(e.stage===1?'Rastro revelado: derrotem '+(e.goal||2)+' elites.':e.stage===2?'Elites derrotados! Localizem o selo e consagrem a relíquia.':'Relíquia consagrada · +EXP e baú de elite para o grupo!',6);
    if(e.type==='magnet')announce(e.kind==='xp'?'Orbe de Experiência · toda a EXP do chão foi recolhida para o grupo!':'Ímã de Zeny · '+(e.amount||0)+' z recolhidos para cada jogador!',4);
    if(e.type==='riftOpen')announce('✧ Fenda aberta! Pise no portal (ou use o botão) para levar TODO o grupo.',6);
    if(e.type==='riftClosed')combatNote('A fenda se fechou.');
    if(e.type==='riftEnter')announce(nameOf(e.by)+' abriu a fenda · '+(e.name||'Fenda da Guilda')+(e.mvp?'! Derrote o MVP em até 2 minutos.':'! Destrua os 3 selos para enfraquecer o guardião.'),7);
    if(e.type==='riftWard')announce('SELOS ROMPIDOS · o Guardião está vulnerável!',4);
    if(e.type==='riftPhase')announce('FASE II · novos selos protegem o guardião!',5);
    if(e.type==='riftComplete')announce('Fenda concluída! Zeny, cura e um baú de recompensa para o grupo.',6);
    if(e.type==='riftCleared')announce('Guardião derrotado! Recolha os prêmios e saia pelo portal no centro (tecla E).',7);
    if(e.type==='riftFailed')announce(e.wiped?'O grupo caiu na fenda · todos voltaram com 25% de HP, sem recompensa.':'O tempo da fenda acabou · o grupo voltou sem recompensa.',6);
    if(e.type==='cardDrop')combatNote('Uma carta rara caiu no chão!');
    if(e.type==='chestShared'){const kind=e.grade==='relic'?'♛ Relicário de imbuimento':e.grade>=3?'♛ Tesouro do MVP':e.grade===2?'♢ Baú de elite':'♢ Baú azul';
      announce(run.local?kind+' aberto · escolha '+(e.grade==='relic'?'um imbuimento':'uma bênção')+'!':kind+' aberto por '+nameOf(e.by)+' · cada jogador escolhe '+(e.grade==='relic'?'o seu imbuimento':'a sua bênção')+'!',4);}
    if(e.type==='pickup' && e.player===selfId() && e.kind==='card'){
      // Solo: a carta vai para o álbum local (como sempre foi). Online: o servidor grava na conta.
      if(run.local)collectCard(e.id);
      else announce('CARTA RARA! '+(cardDb[e.id]?.name||e.id)+' · prêmio confirmado pelo servidor.',5);
    }
    if(e.type==='miss' && e.by===selfId() && run.numbers.length<12)popup(e.x,e.y-24,'Errou','#cfe3ff',12);
    if(e.type==='drain' && e.player===selfId() && run.numbers.length<12)popup(p.x,p.y-40,'+'+e.amount,'#8dff9c',13);
    // Etapa 3: bênçãos, runas, combinações e evoluções (iguais no solo e no online).
    // Etapa 5: eventos de campo, labirinto, asas, poções, forja e rota da missão.
    if(e.type==='fieldElite')announce(e.name+' entrou na horda!',5);
    if(e.type==='mazeGuardian')announce('⚠ PORTAIS SELADOS · O GUARDIÃO DOS PORTAIS APARECEU!',7);
    if(e.type==='mazeCleared')announce('GUARDIÃO DERROTADO! Portais reabertos. Recolha os tesouros secretos.',7);
    if(e.type==='contractRoute')announce(e.route==='seal'?'Rota escolhida: Purificar · bônus contra o MVP.':(e.auto?'Rota da Relíquia escolhida automaticamente · fique perto do selo.':'Rota escolhida: Relíquia · +1 elite e tesouro.'),4);
    if(e.player===selfId()){
      if(e.type==='flyWing'){announce((e.automatic?'Asa de Mosca automática':'Asa de Mosca')+' · fuga e recuperação por 4s!',4);SkillFX.play('warp',{x:e.x,y:e.y});if(run.local)persistWing('flywing',-1);}
      if(e.type==='butterfly'){announce('Asa de Borboleta · fenda contra '+e.name+'!',5);if(run.local)persistWing('butterflywing',-1);}
      if(e.type==='pursuit')announce('⚠ O comandante encontrou seu rastro e voltou à caça!',4);
      if(e.type==='mazeWarp'){SkillFX.play('warp',{x:p.x,y:p.y});if(!run.mazeEvent?.active)combatNote('Teleportado para a sala '+(e.room+1)+' do labirinto');tone(520,1040,.3,'sine',.05);}
      if(e.type==='wing'){announce(RunRelics.names[e.kind]+' obtida! Ative em Inventário → Itens de run.',4);if(run.local)persistWing(e.kind,1);}
      if(e.type==='potionUsed'&&run.local)persist({healPotions:Math.max(0,(saved.healPotions||0)-1)});
      if(e.type==='zenyCache')announce('Bolsa de Zeny · +'+e.amount+' z',3);
      if(e.type==='forged')announce('Forja temporária · '+(itemDb[e.item]?.name||e.item)+' · '+RuneLoot.bnames[e.key]+' +'+e.level+'/4',4);
    }
    // Etapa 4: ataques com aviso no chão, elementos, imunidades, portal/arena/tesouro do MVP.
    if(e.type==='bossAttack')combatNote(e.name);
    if(e.type==='strike'){const m=run.mobs.find(x=>x.uid===e.uid);const w={kind:e.kind,x:e.x,y:e.y,radius:e.radius,angle:e.angle,since:run.time-1,at:run.time,until:run.time+.32};
      if(m)m.strike=w;if(e.kind!=='line'&&run.effects.length<16)effect('blast',e.x,e.y,e.radius,'#f78e6d');tone(97,62,.24,'triangle',.05);}
    if(e.type==='hit'&&e.f&&e.by===selfId()){run.elementNotes??={};const t=e.target||0;if((run.elementNotes[t]||0)<=run.time){run.elementNotes[t]=run.time+1;
      if(run.numbers.length<14)popup(e.x,e.y-35,Elemental.names[e.el]+' ×'+e.f,e.f>1?'#ffdc7b':'#a8bad2',11);}}
    if(e.type==='immune'&&e.by===selfId()&&run.numbers.length<14)popup(e.x,e.y-35,'Imune · '+Elemental.names[e.el],'#bcc9e0',11);
    if(e.type==='magicImmune'&&e.player===selfId())popup(p.x,p.y-44,'Imune','#ffe28a',13);
    if(e.type==='mvpWarning'){announce('⚠ PRESENÇA DE MVP DETECTADA! Prepare-se para a batalha.',4);tone(180,95,.6,'sawtooth',.07);if(run.effects.length<16)effect('blast',e.x,e.y,120,'#e7b75e');}
    if(e.type==='endlessStart'){announce('∞ MODO INFINITO! O MVP caiu e as hordas não param: EXP ×'+String(e.xp||2.5).replace('.',',')+'. Esc → Encerrar run para receber as recompensas.',9);tone(330,660,.45,'triangle',.06);}
    if(e.type==='mvpPhase'){const names={2:'REFORÇOS',3:'PODER ESPECIAL',4:'FÚRIA'};announce('⚠ MVP · FASE '+e.phase+' — '+names[e.phase]+'!',5);tone(e.phase===4?95:210,110,.5,'triangle',.08);if(run.effects.length<16)effect('blast',e.x,e.y,130,e.phase===4?'#ff584a':'#ffbf68');}
    if(e.type==='mvpEnter')announce('⚠ O MVP '+e.name+' APARECEU! Ele chama reforços · desvie dos avisos no chão.',7);
    if(e.type==='mvpDown')announce('MVP DERROTADO! Escolha 1 equipamento permanente do tesouro.',7);
    if(e.type==='mvpItem'&&e.player===selfId()){
      if(run.local){
        // Solo: o item vai para o save (mesma regra do servidor: repetido vira refino ou Zeny).
        const r=Gear.grantItem(items(),{id:e.id,affixes:e.affixes},run.mapTier,'m'+Date.now().toString(36)+Math.floor(Math.random()*1296).toString(36));
        if(r.item){persist({items:r.items,zeny:(saved.zeny||0)+r.zeny});run.picked.push(Gear.label(r.item)+' · '+r.text);announce(Gear.label(r.item)+' · '+r.text,5);}
      }else announce((itemDb[e.id]?.name||e.id)+' · será guardado na sua conta ao fim da partida.',5);
    }
    if(e.type==='chain'){run.chainArcs??=[];if(run.chainArcs.length<18)run.chainArcs.push({x:e.x,y:e.y,tx:e.tx,ty:e.ty,until:run.time+.24});}
    if(e.type==='levelUp'&&e.player===selfId()&&e.level===3)announce('Cadeia Rúnica desbloqueada · seus acertos saltam para mais dois inimigos!',5);
    if(e.player===selfId()){
      if(e.type==='blessing')announce('✦ '+e.name+' · '+e.rank+'/'+e.cap,4);
      if(e.type==='rune')announce('ᛟ '+e.name+' · '+e.level+'/2',4);
      if(e.type==='chestZeny')announce('Baú convertido em '+e.amount+' Zeny · todas as bênçãos possíveis já estão no máximo.',4);
      if(e.type==='synergy'){announce('✧ COMBINAÇÃO: '+e.name+'!',5);if(run.local&&!saved.runSynergies?.[e.id])persist({runSynergies:{...(saved.runSynergies||{}),[e.id]:true},codexCoins:(saved.codexCoins||0)+75});}
      if(e.type==='evolution'){announce('✨ Evolução descoberta: '+e.name+(run.local&&!saved.codexFound?.[e.id]?' · +240 Códex!':''),4.5);if(run.local&&!saved.codexFound?.[e.id])persist({codexFound:{...(saved.codexFound||{}),[e.id]:true},codexCoins:(saved.codexCoins||0)+240});}
      if(e.type==='runeCombo'){run.shout={name:e.name,at:run.time+1.8,color:'#ffe3a3'};SkillFX.play(e.role==='boss'?'bash':'storm',{x:e.x,y:e.y,from:p,radius:145});
        if(run.local&&!saved.codexFound?.[e.id]){persist({codexFound:{...(saved.codexFound||{}),[e.id]:true},codexCoins:(saved.codexCoins||0)+120});announce('Combinação descoberta: '+e.name+' · +120 Códex',4);}}
    }
    if(e.type==='cardZeny' && e.player===selfId())popup(e.x,e.y-34,'+'+e.amount+' z','#ffd65a');
    if(run.local){
      // Metas de mudança de classe e Prova da Guilda no solo (no online quem grava é o servidor).
      if(e.type==='levelUp'&&e.player===selfId())ProgressionGoals.record(e.level);
      if(e.type==='riftComplete')ProgressionGoals.record(run.level,true);
      if(e.type==='trialDone'&&run.career&&e.job===run.line){
        const stage=run.journey.stage,next={...run.journey,guildTrials:{...(run.journey.guildTrials||{}),[stage]:true}};
        run.journey=next;saveJourney(run.line,next);
        announce('PROVA DE GUILDA CONCLUÍDA · '+e.name+'! Termine a expedição para consolidar sua experiência.',6);
      }
    }
  }
  if(ending){run.kills=world.self.kills;run.zeny=world.self.zeny;finish(world.phase==='win');return;}
  // Pose de ataque: os eventos acima são exatos; o estado do snapshot é só uma rede de segurança.
  if(mine?.attack && Number.isFinite(mine.animSeq) && mine.animSeq>run.selfAnimSeq){
    run.selfAnimSeq=mine.animSeq;
    CombatAnimations.begin(p,{now:performance.now()/1000-Math.min(.16,(mine.animProgress||0)*(mine.animDuration||.45)),type:mine.animType,
       kind:mine.animKind,duration:mine.animDuration||.45,skillId:mine.animSkill});
  }
}
function receiveWorld(world) {
  // V23: o mundo sempre vem do motor (servidor no online, sala local no solo).
  if (mode === 'ended' || !world?.authoritative) return;
  return receiveAuthoritativeWorld(world);
}

function start(online = false, partySlot = 0, map = selectedMap) {
  // V23: o solo roda o MESMO motor do servidor numa sala local. Espera o motor carregar (é rápido).
  if (online !== true && !LocalRoom.available()) {
    if (window.MidgardEngine?.error) { alert('Não foi possível carregar o motor do jogo. Recarregue a página (Ctrl+F5).'); return; }
    const button = $('start');
    if (button) { button.disabled = true; button.dataset.label ??= button.textContent; button.textContent = 'Carregando o motor…'; }
    const resumeStart = () => { if (button) { button.disabled = false; button.textContent = button.dataset.label; } };
    (window.MidgardEngine ? LocalRoom.whenReady() : new Promise((resolve, reject) => {
      window.addEventListener('midgard-engine', () => LocalRoom.whenReady().then(resolve, reject), { once: true });
    })).then(() => { resumeStart(); start(online, partySlot, map); },
      () => { resumeStart(); alert('Não foi possível carregar o motor do jogo. Recarregue a página (Ctrl+F5).'); });
    return;
  }
  const hero = selectedJob();
  const career = journeyMode === 'career';
  const journey = career ? journeyOf() : trainingJourney();
  const gear = JSON.parse(JSON.stringify(gearOf(journey)));
  if (!expeditions[map]) map = selectedMap;
  // Online: o SERVIDOR valida o desbloqueio (inclusive ao seguir para o próximo mapa com o grupo).
  if (career && online !== true && (!Campaign.mapUnlocked(saved,selected,map) || !Campaign.difficultyUnlocked(saved,selected,selectedDifficulty))) {
    alert('Mapa ou dificuldade bloqueados para este personagem. Conclua as expedições anteriores com esta linhagem.');
    return;
  }
  const mapField = MapGen.build(map);
  const [x, y] = mapField.spawn;
  nextFlow = 0;
  remoteAppearance.clear();remoteSamples.clear();
  run = {
    // V23: solo também é "autoritativo" (o motor decide tudo); local=true quer dizer sala local de 1 jogador.
    coop: online === true, authoritative: true, local: online !== true, guest: online === true && !Coop.host(),
    authorityEventSeq:0,serverSpawnSynced:false,selfAnimSeq:-1,serverTarget:null,mvSeq:0,mvHistory:[],warpSeq:0,netOffset:null,interpDelay:.12,coopRiftEnter:0,reviveHeld:false,coopSkill:0,coopSkillSeq:0,coopUpgradeSeq:0,coopUpgrade:null,coopRewardSeq:0,coopReward:null,onlineProjectiles:[],onlineSkillSignature:'',
    partySlot, party: [], ack: {}, outgoingHits: [], hitSeq: 0, enemySeq: 0, hostPaused: false,
    hero, id: hero.id, line: selected, career, journey, map, difficulty: selectedDifficulty, auto: combatMode === 'auto', gear, picked: [], cardDrops: [], chests: [], claimedChests: new Set(), pendingMvp: false, zeny: 0, combos:new Set(), pet:null, goldDrops:[], castPending:null, skillPending:null, pendingAttacks:[], shout:null,
    mapTier: mapOrder.indexOf(map), mapStart: 0, questBase: 0, victories: 0, trialSpawned:false, encounters: Object.create(null), mazeEvent: { visits: 0, spawned: false, active: false, defeated: false, room: -1 },
    offers: [], quest: false, portal: null, inMvp: false, field: mapField, warpReady: 0,
    player: { x, y, hp: 1, sp: 1, r: 11, face: 1, dir: 0, walk: 0, immunity: 0, animation: 0, buff: 0 },
    time: 0, kills: 0, level: 1, xp: 0, needed: SkillProgression.needed(1), spawn: .15, wave: 0, boss: null, points: 0, attackAt: 0, noteUntil: 0,
    mobs: [], gems: [], potions: [], shots: [], particles: [], effects: [], numbers: [], notice: 0,
    talents: { [hero.tree[0].id]: { level: 1, next: 0 } }, zones: [], touch: { x: 0, y: 0 },
  };
  run.lootDraft = RuneLoot.initial();
  if(saved.petsOwned?.[saved.activePet])run.pet={ x:x+36,y:y+22, id:saved.activePet };
  refreshStatus();
  run.player.hp = maxHp();
  run.player.sp = maxSp();
  RunRelics.seedMap();
  SkillFX.clear();
  if (partySlot) {
    const angle = (partySlot - 1) * TAU / 6;
    const allyX = x + 51 * Math.cos(angle);
    const allyY = y + 51 * Math.sin(angle);
    if (walkable(allyX, allyY)) Object.assign(run.player, { x: allyX, y: allyY });
  }
  keys.clear();
  cursor = moveTarget = undefined;
  moveRoute = [];
  clearPointer();
  mode = 'play';
  $('game-diagnostic').hidden=true;
  $('menu').hidden = true;
  $('arena').hidden = false;
  ui.dialog.hidden = true;
  ui.boss.hidden = true;
  $('portal-button').hidden = true;
  $('party-status').hidden = !run.coop;
  $('sp-row').hidden = false; // o SP é gasto no manual e no automático, no solo e no online
  document.getElementById('online-passives')?.remove();
  $('hud-combat-mode').textContent = (run.auto ? 'Automático' : 'Manual') + ' · ' + RunDifficulty.get(run.difficulty).name;
  $('map-title').textContent = expeditions[map].name;
  $('arena').setAttribute('aria-label', expeditions[map].name);
  BGM.enter(map,!muted);
  $('quest-title').textContent = JobTrials.forLine(selected,journey.stage) && career && !journey.guildTrials?.[journey.stage] ? 'Prova da Guilda' : 'Missão da expedição';
  $('boss-name').textContent = bosses[expeditions[map].boss].name;
  ui.note.hidden = true;
  $('hud-class').textContent = hero.name;
  $('hud-emblem').replaceChildren(Art.portrait(hero.id));
  resize();
  renderSkills();
  if(run.authoritative){
    // Mesma regra do motor: a habilidade inicial vem da etapa atual (Aprendiz T. → Primeiros Socorros).
    const cat=onlineCatalog,tiers=cat?.stages?.[run.journey?.stage|0]||cat?.stages?.[0]||[],pool=tiers.flatMap(t=>cat?.lines?.[run.line]?.[t]||[]);
    const preferred=cat?.starters?.[run.line],first=pool.includes(preferred)?preferred:pool.find(id=>cat?.skills?.[id]&&cat.skills[id].k!=='passive');
    syncOnlineSkills({skills:first?{[first]:1}:{},slots:first?[first]:[]});
  }
  if(run.local){
    // Personagem no mesmo formato que o servidor lê da conta (nível de Base, atributos, estágio, provas e equipamento).
    run.localRoom=LocalRoom.create({map,difficulty:selectedDifficulty,job:selected,classId:hero.id,
      name:window.MidgardAccount?.user()?.nickname||'Aventureiro',character:localCharacter()});
    run.seed=run.localRoom.world.seed;run.localGearKey=localGearKey();
  }
  updateHud();
  announce('Onda 1 · ' + expeditions[map].firstWave + ' · habilidades até nv. ' + SkillProgression.cap(run.mapTier), 3.5);
  tone(262, 523, .25);
  canvas.tabIndex = -1;
  canvas.focus({ preventScroll: true });
}

function menu() {
  // V22.5: ao terminar uma partida online, voltar ao menu mantém a sala (lobby) para a próxima.
  if (run?.coop) { if (mode === 'ended') Coop.lobby(); else Coop.leave(); }
  for (const id of ['coop-server-upgrades','coop-server-rewards','online-passives','skill-tip']) { const el = document.getElementById(id); if (el) el.hidden = true; }
  mode = 'menu';
  run = null;
  BGM.enter('menu',!muted);
  keys.clear();
  $('arena').hidden = true;
  $('menu').hidden = false;
  renderMenu();
  $('start').focus({ preventScroll: true });
}

function announce(label, duration = 3) {
  run.notice = run.time + duration;
  ui.announcement.textContent = label;
  ui.announcement.hidden = false;
}

function showDialog(label, title, body, actions) {
  clearPointer();
  keys.clear();
  ui.label.textContent = label;
  ui.title.textContent = title;
  ui.body.textContent = body;
  ui.actions.replaceChildren(...actions);
  ui.dialog.hidden = false;
  ui.actions.querySelector('button')?.focus({ preventScroll: true });
}
function resume() {
  mode = 'play';
  ui.dialog.hidden = true;
  canvas.focus({ preventScroll: true });
}
function pause() {
  if (mode === 'pause') return resume();
  if (mode !== 'play') return;
  mode = 'pause';
  // V24.1: os ajustes das janelas da HUD saíram da tela de jogo e ficam aqui, na pausa.
  const lock = $('hud-layout-lock'), locked = lock?.getAttribute('aria-pressed') === 'true';
  showDialog(run.inMvp ? 'ARENA DO MVP' : expeditions[run.map].name.toUpperCase(), 'Jogo pausado', 'A partida continua de onde você parou. As janelas da tela (personagem, mapa, atalhos, música) podem ser arrastadas pelo título.', [
    button('Continuar', 'primary', resume),
    ...(run.endless!=null ? [button('Encerrar run e receber recompensas', 'primary', () => { run.endRequest = true; resume(); })] : []),
    button('Restaurar posição das janelas', 'secondary', () => { $('hud-layout-reset')?.click(); resume(); }),
    button(locked ? 'Destravar janelas' : 'Travar janelas', 'secondary', () => { lock?.click(); resume(); }),
    button('Voltar ao menu', 'secondary', menu),
  ]);
}
// After an MVP falls the next expedition unlocks, and solo runs can travel straight on to it.
/* V22.2: depois de uma partida online, o servidor grava EXP de Base/Classe, Zeny, cartas e mapas.
   Aqui o navegador busca esse progresso verificado e junta com o local sem nunca "voltar" níveis. */
function journeyAhead(a,b){
  const key=j=>[j?.stage||0,j?.base||0,j?.baseXp||0,j?.job||0,j?.jobXp||0];
  const x=key(a),y=key(b);for(let i=0;i<x.length;i++)if(x[i]!==y[i])return x[i]>y[i];return true;
}
/** Metas de mudança de classe (melhor nível de run, fendas, Prova da Guilda, selos) nunca regridem na mescla. */
function mergeGoals(chosen,a,b){
  if((a?.stage||0)!==(b?.stage||0))return chosen;
  const runRecords={...(chosen.runRecords||{})};
  for(const source of [a,b])for(const [stage,r] of Object.entries(source?.runRecords||{})){
    const old=runRecords[stage]||{};runRecords[stage]={bestLevel:Math.max(old.bestLevel||0,r.bestLevel||0),rifts:Math.max(old.rifts||0,r.rifts||0)};
  }
  return {...chosen,runRecords,guildTrials:{...(a?.guildTrials||{}),...(b?.guildTrials||{})},proofs:Math.max(a?.proofs||0,b?.proofs||0)};
}
async function syncOnlineRewards(result){
  if(!window.MidgardAccount?.signedIn())return null;
  const server=await window.MidgardAccount.refresh();if(!server)return null;
  const before=JSON.parse(JSON.stringify(saved.journeys?.[result.line]||server.journeys?.[result.line]||{}));
  const journeys={...(server.journeys||{})};
  for(const [line,local] of Object.entries(saved.journeys||{})){
    const remote=server.journeys?.[line];
    if(!remote){journeys[line]=local;continue;}
    if(line===result.line){
      // Mesma fórmula do servidor aplicada ao progresso local (caso o local esteja à frente, ex.: modo solo).
      const awarded=awardJourney(local,result.kills,result.seconds,result.win?1:0);
      journeys[line]=mergeGoals(journeyAhead(awarded,remote)?awarded:remote,awarded,remote);
    }else journeys[line]=mergeGoals(journeyAhead(local,remote)?local:remote,local,remote);
  }
  const album={...(server.album||{})};
  for(const [id,count] of Object.entries(saved.album||{}))album[id]=Math.max(Number(album[id])||0,Number(count)||0);
  const campaign=JSON.parse(JSON.stringify(server.campaign||{}));
  for(const [line,c] of Object.entries(saved.campaign||{})){
    const target=campaign[line]||(campaign[line]={});
    target.cleared={...(c.cleared||{}),...(target.cleared||{})};
    const byDiff={...(target.clearsByDifficulty||{})};
    for(const [diff,maps] of Object.entries(c.clearsByDifficulty||{}))byDiff[diff]={...maps,...(byDiff[diff]||{})};
    target.clearsByDifficulty=byDiff;
    for(const [key,value] of Object.entries(c))if(!(key in target))target[key]=value;
  }
  // Etapa 3: pontos e descobertas do Códex ganhos no online (o servidor gravou) não são sobrescritos pelo save local.
  const codexFound={...(saved.codexFound||{}),...(server.codexFound||{})},runSynergies={...(saved.runSynergies||{}),...(server.runSynergies||{})};
  saved={...server,...saved,journeys,album,campaign,codexFound,runSynergies,codexCoins:Math.max(Number(server.codexCoins)||0,Number(saved.codexCoins)||0),
    zeny:Math.max(Number(server.zeny)||0,(Number(saved.zeny)||0)+(Number(result.zeny)||0)),
    best:Math.max(Number(server.best)||0,Number(saved.best)||0)};
  try{localStorage.setItem(SAVE,JSON.stringify(saved));}catch{}
  window.MidgardAccount.queueSave(saved);
  return {before,after:journeys[result.line]};
}
window.addEventListener('midgard-progress-merged',event=>{
  saved=event.detail;try{localStorage.setItem(SAVE,JSON.stringify(saved));}catch{}
  if(mode==='menu')renderMenu();
});
function finish(victory) {
  // V23: no online o SERVIDOR grava o progresso; no solo (sala local) o navegador grava, como sempre foi.
  const serverOwned=run.authoritative&&!run.local;
  run.relics={};run.skillMods={};run.chainArcs=[];
  if (mode === 'ended') return;
  run.victory = victory;
  if (victory) {
    if (!run.victories) run.victories = 1;
    if(run.career&&!serverOwned)persist({campaign:Campaign.markCleared(saved,run.line,run.map,run.difficulty)});
  }
  if(run.authoritative){for(const name of ['coop-server-upgrades','coop-server-rewards']){const window=document.getElementById(name);if(window)window.hidden=true;}const overlay=$('online-death-overlay');if(overlay)overlay.hidden=true;}
  mode = 'ended';
  BGM.stop();
  if(!serverOwned)persist({ best: Math.max(saved.best ?? 0, Math.floor(run.time)) });
  // V23.6: tabela de recordes. No online o servidor registra; no solo o navegador envia o resultado (conta logada).
  if(run.local&&window.MidgardAccount?.signedIn()&&run.time>=10)fetch('/api/account/scores',{method:'POST',credentials:'same-origin',cache:'no-store',
    headers:{'Content-Type':'application/json','X-Midgard-Request':'1'},body:JSON.stringify({line:run.line,map:run.map,difficulty:run.difficulty,
    level:run.level,kills:run.kills,seconds:Math.floor(Math.max(0,run.time-(run.mapStart||0))),win:!!victory})}).catch(()=>{});
  let progress = '';
  if (run.career && !serverOwned) {
    const next = awardJourney(run.journey, run.kills, run.time, run.victories, 1.25); // V25.4: solo rende +25% de EXP de base/classe
    saveJourney(run.line, next);
    progress = ' · Base ' + run.journey.base + ' → ' + next.base + ' · Classe ' + run.journey.job + ' → ' + next.job;
    if (advanceJourney(next)) progress += ' · Mudança de classe disponível';
  }
  const mvp = bosses[expeditions[run.map].boss].name;
  if (run.zeny && !serverOwned) persist({ zeny: (saved.zeny ?? 0) + run.zeny });
  // Repeated evolution discoveries grant a small amount of codex experience when completing a run.
  if(run.combos?.size && victory && !serverOwned) persist({codexCoins:(saved.codexCoins||0)+Math.min(100,run.combos.size*18)});
  if(serverOwned){
    progress=window.MidgardAccount?.signedIn()?' · Salvando EXP do personagem…':' · Entre na conta para guardar EXP do personagem.';
    const line=run.line,result={line,kills:run.kills,seconds:Math.max(0,run.time-(run.mapStart||0)),win:!!victory,zeny:run.zeny};
    const finishedRun=run;
    syncOnlineRewards(result).then(change=>{
      if(!change||run!==finishedRun||mode!=='ended')return;
      const a=change.before,b=change.after;
      const text=' · Base '+(a.base||1)+' → '+(b.base||1)+' · Classe '+(a.job||1)+' → '+(b.job||1)+(b.base>(a.base||1)||b.job>(a.job||1)?' ✦':'');
      ui.body.textContent=ui.body.textContent.replace(' · Salvando EXP do personagem…',text);
      if(advanceJourney(b))ui.body.textContent+=' · Mudança de classe disponível';
    }).catch(()=>{if(run===finishedRun&&mode==='ended')ui.body.textContent=ui.body.textContent.replace(' · Salvando EXP do personagem…',' · EXP salva no servidor (confira no menu).');});
  }
  const loot = (run.picked.length ? ' · Itens: ' + run.picked.join(', ') : '') +
    (run.zeny ? ' · +' + run.zeny.toLocaleString('pt-BR') + ' z' : '') +
    (run.endless != null ? ' · ∞ Infinito: ' + timeText(run.endless) + ' (nível ' + run.level + ')' : '');
  tone(victory ? 392 : 160, victory ? 784 : 72, .5);
  // V22.1: fim do mapa com opção de seguir para o PRÓXIMO mapa ou voltar ao menu.
  const nextMap = victory ? mapOrder[mapOrder.indexOf(run.map) + 1] : null;
  const actions = [];
  if (run.coop) {
    const ask = (modeName, el) => { el.disabled = true; ui.body.textContent = 'Preparando o mapa para o grupo…';
      Coop.next(modeName).catch(err => { el.disabled = false; ui.body.textContent = err.message || 'Não foi possível iniciar o próximo mapa.'; }); };
    if (Coop.host()) {
      if (nextMap) { const b = button('Próximo mapa: ' + expeditions[nextMap].name, 'primary', () => ask('next', b)); actions.push(b); }
      const again = button(victory ? 'Jogar este mapa de novo' : 'Tentar de novo com o grupo', nextMap ? 'secondary' : 'primary', () => ask('retry', again)); actions.push(again);
    } else progress += ' · Aguardando o líder escolher o próximo mapa…';
    actions.push(button('Voltar ao lobby da sala', actions.length ? 'secondary' : 'primary', menu));
  } else {
    const unlocked = nextMap && (!run.career || Campaign.mapUnlocked(saved, run.line, nextMap));
    if (unlocked) actions.push(button('Próximo mapa: ' + expeditions[nextMap].name, 'primary', () => { selectedMap = nextMap; start(false, 0, nextMap); }));
    actions.push(button(victory ? 'Jogar este mapa de novo' : 'Tentar de novo', unlocked ? 'secondary' : 'primary', () => start(false, 0, run.map)));
    actions.push(button('Voltar ao menu', 'secondary', menu));
  }
  showDialog(victory ? 'VITÓRIA' : 'FIM DE PARTIDA', victory ? (run.victories > 1 ? run.victories + ' MVPs derrotados' : 'MVP derrotado · ' + mvp) : 'Você caiu em combate',
    timeText(Math.max(0, run.time - (run.mapStart || 0))) + ' de expedição · ' + run.kills + ' abates' + progress + loot, actions);
}

function refreshStatus() {
  run.bonus = Gear.bonuses(run.gear);
  const evolution=Codex.check(run,saved);
  if(evolution.update){persist(evolution.update);if(run.time>0) announce('✨ Evolução descoberta: '+evolution.unlocked.join(', ')+' · +240 Códex!',4.5);}
  for(const source of [Codex.comboBonuses(run),Codex.petBonuses(saved),RunRelics.bonuses(),RuneLoot.bonuses()]) for(const [key,amount] of Object.entries(source)) run.bonus[key]=(run.bonus[key]||0)+amount;
  run.status = RO.derive(run.hero, run.journey, run.bonus);
  if(run.local&&run.localRoom&&run.localGearKey!==localGearKey()){
    run.localGearKey=localGearKey();run.localRoom.core.updateCharacter(run.localRoom.world,LocalRoom.ID,localCharacter());
  }
  run.maxHp = Math.max(1, Math.round(run.hero.hp * run.status.hpMul * (1 + (run.bonus.hpPct ?? 0))));
  run.maxSp = Math.round(run.hero.sp * run.status.spMul * (1 + run.bonus.spPct) + run.bonus.spFlat);
  const lv = run.journey.base;
  // Later expeditions are tougher, and the run keeps getting harder as you travel on.
  run.mobHp = (1 + (lv - 1) * .016) * (1 + run.mapTier * .63) * (1+run.mapTier*.32);
  run.mobDamage = (1 + (lv - 1) / 120) * (1 + run.mapTier * .31) * (1+run.mapTier*.07);
}
function maxHp() { return run.maxHp; }
function maxSp() { return run.maxSp; }

function renderSkills() {
  const slots = run.hero.tree.filter(skill => skill.slot).map(skill => {
    const level = skillLevel(run.talents, skill.id);
    const el = button('', 'skill-slot', () => useSkill(skill.slot));
    el.dataset.skill = skill.id;
    el.style.setProperty('--skill-color', run.hero.color);
    const tipExtra = (level ? 'Nível ' + level : 'Bloqueada · aprenda na Árvore (T)') + (run.auto ? ' · automática' : ' · tecla ' + skill.slot) + ' · ' + skill.cost + ' SP';
    el.setAttribute('aria-label', skill.name + '. ' + (skill.desc || '') + ' ' + tipExtra);
    el.setAttribute('aria-disabled', String(!level || run.auto));
    el.dataset.learned = String(!!level);
    el.innerHTML = '<span class="skill-key">' + (run.auto ? '' : skill.slot) + '</span><img class="skill-icon" src="assets/ro/skill-' + skill.id + '.png" alt=""><b aria-hidden="true">' + (level || '–') + '</b><i aria-hidden="true"></i>';
    skillTip(el, skill.name, skill.desc, tipExtra);
    return el;
  });
  $('skills').replaceChildren(...slots);
  $('skill-count').textContent = Object.keys(run.talents).filter(id => run.hero.tree.find(skill => skill.id === id)?.slot).length + '/' + slots.length;
}
// Buffs ativos (Aumentar Agilidade, Bênção, Angelus…): ícone + segundos restantes, acima dos atalhos.
function renderBuffBar(){
  let bar=$('buff-bar');
  if(!bar){bar=document.createElement('div');bar.id='buff-bar';bar.setAttribute('aria-label','Efeitos ativos');document.body.append(bar);}
  const list=(mode==='play'||mode==='catalogue'||mode==='inventory')?(run?.onlineBuffs||[]):[];
  const key=list.map(([id,t])=>id+':'+Math.ceil(t)).join(',');
  if(bar.dataset.key===key)return;bar.dataset.key=key;bar.hidden=!list.length;
  bar.replaceChildren(...list.map(([id,t])=>{const el=document.createElement('span');el.className='buff-chip';el.title=(skillInfo(id)?.n||id)+' · '+Math.ceil(t)+' s';
    const img=document.createElement('img');img.src=skillIconUrl(id);img.alt='';const time=document.createElement('b');time.textContent=Math.ceil(t)+'s';
    const name=document.createElement('small');name.textContent=skillInfo(id)?.n||id;el.append(img,name,time);return el;}));
}
function updateHud() {
  renderBuffBar();
  const hp = Math.ceil(run.player.hp);
  const hpMax=run.authoritative ? (run.authoritativeMaxHp||maxHp()) : maxHp();
  const hpText = hp + ' / ' + hpMax;
  const stamp = timeText(Math.max(0,run.time-run.mapStart));
  const kills = run.kills + (run.kills === 1 ? ' abate' : ' abates');
  if (ui.hpText.textContent !== hpText) {
    ui.hp.style.width = Math.max(0,100 * hp / hpMax) + '%';
    ui.hpText.textContent = hpText;
  }
  const spMax=run.authoritative ? (run.authoritativeMaxSp||maxSp()):maxSp();
  const spText = Math.floor(run.player.sp) + ' / ' + spMax;
  if (ui.spText.textContent !== spText) {
    ui.sp.style.width = Math.max(0,100 * run.player.sp / spMax) + '%';
    ui.spText.textContent = spText;
  }
  for (const el of $('skills').children) {
    const next = run.authoritative ? 0 : (run.talents[el.dataset.skill]?.next ?? 0);
    const skill = run.hero.tree.find(item => item.id === el.dataset.skill);
    const cd = run.authoritative ? run.onlineCds?.[el.dataset.skill] : null;
    const height = cd ? Math.ceil(100 * Math.max(0, cd[0] - (performance.now() - run.onlineCdsAt) / 1000) / Math.max(.1, cd[1])) + '%'
      : skill && !run.authoritative ? Math.ceil(100 * Math.max(0, next - run.time) / (run.talents[skill.id]?.cooldown ?? skill.cooldown)) + '%' : '0%';
    if (el.lastElementChild.style.height !== height) el.lastElementChild.style.height = height;
  }
  const treeButton = $('tree-button');
  // V23: a árvore fixa não existe dentro da run (habilidades vêm do leque sorteado do catálogo do RO).
  if (!treeButton.hidden) treeButton.hidden = true;
  ui.note.hidden = run.time >= run.noteUntil;
  if (ui.time.textContent !== stamp) ui.time.textContent = stamp;
  if (ui.kills.textContent !== kills) ui.kills.textContent = kills;
  ui.stage.textContent = run.rift?.active ? 'MISSÃO DA FENDA' : run.pendingMvp ? 'RECOMPENSA MVP' : run.mazeEvent?.active ? 'ENCONTRO SECRETO' : run.boss ? 'BATALHA MVP' : run.mobs.some(m=>m.elite==='miniBoss'&&m.hp>0) ? 'MINIBOSS' : run.portal ? 'PORTAL ABERTO' : 'ONDA ' + (run.wave + 1);
  $('hud-level').textContent = run.authoritative ? 'RUN Nv. '+run.level : run.career ? 'Base ' + run.journey.base + ' · Classe ' + run.journey.job : 'Treino de 3ª classe';
  $('hud-gold').textContent='🪙 '+run.zeny.toLocaleString('pt-BR')+' z';
  $('hud-pet').textContent=run.pet ? '🐾 '+Codex.pets[run.pet.id]?.name : '';
  $('mvp-countdown').textContent = run.endless!=null ? '∞ Infinito ' + timeText(run.endless) : run.rift?.active ? 'Fenda · missão opcional' : run.mvpActive ? bosses[expeditions[run.map].boss].name : 'MVP ' + timeText(Math.ceil(Math.max(0,FINAL_WAVE - (run.time - run.mapStart))));
  ExpeditionQuest.hud();
  EliteRifts.hud();
  const portalLabel=nearbyPortal(),portalButton=$('portal-button');
  portalButton.hidden=!portalLabel;
  if(portalLabel&&portalButton.dataset.label!==portalLabel){portalButton.dataset.label=portalLabel;portalButton.innerHTML=portalLabel+' <kbd>E</kbd>';}
  ui.xp.style.width = Math.min(100, 100 * run.xp / run.needed) + '%';
  ui.xpText.textContent = run.authoritative ? 'RUN NV. '+run.level+' · '+Math.floor(run.xp)+'/'+run.needed+' EXP · '+(run.local?'SOLO':'MODO ONLINE') : 'RUN NV. ' + run.level + ' · ' + Math.floor(run.xp) + '/' + run.needed + ' EXP · ' + RuneLoot.summary() + ' · SKILLS ATÉ ' + SkillProgression.cap(run.mapTier) + '/10';
  const highlighted = run.boss?.hp > 0 ? run.boss : run.mobs.filter(m=>m.hp>0 && (m.elite || m.guildTrial || m.specialBoss || m.riftBoss) && !m.riftSeal).sort((a,b)=>distance(a,run.player)-distance(b,run.player))[0];
  ui.boss.hidden = !highlighted;
  if (highlighted) { $('boss-name').textContent = highlighted.type.name+' · '+Math.ceil(Math.max(0,highlighted.hp)).toLocaleString('pt-BR')+'/'+Math.ceil(highlighted.max).toLocaleString('pt-BR')+' HP · '+Elemental.info(highlighted.id)+' · '+Elemental.weakness(highlighted.id); ui.bossFill.style.width = Math.max(0, 100 * highlighted.hp / Math.max(1,highlighted.max)) + '%'; ui.bossFill.setAttribute('aria-label','Vida do '+highlighted.type.name+': '+Math.ceil(100*highlighted.hp/Math.max(1,highlighted.max))+'%'); }
  ui.announcement.hidden = run.time >= run.notice;
}



function burst(x, y, color, count = 7) {
  for (let i = 0; i < count && run.particles.length < 160; i++) {
    const a = Math.random() * TAU;
    const speed = 24 + Math.random() * 94;
    run.particles.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: .25 + Math.random() * .34, color });
  }
}
function effect(kind, x, y, radius, color, extra = {}) {
  const life = kind === 'thunder' || kind === 'slash' ? .32 : .52;
  if(run.effects.length>=72)run.effects.splice(0,run.effects.length-60);
  run.effects.push({ kind, x, y, radius, color, life, max: life, ...extra });
}
function popup(x, y, text, color, size = 15) {
  if (run.numbers.length < 40) run.numbers.push({ x, y, life: .7, text, color, size });
}
// Chests now offer an actual choice: one out of three items, four for MVPs.
// A reward is only generated on opening, and only the selected item is saved.
function openChest(chest = { mvp: false }) {
  if (!run || mode !== 'play') return;
  combatNote('Aproxime-se do baú para escolher uma das melhorias.');
}

// Green improvement chests: choose one stat for one currently equipped item.

function nearestTo(player, range, prioritize = false) {
  if(prioritize){
    let best=null, score=Infinity;
    for(const enemy of run.mobs){
      if(enemy.hp<=0 || distance(player,enemy)>=range)continue;
      const priority=(enemy.riftSeal && run.rift?.ward)?0:(bosses[enemy.id] || enemy.specialBoss || enemy.riftBoss)?1:enemy.elite?2:3;
      const value=priority*100000+distance(player,enemy);
      if(value<score){score=value;best=enemy;}
    }
    return best;
  }
  let target;
  for (const enemy of run.mobs) {
    const gap = distance(player, enemy);
    if (enemy.hp > 0 && gap < range) {
      target = enemy;
      range = gap;
    }
  }
  return target;
}

function combatNote(message) {
  ui.note.textContent = message;
  run.noteUntil = run.time + 1.35;
  ui.note.hidden = false;
}
function collectCard(id) {
  const card = cardDb[id];
  if (!card) return;
  run.picked.push(card.name);
  // Rarity matters: never consume an extremely rare card on the first available
  // piece of gear. The player chooses the socket via Album / Equipment.
  addToAlbum(id);
  announce('CARTA RARA! '+ card.name + ' · guardada no álbum. Escolha o equipamento para encaixá-la.', 6);
  tone(660, 1320, .35, 'sine', .06);
}
function aim(x, y) {
  const p = run.player;
  if (x === p.x && y === p.y) return;
  p.dir = direction(x - p.x, y - p.y);
  if (x !== p.x) p.face = x < p.x ? -1 : 1;
}
function direction(x, y) {
  return (Math.round(Math.atan2(-x, y) / (Math.PI / 4)) + 8) % 8;
}








const shotLooks = { sonicwave: 'crescent', axeboom: 'axe', souldestroyer: 'dark', precise: 'bigarrow', aimed: 'bigarrow' };


const magicSupport = new Set(['heal', 'sanctuary', 'blessing', 'agiup', 'assumptio', 'praefatio']);
function useSkill(slot, pointerAim = false, automatic = false) {
  if(!run)return false;
  if(!automatic){run.coopSkill=slot;run.coopSkillSeq++;}
  return true;
}

/** Hit frames happen only after the visible attack contacts/releases, not on frame zero. */





// Labyrinth warps: step on one and you are sent to a random room of the maze.
/** V19 remote mode: client predicts only movement to reduce latency. All combat is calculated on server. */
function tickAuthoritative(dt){
 const p=run.player;
 // Online dungeon clock belongs to the server. Never accumulate each client's local frames.
 // Relógio contínuo do servidor (não para na fenda); o cronômetro da expedição usa mapStart.
 if(run.netOffset!=null)run.time=Math.max(run.time,serverNow());
 const {dx,dy}=onlineMoveIntent();
 // Movimento 100% local e imediato: o servidor só confirma (sem puxar o personagem de volta).
 if(p.hp>0&&run.serverSpawnSynced){const sp=run.serverMoveSpeed||run.hero.speed;movePlayer(p,dx*sp*dt,dy*sp*dt);p.walk=(dx||dy)?p.walk+dt*13:0;}
 else p.walk=0;
 if(Math.abs(dx)+Math.abs(dy)>.01)aim(p.x+dx,p.y+dy);
 if(run.pet){const x=p.x-22,y=p.y+30;run.pet.x+=(x-run.pet.x)*Math.min(1,dt*5);run.pet.y+=(y-run.pet.y)*Math.min(1,dt*5);}
 const renderAt=renderClock();
 for(const mob of run.mobs){
  const at=mob.samples?sampleAt(mob.samples,renderAt):null;
  if(at){mob.x=at.x;mob.y=at.y;if(Math.hypot(at.vx,at.vy)>14)mob.walkHold=performance.now()+160;}
  // Animação de andar com histerese: não pisca entre parado/andando a cada pacote.
  mob.walking=performance.now()<(mob.walkHold||0);
  mob.walkTick=mob.walking?(mob.walkTick||0)+dt*4.2:0;
 }
 run.onlineProjectiles=run.onlineProjectiles.filter(pr=>performance.now()-pr.at<pr.duration*1000);
 for(const fx of run.effects)fx.life-=dt;
 run.effects=run.effects.filter(fx=>fx.life>0);
 for(const n of run.numbers){n.life-=dt;n.y-=dt*25;}
 run.numbers=run.numbers.filter(n=>n.life>0);
 SkillFX.update(dt);
 if(!run.nextOnlineHudAt || performance.now()>=run.nextOnlineHudAt){
   updateHud();run.nextOnlineHudAt=performance.now()+120;
 }
}
function tick(dt) {
  if(run.local)LocalRoom.frame(run.localRoom,dt,packPlayer,receiveAuthoritativeWorld,()=>run.authorityEventSeq||0);
  tickAuthoritative(dt);
}

function mapNav() { return run.field.nav; }
function cellIndex(x, y) {
  const f = run.field;
  const col = Math.floor((x + f.w * f.cell / 2) / f.cell);
  const row = Math.floor((y + f.h * f.cell / 2) / f.cell);
  return col >= 0 && row >= 0 && col < f.w && row < f.h ? row * f.w + col : -1;
}
function cellCenter(index) {
  const f = run.field;
  return f.world(index % f.w, Math.floor(index / f.w));
}
function walkable(x, y) {
  return run?.inMvp ? Math.hypot(x, y) < MVP_ARENA_RADIUS - 12 : run.field.nav[cellIndex(x, y)] === 1;
}
function nearestWalkable(point) {
  const f = run.field;
  const start = cellIndex(point.x, point.y);
  if (start >= 0 && f.nav[start]) return cellCenter(start);
  const col = Math.floor((point.x + f.w * f.cell / 2) / f.cell);
  const row = Math.floor((point.y + f.h * f.cell / 2) / f.cell);
  for (let r = 1; r < 30; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    const x = col + dx, y = row + dy;
    if (x >= 0 && y >= 0 && x < f.w && y < f.h && f.nav[y * f.w + x]) return f.world(x, y);
  }
  return { x: f.spawn[0], y: f.spawn[1] };
}
const MAX_CELLS = 240 * 240;
const navigation = new Int32Array(MAX_CELLS);
const routeQueue = new Int32Array(MAX_CELLS);
const adjacent = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const mobFlow = new Int32Array(MAX_CELLS);
let nextFlow = 0;
function flood(start, edges, routes, stop) {
  routes.fill(-1);
  const nav = mapNav();
  if (start < 0) return;
  routeQueue[0] = start;
  routes[start] = start;
  let tail = 1;
  for (let head = 0; head < tail; head++) {
    const here = routeQueue[head];
    if (stop?.(here)) break;
    const x = here % run.field.w;
    const y = Math.floor(here / run.field.w);
    for (const [dx, dy] of adjacent) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < edges.left || nx > edges.right || ny < edges.top || ny > edges.bottom) continue;
      const next = ny * run.field.w + nx;
      if (routes[next] !== -1 || nav[next] !== 1) continue;
      routes[next] = here;
      routeQueue[tail++] = next;
    }
  }
}
function gridBox(a, b, padding) {
  const width = run.field.w;
  const x = index => index % width;
  const y = index => Math.floor(index / width);
  return {
    left: Math.max(0, Math.min(x(a), x(b)) - padding),
    right: Math.min(width - 1, Math.max(x(a), x(b)) + padding),
    top: Math.max(0, Math.min(y(a), y(b)) - padding),
    bottom: Math.min(run.field.h - 1, Math.max(y(a), y(b)) + padding),
  };
}
function pathTo(point) {
  if (run.inMvp) {
    const gap = Math.hypot(point.x, point.y);
    const scale = Math.min(1, (MVP_ARENA_RADIUS - 20) / Math.max(gap, 1));
    return [{ x: point.x * scale, y: point.y * scale }];
  }
  const start = cellIndex(run.player.x, run.player.y);
  const edge = run.field.w * run.field.cell / 2;
  const goal = cellIndex(clamp(point.x, -edge, edge - 1), clamp(point.y, -edge, edge - 1));
  if (start < 0 || goal < 0) return [];
  let best = start;
  let gap = distance(cellCenter(start), point);
  flood(start, gridBox(start, goal, 19), navigation, here => {
    const next = distance(cellCenter(here), point);
    if (next < gap) { best = here; gap = next; }
    if (here === goal) { best = goal; return true; }
    return false;
  });
  const route = [];
  for (let here = best; here !== start; here = navigation[here]) route.unshift(cellCenter(here));
  if (best === goal && walkable(point.x, point.y)) route.push(point);
  return route;
}
function movePlayer(player, dx, dy) {
  if (walkable(player.x + dx, player.y)) player.x += dx;
  if (walkable(player.x, player.y + dy)) player.y += dy;
}

function view() {
  const p = run.player;
  const { w, h } = viewport;
  const scale = w < 500 ? .74 : w < 850 ? .82 : .92;
  const vertical = scale * .73;
  return { left: p.x - w / (2 * scale), top: p.y - h / (2 * vertical),
    right: p.x + w / (2 * scale), bottom: p.y + h / (2 * vertical), scale, vertical };
}
function visible(object, bounds, pad = 60) {
  return object.x >= bounds.left - pad && object.x <= bounds.right + pad && object.y >= bounds.top - pad && object.y <= bounds.bottom + pad;
}
function screenPoint(event) {
  const bounds = view();
  return { x: bounds.left + event.clientX / bounds.scale, y: bounds.top + event.clientY / bounds.vertical };
}
let stonePattern;
let arenaFloorCache=null;
function arenaFloor(){
  const key=run.map+'|'+(Art.mvpFloor.complete&&Art.mvpFloor.naturalWidth?1:0);
  if(arenaFloorCache?.key===key)return arenaFloorCache.canvas;
  const R=MVP_ARENA_RADIUS,size=R*2+4,canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  const c=canvas.getContext('2d');c.translate(R+2,R+2);
  c.save();c.beginPath();c.arc(0,0,R,0,TAU);c.clip();
  c.fillStyle=(Art.mvpFloor.complete&&Art.mvpFloor.naturalWidth?c.createPattern(Art.mvpFloor,'repeat'):null)||'#777779';
  c.fillRect(-R,-R,R*2,R*2);
  c.fillStyle=run.map==='payon'?'#56234060':run.map==='sewer'?'#294d3d55':'#20213655';
  c.fillRect(-R,-R,R*2,R*2);c.restore();
  const circle=(r,color,width)=>{c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.arc(0,0,r,0,TAU);c.stroke();};
  circle(R-4,'#bf9f77',7);circle(R-18,'#292739',4);circle(60,'#beaa795c',2);circle(78,'#beaa795c',2);
  arenaFloorCache={key,canvas};return canvas;
}
function ground(bounds) {
  if (run.inMvp) {
    ctx.fillStyle = '#20212c';
    ctx.fillRect(bounds.left - 1, bounds.top - 1, bounds.right - bounds.left + 2, bounds.bottom - bounds.top + 2);
    // V22.1: o chão da arena (fenda/MVP) é desenhado UMA vez num canvas próprio. Antes, o padrão com
    // recorte circular era rasterizado a cada quadro e derrubava o FPS dentro da fenda.
    const floor=arenaFloor();
    if(floor)ctx.drawImage(floor,-MVP_ARENA_RADIUS-2,-MVP_ARENA_RADIUS-2,MVP_ARENA_RADIUS*2+4,MVP_ARENA_RADIUS*2+4);
    return;
  }
  run.field.renderer.draw(ctx, bounds);
  run.field.renderer.water(ctx, bounds, run.time);
}
function actorSprite(actor, action, frame, scale) {
  ctx.save();
  ctx.translate(actor.x, actor.y);
  ctx.scale(1, 1 / .73);
  Art.draw(ctx, actor.id ?? run.id, action, frame, 0, 0, scale);
  ctx.restore();
}
function drawProp(prop) {
  const w = 160 * prop.size;
  const h = 190 * prop.size / .73;
  const isFire = prop.type === 4 || prop.type === 6;
  if (isFire) {
    const radius = prop.type === 4 ? 78 : 61;
    const glow = ctx.createRadialGradient(prop.x, prop.y - 22, 0, prop.x, prop.y - 22, radius);
    glow.addColorStop(0, '#f4a95b61');
    glow.addColorStop(1, '#f4a95b00');
    ctx.fillStyle = glow;
    ctx.fillRect(prop.x - radius, prop.y - radius - 22, radius * 2, radius * 2);
  }
  Art.shadow(ctx, prop.x, prop.y, w * .24, 10 * prop.size);
  ctx.drawImage(Art.props, 160 * prop.type, 0, 160, 190, prop.x - w / 2, prop.y - h + 6, w, h);
}
function gemSprite(gem) {
  const { x, y } = gem;
  const lift = Math.sin(run.time * 7 + x) * 2;
  const wide = Math.min(7, 4 + gem.xp);
  Art.shadow(ctx, x, y + 1, 5, 2);
  ctx.fillStyle = '#81dfbe';
  ctx.beginPath();
  ctx.moveTo(x, y - 13 + lift);
  ctx.lineTo(x + wide, y - 7 + lift);
  ctx.lineTo(x, y - 2 + lift);
  ctx.lineTo(x - wide, y - 7 + lift);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#d1ffdc';
  ctx.fillRect(x - 1, y - 11 + lift, 2, 5);
}
function potionSprite(potion) {
  const { x, y } = potion;
  Art.shadow(ctx, x, y + 1, 7, 3);
  ctx.fillStyle = potion.sp ? '#2f4a86' : '#773b42';
  ctx.fillRect(x - 6, y - 12, 12, 12);
  ctx.fillStyle = potion.sp ? '#7fb2ff' : '#f28088';
  ctx.fillRect(x - 4, y - 10, 8, 8);
  ctx.fillStyle = '#efcea4';
  ctx.fillRect(x - 3, y - 16, 6, 4);
  ctx.fillStyle = '#ffd3c4';
  ctx.fillRect(x - 2, y - 9, 2, 4);
}
function drawWarp(warp) {
  const t = run.time * 2.2 + warp.phase;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  SkillFX.glow(ctx, warp.x, warp.y, 38, '#5aa8ff', .55);
  for (let i = 0; i < 3; i++) {
    const r = 6 + ((t * 10 + i * 8) % 24);
    ctx.globalAlpha = 1 - r / 32;
    ring(warp.x, warp.y, r, '#d6ecff', 1.8);
  }
  ctx.globalAlpha = .55;
  const beam = ctx.createLinearGradient(0, warp.y, 0, warp.y - 95);
  beam.addColorStop(0, '#bfe2ff'); beam.addColorStop(1, '#5aa8ff00');
  ctx.fillStyle = beam;
  ctx.fillRect(warp.x - 13, warp.y - 95, 26, 95);
  ctx.globalAlpha = 1;
  for (let i = 0; i < 5; i++) {
    const a = t * 1.7 + i * TAU / 5;
    const h = ((t * 22 + i * 19) % 80);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(warp.x + Math.cos(a) * 14 - 1, warp.y - h + Math.sin(a) * 5 - 1, 2.5, 2.5);
  }
  ctx.restore();
}
function drawCardDrop(drop, hovered) {
  const bob = Math.sin(run.time * 4 + drop.x) * 2;
  const icon = Cards.groundIcon(drop.id);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  SkillFX.glow(ctx, drop.x, drop.y - 6, 30, cardDb[drop.id].mvp ? '#ff9ab8' : '#ffe08a', .55 + .2 * Math.sin(run.time * 6));
  ctx.restore();
  Art.shadow(ctx, drop.x, drop.y + 1, 9, 3.5);
  ctx.save();
  ctx.translate(drop.x, drop.y - 10 + bob);
  ctx.scale(1, 1 / .73);
  ctx.drawImage(icon, -11, -21, 22, 28);
  const shine = (run.time * .9 + drop.x * .01) % 1;
  if (shine < .25) {
    ctx.globalAlpha = .7 * (1 - shine * 4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-11 + shine * 88, -21, 3, 28);
  }
  ctx.restore();
  if (hovered || distance(run.player, drop) < 140) {
    ctx.font = 'bold 11px system-ui';
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#1b1408';
    ctx.fillStyle = cardDb[drop.id].mvp ? '#ffb7cf' : '#ffe9a6';
    ctx.strokeText(cardDb[drop.id].name, drop.x, drop.y - 44);
    ctx.fillText(cardDb[drop.id].name, drop.x, drop.y - 44);
  }
}
function ring(x, y, radius, color, line) {
  ctx.strokeStyle = color;
  ctx.lineWidth = line;
  ctx.beginPath();
  ctx.arc(x, y, Math.max(radius, 1), 0, TAU);
  ctx.stroke();
}
function drawWarning(warning) {
  const progress = clamp((run.time - warning.since) / (warning.at - warning.since), 0, 1);
  const { x, y, radius, angle, kind } = warning;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#e64c5288';
  ctx.strokeStyle = '#ffce9a';
  ctx.lineWidth = 2.5;
  if (kind === 'line') {
    ctx.rotate(angle);
    ctx.fillRect(-65, -44, 715, 88);
    ctx.strokeRect(-65, -44, 715, 88);
    ctx.fillStyle = '#ff9a6577';
    ctx.fillRect(-65, -44, 715 * progress, 88);
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, TAU);
    if (kind === 'ring') ctx.arc(0, 0, radius - 95, 0, TAU, true);
    ctx.fill();
    ctx.stroke();
    if (kind === 'ring') ring(0, 0, radius - 95 + 95 * progress, '#ffddac', 3);
    else ring(0, 0, radius * progress, '#ffddac', 3);
  }
  ctx.restore();
}
// Kept as compatibility entry points for existing controls; MVP stays on the field.
function enterPortal(){run.coopRiftEnter=(run.coopRiftEnter||0)+1;}
/** V23.6: portais só com E. Diz qual portal está perto (o motor confere de novo antes de usar). */
function nearbyPortal(){
  if(!run||run.player.hp<=0)return null;
  const p=run.player;
  if(run.rift?.active)return run.portal&&distance(p,run.portal)<=110?'Sair da fenda':null;
  if(run.riftPortal&&!run.inMvp&&distance(p,run.riftPortal)<=150)return 'Entrar na fenda';
  if(run.map==='maze'&&!run.mazeEvent?.active&&(run.field?.warps||[]).some(w=>Math.hypot(w.x-p.x,w.y-p.y)<44))return 'Usar o portal';
  return null;
}
function drawPortal(portal) {
  const pulse = (1 + Math.sin(run.time * 6)) / 2;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.shadowColor = '#b588ff';
  ctx.shadowBlur = 22;
  ring(portal.x, portal.y, 27 + pulse * 7, '#dcb3ff', 4);
  ring(portal.x, portal.y, 42 - pulse * 6, '#896aff', 2);
  const beam = ctx.createLinearGradient(portal.x, portal.y, portal.x, portal.y - 120);
  beam.addColorStop(0, '#dbaaff9c'); beam.addColorStop(1, '#8d66fc00');
  ctx.fillStyle = beam;
  ctx.fillRect(portal.x - 15, portal.y - 120, 30, 120);
  ctx.restore();
}
function drawEffect(fx) {
  const progress = 1 - fx.life / fx.max;
  ctx.save();
  ctx.globalAlpha = 1 - progress;
  ctx.globalCompositeOperation = 'lighter';
  if (fx.kind !== 'slash' && fx.kind !== 'beam') {
    const radius = Math.max(28, fx.radius * 1.55);
    const glow = ctx.createRadialGradient(fx.x, fx.y, 0, fx.x, fx.y, radius);
    glow.addColorStop(0, fx.color + 'a0');
    glow.addColorStop(.48, fx.color + '35');
    glow.addColorStop(1, fx.color + '00');
    ctx.fillStyle = glow;
    ctx.fillRect(fx.x - radius, fx.y - radius, radius * 2, radius * 2);
  }
  if (fx.kind === 'beam') {
    ctx.translate(fx.x, fx.y);
    ctx.rotate(fx.angle);
    const width = 35 * (1 - progress * .65);
    const glow = ctx.createLinearGradient(0, 0, fx.radius, 0);
    glow.addColorStop(0, '#fff4c5');
    glow.addColorStop(.35, fx.color);
    glow.addColorStop(1, fx.color + '00');
    ctx.fillStyle = glow;
    ctx.fillRect(0, -width / 2, fx.radius, width);
  } else if (fx.kind === 'slash') {
    const radius = fx.radius * (.58 + progress * .36);
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = ['#c37b48', fx.color, '#fff3cc'][i];
      ctx.lineWidth = [11, 5, 2][i];
      ctx.beginPath();
      ctx.arc(fx.x, fx.y - 8, radius - i * 3, fx.angle - 1.12 + progress * .8, fx.angle + 1.1 + progress * .8);
      ctx.stroke();
    }
  } else if (fx.kind === 'thunder') {
    ctx.strokeStyle = fx.color;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(fx.x + 20, fx.y - 165);
    ctx.lineTo(fx.x - 11, fx.y - 78);
    ctx.lineTo(fx.x + 13, fx.y - 68);
    ctx.lineTo(fx.x, fx.y - 10);
    ctx.stroke();
    ring(fx.x, fx.y, 13 + 17 * progress, '#eee4ff', 2);
  } else if (fx.kind === 'shower') {
    ring(fx.x, fx.y, fx.radius, fx.color, 2);
    for (let i = 0; i < 11; i++) {
      const angle = i * 2.399;
      const radius = fx.radius * Math.sqrt(i / 11);
      const x = fx.x + Math.cos(angle) * radius;
      const y = fx.y + Math.sin(angle) * radius - 96 * (1 - progress);
      ctx.strokeStyle = fx.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x + 6, y - 22);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  } else if (fx.kind === 'fire') {
    ctx.fillStyle = '#df773b77';
    ctx.beginPath();
    ctx.arc(fx.x, fx.y, fx.radius * (.46 + progress * .54), 0, TAU);
    ctx.fill();
    ring(fx.x, fx.y, fx.radius * (.5 + progress * .52), fx.color, 5);
    for (let i = 0; i < 5; i++) {
      const x = fx.x + (i - 2) * 15;
      const height = (30 + Math.sin(i * 17) * 13) * (1 - progress * .6);
      ctx.fillStyle = i % 2 ? '#ffbe66' : '#fff0a3';
      ctx.fillRect(x, fx.y - height, 4, height);
    }
  } else {
    ring(fx.x, fx.y, fx.radius * (.28 + progress * .72), fx.color, 6 - progress * 3);
    ring(fx.x, fx.y, fx.radius * (.16 + progress * .64), fx.color, 2);
    if (fx.kind === 'frost' || fx.kind === 'blast') {
      ctx.globalAlpha *= .32;
      ctx.fillStyle = fx.color;
      ctx.beginPath();
      ctx.arc(fx.x, fx.y, fx.radius * (.5 + progress * .5), 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

const minimap = $('minimap');
const mapCtx = minimap.getContext('2d');
let mapAt = -1;
function drawMinimap() {
  if (minimap.hidden) return;
  if (mapAt >= 0 && run.time >= mapAt && run.time - mapAt < .10) return;
  mapAt = run.time;
  const w = minimap.width;
  const h = minimap.height;
  if (run.inMvp) {
    mapCtx.fillStyle = '#292737';
    mapCtx.fillRect(0, 0, w, h);
    mapCtx.fillStyle = '#7e7779';
    mapCtx.beginPath();
    mapCtx.arc(w / 2, h / 2, h / 2 - 4, 0, TAU);
    mapCtx.fill();
  } else {
    mapCtx.imageSmoothingEnabled = false;
    mapCtx.drawImage(run.field.minimap, 0, 0, w, h);
  }
  const span = run.inMvp ? MVP_ARENA_RADIUS * 2.2 : run.field.size;
  const mark = (object, color, size) => {
    mapCtx.fillStyle = color;
    mapCtx.fillRect(w * (.5 + object.x / span) - size / 2, h * (.5 + object.y / span) - size / 2, size, size);
  };
  for (const mob of run.mobs) mark(mob, (!!bosses[mob.id] || mob.specialBoss) ? '#ff4d64' : mob.elite ? '#ffd45b' : '#cc6b5799', (!!bosses[mob.id] || mob.specialBoss) ? 6 : mob.elite ? 4 : 2);
  if (run.portal) mark(run.portal, '#ec9dff', 6);
  if(run.riftPortal && !run.inMvp){
   if(visible(run.riftPortal,view()))run.riftPortal.discovered=true;
   if(run.riftPortal.discovered){const p=run.riftPortal,mx=w*(.5+p.x/span),my=h*(.5+p.y/span);mark(p,'#182032',12);mark(p,'#8feaff',8);mapCtx.strokeStyle='#fff';mapCtx.strokeRect(mx-7,my-7,14,14);mapCtx.fillStyle='#fff';mapCtx.font='bold 10px Tahoma';mapCtx.fillText('FENDA',Math.min(w-39,Math.max(1,mx+10)),Math.max(12,my));}
  }
  if(run.contract?.node && !run.contract.done && !run.inMvp)mark(run.contract.node,'#efd59e',4);
  if (run.field.warps && !run.inMvp) for (const warp of run.field.warps) mark(warp, '#7fc4ff', 3);
  for (const drop of run.cardDrops) mark(drop, '#ffd65a', 4);
  if (!run.inMvp) for (const chest of run.chests) if(!run.claimedChests.has(chest.uid))mark(chest,chest.mvp?'#ffd65a':chest.kind==='upgrade'?'#7fffb8':'#7fb2ff',4);
  if (!run.inMvp) for (const coin of run.goldDrops) mark(coin,'#eeb848',2);
  for (const member of run.party) if (member.input.arena === run.inMvp) mark(member.input, '#85dcff', 4);
  mark(run.player, '#12283e', 8);
  mark(run.player, '#e2fbff', 5);
}

const remoteAppearance=new Map();
function renderRemote(member){
  // V22.1: interpolação entre snapshots do servidor (~100 ms atrás), sem efeito elástico.
  const input=member.input,now=performance.now();
  let visual=remoteAppearance.get(member.id);
  if(!visual){visual={};remoteAppearance.set(member.id,visual);}
  const entry=remoteSamples.get(member.id);
  let at=null;
  if(entry){
    const t=now/1000,dt=Math.min(.1,Math.max(0,t-(entry.lagAt||t)));entry.lagAt=t;
    if(entry.mode==='ct'){
      // Atraso de exibição muda devagar (sobe até 30%/s, desce até 5%/s): o colega nunca acelera nem freia por causa da rede.
      entry.off+=Math.max(-.05*dt,Math.min(.3*dt,entry.offTarget-entry.off));
      at=sampleAt(entry.list,t-entry.off);
    }else{
      const diff=(entry.lagTarget??entry.lag??0)-(entry.lag||0);
      entry.lag=(entry.lag||0)+Math.max(-.05*dt,Math.min(.3*dt,diff));
      if(run.renderClock!=null)at=sampleAt(entry.list,run.renderClock-(entry.lag||0));
    }
  }
  const x=at?at.x:input.x,y=at?at.y:input.y;
  if(input.attack && Number.isFinite(input.animSeq) && visual.animSeq!==input.animSeq){
    visual.animSeq=input.animSeq;visual.animStart=now-(input.animProgress||0)*(input.animDuration||.5)*1000;
    visual.animDuration=input.animDuration||.5;
    visual.animKind=input.animKind;visual.animType=input.animType;visual.animSkill=input.animSkill;
  }
  const progress=visual.animStart!=null?(now-visual.animStart)/(visual.animDuration*1000):2;
  const animating=progress>=0&&progress<1;
  const moving=at?Math.hypot(at.vx,at.vy)>14:!!input.walk;
  if(moving)visual.walkHold=now+160;
  return {...input,x,y,walk:now<(visual.walkHold||0)?1:0,attack:animating,
    animKind:animating?visual.animKind:'',animType:visual.animType,animSkill:visual.animSkill,
    animProgress:animating?progress:0};
}
function draw() {
  const bounds = view();
  // Base fixa a cada quadro: se algum efeito deixar o canvas desbalanceado, o próximo quadro se recupera sozinho.
  if(viewport?.w&&viewport?.h)ctx.setTransform(canvas.width/viewport.w,0,0,canvas.height/viewport.h,0,0);
  ctx.save();
  ctx.scale(bounds.scale, bounds.vertical);
  ctx.translate(-bounds.left, -bounds.top);
  ground(bounds);
  if (moveTarget) {
    ring(moveTarget.x, moveTarget.y, 11, '#edffd5', 1.7);
    ring(moveTarget.x, moveTarget.y, 15, '#769337', 1.8);
  }
  const hovered = cursor && nearestTo(cursor, 42);
  if (hovered) ring(hovered.x, hovered.y, hovered.type.r + 6, '#ffd7a4', 1.8);
  if (run.field.warps && !run.inMvp) for (const warp of run.field.warps) if (visible(warp, bounds)) drawWarp(warp);
  for (const gem of run.gems) if (visible(gem, bounds)) gemSprite(gem);
  for(const coin of run.goldDrops) if(visible(coin,bounds)){
    ctx.save();ctx.fillStyle='#efb943';ctx.strokeStyle='#7a501a';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.ellipse(coin.x,coin.y-3,7,5,0,0,TAU);ctx.fill();ctx.stroke();
    ctx.fillStyle='#fff4b2';ctx.fillRect(coin.x-1,coin.y-5,2,4);ctx.restore();
  }
  for (const drop of run.cardDrops) if (visible(drop, bounds)) drawCardDrop(drop, cursor && distance(cursor, drop) < 30);
  for (const chest of run.chests) if(!run.claimedChests.has(chest.uid)&&visible(chest, bounds)){
    if(!RunRelics.drawPickup(chest))Gear.drawChest(ctx,chest.x,chest.y,run.time,!!chest.mvp || ['elite','maze'].includes(chest.kind));
    if(chest.kind==='upgrade'){ctx.save();ctx.fillStyle='#b6f6a1';ctx.font='bold 15px system-ui';ctx.textAlign='center';ctx.fillText('✦',chest.x,chest.y-17);ctx.restore();}
  }
  for (const item of run.potions) if (visible(item, bounds)) potionSprite(item);
  if(run.authoritative)for(const [uid,x,y,rad,el,type] of run.onlineZones||[]){
    // Áreas persistentes (Barreira de Fogo, Nevasca, Santuário…) e armadilhas no chão.
    const color=EL_COLORS[el]||(type===2?'#b3ffcc':'#f6dcaa'),pulse=.5+.5*Math.sin(run.time*5+uid);
    ctx.save();
    if(type===1){ring(x,y,13+pulse*2,color,2);ctx.fillStyle=color;ctx.font='bold 12px Tahoma';ctx.textAlign='center';ctx.fillText('✕',x,y+4);}
    else{ctx.globalAlpha=.13+pulse*.06;ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,rad,0,TAU);ctx.fill();ctx.globalAlpha=.75;ring(x,y,rad,color,2);}
    ctx.restore();
  }
  if(run.authoritative)for(const proj of run.onlineProjectiles||[]){
    const t=clamp((performance.now()-proj.at)/(proj.duration*1000),0,1);
    const x=proj.x+(proj.toX-proj.x)*t,y=proj.y+(proj.toY-proj.y)*t;
    const color=skillColor(proj.skill);
    ctx.save();ctx.globalCompositeOperation='lighter';ctx.fillStyle=color;ctx.strokeStyle='#20273f';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.arc(x,y,proj.skill==='arrows'?4:8,0,TAU);ctx.fill();ctx.stroke();
    ctx.globalAlpha=.55;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-(proj.toX-proj.x)*.06,y-(proj.toY-proj.y)*.06);ctx.strokeStyle=color;ctx.lineWidth=4;ctx.stroke();ctx.restore();
  }
  if (run.portal) drawPortal(run.portal);
  RuneAugments.draw();
  ExpeditionQuest.draw();
  EliteRifts.draw();
  for(const mob of run.mobs){if(mob===run.boss||mob.hp<=0)continue;if(mob.warning)drawWarning(mob.warning);if(mob.strike?.until>run.time){ctx.save();ctx.globalAlpha=.35;drawWarning(mob.strike);ctx.restore();}}
  if (run.boss?.warning) drawWarning(run.boss.warning);
  if (run.boss?.strike?.until > run.time) {
    ctx.save();
    ctx.globalAlpha = (run.boss.strike.until - run.time) * 2;
    drawWarning(run.boss.strike);
    ctx.restore();
  }
  const actors = [
    ...(run.inMvp ? [] : run.field.props.filter(prop => visible(prop, bounds, 265))),
    ...run.mobs.filter(enemy => visible(enemy, bounds)),
    ...run.party.filter(member => member.input.arena === run.inMvp && visible(member.input, bounds)).map(member => ({
      ...renderRemote(member), id: member.profile.job, name: member.profile.name, ally: true,
    })),
    run.player,
  ].sort((a, b) => a.y - b.y);
  for (const actor of actors) {
    if (actor.scenery) {
      drawProp(actor);
    } else if (actor.ally) {
      Art.shadow(ctx, actor.x, actor.y, 15, 8);
      ctx.globalAlpha = actor.hp > 0 ? 1 : .45;
      const remote=CombatAnimations.remotePose(actor,actor.id);
      const remoteAction=remote?.action ?? ((actor.walk ? 8 : 0) + actor.dir);
      // Parado = quadro 0 (os 3 quadros "idle" do RO são direções da cabeça, não uma animação).
      const remoteFrame=remote?.frame ?? (actor.walk ? run.time*12 : 0);
      SHOW_WEAPON_OVERLAY&&WeaponVisual.draw(ctx,actor,actor.weapon,run.time,.90,remote,'back');
      actorSprite(actor,remoteAction,remoteFrame,.90);
      SHOW_WEAPON_OVERLAY&&WeaponVisual.draw(ctx,actor,actor.weapon,run.time,.90,remote,'front');
      CombatV17.draw(ctx,actor,remote,run.time,.90);
      ctx.globalAlpha = 1;
      if(actor.hp<=0){ctx.save();ctx.textAlign='center';ctx.font='bold 23px Georgia';ctx.lineWidth=3;ctx.strokeStyle='#260f18';ctx.fillStyle='#ffd6d6';ctx.strokeText('✝',actor.x,actor.y-57);ctx.fillText('✝',actor.x,actor.y-57);ctx.restore();}
      ctx.textAlign = 'center';
      ctx.font = 'bold 12px system-ui';
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#162834';
      ctx.fillStyle = '#d0f2ff';
      ctx.strokeText(actor.name, actor.x, actor.y + 20);
      ctx.fillText(actor.name, actor.x, actor.y + 20);
    } else if (actor === run.player) {
      Art.shadow(ctx, actor.x, actor.y, 15, 8);
      if (actor.buff > run.time) ring(actor.x, actor.y, 19, '#fff0b2', 2);
      ctx.globalAlpha = actor.immunity && Math.floor(run.time * 19) % 2 ? .48 : 1;
      const action = (actor.walk ? 8 : 0) + actor.dir;
      const motion=CombatAnimations.pose(actor,run.authoritative ? performance.now()/1000 : run.time,run.id,action,actor.walk||0);
      SHOW_WEAPON_OVERLAY&&WeaponVisual.draw(ctx,actor,run.gear?.weapon?.id || run.serverWeapon,run.time,.92,motion,'back');
      actorSprite(actor,motion.action,motion.frame,.92);
      SHOW_WEAPON_OVERLAY&&WeaponVisual.draw(ctx,actor,run.gear?.weapon?.id || run.serverWeapon,run.time,.92,motion,'front');
      CombatV17.draw(ctx,actor,motion,run.time,.92);
      CombatV17.reaction(ctx,actor,run.time,.92);
      ctx.globalAlpha = 1;
      if(run.authoritative && actor.hp<=0){
        ctx.save();ctx.textAlign='center';ctx.font='900 21px Georgia';ctx.lineWidth=4;
        ctx.strokeStyle='#190b14';ctx.fillStyle='#fff0cd';ctx.strokeText('✝ CAÍDO',actor.x,actor.y-55);
        ctx.fillText('✝ CAÍDO',actor.x,actor.y-55);ctx.restore();
      }
      ctx.fillStyle = '#25321c';
      ctx.fillRect(actor.x - 13, actor.y + 8, 26, 4);
      ctx.fillStyle = '#b3de67';
      ctx.fillRect(actor.x - 12, actor.y + 9, 24 * actor.hp / (run.authoritative ? (run.authoritativeMaxHp||maxHp()):maxHp()), 2);
    } else {
      const enemy = actor;
      if(enemy.riftSeal){ring(enemy.x,enemy.y,23,'#a8e5ff',3);ctx.save();ctx.fillStyle='#e7faff';ctx.font='bold 22px serif';ctx.textAlign='center';ctx.fillText('ᛟ',enemy.x,enemy.y+7);ctx.restore();continue;}
      Art.shadow(ctx, enemy.x, enemy.y, enemy.type.r * 1.23, enemy.type.r * .57);
      if(enemy.ailment)ring(enemy.x,enemy.y,enemy.type.r+3,enemy.ailment===2?'#bfeaff':'#bce37f',enemy.ailment===2?2.5:1.5);
      // V22.1: sem ctx.filter (CSS filter no canvas é caríssimo e derrubava o FPS na fenda/MVP).
      // O "brilho" de acerto é uma segunda passada aditiva do mesmo sprite.
      const spriteScale=enemy.guildTrial ? 1.23 : enemy.specialBoss ? 1.65 : enemy.elite === 'miniBoss' ? 1.39 : enemy.elite ? 1.18 : (!!bosses[enemy.id] ? 1.12 : .82);
      const striking=run.authoritative&&enemy.attackStart&&performance.now()-enemy.attackStart<420;
      const spriteAction=striking?16+enemy.dir:(enemy.warning ? 16 : (enemy.walking ? 8 : 0)) + enemy.dir;
      const spriteFrame=striking?Math.floor((performance.now()-enemy.attackStart)/420*CombatAnimations.frames(enemy.id,16+enemy.dir)):enemy.slow ? 0 : enemy.walking?(enemy.walkTick||0)*3+enemy.phase:run.time*6+enemy.phase;
      actorSprite(enemy,spriteAction,spriteFrame,spriteScale);
      const glow=(enemy.hit > 0 && (enemy.elite||bosses[enemy.id])) ? .42 : (enemy.slow && (enemy.elite||bosses[enemy.id])) ? .22 : 0;
      if(glow){ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=glow;actorSprite(enemy,spriteAction,spriteFrame,spriteScale);ctx.restore();}
      if(enemy.guildTrial){ring(enemy.x,enemy.y,enemy.type.r+12,'#f6cf77',3);ctx.save();ctx.textAlign='center';ctx.font='900 12px system-ui';ctx.lineWidth=4;ctx.strokeStyle='#111722';ctx.fillStyle='#fff2bb';ctx.strokeText(enemy.guildTrial.name,enemy.x,enemy.y-62);ctx.fillText(enemy.guildTrial.name,enemy.x,enemy.y-62);ctx.restore();}
      if (enemy.elite || enemy.guildTrial || enemy.riftBoss) {
        ring(enemy.x, enemy.y, enemy.type.r + 9 + Math.sin(run.time * 3) * 2, enemy.specialBoss ? '#d8b2ff' : enemy.elite==='miniBoss'?'#ffb36b':'#f4d96b', enemy.specialBoss ? 3 : 2);
        ctx.save();ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#111829';ctx.fillStyle='#fff5d1';
        ctx.strokeText(enemy.type.name,enemy.x,enemy.y-enemy.type.r-31);ctx.fillText(enemy.type.name,enemy.x,enemy.y-enemy.type.r-31);
        const barWidth=enemy.guildTrial||enemy.elite==='miniBoss'||enemy.riftBoss?90:66;const bx=enemy.x-barWidth/2,by=enemy.y-enemy.type.r-25;ctx.fillStyle='#0d1820';ctx.fillRect(bx-2,by-2,barWidth+4,12);ctx.fillStyle='#70232e';ctx.fillRect(bx,by,barWidth,8);ctx.fillStyle=enemy.specialBoss||enemy.riftBoss?'#b686ff':enemy.elite==='miniBoss'||enemy.guildTrial?'#ffb36b':'#f3d75e';ctx.fillRect(bx,by,barWidth*Math.max(0,enemy.hp/Math.max(1,enemy.max)),8);ctx.strokeStyle='#fbdfb2';ctx.lineWidth=1;ctx.strokeRect(bx-.5,by-.5,barWidth+1,9);ctx.fillStyle='#fff';ctx.font='bold 8px Tahoma';ctx.textBaseline='middle';ctx.strokeStyle='#0a1018';ctx.lineWidth=2.5;const percent=Math.ceil(100*enemy.hp/Math.max(1,enemy.max))+'%';ctx.strokeText(percent,enemy.x,by+4.5);ctx.fillText(percent,enemy.x,by+4.5);ctx.restore();
      }
      // Thin temporary health bar for ordinary mobs: no screen-filling UI clutter.
      if(!enemy.elite && !bosses[enemy.id] && enemy.max>0 && enemy.hp<enemy.max && run.time-(enemy.lastDamaged||-999)<2.4){
        const frac=clamp(enemy.hp/enemy.max,0,1),bw=31,bx=enemy.x-bw/2,by=enemy.y-enemy.type.r-19;
        ctx.save();ctx.globalAlpha=Math.min(.86,(2.4-(run.time-enemy.lastDamaged))/.75);
        ctx.fillStyle='#151d25';ctx.fillRect(bx-1,by-1,bw+2,5);
        ctx.fillStyle=frac>.5?'#72d98a':frac>.25?'#f3c166':'#e97977';ctx.fillRect(bx,by,bw*frac,3);ctx.restore();
      }
      if(enemy.uid===run.focusUid){ctx.save();ctx.fillStyle='#f1e5c0';ctx.font='bold 10px Tahoma';ctx.textAlign='center';ctx.fillText(Elemental.info(enemy.id),enemy.x,enemy.y+enemy.type.r+17);ctx.restore();}
      if (enemy.mark > run.time) ring(enemy.x, enemy.y, 15, '#eeb16e', 1.7);
    }
  }
  if(run.castPending){
    const p=run.player,casting=run.castPending;
    const duration=Math.max(.1,casting.end-casting.start),pr=clamp((run.time-casting.start)/duration,0,1);
    ctx.save();ctx.translate(p.x,p.y+1);ctx.scale(1,1.37);ctx.rotate(run.time*.65);
    ctx.strokeStyle=casting.skill.color;ctx.globalAlpha=.28+.52*pr;ctx.lineWidth=2.5;
    for(const rad of [20,28,36]) {ctx.beginPath();ctx.arc(0,0,rad,0,TAU);ctx.stroke();}
    for(let i=0;i<8;i++){const a=i*TAU/8;ctx.save();ctx.translate(Math.cos(a)*30,Math.sin(a)*30);ctx.rotate(a);ctx.strokeRect(-3,-3,6,6);ctx.restore();}
    ctx.rotate(-run.time*1.3);ctx.beginPath();for(let i=0;i<6;i++){let a=i*TAU/6;ctx.lineTo(Math.cos(a)*26,Math.sin(a)*26);}ctx.closePath();ctx.stroke();ctx.restore();
    // Layered, pixel-edged Renewal-inspired cast seal: eight spark glyphs + rotating rune diamonds.
    ctx.save();ctx.translate(p.x,p.y);ctx.scale(1,1.37);ctx.globalAlpha=.5+.5*pr;
    const color=casting.skill.color||'#9cecff';ctx.strokeStyle='#10162f';ctx.lineWidth=5;
    ctx.beginPath();ctx.arc(0,0,43,0,TAU);ctx.stroke();ctx.strokeStyle=color;ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(0,0,43,0,TAU);ctx.stroke();
    ctx.strokeStyle='#ffffff';ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(0,0,37,0,TAU);ctx.stroke();
    for(let i=0;i<8;i++){const a=i*TAU/8+run.time*.9;const x=Math.cos(a)*43,y=Math.sin(a)*43;
      ctx.fillStyle='#112139';ctx.fillRect(Math.floor(x)-5,Math.floor(y)-5,10,10);
      ctx.strokeStyle=i%2?'#fff8d0':color;ctx.strokeRect(Math.floor(x)-4,Math.floor(y)-4,8,8);
      ctx.fillStyle='#fffef6';ctx.fillRect(Math.floor(x)-1,Math.floor(y)-1,2,2);}
    ctx.restore();
  }
  if(run.shout?.at>run.time){
    const p=run.player,remain=run.shout.at-run.time;
    ctx.save();ctx.textAlign='center';ctx.font='900 16px system-ui';
    const text=run.shout.name+'!',width=Math.min(240,Math.max(106,ctx.measureText(text).width+32));
    ctx.globalAlpha=Math.min(1,remain*2);
    ctx.fillStyle='#0b1324f5';ctx.strokeStyle='#ffdf94';ctx.lineWidth=2.5;
    ctx.beginPath();ctx.roundRect(p.x-width/2,p.y-98,width,31,5);ctx.fill();ctx.stroke();
    ctx.fillStyle='#fffdf0';ctx.strokeStyle='#090d1c';ctx.lineWidth=4;ctx.lineJoin='round';
    ctx.strokeText(text,p.x,p.y-77);ctx.fillText(text,p.x,p.y-77);
    ctx.restore();
  }
  if(run.pet)Codex.drawPet(ctx,run.pet.x,run.pet.y,run.time,run.pet.id);
  for (const zone of run.zones) {
    if (zone.kind) {
      ctx.save();
      if (zone.kind === 'trap') {
        ctx.fillStyle = '#3d3a35';
        ctx.beginPath(); ctx.ellipse(zone.x, zone.y, 11, 7, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = Math.floor(run.time * 4) % 2 ? '#ff5a3c' : '#7a2418';
        ctx.beginPath(); ctx.arc(zone.x, zone.y - 2, 3, 0, TAU); ctx.fill();
      } else if (zone.kind !== 'zone' || !zone.skill) {
        ctx.globalAlpha = .63 + .2 * Math.sin(run.time * 12);
        ring(zone.x, zone.y, zone.radius, zone.color, 2.8);
        ring(zone.x, zone.y, zone.radius * .86, zone.color, 1.4);
      }
      ctx.restore();
      continue;
    }
    for (let index = -3; index <= 3; index++) {
      const gap = index * zone.length / 3;
      const x = zone.x + gap * Math.cos(zone.angle);
      const y = zone.y + gap * Math.sin(zone.angle);
      const lift = 30 + Math.sin(run.time * 14 + index) * 8;
      SkillFX.glow(ctx, x, y - 10, 22, '#ff8a3a', .5);
      SkillFX.flame(ctx, x, y, lift, 9, run.time + index, .95);
    }
  }
  for (const shot of run.shots) if (shot.delay <= 0) SkillFX.drawShot(ctx, shot, run.time);
  for (const fx of run.effects) drawEffect(fx);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  SkillFX.draw(ctx, run.time);
  ctx.restore();
  for (const particle of run.particles) {
    ctx.globalAlpha = Math.min(1, particle.life * 2.8);
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x, particle.y - 8, 3, 3);
  }
  ctx.font = 'bold 17px system-ui';
  ctx.textAlign = 'center';
  ctx.lineWidth = 3;
  for (const number of run.numbers) {
    ctx.globalAlpha = Math.min(1, number.life * 3);
    const size = number.crit ? 21 : number.size ?? 17;
    ctx.font = 'bold ' + size + 'px system-ui';
    ctx.strokeStyle = '#263327';
    ctx.fillStyle = number.color ?? (number.crit ? '#ffe45a' : '#fff1c9');
    const label = number.text ?? number.amount;
    if (number.crit) SkillFX.glow(ctx, number.x, number.y - 6, 22, '#ffcf4a', .45 * ctx.globalAlpha);
    ctx.strokeText(label, number.x, number.y);
    ctx.fillText(label, number.x, number.y);
  }
  ctx.restore();
  drawMinimap();
  const { w, h } = viewport;
  const vignette = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .17, w / 2, h / 2, Math.max(w, h) * .64);
  vignette.addColorStop(0, '#0a120000');
  vignette.addColorStop(1, '#282d1330');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
}

let frameFaults=0;
function frame(now) {
  try {
    let dt = lastFrame ? Math.min(.055, Math.max(0,(now - lastFrame) / 1000)) : 0;
    lastFrame = now;
    // Only simulate up to 3 steps, so slow frames do not trigger a death spiral.
    for(let i=0;i<3 && dt>.0001 && mode==='play';i++){
      const step=Math.min(.024,dt);tick(step);dt-=step;
    }
    if(mode!=='menu' && run)draw();
    frameFaults=0;
  } catch(error) {
    console.error('[Midgard] Falha durante o frame:',error);
    if(++frameFaults>=2){
      const diagnostic=$('game-diagnostic');
      diagnostic.hidden=false;
      diagnostic.textContent='A expedição encontrou um erro. Pressione ESC e volte ao menu. Detalhes: '+String(error?.message||error).slice(0,150);
      mode='pause';
    }
  } finally { requestAnimationFrame(frame); }
}

function clearPointer() {
  activePointer = undefined;
  ui.joy.hidden = true;
  if (run) run.touch = { x: 0, y: 0 };
}
canvas.addEventListener('pointerleave', () => { cursor = undefined; });
canvas.addEventListener('pointerdown', event => {
  if (mode !== 'play') return;
  if (event.pointerType === 'mouse') {
    if (event.button === 0) {
      cursor = screenPoint(event);
      moveRoute = pathTo(cursor);
      moveTarget = moveRoute.at(-1);
    }
    return;
  }
  if (activePointer) return;
  moveTarget = undefined;
  moveRoute = [];
  const { clientX: x, clientY: y, pointerId: id } = event;
  activePointer = { id, x, y };
  canvas.setPointerCapture(id);
  ui.joy.style.left = x + 'px';
  ui.joy.style.top = y + 'px';
  ui.joy.firstElementChild.style.transform = '';
  ui.joy.hidden = false;
});
canvas.addEventListener('pointermove', event => {
  if (mode !== 'play') return;
  if (event.pointerType === 'mouse') { cursor = screenPoint(event); return; }
  if (event.pointerId !== activePointer?.id) return;
  const x = event.clientX - activePointer.x;
  const y = event.clientY - activePointer.y;
  const radius = Math.max(37, Math.hypot(x, y));
  run.touch = { x: x / radius, y: y / radius };
  ui.joy.firstElementChild.style.transform = 'translate(' + run.touch.x * 30 + 'px,' + run.touch.y * 30 + 'px)';
});
for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(name, event => {
  if (event.pointerId === activePointer?.id) clearPointer();
});
// Configurable actions; WASD and arrow keys must never open panels.
window.addEventListener('keydown', event => {
  if (Controls.isOpen()) return;
  const target=document.activeElement;
  if (target?.isContentEditable || ['INPUT','TEXTAREA','SELECT'].includes(target?.tagName)) return;
  const raw = event.key.toLowerCase();
  const move = Controls.moveKey(event);
  if (move && mode === 'play') {
    event.preventDefault();
    keys.add(move);
    return;
  }
  if (Controls.matches(event,'pause') && !event.repeat && (mode === 'play' || mode === 'pause')) {
    event.preventDefault(); pause(); return;
  }
  if ((mode === 'play' || mode === 'pause') && !event.repeat) {
    const actions={
      inventory:openInventory,
      cards:openAlbum,
      codex:()=>openCatalogue('codex'),
      pets:()=>openCatalogue('pets'),
      stats:()=>ROClientWindows.open('stats'),
      equipment:()=>ROClientWindows.open('equipment'),
    };
    for(const [name,fn] of Object.entries(actions)){
      if(Controls.matches(event,name)){
        event.preventDefault(); fn(); return;
      }
    }
  }
  if (mode === 'play' && !event.repeat && Controls.matches(event,'portal') && nearbyPortal()) {
    event.preventDefault(); enterPortal(); return;
  }
  if (mode === 'play' && !run.auto && /^f?[1-5]$/.test(raw)) {
    event.preventDefault(); if(!event.repeat)useSkill(Number(raw.at(-1)),true);return;
  }
  if (raw==='tab' && !ui.dialog.hidden && mode !== 'menu') {
    const buttons=Array.from(ui.actions.querySelectorAll('button'));
    if(event.shiftKey&&document.activeElement===buttons[0]){event.preventDefault();buttons.at(-1)?.focus();}
    else if(!event.shiftKey&&document.activeElement===buttons.at(-1)){event.preventDefault();buttons[0]?.focus();}
  }
});
window.addEventListener('keyup', event=>{
  const move=Controls.moveKey(event);
  if(move)keys.delete(move);
});
// V24.1: trocar de aba ou de janela NÃO pausa mais (só o Esc pausa). As teclas são soltas para o herói não andar sozinho.
window.addEventListener('blur', () => { keys.clear(); clearPointer?.(); });
document.addEventListener('visibilitychange', () => { keys.clear(); lastFrame = 0; backgroundTicker(document.hidden); });
/* Com a aba escondida o navegador para o requestAnimationFrame; no solo, um relógio num Worker (que o navegador não
   congela como os timers da página) continua avançando a partida a ~20 passos/s. O online roda no servidor. */
let bgWorker = null, bgLast = 0;
function backgroundTicker(on) {
  if (!on) { bgWorker?.postMessage('stop'); return; }
  try {
    if (!bgWorker) {
      const src = 'let t=0;onmessage=e=>{clearInterval(t);if(e.data==="start")t=setInterval(()=>postMessage(0),50);};';
      bgWorker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
      bgWorker.onmessage = () => {
        if (!document.hidden || mode !== 'play' || !run?.local) { bgLast = 0; return; }
        const now = performance.now();
        let dt = bgLast ? Math.min(.25, Math.max(0, (now - bgLast) / 1000)) : .05; bgLast = now;
        try { while (dt > .0001 && mode === 'play') { const step = Math.min(.024, dt); tick(step); dt -= step; } }
        catch (error) { console.error('[Midgard] Falha no passo em segundo plano:', error); }
      };
    }
    bgLast = 0; bgWorker.postMessage('start');
  } catch (error) { console.warn('[Midgard] Sem relógio em segundo plano:', error); }
}
window.addEventListener('resize', resize);
$('minimap-toggle').addEventListener('click', () => {
  const toggle = $('minimap-toggle');
  const map = $('minimap');
  map.hidden = !map.hidden;
  toggle.textContent = map.hidden ? '+' : '−';
  toggle.setAttribute('aria-expanded', String(!map.hidden));
  toggle.setAttribute('aria-label', map.hidden ? 'Expandir minimapa' : 'Recolher minimapa');
});
$('portal-button').addEventListener('click', enterPortal);

// Saved item inventory: visible from lobby and in a run; cards remain modifiers of equipment.
let inventoryCategory = 'all';
let gearFromInventory = false;
function compareEquipment(item,line,inGame=false){
  const journey=inGame ? run.journey : journeyOf(line);
  const hero=jobs[jobLines[line][journey.stage]] || jobs[line];
  const gear={...(inGame?run.gear:gearOf(journey))};
  const slot=Gear.slotFor(item,gear),current=gear[slot];
  if(current?.uid===item.uid)return {kind:'equal',title:'Equipado',details:'Este item já está em uso.'};
  const origin=RO.derive(hero,journey,Gear.bonuses(gear));
  gear[slot]=item;
  const simulated=RO.derive(hero,journey,Gear.bonuses(gear));
  const values=[['ATK',n=>n.statusAtk+n.weapon],['MATK',n=>n.statusMatk+n.weaponMatk],['DEF',n=>n.softDef+n.hardDef],['MDEF',n=>n.softMdef+n.hardMdef],['FLEE',n=>n.flee],['CRIT',n=>n.crit],['HP',n=>n.hpMul*100]];
  const differences=values.map(([name,fn])=>[name,Math.round(fn(simulated)-fn(origin))]).filter(([_,val])=>val!==0);
  // A hybrid/class-aware score is an aid, not a definitive ranking for every build.
  const useMagic=hero.family==='mage'||hero.family==='acolyte'||hero.basic==='magic';
  const weight={ATK:useMagic?.3:1.4,MATK:useMagic?1.5:.3,DEF:.8,MDEF:.6,FLEE:.28,CRIT:.7,HP:.2};
  const total=differences.reduce((s,[name,v])=>s+v*weight[name],0);
  const kind=total>2?'good':total< -2?'bad':'equal';
  return {kind,title:current?(kind==='good'?'▲ Tendência: melhor':kind==='bad'?'▼ Tendência: pior':'≈ Semelhante'):'◇ Espaço vazio',
    details:current?'Comparado a '+Gear.label(current):'Sem item equipando este espaço',
    changes:differences.slice(0,6).map(([name,val])=>name+' '+(val>0?'+':'')+val).join(' · ')||'Sem alteração de atributos principais'};
}
function openInventory() {
  const dialog = $('inventory-dialog');
  if (!dialog) return;
  const inGame = !!run && mode !== 'menu' && mode !== 'ended';
  if (inGame) { if (mode !== 'inventory') run.inventoryPreviousMode = mode; mode = 'inventory'; }
  function render() {
    const categories = [['services','Forja & Zeny'],['compatible','Minha classe'],['run','Itens de run'],['all', 'Tudo'], ['weapon', 'Armas'], ['armor', 'Armaduras'], ['shield', 'Escudos'],
      ['garment', 'Capas'], ['shoes', 'Botas'], ['headgear', 'Chapéus'], ['accessory', 'Acessórios'], ['cards', 'Cartas']];
    $('inventory-tabs').replaceChildren(...categories.map(([id, title]) => {
      const tab = button(title, inventoryCategory === id ? 'active' : '', () => { inventoryCategory = id; render(); });
      tab.setAttribute('aria-pressed', String(inventoryCategory === id));
      return tab;
    }));
    let source = items().filter(item => inventoryCategory === 'compatible' ? Gear.canEquip(item.id,inGame?run.line:selected,inGame?run.journey.stage:journeyOf(selected).stage) : inventoryCategory === 'all' || inventoryCategory === itemDb[item.id].type);
    let tierFilter=$('inventory-tier-filter');
    if(!tierFilter){const box=document.createElement('label');box.className='tier-filter-label';box.textContent='Tier: ';tierFilter=document.createElement('select');tierFilter.id='inventory-tier-filter';tierFilter.setAttribute('aria-label','Filtrar tier');for(const [value,text]of [['0','Todos · melhores primeiro'],['1','T1 · Comum'],['2','T2 · Incomum'],['3','T3 · Raro'],['4','T4 · Épico']])tierFilter.add(new Option(text,value));box.append(tierFilter);$('inventory-tabs').after(box);}
    tierFilter.onchange=render;tierFilter.parentElement.hidden=['run','cards','services'].includes(inventoryCategory);
    source=source.filter(it=>!Number(tierFilter.value)||itemDb[it.id].tier===Number(tierFilter.value)).sort((a,b)=>itemDb[b.id].tier-itemDb[a.id].tier||(b.refine||0)-(a.refine||0));
    const extras=disposableItems(), proceeds=extras.reduce((sum,item)=>sum+resaleValue(item),0);
    const liquidate=$('inventory-sell-extras');
    liquidate.textContent='Vender sobras ('+extras.length+') · '+proceeds+' z';
    liquidate.disabled=!extras.length;
    liquidate.onclick=()=>{if(sellDisposables())render();};
    const list = $('inventory-list');
    $('inventory-summary').textContent = items().length + ' equipamentos guardados · ' + Object.values(album()).reduce((sum, n) => sum + n, 0) + ' cartas livres · Zeny ' + ZenyServices.balance().toLocaleString('pt-BR');
    list.replaceChildren();list.classList.toggle('run-item-grid',inventoryCategory==='run');
    if (inventoryCategory === 'services'){ZenyServices.render(list,render);
    } else if (inventoryCategory === 'run') {
      RunRelics.renderInventory(list,render);
  RuneLoot.renderInventory(list);
    } else if (inventoryCategory === 'cards') {
      for (const [id, quantity] of Object.entries(album()).filter(([id, qty]) => qty > 0 && cardDb[id])) {
        const row = document.createElement('article');
        row.className = 'inventory-item';
        const copy = document.createElement('div');
        copy.innerHTML = '<strong>' + cardDb[id].name + ' ×' + quantity + '</strong><small>' + cardSlots[cardDb[id].slot].name + '</small><p>' + cardDb[id].text + '</p>';
        row.append(Cards.art(id, 58, 80), copy); list.append(row);
      }
    } else {
      for (const item of source) {
        const def = itemDb[item.id], owner = equippedBy(item.uid);
        const row = document.createElement('article');
        row.className = 'inventory-item'; row.dataset.tier = def.tier;
        const detail = document.createElement('div');
        const title = document.createElement('strong'); title.textContent = Gear.label(item);
        const meta = document.createElement('small'); meta.textContent = 'T'+def.tier+' · '+ItemQuality.tiers[def.tier].name + ' · ' + (owner ? 'Equipado · ' + jobs[jobLines[owner.line][journeyOf(owner.line).stage]].name : 'No inventário');
        const desc = document.createElement('p'); desc.textContent = ItemQuality.describe(item);
        const cards = document.createElement('div'); cards.className = 'inventory-card-buffs';
        for (let slot = 0; slot < def.slots; slot++) {
          const id = item.cards?.[slot];
          const pill = document.createElement('span');
          pill.textContent = id ? '🃏 ' + cardDb[id].name + ': ' + cardDb[id].text : '◇ Encaixe vazio';
          cards.append(pill);
        }
        detail.append(title, meta, ItemQuality.list(item), cards);
        const currentLine=inGame ? run.line : selected;
        const currentStage=inGame ? run.journey.stage : journeyOf(currentLine).stage;
        if(Gear.canEquip(item.id,currentLine,currentStage)){
          const comparison=compareEquipment(item,currentLine,inGame),box=document.createElement('div');
          box.className='inventory-compare '+comparison.kind;
          const badge=document.createElement('strong');badge.textContent=comparison.title;
          const explanation=document.createElement('span');explanation.textContent=comparison.details;
          const changes=document.createElement('span');changes.textContent=comparison.changes||'';
          box.append(badge,explanation,changes);detail.append(box);
        }
        const actions = document.createElement('div'); actions.className = 'inventory-item-actions';
        if (Gear.canEquip(item.id, currentLine, currentStage) && !owner) {
          actions.append(button('Equipar', 'sound', () => {
            const last = selected;
            selected = currentLine;
            const gear = inGame ? run.gear : gearOf(journeyOf(currentLine));
            const slot = Gear.slotFor(item, gear);
            const block = (slot === 'shield' && itemDb[gear.weapon?.id]?.twoHanded);
            if (!block) {
              equipItem(slot, item.uid);
              if (inGame) {
                run.journey = journeyOf(currentLine);
                run.gear = JSON.parse(JSON.stringify(gearOf(run.journey)));
                refreshStatus();
              }
            }
            selected = last;
            render();
            if (!inGame) renderJourney();
          }));
        }
        if (owner && owner.line === currentLine) actions.append(button('Ver encaixes', 'sound', () => {
          gearFromInventory = true;
          $('inventory-dialog').close();
          selected = currentLine;
          openGearDialog(owner.slot);
        }));
        // V25.4: qualquer item (equipado ou guardado) pode devolver as cartas ao álbum direto do inventário.
        if (item.cards?.length) actions.append(button('Remover cartas · '+item.cards.length, 'sound', () => {
          if (removeCards(item.uid)) { render(); if (!inGame) renderJourney(); }
        }));
        if (!owner) actions.append(button('Vender · '+resaleValue(item)+' z', 'sell-item', () => {
          if (sellStored(item.uid)) {render();if(!inGame)renderJourney();}
        }));
        row.append(Gear.sprite(item.id), detail, actions); list.append(row);
      }
    }
    if (!list.children.length) {
      const empty = document.createElement('p'); empty.className = 'inventory-empty'; empty.textContent = 'Nada por aqui ainda. Explore mapas e abra baús para encontrar equipamentos.'; list.append(empty);
    }
  }
  render();
  if (!dialog.open) dialog.showModal();
}
function closeInventory() {
  const dialog = $('inventory-dialog');
  if (dialog.open) dialog.close();
  if (run && mode === 'inventory') { mode = ['play','chest'].includes(run.inventoryPreviousMode) ? run.inventoryPreviousMode : 'pause'; canvas.focus({ preventScroll: true }); }
}
// The Codex and pet stable open in both menu and expedition; adventure time pauses locally.
function codexSkillIcon(id,found){
  const img=document.createElement('img');img.className='codex-icon';
  img.src='assets/ro/skill-'+id+'.png';img.alt=found?'Ícone de '+id:'Silhueta da habilidade';
  img.onerror=()=>{img.onerror=null;img.src='assets/ro/skill-mastery.png';img.classList.add('codex-icon--fallback');};
  return img;
}
function openCatalogue(kind){
  const dialog=$(kind==='codex'?'codex-dialog':'pets-dialog');
  if(kind==='codex'){
    const found=saved.codexFound||{};
    $('codex-summary').textContent='Evoluções descobertas: '+Object.keys(found).length+'/'+(Object.keys(Codex.recipes).length+RuneCombos.recipes.length)+' · Pontos disponíveis: '+(saved.codexCoins||0)+' · Evolução inédita: 240 pontos · Sequência inédita: 120 pontos.';
    $('codex-list').replaceChildren(...Object.entries(Codex.recipes).map(([id,r])=>{
      const item=document.createElement('article');item.className='catalogue-card'+(found[id]?' found':' locked');
      item.dataset.family=Object.values(jobs).find(j=>j.tree?.some(s=>s.id===r.skill))?.family||'';item.dataset.role='equipment';
      const title=document.createElement('strong');title.textContent=r.name+(found[id]?' · Descoberta':' · Não descoberta');
      const visuals=document.createElement('div');visuals.className='codex-recipe-icons';
      const skillIcon=codexSkillIcon(r.skill,!!found[id]);
      const gearIcon=Gear.sprite(r.item);gearIcon.classList.add('codex-icon');gearIcon.alt=found[id]?'Equipamento '+itemDb[r.item].name:'Silhueta de um equipamento';
      gearIcon.addEventListener('error',()=>{gearIcon.src='assets/items/'+r.item+'.png';},{once:true});
      const plus=document.createElement('span');plus.className='codex-plus';plus.textContent='+';
      visuals.append(skillIcon,plus,gearIcon);
      const subtitle=document.createElement('p');subtitle.textContent=found[id]?r.description+' · Bônus: '+Object.entries(r.bonus).map(([k,v])=>k+' +'+v).join(', '):r.description+' · Habilidade Nv. 2 e equipamento equipado';
      item.append(visuals,title,subtitle);return item;
    }));
    for(const r of RuneCombos.recipes){
      const card=document.createElement('article');card.className='catalogue-card '+(found[r.id]?'found':'locked');card.dataset.family=r.family;card.dataset.role=r.role;
      const name=id=>Object.values(jobs).flatMap(j=>j.tree||[]).find(s=>s.id===id)?.name||id;
      const title=document.createElement('strong');title.textContent=r.name+' · '+(r.role==='boss'?'Caça-MVP':'Limpeza de hordas');
      const detail=document.createElement('p');detail.textContent=name(r.first)+' → '+name(r.second)+' · ambas Nv. 2 · executar em até 6s · recarga 10s. '+(r.role==='boss'?'Dano extra de 65% em um elite/MVP.':'Dano extra de 38% em até 5 inimigos num raio de 145.')+' '+(found[r.id]?'Descoberta.':'Primeira descoberta: +120 Códex.');
      const visuals=document.createElement('div');visuals.className='codex-recipe-icons';
      const first=codexSkillIcon(r.first,!!found[r.id]),second=codexSkillIcon(r.second,!!found[r.id]);
      const arrow=document.createElement('span');arrow.className='codex-plus';arrow.textContent='+';
      visuals.append(first,arrow,second);card.append(visuals,title,detail);$('codex-list').append(card);
    }
    let filters=$('codex-filters');if(!filters){filters=document.createElement('div');filters.id='codex-filters';$('codex-summary').after(filters);}filters.replaceChildren();
    const family=document.createElement('select');family.setAttribute('aria-label','Filtrar classe');
    const role=document.createElement('select');role.setAttribute('aria-label','Filtrar combinação');
    for(const [value,label] of [['','Todas as classes'],...Object.keys(jobLines).map(id=>[id,jobs[id].name])])family.add(new Option(label,value));
    for(const [value,label] of [['','Todas as combinações'],['boss','Caça-MVP'],['wave','Limpeza de hordas'],['equipment','Habilidade + equipamento']])role.add(new Option(label,value));
    const filter=()=>{for(const card of $('codex-list').children)card.hidden=!!((family.value && card.dataset.family!==family.value)||(role.value && card.dataset.role!==role.value));};
    family.onchange=role.onchange=filter;filters.append(family,role,button('Bestiário','',openBestiary));
  }else{
    const rerender=()=>{dialog.close();openCatalogue('pets');};
    $('pets-summary').textContent='Pontos do Códex: '+(saved.codexCoins||0)+' · Pet ativo: '+(Codex.pets[saved.activePet]?.name||'Nenhum')+' · Pets não recebem dano.';
    $('pets-list').replaceChildren(...Object.entries(Codex.pets).map(([id,p])=>{
      const owned=!!saved.petsOwned?.[id],active=saved.activePet===id;
      const item=document.createElement('article');item.className='catalogue-card';
      const head=document.createElement('strong');head.textContent='🐾 '+p.name;
      const desc=document.createElement('p');desc.textContent=p.desc;
      const art=Codex.petImage(id);let picture=null;
      if(art){picture=document.createElement('img');picture.className='pet-portrait';picture.src=art;picture.alt=p.name;picture.loading='lazy';const f=Codex.petImageFilter(id);if(f)picture.style.filter=f;}
      const buy=button(active?'Equipado':owned?'Equipar':p.price+' pontos','sound',()=>{
        if(owned)persist({activePet:id});else{const change=Codex.buyPet(saved,id);if(change)persist(change);}
        if(run&&mode!=='menu'){run.pet=saved.petsOwned?.[saved.activePet]?{id:saved.activePet,x:run.player.x+22,y:run.player.y+22}:null;refreshStatus();}
        rerender();
      });buy.disabled=active||(!owned&&(saved.codexCoins||0)<p.price);
      item.append(...(picture?[picture]:[]),head,desc,buy);return item;
    }));
    const enabled=!!saved.petsOwned?.[saved.activePet];
    $('pet-upgrades-list').replaceChildren(...Object.entries(Codex.upgrades).map(([id,u])=>{
      const level=saved.petUpgrades?.[id]||0, cost=u.price*Math.pow(2,level);
      const item=document.createElement('article');item.className='catalogue-card';
      const head=document.createElement('strong');head.textContent=u.name+' · '+level+'/'+u.max;
      const desc=document.createElement('p');desc.textContent=u.desc;
      const buy=button(level===u.max?'Máximo':cost+' pontos','sound',()=>{const update=Codex.buyUpgrade(saved,id);if(update)persist(update);if(update&&run&&mode!=='menu')refreshStatus();rerender();});
      buy.disabled=!enabled||level===u.max||(saved.codexCoins||0)<cost;
      item.append(head,desc,buy);return item;
    }));
  }
  // Só pausa a run depois que a janela foi montada: um erro aqui não deixa o jogo preso sem janela.
  if(run&&mode==='play'){run.cataloguePreviousMode='play';mode='catalogue';}
  if(!dialog.open)dialog.showModal();
}
/** V23.6: tabela de recordes (melhor partida de cada conta, solo e online). */
async function openScores(){
  let dialog=$('scores-dialog');
  if(!dialog){
    dialog=document.createElement('dialog');dialog.id='scores-dialog';dialog.className='ro-window scores-dialog';
    dialog.innerHTML='<div class="ro-title"><span>Recordes</span><button type="button" class="sound" id="scores-close">Fechar ✕</button></div><div class="scores-tabs" role="tablist"></div><div class="scores-body" aria-live="polite"></div>';
    document.body.append(dialog);
    $('scores-close').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('close',()=>{if(run&&mode==='catalogue'){mode=run.cataloguePreviousMode||'play';canvas.focus({preventScroll:true});}});
  }
  const body=dialog.querySelector('.scores-body'),tabs=dialog.querySelector('.scores-tabs');
  body.textContent='Carregando…';
  if(!dialog.open)dialog.showModal();
  if(run&&mode==='play'){run.cataloguePreviousMode='play';mode='catalogue';}
  let data;
  try{const r=await fetch('/api/account/scores',{cache:'no-store'});data=await r.json();if(!r.ok)throw new Error();}
  catch{body.textContent='Não foi possível carregar os recordes. O servidor online está aberto?';return;}
  const lineName=id=>jobs[id]?.name||id,mapName=id=>expeditions[id]?.name||id,diffName=id=>RunDifficulty.get(id)?.name||id;
  const views={
    level:{label:'Maior nível de run',cols:['#','Jogador','Nível','Abates','Classe','Mapa','Modo'],row:(r,i)=>[i+1,r.nickname,r.level,r.kills,lineName(r.line),mapName(r.map)+' · '+diffName(r.difficulty),r.mode==='online'?'Online':'Solo']},
    kills:{label:'Mais abates',cols:['#','Jogador','Abates','Nível','Classe','Mapa','Modo'],row:(r,i)=>[i+1,r.nickname,r.kills,r.level,lineName(r.line),mapName(r.map)+' · '+diffName(r.difficulty),r.mode==='online'?'Online':'Solo']},
    wins:{label:'Vitórias',cols:['#','Jogador','Vitórias','Partidas','Melhor nível'],row:(r,i)=>[i+1,r.nickname,r.wins,r.runs,r.level]},
  };
  const show=key=>{
    for(const b of tabs.children)b.setAttribute('aria-selected',String(b.dataset.key===key));
    const rows=data[key]||[];
    if(!rows.length){body.textContent='Ainda não há recordes. Termine uma partida logado na sua conta para aparecer aqui.';return;}
    const table=document.createElement('table');table.className='scores-table';
    const head=document.createElement('tr');for(const c of views[key].cols){const th=document.createElement('th');th.textContent=c;head.append(th);}
    table.append(head);
    rows.forEach((r,i)=>{const tr=document.createElement('tr');for(const v of views[key].row(r,i)){const td=document.createElement('td');td.textContent=v;tr.append(td);}table.append(tr);});
    body.replaceChildren(table);
  };
  tabs.replaceChildren(...Object.entries(views).map(([key,v])=>{const b=document.createElement('button');b.type='button';b.className='sound';b.dataset.key=key;b.setAttribute('role','tab');b.textContent=v.label;b.onclick=()=>show(key);return b;}));
  show('level');
}
function closeCatalogue(kind){const dialog=$(kind==='codex'?'codex-dialog':'pets-dialog');if(dialog.open)dialog.close();
  if(run&&mode==='catalogue'){mode=run.cataloguePreviousMode||'play';canvas.focus({preventScroll:true});}
}
for(const [kind,menuId,runId,closeId] of [['codex','menu-codex','run-codex','codex-close'],['pets','menu-pets','run-pets','pets-close']]){
  $(menuId).addEventListener('click',()=>openCatalogue(kind));
  $(runId).addEventListener('click',()=>openCatalogue(kind));
  $(closeId).addEventListener('click',()=>closeCatalogue(kind));
  const dialog=$(kind==='codex'?'codex-dialog':'pets-dialog');
  dialog.addEventListener('cancel',e=>{e.preventDefault();closeCatalogue(kind);});
}
$('menu-inventory').addEventListener('click', openInventory);
$('menu-cards').addEventListener('click', openAlbum);
$('run-cards').addEventListener('click', openAlbum);
$('nav-inventory').addEventListener('click', openInventory);
$('nav-cards').addEventListener('click', openAlbum);
$('nav-codex').addEventListener('click', () => openCatalogue('codex'));
$('nav-pets').addEventListener('click', () => openCatalogue('pets'));
$('nav-scores')?.addEventListener('click', openScores);
$('nav-online').addEventListener('click', () => { const panel=$('coop-panel'); if(panel.hidden) $('coop-toggle').click(); panel.scrollIntoView({behavior:'smooth',block:'center'}); });
$('run-inventory').addEventListener('click', openInventory);
$('run-build-button').addEventListener('click',openInventory);
$('inventory-close').addEventListener('click', closeInventory);
$('inventory-dialog').addEventListener('cancel', event => { event.preventDefault(); closeInventory(); });
$('card-back-to-inventory').addEventListener('click',()=>{
  $('card-dialog').close();
  gearFromInventory=false;
  if(run && mode==='inventory') mode=run.inventoryPreviousMode||'play';
  openInventory();
});
$('card-dialog').addEventListener('close',()=>{
  const nested=gearFromInventory;
  gearFromInventory=false;
  if(run && mode==='inventory' && !$('inventory-dialog').open){
    mode=run.inventoryPreviousMode||'play';canvas.focus({preventScroll:true});
  }
});
// Clique na área escurecida encerra apenas menus opcionais, nunca uma escolha de baú ou nível.
const outsideClosers={
  'inventory-dialog':()=>closeInventory(),
  'card-dialog':()=>$('card-dialog').close(),
  'codex-dialog':()=>closeCatalogue('codex'),
  'pets-dialog':()=>closeCatalogue('pets'),
  'character-dialog':()=>$('character-dialog').close(),
  'rebirth-dialog':()=>$('rebirth-dialog').close(),
};
for(const [id,close] of Object.entries(outsideClosers)){
  const dialog=$(id);
  dialog?.addEventListener('pointerdown',event=>{
    if(event.target!==dialog)return;
    const rect=dialog.getBoundingClientRect();
    if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)close();
  });
}
ui.dialog.addEventListener('pointerdown',event=>{
  if(event.target===ui.dialog&&['pause','tree'].includes(mode))resume();
});
$('difficulty').value = selectedDifficulty;
$('difficulty').addEventListener('change', () => {
  selectedDifficulty=Campaign.validDifficulty(saved,selected,$('difficulty').value);
  persist({difficulty:selectedDifficulty});
  updateDifficultyOptions();
});
updateDifficultyOptions();

let assetsReady = false;
$('start').disabled = true;
const startLabel = $('start').innerHTML;
$('start').textContent = 'Carregando o mapa…';
Art.ready().then(() => {
  assetsReady = true;
  $('start').disabled = false;
  Coop.refresh();
  $('start').innerHTML = startLabel;
}, () => { $('start').textContent = 'Recarregue para tentar de novo'; });
$('start').addEventListener('click', start);
$('pause').addEventListener('click', pause);
$('menu-sound').addEventListener('click', toggleSound);
$('menu-theme').addEventListener('click', toggleTheme);
$('game-theme').addEventListener('click', toggleTheme);
applyTheme(document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');
$('game-sound').addEventListener('click', toggleSound);
$('menu-bgm-source').addEventListener('click',()=>BGM.toggleOriginal());
$('bgm-volume').addEventListener('input',event=>BGM.changeVolume(event.currentTarget.value));
$('game-music-volume').addEventListener('input',event=>BGM.changeVolume(event.currentTarget.value));
$('menu-music-play').addEventListener('click',()=>BGM.toggleMusic());
$('game-music-play').addEventListener('click',()=>BGM.toggleMusic());
$('menu-track').addEventListener('change',event=>BGM.setMenuTrack(event.target.value));
$('menu-music-launch').addEventListener('click',()=>{const box=$('menu-music-popover');box.hidden=!box.hidden;$('menu-music-launch').setAttribute('aria-expanded',String(!box.hidden));});
$('music-popover-close').addEventListener('click',()=>{$('menu-music-popover').hidden=true;$('menu-music-launch').setAttribute('aria-expanded','false');});
/* V24.1: o ♫ do painel de música da partida abre os mesmos ajustes do menu (faixa, volume, arquivos).
   Arrastar o ♫ continua movendo o painel; só um clique (sem arrastar) abre/fecha os ajustes. */
(()=>{
 const caption=document.querySelector('#game-music-panel .ro-music-game-caption'),box=$('menu-music-popover');
 if(!caption||!box)return;
 const home=box.parentElement,homeNext=box.nextSibling;let down=null;
 caption.setAttribute('role','button');caption.setAttribute('tabindex','0');caption.setAttribute('aria-controls','menu-music-popover');
 caption.title='Clique para abrir os ajustes de música · arraste para mover o painel';
 const dock=()=>{box.classList.remove('in-game');box.style.left=box.style.top=box.style.right='';if(box.parentElement!==home)home.insertBefore(box,homeNext);};
 const toggle=()=>{
  if(!box.hidden&&box.classList.contains('in-game')){box.hidden=true;dock();return;}
  document.body.append(box);box.classList.add('in-game');box.hidden=false;
  const r=$('game-music-panel').getBoundingClientRect(),w=box.offsetWidth,h=box.offsetHeight;
  box.style.left=Math.max(8,Math.min(innerWidth-w-8,r.left))+'px';
  box.style.top=Math.max(8,r.bottom+8+h>innerHeight?r.top-h-8:r.bottom+8)+'px';box.style.right='auto';
 };
 caption.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};});
 caption.addEventListener('click',e=>{if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>5){down=null;return;}down=null;toggle();});
 caption.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle();}});
 $('music-popover-close').addEventListener('click',dock);
 const observer=new MutationObserver(()=>{if(mode==='menu'&&box.classList.contains('in-game')){box.hidden=true;dock();}});
 observer.observe(document.getElementById('menu'),{attributes:true,attributeFilter:['hidden','class','style']});
})();
$('menu-music-file').addEventListener('change',event=>{
  const file=event.currentTarget.files?.[0];
  if(!file)return;
  if(!BGM.setMenuFile(file))alert('Selecione um MP3 ou OGG de até 45 MB.');
});
renderMenu();
// Browsers normally block autoplay until the first interaction. The song is queued from startup,
// then enabled after a user gesture while still in the menu.
BGM.enter('menu',!muted);
const unlockMenuMusic=()=>{if(mode==='menu'&&!muted&&!BGM.debug().playing)BGM.enter('menu',true);};
document.addEventListener('pointerdown',unlockMenuMusic,{passive:true});
document.addEventListener('keydown',unlockMenuMusic,{passive:true});
Coop.init();
requestAnimationFrame(frame);

// V23.6: aviso de versão nova. O servidor reinicia sozinho ao ser atualizado; quem está com a página antiga é avisado.
(() => {
  let first = null, shown = false;
  const check = () => fetch('/api/version', { cache: 'no-store' }).then(r => r.json()).then(v => {
    if (!v?.patch) return;
    if (first === null) { first = v.patch; return; }
    if (v.patch === first || shown) return;
    shown = true;
    const bar = document.createElement('div'); bar.id = 'update-bar'; bar.setAttribute('role', 'status');
    const text = document.createElement('span'); text.textContent = 'Nova versão do jogo disponível. Recarregue a página (F5) quando terminar a partida.';
    const reload = document.createElement('button'); reload.type = 'button'; reload.className = 'sound'; reload.textContent = 'Recarregar';
    reload.addEventListener('click', () => { if (mode === 'menu' || confirm('Recarregar agora encerra a partida atual. Continuar?')) location.reload(); });
    bar.append(text, reload); document.body.append(bar);
  }).catch(() => {});
  if (location.protocol.startsWith('http')) { check(); setInterval(check, 45000); }
})();

// V24.2: presença — avisa o servidor a cada 20 s que o jogo está aberto (menu, solo ou online).
// Serve só para o painel do administrador (admin.html). Sem dados pessoais além do apelido da conta logada.
(() => {
  if (!/^https?:$/.test(location.protocol)) return;
  let id = '';
  try { id = sessionStorage.getItem('rag-presence') || ''; if (!id) { id = (crypto.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36)); sessionStorage.setItem('rag-presence', id); } }
  catch { id = Math.random().toString(36).slice(2) + Date.now().toString(36); }
  const ping = () => {
    const playing = mode === 'play' || mode === 'pause' || mode === 'ended';
    const state = !playing ? 'menu' : mode === 'ended' ? 'ended' : run?.coop ? 'online' : mode === 'pause' ? 'pause' : 'solo';
    const body = { id, mode: state };
    if (playing && run) Object.assign(body, { map: run.map, line: run.line, difficulty: run.difficulty, level: run.level });
    fetch('/api/presence', { method: 'POST', credentials: 'same-origin', cache: 'no-store', keepalive: true,
      headers: { 'Content-Type': 'application/json', 'X-Midgard-Request': '1' }, body: JSON.stringify(body) }).catch(() => {});
  };
  setTimeout(ping, 1500); setInterval(ping, 20000);
})();
