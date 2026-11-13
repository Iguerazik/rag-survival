'use strict';
// Target rows, attack columns, as published by bROWiki (Monstros#Propriedade), consulted 2026-11-11.
// Common monster properties cross-checked with Divine Pride, linked from bROWiki.
// MVP properties verified against https://browiki.org/wiki/MVP .
const Elemental=(()=>{
  const order=['neutral','water','earth','fire','wind','poison','holy','shadow','ghost','undead'];
  const names={neutral:'Neutro',water:'Água',earth:'Terra',fire:'Fogo',wind:'Vento',poison:'Veneno',holy:'Sagrado',shadow:'Sombrio',ghost:'Fantasma',undead:'Maldito'};
  const matrices=[[[1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,0.9,1.0],[1.0,0.25,1.0,0.9,1.5,1.5,1.0,1.0,1.0,1.0],[1.0,1.0,0.25,1.5,0.9,1.5,1.0,1.0,1.0,1.0],[1.0,1.5,0.9,0.25,1.0,1.5,1.0,1.0,1.0,0.9],[1.0,0.9,1.5,1.0,0.25,1.5,1.0,1.0,1.0,1.0],[1.0,1.5,1.5,1.5,1.5,0.0,0.75,0.75,0.75,0.75],[1.0,1.0,1.0,1.0,1.0,0.75,0.0,1.25,0.9,1.25],[1.0,1.0,1.0,1.0,1.0,0.75,1.25,0.0,0.9,0.0],[0.9,1.0,1.0,1.0,1.0,0.75,1.0,1.0,1.25,1.0],[1.0,1.0,1.0,1.25,1.0,0.75,1.25,0.0,1.0,0.0]],[[1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,0.7,1.0],[1.0,0.0,1.0,0.8,1.75,1.5,1.0,1.0,1.0,1.0],[1.0,1.0,0.0,1.75,0.8,1.5,1.0,1.0,1.0,1.0],[1.0,1.75,0.8,0.0,1.0,1.5,1.0,1.0,1.0,0.8],[1.0,0.8,1.75,1.0,0.0,1.5,1.0,1.0,1.0,1.0],[1.0,1.5,1.5,1.5,1.5,0.0,0.75,0.75,0.75,0.5],[1.0,1.0,1.0,1.0,1.0,0.75,0.0,1.5,0.8,1.5],[1.0,1.0,1.0,1.0,1.0,0.75,1.5,0.0,0.8,0.0],[0.7,1.0,1.0,1.0,1.0,0.75,1.0,1.0,1.5,1.25],[1.0,1.0,1.0,1.5,1.0,0.5,1.5,0.0,1.25,0.0]],[[1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,0.5,1.0],[1.0,0.0,1.0,0.7,2.0,1.25,1.0,1.0,1.0,1.0],[1.0,1.0,0.0,2.0,0.7,1.25,1.0,1.0,1.0,1.0],[1.0,2.0,0.7,0.0,1.0,1.25,1.0,1.0,1.0,0.7],[1.0,0.7,2.0,1.0,0.0,1.25,1.0,1.0,1.0,1.0],[1.0,1.25,1.25,1.25,1.25,0.0,0.5,0.5,0.5,0.25],[1.0,1.0,1.0,1.0,1.0,0.5,0.0,1.75,0.7,1.75],[1.0,1.0,1.0,1.0,1.0,0.5,1.75,0.0,0.7,0.0],[0.5,1.0,1.0,1.0,1.0,0.5,1.0,1.0,1.75,1.5],[1.0,1.0,1.0,1.75,1.0,0.25,1.75,0.0,1.5,0.0]],[[1.0,1.0,1.0,1.0,1.0,1.0,1.0,1.0,0.0,1.0],[1.0,0.0,1.0,0.6,2.0,1.25,1.0,1.0,1.0,1.0],[1.0,1.0,0.0,2.0,0.6,1.25,1.0,1.0,1.0,1.0],[1.0,2.0,0.6,0.0,1.0,1.25,1.0,1.0,1.0,0.6],[1.0,0.6,2.0,1.0,0.0,1.25,1.0,1.0,1.0,1.0],[1.0,1.25,1.25,1.25,1.25,0.0,0.5,0.5,0.5,0.0],[1.0,1.0,1.0,1.0,1.0,0.5,0.0,2.0,0.6,2.0],[1.0,1.0,1.0,1.0,1.0,0.5,2.0,0.0,0.6,0.0],[0.0,1.0,1.0,1.0,1.0,0.5,1.0,1.0,2.0,1.75],[1.0,1.0,1.0,2.0,1.0,0.0,2.0,0.0,1.75,0.0]]];
  const levels={"drainliar":2,"bongun":1,"spore":1,"thiefbug":3,"nine_tail":3,"cramp":2,"fabre":1,"hunterfly":2,"mantis":1,"tarou":1,"lunatic":3,"munak":1,"baphometjr":1,"poring":1,"sohee":1,"sidewinder":1,"baphomet":3,"moonlight":3,"goldenbug":2,"orc_hero":2,"doppelganger":3,"eddga":1};
  const fixed={fire:'fire',wall:'fire',magnum:'fire',crimson:'fire',comet:'neutral',ignition:'fire',dragon:'fire',frost:'water',stormgust:'water',storm:'wind',vermilion:'wind',lightning:'wind',holy:'holy',magnus:'holy',adoramus:'holy',judex:'holy',envenom:'poison',spirit:'ghost',napalm:'ghost'};
  let current=null;
  function property(id){return {element:mobElements[id]||'neutral',level:levels[id]||1};}
  function factor(attack,id){const p=property(id),a=order.indexOf(attack),t=order.indexOf(p.element);return matrices[p.level-1]?.[t]?.[a]??1;}
  function weapon(){return typeof RunRelics!=='undefined'?RunRelics.weaponElement():'neutral';}
  function skillElement(skill){return fixed[skill.id]||weapon();}
  function withSkill(skill,fn){const previous=current;current=skillElement(skill);const firstZone=run.zones.length;
    try{return fn();}finally{for(let i=firstZone;i<run.zones.length;i++)run.zones[i].element=current;current=previous;}}
  function info(id){const p=property(id);return names[p.element]+' '+p.level;}
  function weakness(id){let best=1,chosen=[];for(const a of order){const f=factor(a,id);if(f>best){best=f;chosen=[names[a]];}else if(f===best&&f>1)chosen.push(names[a]);}return chosen.length?chosen.join('/')+' ×'+best:'sem fraqueza elemental';}
  return {order,names,matrices,levels,property,factor,info,weakness,weapon,skillElement,withSkill,get current(){return current;}};
})();

Object.assign(Elemental.levels,{"thief_female": 1, "thief_male": 1, "archer_skeleton": 1, "horong": 4, "dokebi": 1, "orc_zombie": 1, "orc_skeleton": 1, "steel_chonchon": 1, "marionette": 3, "whisper": 3, "nightmare": 3, "deviruchi": 1, "beetle_king": 1, "greatestgeneral": 2, "savage": 2});
