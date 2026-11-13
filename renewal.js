'use strict';

const jobLines = {
  sword: ['sword', 'knight', 'highnovice', 'highsword', 'lordknight', 'runeknight'],
  mage: ['mage', 'wizard', 'highnovice', 'highmage', 'highwizard', 'warlock'],
  archer: ['archer', 'hunter', 'highnovice', 'higharcher', 'sniper', 'ranger'],
  acolyte: ['acolyte', 'priest', 'highnovice', 'highacolyte', 'highpriest', 'archbishop'],
  merchant: ['merchant', 'blacksmith', 'highnovice', 'highmerchant', 'whitesmith', 'mechanic'],
  thief: ['thief', 'assassin', 'highnovice', 'highthief', 'assassincross', 'guillotine'],
};
const lineStats = {
  acolyte: { name: 'Noviço', role: 'Luz e recuperação', hp: 98, sp: 75, speed: 178, color: '#f4d4a5', range: 176, damage: 15, rate: .72, basic: 'magic' },
  merchant: { name: 'Mercador', role: 'Machados e impacto', hp: 113, sp: 60, speed: 176, color: '#f2ca89', range: 78, damage: 22, rate: .74, basic: 'melee' },
  thief: { name: 'Gatuno', role: 'Velocidade e veneno', hp: 90, sp: 62, speed: 202, color: '#d3bdff', range: 79, damage: 17, rate: .49, basic: 'melee' },
};
const active = (id, name, icon, style, damage, range, cooldown, color, desc, extra = {}) =>
  ({ id, name, icon, style, damage, range, cooldown, color, desc, cost: Math.round(6 + cooldown * 2.2), ...extra });
