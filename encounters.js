'use strict';
// Encounters especiais do mapa: cronograma por expedição e evento oculto do labirinto.
const MapEncounters = (() => {
  const schedule = Object.freeze([
    { time: 120, kind: 'elite' },
    { time: 240, kind: 'elite' },
    { time: 360, kind: 'miniBoss' },
    { time: 480, kind: 'elite' },
    { time: 600, kind: 'elite' },
  ]);
  function due(local, spawned) { return schedule.find((event, i) => local >= event.time && !spawned[i]); }
  function mazeTrigger(visitCount, local, defeated, random = Math.random()) {
    if (defeated || visitCount < 2 || local < 55) return false;
    return visitCount >= 8 || random < .24;
  }
  const labels = { elite: 'ELITE', miniBoss: 'MINIBOSS', specialBoss: 'GUARDIÃO DOS PORTAIS' };
  return { schedule, due, mazeTrigger, labels };
})();
