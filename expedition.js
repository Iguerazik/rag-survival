'use strict';

const MVP_ARENA_RADIUS = 445;
const QUEST_GOAL = 40;
// Expeditions unlock in this order: defeat the MVP of one to open the next.

const expeditions = {
  sewer: { name: 'Esgotos de Prontera (4)', map: 'prt_sewb4', boss: 'goldenbug', color: '#f5d581',
    roster: ['thief_female', 'thief_male', 'drainliar', 'cramp'], firstWave: 'Infestação nos esgotos' },
  payon: { name: 'Caverna de Payon (4)', map: 'pay_dun04', boss: 'moonlight', color: '#f5afcb',
    roster: ['archer_skeleton', 'horong', 'dokebi', 'nine_tail'], firstWave: 'Os espíritos de Payon' },
  maze: { name: 'Labirinto da Floresta (3)', map: 'prt_maze03', boss: 'baphomet', color: '#d9b185',
    roster: ['baphometjr', 'hunterfly', 'mantis', 'sidewinder'], firstWave: 'A floresta despertou' },
  orc: { name: 'Calabouço dos Orcs', map: 'orcsdun01', boss: 'orc_hero', color: '#a9d978',
    roster: ['orc_zombie', 'orc_skeleton', 'drainliar', 'steel_chonchon'], firstWave: 'As galerias estremecem' },
  geffen: { name: 'Torre de Geffen', map: 'gef_dun02', boss: 'doppelganger', color: '#b9a4f5',
    roster: ['hunterfly', 'marionette', 'whisper', 'nightmare', 'deviruchi'], firstWave: 'Maldições arcanas' },
  payonfield: { name: 'Floresta de Payon', map: 'pay_fild10', boss: 'eddga', color: '#ffb879',
    roster: ['savage', 'beetle_king', 'greatestgeneral'], firstWave: 'Bestas entre as árvores' },
  glast: { name: 'Prisão de Glast Heim', map: 'gl_prison1', boss: 'doppelganger', color: '#b5b8ed',
    roster: ['whisper','nightmare','marionette','deviruchi'], firstWave: 'Correntes na escuridão' },
  mine: { name: 'Mina Abandonada', map: 'ein_dun01', boss: 'goldenbug', color: '#dfc28c',
    roster: ['steel_chonchon','hunterfly','cramp','beetle_king'], firstWave: 'Vibrações nas galerias' },
  temple: { name: 'Templo Esquecido', map: 'ra_san01', boss: 'baphomet', color: '#eac1a9',
    roster: ['horong','greatestgeneral','dokebi','sidewinder'], firstWave: 'Os selos se romperam' },
  shadow: { name: 'Bosque das Sombras', map: 'niflheim', boss: 'eddga', color: '#b49ecf',
    roster: ['deviruchi','nine_tail','baphometjr','nightmare'], firstWave: 'Ecos além da névoa' },
};
const mapOrder = Object.keys(expeditions);
const bosses = {
  baphomet: { name: 'Bafomé', color: '#ff9879', hp: 2120, speed: 83, r: 31, damage: 25, xp: 0,
    patterns: ['circle', 'line', 'ring'], attacks: ['Impacto de Tyr', 'Golpe em linha', 'Terremoto'], element: 'Sombrio' },
  moonlight: { name: 'Flor do Luar', color: '#ee93cf', hp: 1780, speed: 112, r: 24, damage: 21, xp: 0,
    patterns: ['circle', 'ring', 'line'], attacks: ['Coluna de Fogo', 'Ataque em anel', 'Investida'], element: 'Fogo' },
  goldenbug: { name: 'Besouro-Ladrão Dourado', color: '#f7ca62', hp: 1910, speed: 93, r: 27, damage: 24, xp: 0,
    patterns: ['line', 'circle', 'summons'], attacks: ['Investida', 'Impacto Explosivo', 'Convocar Besouros'], element: 'Fogo' },
  orc_hero: { name: 'Herói Orc', color: '#94d86a', hp: 2560, speed: 90, r: 30, damage: 27, xp: 0,
    patterns: ['line', 'circle', 'summons'], attacks: ['Machadada colossal', 'Fúria dos Orcs', 'Convocar guerreiros'], element: 'Terra' },
  doppelganger: { name: 'Doppelganger', color: '#c0a3ef', hp: 2950, speed: 112, r: 30, damage: 31, xp: 0,
    patterns: ['line', 'ring', 'circle'], attacks: ['Corte sombrio', 'Lâminas espectrais', 'Explosão de trevas'], element: 'Sombrio' },
  eddga: { name: 'Eddga', color: '#f5a16a', hp: 3150, speed: 104, r: 29, damage: 32, xp: 0,
    patterns: ['circle', 'line', 'ring'], attacks: ['Explosão feroz', 'Salto do tigre', 'Chama circular'], element: 'Fogo' },
};
const renewalMobs = {
  baphometjr: ['Bafomé Jr.', 22, 69, 11, 8, 1, '#dfbeab'], hunterfly: ['Mosca Caçadora', 24, 106, 10, 11, 2, '#e5caa4'],
  mantis: ['Louva-a-Deus', 41, 68, 13, 14, 2, '#cfdea4'], sidewinder: ['Sorrateiro', 56, 73, 14, 17, 3, '#d4d197'],
  munak: ['Munak', 20, 63, 12, 8, 1, '#e3c4b9'], bongun: ['Bongun', 30, 77, 13, 11, 2, '#c6d4e5'],
  sohee: ['Sohee', 38, 71, 13, 13, 2, '#e8c6d6'], nine_tail: ['Nove Caudas', 52, 94, 15, 16, 3, '#f2b67d'],
  thiefbug: ['Besouro-Ladrão', 16, 67, 11, 8, 1, '#d2a581'], tarou: ['Tarou', 24, 88, 11, 10, 2, '#d4ccc9'],
  drainliar: ['Drainliar', 33, 90, 12, 13, 2, '#f1a799'], cramp: ['Cãibra', 52, 97, 15, 15, 3, '#d4bad3'],
};

