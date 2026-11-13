'use strict';

const jobs = {
  sword: { name: 'Espadachim', role: 'Corpo a corpo', hp: 120, sp: 54, speed: 180, color: '#efaa81', range: 75, damage: 23, rate: .68,
    tree: [
      { id: 'bash', name: 'Golpe Fulminante', desc: 'Golpe forte contra um alvo próximo.', slot: 1, cost: 8, cooldown: 1.15, range: 115, start: 1 },
      { id: 'magnum', name: 'Impacto Explosivo', desc: 'Explode ao seu redor e empurra os monstros.', slot: 2, cost: 15, cooldown: 4.2, requires: ['bash', 2] },
      { id: 'provoke', name: 'Provocar', desc: 'O alvo recebe mais dano e bate mais forte.', slot: 3, cost: 6, cooldown: 3.8, range: 230 },
      { id: 'endure', name: 'Vigor', desc: 'Reduz o dano recebido por alguns segundos.', slot: 4, cost: 11, cooldown: 12, requires: ['provoke', 2] },
      { id: 'mastery', name: 'Perícia com Espada', desc: '+15% de dano nos ataques e habilidades por nível.' },
      { id: 'recovery', name: 'Aumentar Recuperação de HP', desc: 'Regenera HP e aumenta a cura das poções.' },
    ] },
  mage: { name: 'Mago', role: 'Magia e controle', hp: 85, sp: 85, speed: 175, color: '#ccbcf5', range: 167, damage: 14, rate: .73,
    tree: [
      { id: 'fire', name: 'Lanças de Fogo', desc: 'Lanças de fogo causam dano ao alvo escolhido.', slot: 1, cost: 9, cooldown: 1.6, range: 320, start: 1 },
      { id: 'wall', name: 'Barreira de Fogo', desc: 'Ergue uma parede que queima e repele os monstros.', slot: 2, cost: 16, cooldown: 5, requires: ['fire', 2] },
      { id: 'frost', name: 'Rajada Congelante', desc: 'Congela o alvo por alguns instantes.', slot: 3, cost: 10, cooldown: 3.8, range: 310 },
      { id: 'storm', name: 'Tempestade de Raios', desc: 'Raios caem em área no ponto mirado.', slot: 4, cost: 18, cooldown: 6.4, point: true, range: 340, requires: ['focus', 2] },
      { id: 'focus', name: 'Aumentar Recuperação de SP', desc: '+1,1 SP por segundo por nível.' },
      { id: 'spirit', name: 'Ataque Espiritual', desc: 'Causa dano espiritual ao alvo e a monstros próximos.', slot: 5, cost: 10, cooldown: 2.8, range: 285 },
    ] },
  archer: { name: 'Arqueiro', role: 'Precisão à distância', hp: 98, sp: 66, speed: 193, color: '#b4dfa4', range: 245, damage: 16, rate: .65,
    tree: [
      { id: 'arrows', name: 'Rajada de Flechas', desc: 'Dispara duas flechas em sequência contra o alvo.', slot: 1, cost: 8, cooldown: 1.3, range: 415, start: 1 },
      { id: 'shower', name: 'Chuva de Flechas', desc: 'Dispara em área e empurra os alvos atingidos.', slot: 2, cost: 14, cooldown: 4.8, point: true, range: 385, requires: ['arrows', 2] },
      { id: 'charge', name: 'Disparo Violento', desc: 'Flecha potente que empurra o alvo para trás.', slot: 3, cost: 10, cooldown: 3.1, range: 430 },
      { id: 'concentration', name: 'Concentração', desc: 'Aumenta a velocidade e o dano dos seus disparos.', slot: 4, cost: 13, cooldown: 12, requires: ['vulture', 2] },
      { id: 'vulture', name: 'Olhos de Águia', desc: 'Aumenta o alcance dos ataques e das habilidades.' },
      { id: 'owl', name: 'Olhos de Coruja', desc: '+13% de dano nas flechas por nível.' },
    ] },
};

const skillLevel = (talents, id) => talents[id]?.level ?? 0;

function skillRequirement(job, skill) {
  return skill.requires && job.tree.find(item => item.id === skill.requires[0]);
}
