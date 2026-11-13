'use strict';

// Equipment found in chests. Names, slots ([n]) and class restrictions follow classic Ragnarok
// Online items; ATK/DEF values are the classic ones, rounded where the versions differ.
const CHEST_DROP_RATE = .0035;

const gearSlots = {
  weapon: { name: 'Arma', type: 'weapon' },
  armor: { name: 'Armadura', type: 'armor' },
  shield: { name: 'Escudo', type: 'shield' },
  garment: { name: 'Capa', type: 'garment' },
  shoes: { name: 'Calçado', type: 'shoes' },
  headgear: { name: 'Chapéu', type: 'headgear' },
  accessory1: { name: 'Acessório 1', type: 'accessory' },
  accessory2: { name: 'Acessório 2', type: 'accessory' },
};
const lineNames = { sword: 'Espadachim', mage: 'Mago', archer: 'Arqueiro', acolyte: 'Noviço', merchant: 'Mercador', thief: 'Gatuno' };

const weaponItem = (name, kind, atk, slots, tier, classes, extra = {}) => ({ name, type: 'weapon', kind, atk, slots, tier, classes, ...extra });
const armorItem = (name, type, def, slots, tier, classes = null, extra = {}) => ({ name, type, def, slots, tier, classes, ...extra });
const itemDb = {
  // Daggers: almost every class can use them.
  knife: weaponItem('Faca', 'Adaga', 17, 3, 1, ['sword', 'mage', 'merchant', 'thief', 'archer']),
  cutter: weaponItem('Cortador', 'Adaga', 30, 3, 1, ['sword', 'mage', 'merchant', 'thief', 'archer']),
  maingauche: weaponItem('Main Gauche', 'Adaga', 43, 3, 2, ['sword', 'mage', 'merchant', 'thief', 'archer']),
  dirk: weaponItem('Punhal', 'Adaga', 59, 2, 2, ['sword', 'merchant', 'thief']),
  dagger: weaponItem('Adaga', 'Adaga', 73, 2, 3, ['sword', 'merchant', 'thief']),
  gladius: weaponItem('Gládio', 'Adaga', 105, 1, 4, ['sword', 'merchant', 'thief']),
  jur: weaponItem('Jur', 'Katar', 125, 2, 3, ['thief'], { katar: true, twoHanded: true }),
  katar: weaponItem('Katar', 'Katar', 148, 1, 4, ['thief'], { katar: true, twoHanded: true }),
  // Swords.
  sword: weaponItem('Espada', 'Espada', 25, 3, 1, ['sword', 'merchant', 'thief']),
  falchion: weaponItem('Falcione', 'Espada', 39, 3, 1, ['sword', 'merchant', 'thief']),
  blade: weaponItem('Lâmina', 'Espada', 53, 3, 2, ['sword', 'merchant', 'thief']),
  rapier: weaponItem('Florete', 'Espada', 70, 2, 2, ['sword', 'merchant', 'thief']),
  scimitar: weaponItem('Cimitarra', 'Espada', 85, 2, 3, ['sword', 'merchant']),
  tsurugi: weaponItem('Tsurugi', 'Espada', 130, 1, 4, ['sword', 'merchant']),
  claymore: weaponItem('Claymore', 'Espada de duas mãos', 180, 0, 4, ['sword'], { twoHanded: true }),
  // Rods and staves.
  rod: weaponItem('Vara', 'Cajado', 15, 3, 1, ['mage', 'acolyte'], { matk: 15 }),
  wand: weaponItem('Varinha', 'Cajado', 25, 3, 2, ['mage', 'acolyte'], { matk: 30, bonus: { int: 1 } }),
  staff: weaponItem('Cajado', 'Cajado', 40, 3, 3, ['mage', 'acolyte'], { matk: 45, bonus: { int: 2 } }),
  arcwand: weaponItem('Cajado Arcano', 'Cajado', 60, 2, 4, ['mage'], { matk: 70, bonus: { int: 3 } }),
  // Bows (two-handed: no shield).
  bow: weaponItem('Arco', 'Arco', 15, 3, 1, ['archer'], { twoHanded: true }),
  compositebow: weaponItem('Arco Composto', 'Arco', 29, 3, 1, ['archer'], { twoHanded: true }),
  greatbow: weaponItem('Arco Longo', 'Arco', 50, 2, 2, ['archer'], { twoHanded: true }),
  crossbow: weaponItem('Besta', 'Arco', 65, 2, 3, ['archer'], { twoHanded: true }),
  arbalest: weaponItem('Arbaleste', 'Arco', 90, 1, 3, ['archer'], { twoHanded: true }),
  gakkung: weaponItem('Gakkung', 'Arco', 100, 1, 4, ['archer'], { twoHanded: true }),
  // Maces.
  club: weaponItem('Clava', 'Maça', 23, 3, 1, ['acolyte', 'merchant', 'sword']),
  mace: weaponItem('Maça', 'Maça', 37, 3, 1, ['acolyte', 'merchant', 'sword']),
  smasher: weaponItem('Esmagador', 'Maça', 54, 2, 2, ['acolyte', 'merchant', 'sword']),
  flail: weaponItem('Mangual', 'Maça', 69, 2, 3, ['acolyte', 'merchant', 'sword']),
  morningstar: weaponItem('Maça Estrela', 'Maça', 110, 1, 4, ['acolyte', 'merchant', 'sword']),
  // Axes.
  axe: weaponItem('Machado', 'Machado', 38, 3, 1, ['merchant', 'sword']),
  battleaxe: weaponItem('Machado de Batalha', 'Machado', 80, 3, 2, ['merchant', 'sword']),
  hammer: weaponItem('Martelo', 'Machado de duas mãos', 120, 2, 3, ['merchant', 'sword'], { twoHanded: true }),
  buster: weaponItem('Destruidor', 'Machado de duas mãos', 155, 1, 4, ['merchant', 'sword'], { twoHanded: true }),
  // Armor.
  cottonshirt: armorItem('Camisa de Algodão', 'armor', 1, 1, 1),
  adventurer: armorItem('Traje de Aventureiro', 'armor', 3, 1, 1),
  silkrobe: armorItem('Manto de Seda', 'armor', 3, 1, 2, null, { mdef: 10 }),
  mantle: armorItem('Capote', 'armor', 4, 1, 2),
  coat: armorItem('Casaco', 'armor', 5, 1, 2),
  saintrobe: armorItem('Túnica Sagrada', 'armor', 5, 1, 3, ['acolyte', 'mage'], { mdef: 5 }),
  paddedarmor: armorItem('Armadura Acolchoada', 'armor', 7, 1, 3, ['sword', 'merchant', 'acolyte', 'archer', 'thief']),
  chainmail: armorItem('Cota de Malha', 'armor', 8, 1, 3, ['sword', 'merchant', 'acolyte']),
  platearmor: armorItem('Armadura de Placas', 'armor', 10, 1, 4, ['sword']),
  // Shields.
  guard: armorItem('Guarda', 'shield', 3, 1, 1),
  buckler: armorItem('Broquel', 'shield', 4, 1, 2),
  shieldbig: armorItem('Escudo', 'shield', 6, 1, 3, ['sword', 'merchant', 'acolyte']),
  mirrorshield: armorItem('Escudo Espelhado', 'shield', 4, 1, 4, ['sword', 'merchant', 'acolyte'], { mdef: 5 }),
  // Classic Ragnarok item combinations.
  panties: armorItem('Calcinha', 'armor', 4, 1, 3),
  undershirt: armorItem('Camiseta', 'garment', 2, 1, 3),
  tidalshoes: armorItem('Sapatos da Maré', 'shoes', 4, 1, 4, null, { hpRegen: .05 }),
  woolscarf: armorItem('Cachecol de Lã', 'garment', 3, 1, 4, null, { mdef: 4 }),
  // Garments.
  hood: armorItem('Capuz', 'garment', 1, 1, 1),
  muffler: armorItem('Cachecol', 'garment', 2, 1, 2),
  manteau: armorItem('Capa', 'garment', 4, 1, 3),
  // Shoes.
  sandals: armorItem('Sandálias', 'shoes', 1, 1, 1),
  shoes: armorItem('Sapatos', 'shoes', 2, 1, 2),
  boots: armorItem('Botas', 'shoes', 4, 1, 3),
  // Headgear.
  ribbon: armorItem('Fita', 'headgear', 1, 1, 1, null, { mdef: 3, bonus: { int: 1 } }),
  hat: armorItem('Chapéu', 'headgear', 2, 1, 1),
  cap: armorItem('Boné', 'headgear', 4, 1, 2),
  helm: armorItem('Elmo', 'headgear', 6, 1, 3, ['sword', 'merchant', 'acolyte']),
  // Accessories.
  ring: armorItem('Anel', 'accessory', 0, 1, 2, null, { bonus: { str: 2 } }),
  earring: armorItem('Brinco', 'accessory', 0, 1, 2, null, { bonus: { int: 2 } }),
  necklace: armorItem('Colar', 'accessory', 0, 1, 2, null, { bonus: { vit: 2 } }),
  glove: armorItem('Luva', 'accessory', 0, 1, 2, null, { bonus: { dex: 2 } }),
  brooch: armorItem('Broche', 'accessory', 0, 1, 2, null, { bonus: { agi: 2 } }),
  rosary: armorItem('Rosário', 'accessory', 0, 1, 3, null, { mdef: 5, bonus: { luk: 2 } }),
  clip: armorItem('Clipe', 'accessory', 0, 1, 1, null, { sp: 10 }),
};
for (const [id, item] of Object.entries(itemDb)) item.id = id;