const advanced = {
  sword: {
    high: 'Espadachim T.',
    second: ['Cavaleiro', [
      active('pierce', 'Perfurar', 56, 'single', 72, 140, 1.55, '#ffe5a3', 'Perfura um alvo próximo com a lança.'),
      active('bowling', 'Impacto de Tyr', 62, 'blast', 105, 125, 4.1, '#ffd5a4', 'Atinge e empurra monstros próximos.', { radius: 104 }),
    ]],
    trans: ['Lorde', [
      active('joint', 'Golpe Traumático', 398, 'poison', 86, 135, 2.15, '#ffac81', 'Fere o alvo e causa dano contínuo.'),
    ]],
    third: ['Cavaleiro Rúnico', [
      active('dragon', 'Sopro do Dragão', 2008, 'line', 152, 360, 3.2, '#ff984f', 'Expele fogo em linha e atinge todos os monstros à frente.'),
      active('ignition', 'Impacto Flamejante', 2006, 'self', 157, 145, 5.0, '#ffb58b', 'Explode ao redor do Cavaleiro Rúnico.', { radius: 136 }),
      active('sonicwave', 'Onda de Choque', 2002, 'shot', 125, 390, 2.15, '#f2e3c6', 'Lança uma onda cortante que atravessa inimigos.'),
    ]],
  },
  mage: {
    high: 'Mago T.',
    second: ['Bruxo', [
      active('stormgust', 'Nevasca', 89, 'zone', 30, 320, 5.4, '#a8e4ff', 'Cria uma nevasca persistente com cinco pulsos de dano e desaceleração.', { radius: 98, slow: 2.2 }),
      active('vermilion', 'Ira de Thor', 85, 'chain', 65, 310, 5.5, '#ddd1ff', 'Dispara relâmpagos em vários alvos.'),
    ]],
    trans: ['Arquimago', [
      active('napalm', 'Vulcão Napalm', 400, 'blast', 111, 340, 2.9, '#e8b9fb', 'Atinge o alvo e quem estiver ao redor.', { radius: 84 }),
    ]],
    third: ['Arcano', [
      active('crimson', 'Meteoro Escarlate', 2211, 'meteor', 170, 395, 3.35, '#ffae78', 'Marca o chão e faz um meteoro explodir na área.', { radius: 112 }),
      active('comet', 'Cometa', 2213, 'meteor', 240, 420, 7.0, '#f8df8d', 'Invoca uma explosão em uma área ampla.', { radius: 180 }),
      active('lightning', 'Corrente Elétrica', 2214, 'chain', 125, 380, 4.25, '#cbb6ff', 'O raio salta entre inimigos próximos.'),
    ]],
  },
  archer: {
    high: 'Arqueiro T.',
    second: ['Caçador', [
      active('falcon', 'Ataque Aéreo', 129, 'line', 96, 390, 2.45, '#e3d0a7', 'Envia o falcão pela linha de inimigos.'),
      active('landmine', 'Mina Terrestre', 122, 'trap', 127, 300, 4.1, '#ffc69b', 'Planta uma mina que explode quando um monstro se aproxima.'),
    ]],
    trans: ['Atirador de Elite', [
      active('precise', 'Tiro Preciso', 382, 'shot', 116, 435, 2.1, '#f2eeaa', 'Dispara uma flecha veloz e perfurante.'),
    ]],
    third: ['Sentinela', [
      active('arrowstorm', 'Tempestade de Flechas', 2233, 'blast', 155, 420, 3.5, '#baf398', 'Faz cair uma chuva de flechas na área escolhida.', { radius: 125, visual: 'shower' }),
      active('aimed', 'Disparo Certeiro', 2236, 'shot', 190, 460, 3.55, '#f6e694', 'Acerta com força à distância e perfura alvos.'),
      active('wargstrike', 'Disparo Selvagem', 2234, 'line', 149, 395, 4.4, '#d9bced', 'Manda o Warg avançar contra os inimigos em linha.'),
    ]],
  },
  acolyte: {
    high: 'Noviço T.',
    first: [
      active('holy', 'Luz Divina', 156, 'single', 58, 280, 1.5, '#fff0a5', 'Atinge um monstro com luz sagrada.'),
      active('heal', 'Curar', 28, 'heal', 21, 0, 6.8, '#b3ffcc', 'Recupera seu HP.'),
      active('blessing', 'Bênção', 34, 'boost', .18, 0, 9, '#f6e6ae', 'Aumenta o dano por alguns segundos.'),
      active('agiup', 'Aumentar Agilidade', 29, 'haste', .19, 0, 10, '#b3f7e1', 'Aumenta temporariamente a velocidade de movimento.'),
    ],
    second: ['Sacerdote', [
      active('magnus', 'Magnus Exorcismus', 79, 'zone', 49, 325, 4.1, '#f6e7a3', 'Consagra o chão e causa dano em pulsos.', { radius: 112 }),
      active('sanctuary', 'Santuário', 70, 'heal', 32, 0, 8.9, '#b5ffd4', 'Recupera HP com energia sagrada.'),
    ]],
    trans: ['Sumo Sacerdote', [
      active('assumptio', 'Assumptio', 361, 'guard', .48, 0, 8.5, '#e9e1ff', 'Reduz o dano recebido por alguns segundos.'),
    ]],
    third: ['Arcebispo', [
      active('adoramus', 'Adoramus', 2040, 'blast', 164, 365, 2.8, '#fff1b4', 'Envolve o alvo e os monstros próximos em luz.', { radius: 93, slow: 1.0 }),
      active('judex', 'Judex', 2038, 'blast', 113, 330, 2.25, '#e0eeff', 'Conjura uma explosão sagrada no alvo.', { radius: 76 }),
      active('praefatio', 'Praefatio', 2045, 'guard', .58, 0, 9.2, '#b6e1ff', 'Ergue uma barreira que reduz o dano recebido.'),
    ]],
  },
  merchant: {
    high: 'Mercador T.',
    first: [
      active('mammon', 'Mammonita', 42, 'single', 71, 120, 1.75, '#f1cf7e', 'Golpe poderoso contra um alvo próximo.'),
      active('cartrev', 'Cavalo-de-Pau', 153, 'self', 74, 107, 3.65, '#e2bd83', 'Gira o carrinho e empurra os monstros.', { radius: 101, knock: 40 }),
      { id: 'pushcart', name: 'Usar Carrinho', icon: 39, desc: 'Aumenta o alcance para recolher cristais.' },
      { id: 'discount', name: 'Desconto', icon: 37, desc: 'Reduz o consumo de SP por nível.' },
    ],
    second: ['Ferreiro', [
      active('hammerfall', 'Martelo de Thor', 110, 'blast', 96, 145, 2.5, '#f9d38d', 'Esmaga o chão e desacelera inimigos.', { radius: 108, slow: 1.4 }),
      active('overthrust', 'Força Violenta', 113, 'boost', .24, 0, 8, '#ffc092', 'Reforça o dano dos seus ataques.'),
    ]],
    trans: ['Mestre-Ferreiro', [
      active('cartterm', 'Choque de Carrinho', 485, 'line', 123, 245, 2.65, '#ffd18f', 'Avança com o carrinho, atingindo os inimigos em linha.'),
    ]],
    third: ['Mecânico', [
      active('axetornado', 'Fúria do Furacão', 2280, 'self', 162, 136, 3.4, '#ffca9c', 'Gira o machado em uma área ao redor do personagem.', { radius: 140 }),
      active('axeboom', 'Arremesso de Machado', 2278, 'shot', 146, 400, 2.9, '#efc78c', 'Lança o machado, que atravessa monstros.'),
      active('armcannon', 'Canhão de Prótons', 2477, 'line', 194, 450, 4.6, '#a8d9ff', 'Dispara uma descarga em linha longa.'),
    ]],
  },
  thief: {
    high: 'Gatuno T.',
    first: [
      active('envenom', 'Envenenar', 52, 'poison', 60, 112, 1.7, '#bce78b', 'Envenena um alvo, causando dano contínuo.'),
      active('sand', 'Chutar Areia', 149, 'blast', 57, 123, 3.1, '#e6ca95', 'Joga areia nos inimigos próximos e desacelera.', { radius: 65, slow: 1.0 }),
      { id: 'doubleattack', name: 'Ataque Duplo', icon: 48, desc: '5% de chance por nível de golpear duas vezes com ataques normais.' },
      { id: 'dodge', name: 'Perícia em Esquiva', icon: 49, desc: 'Reduz parte do dano recebido.' },
    ],
    second: ['Mercenário', [
      active('sonicblow', 'Lâminas Destruidoras', 136, 'single', 105, 127, 1.8, '#e6c6fa', 'Executa uma sequência rápida de golpes.'),
      active('grimtooth', 'Tocaia', 137, 'blast', 90, 260, 3.3, '#d9a7ff', 'Ataca sob os pés de um grupo de inimigos.', { radius: 87 }),
    ]],
    trans: ['Algoz', [
      active('souldestroyer', 'Destruidor de Almas', 379, 'shot', 132, 365, 2.6, '#e4bcfb', 'Dispara energia cortante em um alvo.'),
    ]],
    third: ['Sicário', [
      active('rolling', 'Lâminas de Loki', 2036, 'self', 146, 136, 2.45, '#ebc0ff', 'Gira as lâminas e acumula cargas para Castigo de Loki.', { radius: 126 }),
      active('counterslash', 'Lâminas Retalhadoras', 2022, 'self', 158, 120, 4.2, '#dba5f9', 'Corta todos os monstros em volta do Sicário.', { radius: 119 }),
      active('ripper', 'Castigo de Loki', 2037, 'line', 130, 400, 3.1, '#ef9cff', 'Gasta as cargas de Lâminas de Loki para lançar um corte à distância.', { requires: ['rolling', 2] }),
    ]],
  },
};
const stages = [
  { name: 'Primeira classe', baseCap: 99, jobCap: 50, nextJob: 40, nextBase: 1 },
  { name: 'Segunda classe', baseCap: 99, jobCap: 50, nextJob: 50, nextBase: 99 },
  { name: 'Renascimento', baseCap: 99, jobCap: 10, nextJob: 10, nextBase: 1 },
  { name: 'Primeira classe T.', baseCap: 99, jobCap: 50, nextJob: 50, nextBase: 1 },
  { name: 'Transclasse', baseCap: 99, jobCap: 70, nextJob: 70, nextBase: 99 },
  { name: 'Terceira classe', baseCap: 200, jobCap: 70 },
];
const attributes = [
  ['str', 'FOR', 'ATK físico corpo a corpo'], ['agi', 'AGI', 'Esquiva (FLEE) e ASPD'], ['vit', 'VIT', 'HP máximo e DEF'],
  ['int', 'INT', 'MATK, SP e conjuração'], ['dex', 'DES', 'Precisão (HIT), ATK à distância e conjuração'], ['luk', 'SOR', 'Crítico e esquiva perfeita'],
];
const firstAid = active('firstaid', 'Primeiros Socorros', 142, 'heal', 14, 0, 5.4, '#b6e9bf', 'Recupera uma pequena parte da vida.');
const playDead = active('playdead', 'Fingir de Morto', 143, 'guard', .55, 0, 9, '#e4d9c4', 'Reduz o dano por alguns segundos.');

