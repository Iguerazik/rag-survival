'use strict';
// Adaptive run tuning. Players count includes the host and all active party members.
const RunDifficulty = (() => {
  const modes = {
    story: { name: 'Exploração', hp: .55, damage: .52, spawn: 1.38, maxMobs: .68, xp: 1.22, hint: 'Para jogar sozinho e conhecer os mapas.' },
    easy: { name: 'Fácil', hp: .75, damage: .73, spawn: 1.16, maxMobs: .86, xp: 1.08, hint: 'Combate mais acessível, recompensas normais.' },
    normal: { name: 'Normal', hp: 1, damage: 1, spawn: 1, maxMobs: 1, xp: 1, hint: 'Experiência padrão para jogadores experientes.' },
    hard: { name: 'Difícil', hp: 1.38, damage: 1.22, spawn: .81, maxMobs: 1.18, xp: 1.12, hint: 'Mais monstros, maior resistência e dano.' },
    nightmare: { name: 'Pesadelo', hp: 1.82, damage: 1.55, spawn: .65, maxMobs: 1.37, xp: 1.25, hint: 'Para grupos coordenados e builds avançadas.' },
  };
  const get = id => modes[id] ?? modes.easy;
  const count = players => Math.max(1, Math.min(6, Math.round(players || 1)));
  function factors(id, players = 1) {
    const m = get(id), extra = count(players) - 1;
    // V22.5: jogando sozinho os monstros batem 12% mais fraco e têm 8% menos HP (o solo estava mais difícil que o grupo).
    const solo = extra === 0;
    return { hp: m.hp * (1 + extra * .58) * (solo ? .92 : 1), damage: m.damage * (1 + extra * .13) * (solo ? .88 : 1),
      spawn: m.spawn / (1 + extra * .32), maxMobs: Math.min(380,Math.round(215 * m.maxMobs * (1 + extra * .16))),
      xp: m.xp, players: 1 + extra };
  }
  return { modes, get, count, factors };
})();
