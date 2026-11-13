'use strict';
// Adapted in-game job trials inspired by Ragnarok's guild exams. Separate from MVP clears.
const JobTrials=(()=>{
  const guilds={
    sword:['Cavaleiro da Provação','Guardião das Runas','fabre','mantis'],
    mage:['Conjurador de Geffen','Sentinela Elemental','spore','drainliar'],
    archer:['Caçador da Guilda','Lobo do Desafio','lunatic','sidewinder'],
    acolyte:['Discípulo da Luz','Protetor de Yggdrasil','poring','munak'],
    merchant:['Ferreiro da Prova','Autômato da Forja','thiefbug','cramp'],
    thief:['Sombra da Guilda','Executor da Meia-noite','tarou','hunterfly']
  };
  const forLine=(line,stage)=>{
    if(![0,4].includes(stage)||!guilds[line])return null;
    const data=guilds[line],third=stage===4;
    return {name:data[third?1:0],monster:data[third?3:2],stage,kills:third?48:24, hpFactor:third?28:14};
  };
  function checkAndSpawn(run,spawn,announce){
    if(!run.career||run.guest||run.inMvp||run.pendingMvp||run.trialSpawned)return;
    const trial=forLine(run.line,run.journey.stage);
    if(!trial||run.journey.guildTrials?.[trial.stage]||run.kills-run.questBase<trial.kills)return;
    if(!run.mobs||run.mobs.length>RunDifficulty.factors(run.difficulty).maxMobs-3)return;
    const enemy=spawn(expeditions[run.map].roster[(trial.stage+1)%expeditions[run.map].roster.length],true);
    if(!enemy)return;
    enemy.guildTrial=trial;enemy.type={...enemy.type,r:Math.min(24,enemy.type.r*1.25),speed:Math.min(126,enemy.type.speed*1.12),damage:enemy.type.damage*1.55,color:'#ffd07d'};
    enemy.hp*=trial.hpFactor;enemy.max=enemy.hp;
    run.trialSpawned=true;
    announce('PROVA DE GUILDA: '+trial.name+' apareceu! Derrote-o para liberar a evolução da classe.',7);
  }
  return {forLine,checkAndSpawn};
})();