function classTree(skills) {
  const ids = new Set(skills.map(skill => skill.id));
  let slot = 0;
  return skills.map((skill, index) => ({
    ...skill, requires: ids.has(skill.requires?.[0]) ? skill.requires : undefined,
    slot: skill.cooldown ? ++slot : undefined, start: index === 0 ? 1 : undefined,
  }));
}
for (const [line, route] of Object.entries(jobLines)) {
  const origin = jobs[line] ?? { ...lineStats[line], tree: advanced[line].first };
  const source = advanced[line];
  origin.family = line;
  origin.basic ??= ({ sword: 'melee', mage: 'magic', archer: 'arrow' })[line];
  jobs[line] = { ...origin, id: line, tree: classTree(origin.tree) };
  const add = (id, name, stage, skills, size) => {
    jobs[id] = { ...origin, id, name, stage, hp: Math.round(origin.hp * size), sp: Math.round(origin.sp * size),
      damage: Math.round(origin.damage * (1 + (size - 1) * .65)), tree: classTree(skills) };
  };
  add(route[1], source.second[0], 1, [...source.second[1], ...origin.tree.slice(0, 3)], 1.09);
  add(route[3], source.high, 3, origin.tree, 1.25);
  add(route[4], source.trans[0], 4, [...source.trans[1], ...source.second[1], ...origin.tree.slice(0, 2)], 1.30);
  add(route[5], source.third[0], 5, [...source.third[1], source.trans[1][0], origin.tree[0]], 1.42);
}
jobs.highnovice = { id: 'highnovice', name: 'Aprendiz T.', role: 'Recomeço após o renascimento', family: 'novice', basic: 'melee',
  hp: 105, sp: 53, speed: 181, color: '#f6dfac', range: 75, damage: 17, rate: .62, tree: classTree([firstAid, playDead]) };

