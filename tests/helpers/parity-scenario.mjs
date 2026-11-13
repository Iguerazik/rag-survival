// Cenário fixo do teste de paridade: a MESMA semente e os MESMOS comandos rodam no Node e no navegador.
// Não usa nada do Node nem do DOM: o mesmo arquivo é importado pelos dois lados.
export const SEED = 20261112;
export const STEPS = 1600; // 80 s de jogo a 20 ticks/s

function fnv(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** Estado relevante do mundo (tudo o que o motor decide: posições, HP, SP, EXP, Zeny, drops, sorteio). */
export function digest(world) {
  const players = [...world.players.values()].map(p => [p.id, p.x, p.y, p.hp, p.max, p.sp, p.level, p.xp, p.zeny, p.kills,
    p.cards.join(','), Object.entries(p.skills).sort().join(';'), p.slots.join(','), p.choices.join(','), Object.values(p.relics).join(','),
    JSON.stringify(p.blessings), JSON.stringify(p.mods), p.evolutions.join(','), p.petX, p.petY,
    JSON.stringify(p.wingsUsed), p.potionsUsed, JSON.stringify(p.forged)]);
  const mobs = world.mobs.map(m => [m.uid, m.id, m.x, m.y, m.hp, m.elite]);
  const pickups = world.pickups.map(o => [o.uid, o.kind, o.x, o.y, o.amount, o.id]);
  return fnv(JSON.stringify([world.time, world.kills, world.rng, players, mobs, pickups, world.zones.length, world.wave]));
}

/** Comandos determinísticos: anda em círculos, usa habilidades em turnos e escolhe a 1ª opção ao subir de nível. */
export function run(core, { steps = STEPS, seed = SEED } = {}) {
  const members = [
    // Equipamento com cartas de efeito especial: a paridade cobre também a Etapa 2.
    { id: 'a', profile: { job: 'sword', classId: 'knight' }, character: { base: 55, stage: 1, stats: { str: 60, agi: 40, vit: 40, int: 5, dex: 35, luk: 25 },
      gear: { weaponAtk: 152, str: 3, crit: 1, def: 14, hpPct: .12, drains: [[.03, .15]], autoBash: .02, splash: true, zeny: .01, doubleAttack: 1, vsWater: .2, earthResist: .05, endure: true, cards: ['hunterfly', 'bongun', 'baphomet', 'cramp'], items: ['tsurugi'] },
      pet: { id: 'familiar', upgrades: { pickupGold: 1, pickupXp: 1, range: 2 } }, wings: { flywing: 2, butterflywing: 0 }, potions: 2, flyConfig: { enabled: false } } },
    { id: 'b', profile: { job: 'mage', classId: 'wizard' }, character: { base: 50, stage: 1, stats: { str: 1, agi: 20, vit: 30, int: 70, dex: 45, luk: 10 },
      gear: { weaponAtk: 60, weaponMatk: 82, int: 3, spPct: .15, spRegen: .03, spFlat: 10, spCost: 2, speed: .25, mdef: 5, cards: ['sohee', 'goldenbug', 'moonlight'] } } },
  ];
  const world = core.makeWorld('sewer', 'normal', members, { seed, id: 'paridade' });
  const checkpoints = [];
  let upgradeSeq = 0, skillSeq = 0, rewardSeq = 0;
  for (let i = 0; i < steps; i++) {
    for (const [k, id] of ['a', 'b'].entries()) {
      const p = world.players.get(id), angle = i / (37 + k * 11);
      const input = { dx: core.dmath.cos(angle), dy: core.dmath.sin(angle) * .8, auto: k === 0, attack: true };
      if (k === 1 && i % 40 === 0) { input.skill = 1 + (i / 40) % Math.max(1, p.slots.length); input.skillSeq = ++skillSeq; }
      if (p.choices.length) input.upgrade = { seq: ++upgradeSeq, id: p.choices.find(c => c.startsWith('rune:')) || p.choices[i % p.choices.length] };
      if (p.rewardChoices.length) input.reward = { seq: ++rewardSeq, id: p.rewardChoices[0].id };
      // Etapa 5: rota da missão, Asa de Mosca e Poção de Cura.
      if (k === 0 && i === 40) input.route = 'seal';
      if (k === 0 && (i === 500 || i === 700)) input.item = { seq: i, kind: i === 500 ? 'flywing' : 'potion' };
      core.command(world, id, input);
    }
    // Etapa 4: avança para o portal do MVP e entra na arena (avisos no chão, elementos, tesouro).
    if (i === 1000) { world.time = Math.max(world.time, 719.96); world.spawnAt = 1e9; }
    if (i === 1003 && world.mvpPortal) { const a = world.players.get('a'); a.x = world.mvpPortal.x; a.y = world.mvpPortal.y; }
    // Baús fixos para a paridade cobrir as bênçãos (Etapa 3).
    if (i === 300 || i === 900) { const a = world.players.get('a'); world.pickups.push({ uid: 'paridade-' + i, kind: 'chest', x: a.x, y: a.y, amount: i === 300 ? 2 : 3 }); }
    core.tickWorld(world, .05);
    if (i % 200 === 199) checkpoints.push(digest(world));
    if (world.finished) break;
  }
  const a = world.players.get('a'), b = world.players.get('b');
  return { checkpoints, final: digest(world), kills: world.kills, levels: [a.level, b.level], time: world.time, mvpArena: !!world.mvpArena,
    strikes: world.strikeCount || 0, flew: a.wingsUsed.flywing || 0, route: world.contract.route,
    blessings: [Object.keys(a.blessings.perks).length, Object.keys(b.blessings.perks).length], runes: Object.keys(a.mods).length + Object.keys(b.mods).length };
}
