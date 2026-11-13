'use strict';
// Progressão da RUN: árvore do Ragnarok adaptada para atravessar seis expedições.
// Limites por mapa evitam que a primeira tela entregue todas as habilidades no máximo.
const SkillProgression = (() => {
  const caps = [4, 5, 6, 7, 8, 9, 10, 10, 10, 10];
  const maxLevel = 10;
  const maxRunLevel = 150;
  const cap = tier => caps[Math.max(0, Math.min(caps.length - 1, tier | 0))];
  function needed(level) {
    const lv = Math.max(1, level | 0);
    return Math.ceil(8 + lv * 3 + Math.pow(lv, 1.28) * 1.9);
  }
  // Levels 2-6 dão um ponto por nível. A partir disso, avançar exige mais XP.
  // Não há bônus gratuito por XP acumulada quando todas as skills estão no limite.
  function earnedAt(level) {
    return level >= 2 && (level <= 12 || (level <= 60 && level % 2 === 0) || (level > 60 && level % 3 === 0));
  }
  function available(hero, talents, tier, levelOf) {
    const limit = cap(tier);
    return hero.tree.filter(skill => levelOf(talents, skill.id) < Math.min(maxLevel, skill.maxLevel || maxLevel, limit) &&
      (!skill.requires || levelOf(talents, skill.requires[0]) >= skill.requires[1]));
  }
  function maxPotential(hero, talents, levelOf) {
    return hero.tree.reduce((sum, skill) => sum + Math.max(0, Math.min(maxLevel,skill.maxLevel || maxLevel) - levelOf(talents, skill.id)), 0)+(typeof RuneAugments==='undefined'?0:RuneAugments.remaining(hero));
  }
  return { maxLevel, maxRunLevel, cap, caps, needed, earnedAt, available, maxPotential };
})();