function newJourney(stage = 0) { return { v: 2, stage, base: 1, job: 1, baseXp: 0, jobXp: 0, points: RO.startPoints(stage), stats: RO.baseStats(), proofs: 0, guildTrials: {} };  }
function levelCost(level, job = false) { return Math.floor(job ? 15 + .095*Math.pow(level,1.56) : 18 + .14*Math.pow(level,1.58)); }
function advanceJourney(journey) {
  const rule = stages[journey.stage];
  // An adventure proves worthiness for the class trial: second class 1 MVP, rebirth 2, third class 5.
  const marks=[1,2,2,3,5,0];
  if(!ProgressionGoals.canAdvance(journey))return null;
  if (!rule.nextJob || journey.job < rule.nextJob || journey.base < rule.nextBase || (journey.proofs||0)<marks[journey.stage]) return null;
  if ((journey.stage===0 || journey.stage===4) && !journey.guildTrials?.[journey.stage]) return null;
  if (journey.stage === 1) return { ...newJourney(2), cards: journey.cards, proofs: journey.proofs,runRecords:journey.runRecords, rebirthBonus: true };
  return { ...journey, stage: journey.stage + 1, job: 1, jobXp: 0 };
}
// V25.4: `bonus` multiplica a EXP (solo = 1,25) e o Aprendiz T. ganha +50% (precisa de menos partidas para o nível 10 de classe).
function awardJourney(journey, kills, seconds, victory, bonus = 1) {
  const next = { ...journey, stats: { ...journey.stats } };
  const rule = stages[next.stage];
  const gain = 1.5 * Math.max(1, Math.min(2, Number(bonus) || 1)) * (next.stage === 2 ? 1.5 : 1);
  next.proofs = (next.proofs||0) + Math.min(3, Math.max(0,Number(victory)||0));
  next.baseXp += Math.floor(gain*(kills * 3.6 + seconds * .36 + 135 * Number(!!victory)));
  next.jobXp += Math.floor(gain*(kills * 2.2 + seconds * .24 + 90 * Number(!!victory)));
  while (next.base < rule.baseCap && next.baseXp >= levelCost(next.base)) {
    next.baseXp -= levelCost(next.base);
    next.points += RO.levelPoints(next.base);
    next.base++;
  }
  while (next.job < rule.jobCap && next.jobXp >= levelCost(next.job, true)) next.jobXp -= levelCost(next.job++, true);
  if (next.base >= rule.baseCap) next.baseXp = 0;
  if (next.job >= rule.jobCap) next.jobXp = 0;
  return next;
}