// V12: monsters selected from the corresponding Divine Pride map lists.
Object.assign(renewalMobs, {
  thief_female: ["Besouro-Ladrão Fêmea", 32, 76, 12, 11, 2, "#c5c6c9"],
  thief_male: ["Besouro-Ladrão Macho", 46, 72, 13, 13, 3, "#c5c6c9"],
  archer_skeleton: ["Esqueleto Arqueiro", 42, 67, 13, 13, 3, "#c5c6c9"],
  horong: ["Horong", 48, 61, 14, 14, 3, "#c5c6c9"],
  dokebi: ["Dokebi", 56, 84, 14, 15, 3, "#c5c6c9"],
  orc_zombie: ["Orc Zumbi", 65, 55, 15, 17, 3, "#c5c6c9"],
  orc_skeleton: ["Orc Esqueleto", 58, 74, 14, 16, 3, "#c5c6c9"],
  steel_chonchon: ["Chonchon de Aço", 43, 110, 11, 12, 2, "#c5c6c9"],
  marionette: ["Marionete", 55, 76, 13, 16, 3, "#c5c6c9"],
  whisper: ["Sussurro", 44, 83, 13, 13, 3, "#c5c6c9"],
  nightmare: ["Pesadelo", 82, 82, 18, 22, 4, "#c5c6c9"],
  deviruchi: ["Deviruchi", 70, 94, 14, 20, 4, "#c5c6c9"],
  beetle_king: ["Besouro-Rei", 85, 84, 17, 21, 4, "#c5c6c9"],
  savage: ["Selvagem", 76, 90, 17, 20, 4, "#c5c6c9"],
  greatestgeneral: ["Guardião da Floresta", 98, 0, 17, 25, 5, "#c5c6c9"],
});
