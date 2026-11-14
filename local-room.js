'use strict';
/* V23 - Modo solo = "sala local de 1 jogador" rodando o MESMO motor do servidor (engine/core.mjs).
 * O navegador continua só desenhando: a cada passo fixo de 0,05 s (20 ticks/s, igual ao servidor)
 * a sala recebe a entrada do jogador, avança o motor e entrega um snapshot para o mesmo código que
 * desenha o online (receiveAuthoritativeWorld). Pausar o jogo (Esc) pausa a sala (nada avança).
 * V24.1: escolher habilidade, baú ou tesouro NÃO pausa mais: a partida segue e o herói anda, como no online.
 */
const LocalRoom = (() => {
  const STEP = .05;          // mesmo ritmo do servidor
  const MAX_STEPS = 4;       // quadro muito lento não vira "espiral da morte"
  const ID = 'solo';

  function available() { return !!window.MidgardEngine?.ok; }
  function whenReady() { return window.MidgardEngine?.ready || Promise.reject(new Error('Motor não encontrado')); }

  /** character: { base, stats, stage, guildTrials } do personagem escolhido (mesmo formato que o servidor usa). */
  function create({ map, difficulty, job, classId, name, character, seed }) {
    const core = window.MidgardEngine.core;
    const world = core.makeWorld(map, difficulty, [{ id: ID, profile: { job, classId, name }, character }],
      Number.isFinite(seed) ? { seed } : {});
    // V26 (só para testes): ?evento=30 na URL faz o 1º evento dinâmico começar aos 30 s da run solo (em qualquer mapa/dificuldade);
    // &tipo=poringInvasion | treasureRain | orcMarch escolhe qual.
    try { const at = Number(new URLSearchParams(location.search).get('evento')); if (at > 0) world.director = { state: 'idle', next: at, ev: null, seq: 0, history: [], force: new URLSearchParams(location.search).get('tipo') || null, ignoreRules: true }; } catch {}
    return { core, world, acc: 0, ended: false, steps: 0, tickMs: 0 };
  }

  /**
   * Avança a sala em passos fixos. input(): entrada do jogador (mesmo pacote enviado ao servidor no online).
   * deliver(snapshot): recebe cada snapshot (igual ao que o servidor manda pelo WebSocket).
   */
  function frame(room, dt, input, deliver, sinceEvent) {
    if (!room || room.ended) return;
    room.acc = Math.min(STEP * MAX_STEPS, room.acc + dt);
    let stepped = false;
    while (room.acc >= STEP - 1e-9) {
      room.acc -= STEP;
      const started = performance.now();
      room.core.command(room.world, ID, input());
      room.paused = false;
      room.core.tickWorld(room.world, STEP);
      room.tickMs = room.tickMs * .95 + (performance.now() - started) * .05;
      room.steps++;
      stepped = true;
      if (room.world.finished) break;
    }
    if (!stepped) return;
    const snapshot = room.core.snapshotWorld(room.world, ID, sinceEvent(), { cull: true });
    if (room.world.finished) room.ended = true;
    deliver(snapshot);
  }

  return { ID, STEP, available, whenReady, create, frame };
})();
