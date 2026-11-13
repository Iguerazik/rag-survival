'use strict';

// Monster cards. Effects follow the iRO (Renewal) card database for each monster in the game.
// Base Ragnarok frequentemente usa 0,02%; ajuste para o ritmo de Survivors sem banalizar.
// As porcentagens aqui sao por abate, nao chance por frame e nao incluem monsters descartados.
const CARD_DROP_RATE = .00035; // 0,035% por abate: rara, sem drop por descarte/despawn
const MVP_CARD_DROP_RATE = .0075; // 0,75% MVP: recompensas especiais, mas cartas continuam excepcionais

const cardSlots = {
  weapon: { name: 'Arma', count: 4 },
  armor: { name: 'Armadura', count: 1 },
  shield: { name: 'Escudo', count: 1 },
  garment: { name: 'Capa', count: 1 },
  shoes: { name: 'Calçado', count: 1 },
  headgear: { name: 'Chapéu', count: 1 },
  accessory: { name: 'Acessório', count: 2 },
};

const cardDb = {
  lunatic: { slot: 'weapon', text: 'SOR +1, CRIT +1 e Esquiva Perfeita +1.', bonus: { luk: 1, crit: 1, perfectDodge: 1 } },
  spore: { slot: 'accessory', text: 'VIT +2.', bonus: { vit: 2 } },
  baphometjr: { slot: 'garment', text: 'AGI +3. CRIT +1.', bonus: { agi: 3, crit: 1 } },
  hunterfly: { slot: 'weapon', text: 'Ao realizar ataques físicos, 3% de chance de recuperar 15% do dano causado como HP.', drain: [.03, .15] },
  mantis: { slot: 'accessory', text: 'FOR +3.', bonus: { str: 3 } },
  sidewinder: { slot: 'weapon', text: 'Permite usar [Ataque Duplo] nv. 1 com a arma (ou o nível aprendido, se for maior).', doubleAttack: 1 },
  munak: { slot: 'shield', text: 'DEF +1. Resistência a Petrificação +15%. Reduz em 5% o dano recebido de ataques de propriedade Terra.', bonus: { def: 1 }, earthResist: .05 },
  bongun: { slot: 'accessory', text: 'Ao realizar ataques físicos, 2% de chance de usar [Golpe Fulminante] nv. 1 no alvo. O alvo é empurrado 5 células.', autoBash: .02 },
  sohee: { slot: 'shoes', text: 'SP máximo +15%. Regeneração de SP +3%.', spPct: .15, spRegen: .03 },
  nine_tail: { slot: 'garment', text: 'AGI +2. No RO: FLEE +20 com capa +9. Nesta versão (refino máximo +8): FLEE +20 com capa +8.', bonus: { agi: 2 } },
  thiefbug: { slot: 'armor', text: 'AGI +1.', bonus: { agi: 1 } },
  tarou: { slot: 'accessory', text: 'FOR +2. Conjunto com a Carta Cãibra: FOR +3.', bonus: { str: 2 } },
  drainliar: { slot: 'weapon', text: 'Aumenta em 20% o dano físico contra alvos de propriedade Água.', vsWater: .2 },
  cramp: { slot: 'headgear', text: '1% de chance de ganhar de 1 a 500 zenys ao derrotar um monstro. Conjunto com a Carta Tarou: FOR +3.', zeny: .01 },
  baphomet: { slot: 'weapon', text: 'HIT -10. Ataques normais causam dano em área 3x3 ao redor do alvo.', bonus: { hit: -10 }, splash: true, mvp: true },
  moonlight: { slot: 'shoes', text: 'Aumenta a velocidade de movimento.', speed: .25, mvp: true },
  goldenbug: { slot: 'shield', text: 'Torna o usuário imune a magias. Dobra o custo de SP das habilidades.', magicImmune: true, spCost: 2, mvp: true },
  orc_hero: { slot: 'headgear', text: 'VIT +8, HP máximo +12% e imunidade a Atordoamento (adaptação Survivors).', bonus: { vit: 8 }, hpPct:.12, stunImmune: true, mvp: true },
  doppelganger: { slot: 'weapon', text: 'Velocidade de ataque +20% (adaptação Survivors).', aspdPct: .20, mvp: true },
  eddga: { slot: 'shoes', text: 'Vigor permanente: dano recebido -8%. HP máximo -10% (adaptação Survivors).', hpPct: -.10, endure: true, mvp: true },
};

// Renewal monster properties (element) used by element-based card effects.
const mobElements = {
  poring: 'water', fabre: 'earth',
  lunatic: 'neutral', spore: 'water', baphometjr: 'shadow', hunterfly: 'wind', mantis: 'earth', sidewinder: 'poison', munak: 'undead', bongun: 'undead',
  sohee: 'water', nine_tail: 'fire', thiefbug: 'neutral', tarou: 'shadow', drainliar: 'shadow', cramp: 'poison',
  baphomet: 'shadow', moonlight: 'fire', goldenbug: 'fire', orc_hero: 'earth', doppelganger: 'shadow', eddga: 'fire',
};