const starterGear = {
  sword: ['sword', 'cottonshirt'], mage: ['rod', 'cottonshirt'], archer: ['bow', 'cottonshirt'],
  acolyte: ['rod', 'cottonshirt'], merchant: ['axe', 'cottonshirt'], thief: ['knife', 'cottonshirt'],
};

const roOfficialItemIds = Object.freeze({
  knife: 1201,
  cutter: 1204,
  maingauche: 1207,
  dirk: 1210,
  dagger: 1213,
  gladius: 1219,
  jur: 1250,
  katar: 1251,
  sword: 1101,
  falchion: 1104,
  blade: 1107,
  rapier: 1110,
  scimitar: 1113,
  tsurugi: 1116,
  claymore: 1163,
  rod: 1601,
  wand: 1604,
  staff: 1607,
  arcwand: 1610,
  bow: 1701,
  compositebow: 1704,
  greatbow: 1707,
  crossbow: 1710,
  arbalest: 1713,
  gakkung: 1716,
  club: 1501,
  mace: 1504,
  smasher: 1507,
  flail: 1510,
  morningstar: 1513,
  axe: 1301,
  battleaxe: 1351,
  hammer: 1354,
  buster: 1357,
  cottonshirt: 2301,
  adventurer: 2303,
  silkrobe: 2321,
  mantle: 2307,
  coat: 2309,
  saintrobe: 2325,
  paddedarmor: 2313,
  chainmail: 2316,
  platearmor: 2319,
  guard: 2101,
  buckler: 2103,
  shieldbig: 2105,
  mirrorshield: 2107,
  panties: 2339,
  undershirt: 2522,
  tidalshoes: 2424,
  woolscarf: 2526,
  hood: 2501,
  muffler: 2503,
  manteau: 2505,
  sandals: 2401,
  shoes: 2403,
  boots: 2405,
  ribbon: 2208,
  hat: 2220,
  cap: 2226,
  helm: 2228,
  ring: 2601,
  earring: 2602,
  necklace: 2603,
  glove: 2604,
  brooch: 2605,
  rosary: 2608,
  clip: 2607,
});

