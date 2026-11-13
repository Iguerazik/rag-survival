'use strict';
// V13: campaign belongs to the character lineage, never the global account.
const Campaign = (() => {
  const initial = ['easy', 'normal'];
  const difficulties = ['easy', 'normal', 'hard', 'nightmare'];
  function migrate(save, line) {
    if (save.campaign && typeof save.campaign === 'object') return save;
    // Older saves had one global cleared list. Keep that history ONLY on the
    // previously selected character, never silently unlock it for all others.
    const old = Object.keys(save.cleared || {}).filter(k => save.cleared[k] && expeditions[k]);
    return { ...save, campaign: old.length ? { [line]: { cleared: Object.fromEntries(old.map(k => [k, true])), clearsByDifficulty: {} } } : {} };
  }
  function character(save, line) {return save.campaign?.[line] || { cleared:{}, clearsByDifficulty:{} };}
  function mapUnlocked(save, line, map) {
    const i = mapOrder.indexOf(map);
    return i === 0 || (i > 0 && !!character(save,line).cleared?.[mapOrder[i-1]]);
  }
  function allCleared(save,line,difficulty) {
    return mapOrder.every(id => !!character(save,line).clearsByDifficulty?.[difficulty]?.[id]);
  }
  function difficultyUnlocked(save,line,id) {
    if(initial.includes(id))return true;
    if(id === 'hard')return allCleared(save,line,'normal');
    if(id === 'nightmare')return allCleared(save,line,'hard');
    return false; // Exploração is a legacy accessibility/training mode, hidden from V13 career.
  }
  function markCleared(save,line,map,difficulty) {
    if (!mapOrder.includes(map) || !difficulties.includes(difficulty)) return save.campaign || {};
    const c = character(save,line);
    return { ...(save.campaign||{}), [line]: { ...c, cleared:{...c.cleared,[map]:true},
      clearsByDifficulty:{...(c.clearsByDifficulty||{}), [difficulty]:{...(c.clearsByDifficulty?.[difficulty]||{}),[map]:true}} } };
  }
  function hint(save,line,id) {
    if(id==='hard')return 'Conclua os '+mapOrder.length+' mapas no Normal com este personagem.';
    if(id==='nightmare')return 'Conclua os '+mapOrder.length+' mapas no Difícil com este personagem.';
    return '';
  }
  function validDifficulty(save,line,id) {return difficultyUnlocked(save,line,id) ? id : 'normal';}
  return { migrate,character,mapUnlocked,allCleared,difficultyUnlocked,markCleared,hint,validDifficulty };
})();