const Cards = (() => {
  const names = id => 'Carta ' + (typeof monsters !== 'undefined' && monsters[id]?.name ? monsters[id].name : (bosses[id]?.name ?? renewalMobs[id]?.[0] ?? id));
  for (const [id, card] of Object.entries(cardDb)) {
    card.id = id;
    Object.defineProperty(card, 'name', { get: () => names(id) });
  }

  function slotKeys() {
    return Object.entries(cardSlots).flatMap(([slot, info]) => Array.from({ length: info.count }, (_, i) => slot + '-' + i));
  }
  function freeSlot(loadout, cardId) {
    const slot = cardDb[cardId]?.slot;
    if (!slot) return null;
    for (let i = 0; i < cardSlots[slot].count; i++) if (!loadout[slot + '-' + i]) return slot + '-' + i;
    return null;
  }

  // Combines every equipped card into one bonus object.
  function bonuses(loadout = {}) {
    const ids = Object.values(loadout).filter(id => cardDb[id]);
    const total = { str: 0, agi: 0, vit: 0, int: 0, dex: 0, luk: 0, crit: 0, hit: 0, flee: 0, perfectDodge: 0, def: 0,
      drains: [], autoBash: 0, doubleAttack: 0, spPct: 0, spRegen: 0, vsWater: 0, earthResist: 0, zeny: 0,
      splash: false, speed: 0, magicImmune: false, spCost: 1, hpPct: 0, aspdPct: 0, stunImmune: false, endure: false, ids };
    for (const id of ids) {
      const card = cardDb[id];
      for (const [key, value] of Object.entries(card.bonus ?? {})) total[key] += value;
      if (card.drain) total.drains.push(card.drain);
      total.autoBash += card.autoBash ?? 0;
      total.doubleAttack = Math.max(total.doubleAttack, card.doubleAttack ?? 0);
      total.spPct += card.spPct ?? 0;
      total.spRegen += card.spRegen ?? 0;
      total.vsWater += card.vsWater ?? 0;
      total.earthResist += card.earthResist ?? 0;
      total.zeny += card.zeny ?? 0;
      total.splash ||= !!card.splash;
      total.speed = Math.max(total.speed, card.speed ?? 0);
      total.magicImmune ||= !!card.magicImmune;
      total.spCost *= card.spCost ?? 1;
      total.hpPct += card.hpPct ?? 0;
      total.aspdPct += card.aspdPct ?? 0;
      total.stunImmune ||= !!card.stunImmune;
      total.endure ||= !!card.endure;
    }
    if (ids.includes('tarou') && ids.includes('cramp')) total.str += 3;
    return total;
  }

  // Card illustration: classic brown card frame with the monster sprite.
  const artCache = new Map();
  function paintCard(canvas, id) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, w, h);
    const frame = ctx.createLinearGradient(0, 0, w, h);
    frame.addColorStop(0, '#9b6b3b'); frame.addColorStop(.5, '#d7a768'); frame.addColorStop(1, '#7a4c27');
    ctx.fillStyle = frame;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#3a2614';
    ctx.fillRect(2, 2, w - 4, h - 4);
    const inner = ctx.createLinearGradient(0, 4, 0, h * .78);
    inner.addColorStop(0, cardDb[id]?.mvp ? '#5e2a3d' : '#2c4a5c');
    inner.addColorStop(1, cardDb[id]?.mvp ? '#c6806b' : '#a9c7c9');
    ctx.fillStyle = inner;
    ctx.fillRect(4, 4, w - 8, h * .74);
    const data = roSpriteData[id];
    if (data) {
      const scale = Math.min((w - 12) / data.w, (h * .7) / data.h) * 1.15;
      Art.draw(ctx, id, 0, 0, w / 2, h * .74 - 2, scale);
    }
    ctx.fillStyle = '#f2dfb5';
    ctx.fillRect(4, h * .78 + 1, w - 8, h * .22 - 5);
    ctx.fillStyle = '#4a2f16';
    ctx.font = 'bold ' + Math.max(6, Math.round(w / 9)) + 'px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = names(id).replace('Carta ', '');
    ctx.fillText(label.length > 13 ? label.slice(0, 12) + '…' : label, w / 2, h * .89 - 1, w - 10);
  }
  function art(id, w = 66, h = 90) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.className = 'card-art';
    paintCard(canvas, id);
    Art.ready().then(() => paintCard(canvas, id), () => {});
    return canvas;
  }
  // Small card icon drawn on the ground.
  function groundIcon(id) {
    if (artCache.has(id)) return artCache.get(id);
    const canvas = document.createElement('canvas');
    canvas.width = 22;
    canvas.height = 28;
    const paint = () => {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, 22, 28);
      ctx.fillStyle = '#6b431f'; ctx.fillRect(0, 0, 22, 28);
      ctx.fillStyle = '#e8c27d'; ctx.fillRect(1, 1, 20, 26);
      ctx.fillStyle = cardDb[id]?.mvp ? '#8a3b52' : '#3f6a7e'; ctx.fillRect(3, 3, 16, 15);
      const data = roSpriteData[id];
      if (data) Art.draw(ctx, id, 0, 0, 11, 17, Math.min(15 / data.w, 14 / data.h) * 1.2);
      ctx.fillStyle = '#7a5428'; ctx.fillRect(3, 20, 16, 2); ctx.fillRect(3, 23, 11, 2);
    };
    paint();
    Art.ready().then(paint, () => {});
    artCache.set(id, canvas);
    return canvas;
  }

  return { names, slotKeys, freeSlot, bonuses, art, groundIcon };
})();

Object.assign(mobElements,{"thief_female": "shadow", "thief_male": "shadow", "archer_skeleton": "undead", "horong": "fire", "dokebi": "shadow", "orc_zombie": "undead", "orc_skeleton": "undead", "steel_chonchon": "wind", "marionette": "ghost", "whisper": "ghost", "nightmare": "ghost", "deviruchi": "shadow", "beetle_king": "earth", "greatestgeneral": "fire", "savage": "earth"});