const Gear = (() => {
  let seq = Date.now() % 100000;
  const newItem = id => ({ uid: 'i' + (seq++).toString(36) + Math.floor(Math.random() * 1296).toString(36), id, cards: [], refine: 0, upgrades: {}, affixes:ItemQuality.roll(id) });
  const label = item => itemDb[item.id].name + (item.refine ? ' +' + item.refine : '') + (itemDb[item.id].slots ? ' [' + itemDb[item.id].slots + ']' : '');

  function canEquip(itemId, line, stage) {
    const item = itemDb[itemId];
    if (!item) return false;
    if (item.classes && !item.classes.includes(line)) return false;
    if (item.katar && ![1, 4, 5].includes(stage)) return false;
    return true;
  }
  function slotFor(item, gear) {
    const type = itemDb[item.id].type;
    if (type === 'accessory') return gear.accessory1 ? 'accessory2' : 'accessory1';
    return type;
  }
  function describe(itemId) {
    const item = itemDb[itemId];
    const parts = [];
    if (item.type === 'weapon') parts.push(item.kind + ' · ATK ' + item.atk + (item.matk ? ' · MATK ' + item.matk : ''));
    else if (item.def) parts.push('DEF ' + item.def);
    if (item.mdef) parts.push('MDEF ' + item.mdef);
    for (const [key, value] of Object.entries(item.bonus ?? {})) parts.push(key.toUpperCase().replace('STR', 'FOR').replace('DEX', 'DES').replace('LUK', 'SOR') + ' +' + value);
    if (item.sp) parts.push('SP +' + item.sp);
    if (item.twoHanded) parts.push('duas mãos');
    parts.push(item.slots + (item.slots === 1 ? ' encaixe' : ' encaixes'));
    parts.push(item.classes ? item.classes.map(c => lineNames[c]).join(', ') : 'Todas as classes');
    return parts.join(' · ');
  }

  // Sums weapon ATK, DEF, stat bonuses and every card compounded on the equipped items.
  function bonuses(gear) {
    const totals = { str: 0, agi: 0, vit: 0, int: 0, dex: 0, luk: 0, flee: 0, weaponAtk: 0, weaponMatk: 0, itemDef: 0, itemMdef: 0, sp: 0, twoHanded: false, atkPct:0, spellPct:0, hpRegen:0, hpPct:0, speed:0, aspdPct:0 };
    const cardIds = [];
    for (const [slot, item] of Object.entries(gear)) {
      if (!item) continue;
      const data = itemDb[item.id];
      if (slot === 'shield' && gear.weapon && itemDb[gear.weapon.id]?.twoHanded) continue;
      if (data.type === 'weapon') { totals.weaponAtk += data.atk; totals.weaponMatk += data.matk ?? 0; totals.twoHanded = !!data.twoHanded; }
      totals.itemDef += (data.def ?? 0) + (data.type === 'weapon' ? 0 : (item.refine||0)*1.25);
      totals.weaponAtk += data.type === 'weapon' ? (item.refine||0) * (3 + data.tier*2) : 0;
      totals.weaponMatk += data.type === 'weapon' ? (item.refine||0) * (2 + data.tier) : 0;
      totals.itemMdef += data.mdef ?? 0;
      totals.sp += data.sp ?? 0;
      totals.hpRegen += data.hpRegen||0;
      for(const [stat,level] of Object.entries(item.upgrades||{})){
        if(['str','agi','vit','int','dex','luk'].includes(stat))totals[stat]+=level;
        else if(stat==='regen')totals.hpRegen+=level*.48;
        else if(stat==='damage')totals.atkPct+=level*.025;
        else if(stat==='magic')totals.spellPct+=level*.025;
        else if(stat==='hp')totals.hpPct+=level*.018;
        else if(stat==='speed')totals.speed+=level*.01;
      }
      for(const [key,value]of Object.entries(item.affixes||{}))if(key in totals)totals[key]+=value;
      for (const [key, value] of Object.entries(data.bonus ?? {})) totals[key] += value;
      cardIds.push(...item.cards);
      // Nine Tail is +9 in classic RO; this Survivors edition caps gear at +8.
      // Activate the high-refinement milestone at the game's reachable cap.
      if((item.refine||0)>=8 && data.type==='garment' && item.cards.includes('nine_tail'))totals.flee+=20;
    }
    // Pantie + Undershirt: AGI +5/FLEE +10; Tidal Shoes + Wool Scarf: max HP +10%.
    const worn = new Set(Object.values(gear).filter(Boolean).map(item=>item.id));
    let setNames=[];
    let setFlee=0;
    if(worn.has('panties')&&worn.has('undershirt')){ totals.agi+=5;setFlee+=10;setNames.push('Calcinha + Camiseta'); }
    if(worn.has('tidalshoes')&&worn.has('woolscarf')){ totals.hpPct+=.10;setNames.push('Sapatos da Maré + Cachecol de Lã'); }
    const cards = Cards.bonuses(cardIds);
    for (const key of ['str', 'agi', 'vit', 'int', 'dex', 'luk']) cards[key] += totals[key];
    return { ...cards, weaponAtk: totals.weaponAtk, weaponMatk: totals.weaponMatk, def: (cards.def ?? 0) + totals.itemDef,
      mdef: totals.itemMdef, spFlat: totals.sp, twoHanded: totals.twoHanded, setNames, flee:(cards.flee||0)+setFlee+totals.flee,
      atkPct:totals.atkPct, spellPct:totals.spellPct, hpRegen:totals.hpRegen+(cards.hpRegen||0),
      hpPct:totals.hpPct+(cards.hpPct||0), speed:totals.speed+(cards.speed||0), aspdPct:totals.aspdPct+(cards.aspdPct||0) };
  }

  // V23: equipamento VÁLIDO de um personagem. A MESMA função roda no navegador (solo) e no servidor (online,
  // lendo a conta no SQLite): só vale item que existe, no espaço certo, que a classe pode usar, com refino
  // dentro do limite e cartas do tipo certo até o número de encaixes. Nada que o navegador "invente" passa daqui.
  const MAX_REFINE = 8; // o ferreiro do jogo (v12-systems.js) refina até +8
  const whole = (v, lo, hi) => Number.isFinite(Number(v)) ? Math.max(lo, Math.min(hi, Math.floor(Number(v)))) : lo;
  const cleanLevels = obj => Object.fromEntries(Object.entries(obj && typeof obj === 'object' ? obj : {})
    .filter(([k]) => /^[a-zA-Z]{2,12}$/.test(k)).map(([k, v]) => [k, whole(v, 0, 8)]).filter(([, v]) => v > 0));
  function equipped(profile, list, line) {
    const out = {};
    if (!profile || typeof profile !== 'object') return out;
    const stage = whole(profile.stage, 0, 5);
    const pairs = profile.gearItems && typeof profile.gearItems === 'object'
      ? Object.entries(profile.gearItems)
      : Object.entries(profile.gear && typeof profile.gear === 'object' ? profile.gear : {})
        .map(([slot, uid]) => [slot, Array.isArray(list) ? list.find(item => item && item.uid === uid) : null]);
    for (const [slot, raw] of pairs) {
      const info = gearSlots[slot], data = raw && itemDb[raw.id];
      if (!info || !data || data.type !== info.type || !canEquip(raw.id, line, stage)) continue;
      const cards = (Array.isArray(raw.cards) ? raw.cards : [])
        .filter(id => typeof cardDb !== 'undefined' && cardDb[id] && cardDb[id].slot === data.type).slice(0, data.slots);
      out[slot] = { uid: String(raw.uid || slot), id: raw.id, refine: whole(raw.refine, 0, MAX_REFINE), cards,
        upgrades: cleanLevels(raw.upgrades), affixes: cleanLevels(raw.affixes) };
    }
    if (out.shield && out.weapon && itemDb[out.weapon.id].twoHanded) delete out.shield;
    // Sem arma equipada, vale a arma inicial da classe (personagem nunca fica com ATK 0).
    const starter = starterGear[line]?.[0];
    if (!out.weapon && starter && canEquip(starter, line, stage)) out.weapon = { uid: 'starter', id: starter, refine: 0, cards: [], upgrades: {}, affixes: {} };
    return out;
  }
  // V23 Etapa 4: guarda o item escolhido no tesouro do MVP (mesma regra no solo e no servidor).
  // Repetido: +1 de refino na melhor cópia (até +8); com refino máximo, vira Zeny.
  function grantItem(list, chosen, mapTier, uid) {
    const items = Array.isArray(list) ? list : [], data = chosen && itemDb[chosen.id];
    if (!data) return { items, zeny: 0, item: null, text: '' };
    const owned = items.filter(item => item && item.id === chosen.id).sort((a, b) => (b.refine || 0) - (a.refine || 0));
    if (owned.length) {
      const previous = owned[0];
      if ((previous.refine || 0) < MAX_REFINE) {
        const refine = (previous.refine || 0) + 1, item = { ...previous, refine };
        return { items: items.map(entry => entry === previous ? item : entry), zeny: 0, item, text: 'refino ' + refine + '/8 (cópia repetida transformada em melhoria)' };
      }
      const salvage = 45 + data.tier * 35 + whole(mapTier, 0, 9) * 10;
      return { items, zeny: salvage, item: previous, text: 'cópia convertida em +' + salvage + ' Zeny (refino máximo)' };
    }
    const affixes = Object.fromEntries(Object.entries(chosen.affixes && typeof chosen.affixes === 'object' ? chosen.affixes : {})
      .filter(([k]) => ['str', 'agi', 'vit', 'int', 'dex', 'luk'].includes(k)).slice(0, 3).map(([k, v]) => [k, whole(v, 1, 3)]));
    const item = { uid: String(uid), id: chosen.id, cards: [], refine: 0, upgrades: {}, affixes };
    return { items: [...items, item], zeny: 0, item, text: 'novo' };
  }
  // Totais prontos para o motor (só números e listas simples).
  function engineBonuses(gear) {
    const b = bonuses(gear);
    const num = v => Number.isFinite(Number(v)) ? Number(v) : 0;
    const out = { drains: (b.drains || []).map(([c, s]) => [num(c), num(s)]) };
    for (const key of ['str', 'agi', 'vit', 'int', 'dex', 'luk', 'crit', 'hit', 'flee', 'perfectDodge', 'def', 'mdef', 'weaponAtk', 'weaponMatk',
      'spFlat', 'spPct', 'spRegen', 'hpPct', 'hpRegen', 'atkPct', 'spellPct', 'speed', 'aspdPct', 'autoBash', 'doubleAttack', 'vsWater',
      'earthResist', 'zeny', 'spCost']) out[key] = num(b[key]);
    for (const key of ['splash', 'magicImmune', 'stunImmune', 'endure']) out[key] = !!b[key];
    out.cards = (b.ids || []).slice(0, 16);
    out.items = Object.values(gear).filter(Boolean).map(item => item.id).slice(0, 8);
    out.slots = Object.fromEntries(Object.entries(gear).filter(([, item]) => item).map(([slot, item]) => [slot, item.id]));
    return out;
  }

  // Random item from a chest: map tier sets the item level, and most rolls fit the hero's class.
  function roll(line, stage, tier, mvp) {
    const maxTier = Math.min(4, tier + 2 + (mvp ? 1 : 0));
    const minTier = Math.max(1, Math.min(maxTier, tier + (mvp ? 1 : 0)));
    const pool = Object.values(itemDb).filter(item => item.tier >= minTier && item.tier <= maxTier);
    const mine = pool.filter(item => canEquip(item.id, line, stage));
    const list = mine.length && Math.random() < .7 ? mine : pool;
    const weights = list.map(item => 1 / item.tier);
    let pick = Math.random() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < list.length; i++) { pick -= weights[i]; if (pick <= 0) return list[i].id; }
    return list[0].id;
  }
  // Draw-order independent loot offers, without duplicates. Higher-tier MVP rolls and class-biased options.
  function rollChoices(line, stage, mapTier, mvp = false) {
    const trueMvp = mvp === true;
    const elite = mvp === 'elite' || mvp === 'maze';
    const amount = trueMvp ? 4 : 3;
    // Elites guarantee a better tier than normal drops, but do not give
    // final-map equipment immediately in the first dungeon.
    const low = trueMvp ? Math.min(4, Math.max(2, mapTier + 2)) : elite
      ? Math.min(4, Math.max(2, mapTier + 1)) : Math.min(4, Math.max(1, mapTier + 1));
    const high = trueMvp ? 4 : Math.min(4, Math.max(2, mapTier + 2));
    const all = Object.values(itemDb).filter(item => item.tier >= low && item.tier <= high);
    const usable = all.filter(item => canEquip(item.id, line, stage));
    const pool = usable;
    const picks = [];
    while (picks.length < amount && pool.length > picks.length) {
      const candidates = pool.filter(item => !picks.includes(item.id));
      if (!candidates.length) break;
      const weights = candidates.map(item => (trueMvp ? Math.pow(item.tier, 3) : elite ? Math.pow(item.tier, 2) : 1.5 / item.tier) *
        (canEquip(item.id, line, stage) ? 2 : .5));
      let value = Math.random() * weights.reduce((a, b) => a + b, 0);
      let index = weights.findIndex(weight => (value -= weight) <= 0);
      if (index < 0) index = candidates.length - 1;
      picks.push(candidates[index].id);
    }
    return picks;
  }
  function sprite(id) {
    const img = document.createElement('img');
    const key = itemDb[id] ? id : 'knife';
    const itemID = roOfficialItemIds[key];
    const fallback = 'assets/items/' + key + '.png';
    img.src = itemID ? 'assets/items-ro/' + itemID + '.png' : fallback;
    img.referrerPolicy = 'no-referrer';
    img.addEventListener('error', () => { if (img.src !== new URL(fallback, document.baseURI).href) img.src = fallback; }, { once:true });
    img.dataset.ragnarokId = itemID ?? '';
    img.className = 'item-sprite';
    img.width = 64;
    img.height = 64;
    img.alt = itemDb[id]?.name ?? 'Equipamento';
    img.loading = 'lazy';
    return img;
  }
  // Best gear of each slot for the third class training character.
  function trainingGear(line) {
    const gear = {};
    const best = type => Object.values(itemDb).filter(item => item.type === type && canEquip(item.id, line, 5))
      .sort((a, b) => (b.atk ?? 0) + (b.matk ?? 0) * 1.2 + (b.def ?? 0) * 10 - ((a.atk ?? 0) + (a.matk ?? 0) * 1.2 + (a.def ?? 0) * 10))[0];
    for (const [slot, info] of Object.entries(gearSlots)) {
      const item = best(info.type);
      if (!item) continue;
      if (slot === 'shield' && itemDb[gear.weapon?.id]?.twoHanded) continue;
      gear[slot] = { uid: 'train-' + slot, id: slot === 'accessory2' ? 'glove' : slot === 'accessory1' ? 'ring' : item.id, cards: [] };
    }
    return gear;
  }

  // Chest sprite drawn on the ground.
  function drawChest(ctx, x, y, time, mvp) {
    const bob = Math.sin(time * 3 + x) * 1.5;
    ctx.save();
    ctx.translate(x, y - 2 + bob);
    ctx.scale(1, 1 / .73);
    const body = mvp ? ['#8a5a14', '#f2c14e', '#fff0b0'] : ['#24406e', '#4f7fc4', '#f0d27a'];
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath(); ctx.ellipse(0, 2, 15, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = body[0]; ctx.fillRect(-13, -18, 26, 18);
    ctx.fillStyle = body[1]; ctx.fillRect(-12, -17, 24, 7);
    ctx.fillStyle = body[0]; ctx.beginPath(); ctx.ellipse(0, -18, 13, 6, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = body[1]; ctx.beginPath(); ctx.ellipse(0, -18, 11, 4.5, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = body[2];
    ctx.fillRect(-13, -12, 26, 2); ctx.fillRect(-2.5, -15, 5, 7);
    ctx.fillRect(-13, -18, 2, 18); ctx.fillRect(11, -18, 2, 18);
    ctx.restore();
  }

  return { newItem, label, canEquip, slotFor, describe, bonuses, equipped, engineBonuses, grantItem, MAX_REFINE, roll, rollChoices, sprite, trainingGear, drawChest };
})();
