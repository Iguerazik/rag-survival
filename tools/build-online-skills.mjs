// Gera online-skills.json: catálogo ÚNICO de habilidades do modo online (servidor + navegador).
// Nomes conforme o Ragnarok Online brasileiro (bRO). Rode: node tools/build-online-skills.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const S = {};
const add = (id, n, max, k, d, o = {}) => { if (S[id]) throw new Error('duplicado ' + id); S[id] = { n, max, k, d, ...o }; return id; };
// k: melee | bolt | ball | area | self | zone | trap | heal | healzone | buff | debuff | revive | passive
// r alcance · cd recarga · m multiplicador · rad raio · el elemento · ic ícone existente · fx efeito existente
// st: stun/freeze/stone [chance, +chance/nv, seg] · slow [fator, seg] · poison [mult/s, seg] · vuln [base, /nv, seg] · knock px · lex
// stats: passiva = valor por nível; buff = [base, por nível]
const sword = {
 first: [
  add('bash','Golpe Fulminante',10,'melee','Golpe forte em um alvo próximo. Com Ataque Fatal, pode atordoar.',{r:74,cd:1.75,m:1.2,ic:'bash',fx:'bash'}),
  add('magnum','Impacto Explosivo',10,'self','Explosão de fogo ao seu redor que empurra os monstros.',{rad:125,cd:3.9,m:1.05,el:'fire',st:{knock:30},ic:'magnum',fx:'magnum'}),
  add('provoke','Provocar',10,'debuff','Enfurece o alvo mais forte: ele recebe mais dano de todo o grupo.',{r:240,cd:7,st:{vuln:[.12,.02,8]},ic:'provoke',fx:'provoke'}),
  add('endure','Vigor',10,'buff','Reduz o dano que você recebe por alguns segundos.',{cd:14,dur:7,stats:{def:[.15,.02]},ic:'endure',fx:'endure'}),
  add('mastery','Perícia com Espada',10,'passive','Passiva: +4% de dano por nível.',{stats:{dmg:.04},ic:'mastery'}),
  add('twohand','Perícia com Espada de Duas Mãos',10,'passive','Passiva: +4% de dano por nível.',{stats:{dmg:.04},ic:'mastery'}),
  add('recovery','Aumentar Recuperação de HP',10,'passive','Passiva: recupera mais HP por segundo.',{stats:{regen:.35},ic:'recovery'}),
  add('fatal','Ataque Fatal',1,'passive','Passiva: o Golpe Fulminante ganha 30% de chance de atordoar.',{stats:{bashstun:.3},req:'bash'}),
  add('movingrec','Recuperar HP em Movimento',1,'passive','Passiva: recupera HP extra o tempo todo, mesmo andando.',{stats:{regen:1.1},ic:'recovery'}),
  add('berserk','Instinto de Sobrevivência',1,'passive','Passiva: com menos de 25% de HP, causa +32% de dano.',{stats:{lowhp:.32},ic:'provoke'}),
 ],
 second: [
  add('spearmastery','Perícia com Lança',10,'passive','Passiva: +3% de dano e um pouco mais de alcance por nível.',{stats:{dmg:.03,range:2},ic:'pierce'}),
  add('pierce','Perfurar',10,'melee','Três estocadas rápidas. Dano maior contra elites e chefes.',{r:112,cd:1.55,m:1.5,big:1.3,ic:'pierce',fx:'pierce',req:'spearmastery'}),
  add('brandish','Brandir Lança',10,'area','Varre os monstros à frente e os empurra.',{r:125,rad:85,cd:3.4,m:1.5,st:{knock:25},ic:'pierce',fx:'bowling',req:'spearmastery'}),
  add('spearstab','Estocada',10,'melee','Estocada que empurra o alvo para longe.',{r:122,cd:2.6,m:1.4,st:{knock:70},ic:'pierce',fx:'pierce',req:'spearmastery'}),
  add('boomerang','Lança Bumerangue',5,'bolt','Arremessa a lança em um alvo distante.',{r:300,cd:2.4,m:1.5,ic:'pierce',fx:'charge',req:'spearmastery'}),
  add('twohandquicken','Rapidez com Duas Mãos',10,'buff','Ataca muito mais rápido por alguns segundos.',{cd:18,dur:12,stats:{aspd:[.15,.02]},ic:'concentration',fx:'concentration',req:'twohand'}),
  add('counter','Contra-Ataque',5,'passive','Passiva: chance de revidar com um golpe crítico ao ser atingido.',{stats:{counter:.08},ic:'bash'}),
  add('bowling','Impacto de Tyr',10,'area','Golpe pesado que atinge e empurra o grupo de monstros.',{r:128,rad:104,cd:4.1,m:1.9,st:{knock:40},ic:'bowling',fx:'bowling'}),
  add('chargeatk','Avanço Ofensivo',1,'melee','Investida de longe contra um alvo, com dano alto.',{r:260,cd:5,m:2.6,ic:'bash',fx:'bash'}),
 ],
 trans: [ add('joint','Golpe Traumático',5,'melee','Fere o alvo e causa sangramento contínuo.',{r:135,cd:2.15,m:1.5,st:{poison:[.3,5]},ic:'joint',fx:'joint'}) ],
 third: [
  add('dragontrain','Adestrar Dragão',1,'passive','Passiva: monta no dragão (libera o Sopro do Dragão), +3% de defesa e regeneração de HP.',{stats:{def:.03,regen:.6},ic:'dragon'}),
  add('dragon','Sopro do Dragão',10,'area','Sopro de fogo que queima todos na área do alvo.',{r:300,rad:110,cd:3.2,m:2.4,el:'fire',ic:'dragon',fx:'dragon',req:'dragontrain'}),
  add('ignition','Impacto Flamejante',5,'self','Explosão flamejante ao redor do Cavaleiro Rúnico.',{rad:136,cd:5,m:2.5,el:'fire',ic:'ignition',fx:'ignition'}),
  add('sonicwave','Onda de Choque',5,'bolt','Onda cortante lançada em um alvo distante.',{r:390,cd:2.15,m:2.0,ic:'sonicwave',fx:'sonicwave'}),
  add('windcutter','Cortador de Vento',5,'self','Corte de vento em todos ao seu redor.',{rad:118,cd:3.1,m:1.9,el:'wind',ic:'magnum',fx:'magnum'}),
  add('hundredspear','Cem Lanças',5,'melee','Sequência de estocadas muito forte em um alvo.',{r:140,cd:2.9,m:3.0,ic:'pierce',fx:'pierce'}),
  add('crushstrike','Golpe Esmagador',5,'melee','Golpe pesado que atordoa o alvo.',{r:130,cd:4.4,m:3.2,st:{stun:[.35,.05,1.5]},ic:'bowling',fx:'bowling'}),
  add('stormblast','Explosão Tempestuosa',5,'area','Explosão de energia rúnica na área do alvo.',{r:330,rad:115,cd:4.6,m:2.7,ic:'magnum',fx:'storm'}),
 ],
};
const mage = {
 first: [
  add('fire','Lanças de Fogo',10,'bolt','Lanças de fogo em um alvo a distância.',{r:400,cd:2.35,m:1.6,el:'fire',ic:'fire',fx:'fire'}),
  add('cbolt','Lanças de Gelo',10,'bolt','Lanças de gelo em um alvo a distância.',{r:400,cd:2.35,m:1.6,el:'water',ic:'frost',fx:'frost'}),
  add('lbolt','Relâmpago',10,'bolt','Raios caem sobre um alvo a distância.',{r:400,cd:2.35,m:1.6,el:'wind',ic:'lightning',fx:'lightning'}),
  add('spirit','Ataque Espiritual',10,'ball','Energia espiritual que atinge o alvo e quem estiver colado nele.',{r:390,rad:62,cd:2.6,m:1.15,el:'ghost',ic:'spirit',fx:'spirit'}),
  add('soulstrike','Espíritos Anciões',10,'bolt','Espíritos velozes perseguem um alvo. Recarga curta.',{r:420,cd:1.8,m:1.25,el:'ghost',ic:'spirit',fx:'spirit'}),
  add('fireball','Bolas de Fogo',10,'ball','Bola de fogo que explode no alvo e nos monstros ao redor.',{r:400,rad:88,cd:3.2,m:1.5,el:'fire',ic:'fire',fx:'magnum'}),
  add('wall','Barreira de Fogo',10,'zone','Cria fogo no chão que queima e empurra quem passa.',{r:260,rad:72,cd:6,m:.45,dur:4,tick:.5,el:'fire',st:{knock:12},ic:'wall',fx:'fire'}),
  add('frost','Rajada Congelante',10,'bolt','Gelo que fere o alvo e pode congelá-lo.',{r:360,cd:3.4,m:1.35,el:'water',st:{freeze:[.35,.05,2.5]},ic:'frost',fx:'frost'}),
  add('storm','Tempestade de Raios',10,'area','Raios caem em área sobre os inimigos.',{r:300,rad:100,cd:5.5,m:1.6,el:'wind',ic:'storm',fx:'storm'}),
  add('stonecurse','Petrificar',10,'debuff','Chance de transformar o alvo mais forte em pedra por 4 s (ele também recebe mais dano).',{r:260,cd:6,el:'earth',st:{stone:[.3,.05,4],vuln:[.1,0,4]}}),
  add('safetywall','Escudo Mágico',10,'buff','Barreira que bloqueia os próximos golpes corpo a corpo.',{cd:14,dur:10,stats:{shield:[2,.5]},el:'ghost',fx:'assumptio'}),
  add('sight','Chama Reveladora',1,'self','Uma chama gira ao seu redor: queima de leve e deixa os inimigos próximos mais frágeis.',{rad:110,cd:6,m:.5,el:'fire',st:{vuln:[.1,0,5]},fx:'fire'}),
  add('energycoat','Proteção Arcana',1,'buff','Usa energia espiritual para reduzir o dano recebido.',{cd:20,dur:15,stats:{def:[.2,0]},el:'ghost',fx:'endure'}),
  add('focus','Aumentar Recuperação de SP',10,'passive','Passiva: recupera SP bem mais rápido.',{stats:{spregen:.9},ic:'focus'}),
 ],
 second: [
  add('firepillar','Coluna de Fogo',10,'trap','Armadilha mágica: uma coluna de fogo explode quando um monstro pisa.',{rad:75,cd:5,m:2.2,el:'fire',fx:'fire'}),
  add('sightrasher','Supernova',10,'self','Bolas de fogo disparam em todas as direções e empurram os monstros.',{rad:150,cd:5,m:1.7,el:'fire',st:{knock:40},fx:'magnum',req:'sight'}),
  add('meteor','Chuva de Meteoros',10,'zone','Meteoros caem na área por alguns segundos e podem atordoar.',{r:340,rad:120,cd:9,m:.9,dur:3,tick:.6,el:'fire',st:{stun:[.1,0,1]},ic:'crimson',fx:'crimsonHit'}),
  add('jupitel','Trovão de Júpiter',10,'bolt','Esfera elétrica que causa dano alto e arremessa o alvo.',{r:400,cd:3,m:2.3,el:'wind',st:{knock:55},ic:'lightning',fx:'lightning'}),
  add('vermilion','Ira de Thor',10,'zone','Tempestade de relâmpagos em uma área grande.',{r:320,rad:130,cd:9,m:.85,dur:2.4,tick:.6,el:'wind',ic:'vermilion',fx:'vermilion'}),
  add('waterball','Esfera d\'Água',5,'bolt','Esferas de água em sequência contra um alvo.',{r:380,cd:2.8,m:2.0,el:'water',ic:'frost',fx:'frost'}),
  add('frostnova','Congelar',10,'self','Onda de gelo ao seu redor com chance de congelar.',{rad:120,cd:7,m:.8,el:'water',st:{freeze:[.4,.04,2.5]},ic:'frost',fx:'frost',req:'frost'}),
  add('stormgust','Nevasca',10,'zone','Nevasca persistente que fere, desacelera e pode congelar.',{r:320,rad:110,cd:9,m:.7,dur:3,tick:.6,el:'water',st:{freeze:[.12,0,2],slow:[.6,1.2]},ic:'stormgust',fx:'stormgust'}),
  add('earthspike','Coluna de Pedra',5,'bolt','Estacas de pedra surgem sob o alvo.',{r:380,cd:2.6,m:1.9,el:'earth'}),
  add('heavensdrive','Fúria da Terra',5,'area','Estacas de pedra atingem todos na área.',{r:320,rad:105,cd:4.6,m:1.7,el:'earth',req:'earthspike'}),
  add('quagmire','Pântano dos Mortos',5,'zone','Pântano que deixa os monstros muito lentos.',{r:300,rad:120,cd:12,m:0,dur:6,tick:1,el:'earth',st:{slow:[.45,1.5]}}),
 ],
 trans: [ add('napalm','Vulcão Napalm',5,'ball','Rajada espiritual no alvo e em quem estiver ao redor.',{r:340,rad:84,cd:2.9,m:1.9,el:'ghost',ic:'napalm',fx:'napalm'}) ],
 third: [
  add('crimson','Meteoro Escarlate',5,'area','Um meteoro explode na área do alvo.',{r:395,rad:112,cd:3.35,m:2.6,el:'fire',ic:'crimson',fx:'crimsonHit'}),
  add('comet','Cometa',5,'area','Explosão enorme em uma área ampla.',{r:420,rad:180,cd:7,m:3.4,el:'fire',ic:'comet',fx:'cometHit'}),
  add('lightning','Corrente Elétrica',5,'area','O raio salta entre os inimigos próximos do alvo.',{r:380,rad:120,cd:4.25,m:2.2,el:'wind',ic:'lightning',fx:'lightning'}),
  add('jackfrost','Geada Infernal',5,'self','Onda de gelo ao seu redor que pode congelar.',{rad:150,cd:5.2,m:2.2,el:'water',st:{freeze:[.3,.05,2]},ic:'frost',fx:'stormgust'}),
  add('earthstrain','Fenda Terrestre',5,'area','A terra se parte sob os monstros do alvo.',{r:360,rad:120,cd:4.4,m:2.5,el:'earth',ic:'sand',fx:'grimtooth'}),
  add('soulexpansion','Expansão Espiritual',5,'area','Explosão de almas no alvo e em volta.',{r:380,rad:100,cd:3.1,m:2.3,ic:'spirit',fx:'spirit'}),
  add('tetravortex','Vórtice Elemental',5,'ball','Quatro elementos explodem no alvo: dano altíssimo.',{r:400,rad:80,cd:6,m:4.2,ic:'napalm',fx:'crimsonHit'}),
 ],
};
const archer = {
 first: [
  add('arrows','Rajada de Flechas',10,'bolt','Duas flechas rápidas em um alvo.',{r:465,cd:1.95,m:1.35,ic:'arrows',fx:'arrows'}),
  add('shower','Chuva de Flechas',10,'area','Flechas caem em área e empurram os monstros.',{r:375,rad:95,cd:4.1,m:1.4,st:{knock:25},ic:'shower',fx:'shower'}),
  add('charge','Disparo Violento',1,'bolt','Flecha poderosa que arremessa o alvo para longe.',{r:480,cd:4.5,m:2.6,st:{knock:90},ic:'charge',fx:'charge'}),
  add('concentration','Concentração',10,'buff','Aumenta sua velocidade de ataque e seu dano por alguns segundos.',{cd:18,dur:12,stats:{aspd:[.1,.015],dmg:[.05,.01]},ic:'concentration',fx:'concentration'}),
  add('owl','Olhos de Coruja',10,'passive','Passiva: +3,5% de dano por nível.',{stats:{dmg:.035},ic:'owl'}),
  add('vulture','Olhos de Águia',10,'passive','Passiva: aumenta o alcance dos ataques e das habilidades.',{stats:{range:12},ic:'vulture'}),
 ],
 second: [
  add('falconry','Adestrar Falcão',1,'passive','Passiva: o falcão passa a acompanhar você e libera o Ataque Aéreo (habilidade ativa) e as Garras de Aço. Ele ataca sozinho às vezes (5%).',{stats:{autoblitz:.05},ic:'falcon'}),
  add('falcon','Ataque Aéreo',5,'ball','Ativa: manda o falcão mergulhar no alvo e nos monstros ao redor. Cada nível também aumenta em 2% o ataque automático do falcão.',{r:390,rad:72,cd:2.45,m:1.7,ic:'falcon',fx:'falcon',req:'falconry'}),
  add('steelcrow','Garras de Aço',10,'passive','Passiva: aumenta o dano do falcão.',{stats:{falcon:.08},ic:'falcon',req:'falconry'}),
  add('beastbane','Flagelo das Feras',10,'passive','Passiva: +3% de dano por nível.',{stats:{dmg:.03},ic:'owl'}),
  add('landmine','Mina Terrestre',5,'trap','Planta uma mina que explode e pode atordoar.',{rad:78,cd:4.1,m:1.9,el:'earth',st:{stun:[.3,0,1.5]},ic:'landmine',fx:'landmineHit'}),
  add('claymore','Armadilha Explosiva',5,'trap','Armadilha com explosão de fogo em área grande.',{rad:112,cd:6,m:2.4,el:'fire',ic:'landmine',fx:'landmineHit'}),
  add('freezingtrap','Armadilha Congelante',5,'trap','Armadilha que congela os monstros da área.',{rad:92,cd:6,m:1.2,el:'water',st:{freeze:[.7,0,3]},ic:'landmine',fx:'frost'}),
  add('anklesnare','Instalar Armadilha',5,'trap','Armadilha que prende os monstros no lugar.',{rad:64,cd:5,m:.3,st:{stun:[1,0,3.5]},ic:'landmine',fx:'landmineHit'}),
 ],
 trans: [ add('precise','Tiro Preciso',5,'bolt','Flecha veloz e certeira com dano alto.',{r:435,cd:2.1,m:2.1,ic:'precise',fx:'precise'}) ],
 third: [
  add('arrowstorm','Tempestade de Flechas',5,'area','Chuva de flechas devastadora na área do alvo.',{r:420,rad:125,cd:3.5,m:2.5,ic:'arrowstorm',fx:'arrowstorm'}),
  add('aimed','Disparo Certeiro',5,'bolt','Tiro carregado com dano muito alto.',{r:460,cd:3.55,m:3.2,ic:'aimed',fx:'aimed'}),
  add('wargtrain','Vínculo com o Lobo',1,'passive','Passiva: um lobo passa a acompanhar você e libera o Disparo Selvagem. +4% de dano.',{stats:{dmg:.04},ic:'wargstrike'}),
  add('wargstrike','Disparo Selvagem',5,'bolt','O Warg avança contra o alvo.',{r:395,cd:4.4,m:2.6,ic:'wargstrike',fx:'wargstrike',req:'wargtrain'}),
  add('wargbite','Mordida do Lobo',5,'bolt','O lobo morde o alvo e o prende no lugar.',{r:360,cd:4.8,m:2.2,st:{stun:[.6,.06,1.6]},ic:'wargstrike',fx:'wargstrike',req:'wargtrain'}),
  add('wargdash','Investida do Lobo',5,'area','O lobo avança e atropela os monstros da área.',{r:330,rad:95,cd:3.8,m:2.3,st:{knock:30},ic:'wargstrike',fx:'wargstrike',req:'wargtrain'}),
  add('fearbreeze','Brisa do Medo',5,'buff','Dispara várias flechas a cada ataque por alguns segundos.',{cd:20,dur:12,stats:{dbl:[.18,.04],aspd:[.05,.01]},ic:'concentration',fx:'concentration'}),
  add('clusterbomb','Bomba de Fragmentação',5,'trap','Armadilha que explode em estilhaços numa área grande.',{rad:105,cd:4.6,m:2.4,el:'fire',ic:'landmine',fx:'landmineHit'}),
  add('electricshocker','Choque Elétrico',5,'trap','Armadilha elétrica que paralisa os monstros.',{rad:80,cd:6,m:.8,el:'wind',st:{stun:[1,0,2.5]},ic:'landmine',fx:'landmineHit'}),
 ],
};
const acolyte = {
 first: [
  add('heal','Curar',10,'heal','Cura você e os aliados feridos que estiverem perto de você.',{cd:6.8,rad:160,amt:[21,5.67],el:'holy',ic:'heal',fx:'heal'}),
  add('blessing','Bênção',10,'buff','Abençoa o grupo: todos por perto causam mais dano.',{cd:9,dur:4,durLv:.4,party:1,stats:{dmg:[.18,.03]},el:'holy',ic:'blessing',fx:'blessing'}),
  add('agiup','Aumentar Agilidade',10,'buff','O grupo anda mais rápido por alguns segundos.',{cd:10,dur:5,durLv:.35,party:1,stats:{speed:[.19,.024]},ic:'agiup',fx:'agiup'}),
  add('decagi','Diminuir Agilidade',10,'debuff','Deixa lentos o alvo mais forte e os monstros colados nele.',{r:260,rad:80,cd:7,st:{slow:[.5,6]},ic:'agiup'}),
  add('angelus','Angelus',10,'buff','Aumenta a defesa de todo o grupo.',{cd:18,dur:14,party:1,stats:{def:[.06,.012]},el:'holy',fx:'assumptio'}),
  add('divineprot','Proteção Divina',10,'passive','Passiva: reduz em 2% por nível o dano que você recebe.',{stats:{def:.02},el:'holy'}),
  add('demonbane','Flagelo do Mal',10,'passive','Passiva: +3,5% de dano por nível.',{stats:{dmg:.035},el:'holy'}),
  add('holy','Luz Divina',1,'bolt','Luz sagrada que fere um alvo a distância.',{r:345,cd:2.3,m:2.4,el:'holy',ic:'holy',fx:'holy'}),
  add('ruwach','Revelação',1,'self','Luz sagrada ao seu redor que revela e fere os inimigos próximos (145% de dano Sagrado).',{rad:150,cd:5,m:1.45,el:'holy',fx:'holy'}),
  add('pneuma','Escudo Sagrado',1,'buff','Proteção curta e forte para todo o grupo.',{cd:16,dur:6,party:1,stats:{def:[.25,0]},el:'holy',fx:'praefatio'}),
  add('signum','Signum Crucis',10,'self','Enfraquece todos os inimigos ao redor: eles recebem mais dano.',{rad:210,cd:12,m:0,el:'holy',st:{vuln:[.06,.012,8]},fx:'blessing'}),
 ],
 second: [
  add('sanctuary','Santuário',10,'healzone','Consagra o chão: cura quem do grupo ficar em cima.',{rad:115,cd:12,dur:5,tick:1,el:'holy',ic:'sanctuary',fx:'sanctuary',req:'heal'}),
  add('magnus','Magnus Exorcismus',10,'zone','Cruz sagrada no chão que causa dano em pulsos.',{r:325,rad:112,cd:9,m:.6,dur:4,tick:.5,el:'holy',ic:'magnus',fx:'magnusPulse'}),
  add('kyrie','Kyrie Eleison',10,'buff','Barreira que bloqueia os próximos golpes em cada aliado.',{cd:16,dur:12,party:1,stats:{shield:[2,.3]},el:'holy',fx:'assumptio'}),
  add('magnificat','Magnificat',5,'buff','O grupo recupera SP muito mais rápido.',{cd:22,dur:15,party:1,stats:{spregen:[3,1]},el:'holy',fx:'blessing'}),
  add('gloria','Gloria',5,'buff','O grupo ganha chance de acerto crítico (dano dobrado).',{cd:20,dur:12,party:1,stats:{crit:[.06,.02]},el:'holy',fx:'blessing'}),
  add('impositio','Impositio Manus',5,'buff','Aumenta o dano de todo o grupo.',{cd:20,dur:14,party:1,stats:{dmg:[.05,.02]},el:'holy',fx:'blessing'}),
  add('aspersio','Aspersio',5,'buff','Encanta sua arma com água benta: você causa mais dano.',{cd:20,dur:14,stats:{dmg:[.08,.03]},el:'holy',fx:'blessing',req:'agiup'}),
  add('lexaeterna','Lex Aeterna',1,'debuff','O próximo golpe no alvo mais forte causa dano dobrado.',{r:300,cd:5,el:'holy',st:{lex:1},fx:'holy'}),
  add('turnundead','Esconjurar',10,'bolt','Luz que fere o alvo, com pequena chance de destruir monstros comuns na hora.',{r:300,cd:4,m:2.0,el:'holy',kill:.03,ic:'holy',fx:'judex'}),
  add('macemastery','Perícia com Maça',10,'passive','Passiva: +3% de dano por nível.',{stats:{dmg:.03},ic:'mastery'}),
  add('resurrection','Ressuscitar',4,'revive','Levanta na hora um aliado caído que esteja por perto.',{rad:320,cd:30,el:'holy',ic:'heal',fx:'heal'}),
  add('suffragium','Suffragium',3,'buff','Reduz a recarga das habilidades do grupo.',{cd:20,dur:12,party:1,stats:{cdr:[0,.05]},el:'holy',fx:'blessing'}),
 ],
 trans: [ add('assumptio','Assumptio',5,'buff','Reduz bastante o dano recebido por todo o grupo.',{cd:18,dur:8,party:1,stats:{def:[.3,.04]},el:'holy',ic:'assumptio',fx:'assumptio'}) ],
 third: [
  add('adoramus','Adoramus',10,'area','Luz sagrada no alvo e nos monstros próximos, que ficam lentos.',{r:365,rad:93,cd:2.8,m:2.6,el:'holy',st:{slow:[.6,1]},ic:'adoramus',fx:'adoramus'}),
  add('judex','Judex',5,'area','Explosão sagrada no alvo.',{r:330,rad:76,cd:2.25,m:2.0,el:'holy',ic:'judex',fx:'judex'}),
  add('praefatio','Praefatio',10,'buff','Barreira forte que bloqueia golpes em todo o grupo.',{cd:18,dur:12,party:1,stats:{shield:[4,.4]},el:'holy',ic:'praefatio',fx:'praefatio'}),
  add('laudaagnus','Lauda Agnus',5,'heal','Cura forte em você e nos aliados próximos.',{cd:8,rad:200,amt:[70,14],el:'holy',ic:'heal',fx:'heal'}),
  add('epiclesis','Epiclesis',5,'healzone','Árvore sagrada que cura o grupo na área por alguns segundos.',{rad:135,cd:16,dur:6,tick:1,el:'holy',ic:'sanctuary',fx:'sanctuary'}),
  add('duplelight','Luz Dupla',5,'bolt','Dois feixes sagrados no alvo.',{r:360,cd:2.2,m:2.6,el:'holy',ic:'holy',fx:'holy'}),
  add('oratio','Oratio',5,'debuff','O alvo mais forte fica vulnerável e recebe mais dano.',{r:320,cd:9,el:'holy',st:{vuln:[.15,.03,6]},ic:'judex',fx:'holy'}),
 ],
};
const merchant = {
 first: [
  add('mammon','Mammonita',10,'melee','Golpe com moedas: dano alto em um alvo próximo.',{r:95,cd:2.2,m:1.9,ic:'mammon',fx:'mammon'}),
  add('cartrev','Cavalo-de-Pau',1,'self','Gira o carrinho, acerta todos ao redor e empurra.',{rad:105,cd:4.4,m:2.0,st:{knock:40},ic:'cartrev',fx:'cartrev',req:'pushcart'}),
  add('uproar','Grito de Guerra',1,'buff','Grito que aumenta seu dano por um bom tempo.',{cd:24,dur:20,stats:{dmg:[.12,0]},ic:'overthrust',fx:'overthrust'}),
  add('discount','Desconto',10,'passive','Passiva: suas habilidades gastam menos SP.',{stats:{spcost:.03},ic:'discount'}),
  add('overcharge','Superfaturar',10,'passive','Passiva: ganha mais Zeny.',{stats:{zeny:.06},ic:'discount'}),
  add('pushcart','Usar Carrinho',10,'passive','Passiva: recolhe itens de mais longe.',{stats:{pickup:12},ic:'pushcart'}),
 ],
 second: [
  add('adrenaline','Adrenalina Pura',5,'buff','O grupo todo ataca mais rápido.',{cd:20,dur:14,party:1,stats:{aspd:[.1,.03]},ic:'overthrust',fx:'overthrust'}),
  add('overthrust','Força Violenta',5,'buff','Seus golpes causam muito mais dano.',{cd:18,dur:12,stats:{dmg:[.05,.05]},ic:'overthrust',fx:'overthrust'}),
  add('weaponperf','Manejo Perfeito',5,'buff','Golpes precisos: chance de acerto crítico (dano dobrado).',{cd:18,dur:12,stats:{crit:[.1,.04]},ic:'overthrust',fx:'concentration'}),
  add('maxpower','Amplificar Poder',5,'buff','Sua arma sempre causa o dano máximo.',{cd:16,dur:10,stats:{dmg:[.1,.03]},ic:'overthrust',fx:'overthrust'}),
  add('hammerfall','Martelo de Thor',5,'self','Martelada no chão que atordoa os monstros ao redor.',{rad:112,cd:5,m:.9,st:{stun:[.3,.1,2]},ic:'hammerfall',fx:'hammerfall'}),
  add('weaponry','Perícia em Armamento',10,'passive','Passiva: +2,5% de dano por nível.',{stats:{dmg:.025},ic:'mastery'}),
 ],
 trans: [ add('cartterm','Choque de Carrinho',10,'melee','Pancada com o carrinho: dano alto e chance de atordoar.',{r:140,cd:2.65,m:2.6,st:{stun:[.2,0,1.2]},ic:'cartterm',fx:'cartterm',req:'pushcart'}) ],
 third: [
  add('axetornado','Fúria do Furacão',5,'self','Gira o machado e acerta todos ao redor.',{rad:140,cd:3.4,m:2.6,ic:'axetornado',fx:'axetornado'}),
  add('axeboom','Arremesso de Machado',5,'bolt','Lança o machado em um alvo distante.',{r:400,cd:2.9,m:2.5,ic:'axeboom',fx:'charge'}),
  add('madogear','Licença do Robô',1,'passive','Passiva: pilota o Robô Mágico (libera o Canhão de Prótons) e ganha +5% de defesa.',{stats:{def:.05},ic:'armcannon'}),
  add('armcannon','Canhão de Prótons',5,'area','Disparo que explode na área do alvo.',{r:450,rad:100,cd:4.6,m:3.2,ic:'armcannon',fx:'armcannon',req:'madogear'}),
  add('knuckleboost','Soco Turbinado',5,'melee','O robô dá um soco potente no alvo.',{r:135,cd:2.6,m:2.6,ic:'overthrust',fx:'hammerfall',req:'madogear'}),
  add('flamelauncher','Lança-Chamas',5,'area','O robô cospe fogo na área do alvo.',{r:300,rad:105,cd:3.6,m:2.4,el:'fire',ic:'armcannon',fx:'fire',req:'madogear'}),
  add('vulcanarm','Braço Vulcânico',5,'bolt','Rajada rápida de tiros do robô em um alvo.',{r:420,cd:1.9,m:1.9,ic:'armcannon',fx:'armcannon',req:'madogear'}),
  add('coldslower','Gelo Lento',5,'area','Névoa gelada que deixa os monstros lentos.',{r:330,rad:115,cd:5.5,m:1.2,el:'water',st:{slow:[.5,3]},ic:'frost',fx:'frost',req:'madogear'}),
 ],
};
const thief = {
 first: [
  add('envenom','Envenenar',10,'melee','Golpe que envenena o alvo e causa dano contínuo.',{r:115,cd:3,m:1.3,el:'poison',st:{poison:[.3,5]},ic:'envenom',fx:'envenom'}),
  add('doubleattack','Ataque Duplo',10,'passive','Passiva: 5% de chance por nível de golpear duas vezes.',{stats:{dbl:.05},ic:'doubleattack'}),
  add('dodge','Perícia em Esquiva',10,'passive','Passiva: 3% de chance por nível de desviar de um golpe.',{stats:{dodge:.03},ic:'dodge'}),
  add('steal','Furto',10,'melee','Golpe rápido que também rouba Zeny do monstro.',{r:92,cd:5,m:1.0,zeny:2,ic:'discount',fx:'bash'}),
  add('hide','Esconderijo',10,'buff','Você some: os monstros param de te atacar por alguns segundos.',{cd:14,dur:2,durLv:.3,stats:{hidden:[1,0]},ic:'playdead',fx:'playdead'}),
  add('sand','Chutar Areia',1,'area','Joga areia nos monstros à frente: fere e deixa lentos.',{r:100,rad:66,cd:3.1,m:1.5,el:'earth',st:{slow:[.6,2]},ic:'sand',fx:'sand'}),
  add('stonefling','Arremessar Pedra',1,'bolt','Pedrada em um alvo distante, com chance de atordoar.',{r:330,cd:2.2,m:1.4,st:{stun:[.2,0,1.2]},ic:'sand',fx:'charge'}),
 ],
 second: [
  add('katar','Perícia com Katar',10,'passive','Passiva: +3% de dano e +1% de crítico por nível.',{stats:{dmg:.03,crit:.01},ic:'mastery'}),
  add('righthand','Perícia com Mão Direita',5,'passive','Passiva: +4% de dano por nível.',{stats:{dmg:.04},ic:'mastery'}),
  add('lefthand','Perícia com Mão Esquerda',5,'passive','Passiva: +4% de golpe duplo por nível. Com adaga ou espada na mão esquerda, a 2ª arma soma ao dano (35% + 6% por nível). Sem 2ª arma nem katar, o golpe duplo vale metade.',{stats:{dbl:.04},ic:'doubleattack'}),
  add('sonicblow','Lâminas Destruidoras',10,'melee','Oito golpes seguidos em um alvo, com chance de atordoar.',{r:127,cd:3.2,m:2.6,st:{stun:[.1,.02,1.2]},ic:'sonicblow',fx:'sonicblow',req:'katar'}),
  add('grimtooth','Tocaia',5,'area','Espinhos surgem sob um grupo de inimigos distante.',{r:260,rad:87,cd:3.3,m:1.5,ic:'grimtooth',fx:'grimtooth',req:'sonicblow'}),
  add('cloaking','Furtividade',10,'buff','Fica invisível e mais rápido por alguns segundos.',{cd:16,dur:2.5,durLv:.25,stats:{hidden:[1,0],speed:[.15,0]},ic:'playdead',fx:'playdead',req:'hide'}),
  add('enchantpoison','Envenenar Arma',10,'buff','Seus ataques normais passam a envenenar os monstros.',{cd:18,dur:14,stats:{venom:[.2,.03]},el:'poison',ic:'envenom',fx:'envenom',req:'envenom'}),
  add('poisonreact','Refletir Veneno',10,'passive','Passiva: chance de revidar ao ser atingido.',{stats:{counter:.05},el:'poison',ic:'envenom'}),
  add('venomdust','Névoa Tóxica',10,'zone','Névoa venenosa no chão que fere quem ficar dentro.',{r:250,rad:90,cd:8,m:.35,dur:5,tick:1,el:'poison',ic:'envenom',fx:'envenom',req:'enchantpoison'}),
  add('venomsplasher','Explosão Tóxica',10,'area','Explosão de veneno no alvo e nos monstros ao redor.',{r:118,rad:100,cd:6,m:2.4,el:'poison',ic:'envenom',fx:'envenom',req:'poisonreact'}),
 ],
 trans: [ add('souldestroyer','Destruidor de Almas',10,'bolt','Energia cortante em um alvo distante.',{r:365,cd:2.6,m:2.4,ic:'souldestroyer',fx:'souldestroyer'}) ],
 third: [
  add('rolling','Lâminas de Loki',5,'self','Gira as lâminas e corta todos ao redor.',{rad:126,cd:2.45,m:2.2,ic:'rolling',fx:'rolling'}),
  add('counterslash','Lâminas Retalhadoras',5,'self','Corte amplo em todos os monstros em volta.',{rad:119,cd:4.2,m:2.7,ic:'counterslash',fx:'counterslash'}),
  add('ripper','Castigo de Loki',5,'bolt','Corte lançado à distância.',{r:400,cd:3.1,m:2.3,ic:'ripper',fx:'ripper'}),
  add('crossimpact','Impacto Cruzado',5,'melee','Sete cortes em X num único alvo.',{r:130,cd:3.4,m:3.4,ic:'sonicblow',fx:'sonicblow'}),
  add('darkillusion','Ilusão Sombria',5,'bolt','Surge atrás do alvo e golpeia de surpresa.',{r:380,cd:3,m:2.4,ic:'souldestroyer',fx:'ripper'}),
  add('meteorassault','Assalto Meteoro',5,'self','Golpe em área ao seu redor que pode atordoar.',{rad:130,cd:4,m:2.5,st:{stun:[.2,.03,1.2]},ic:'counterslash',fx:'counterslash'}),
  add('venompressure','Pressão Venenosa',5,'melee','Golpe envenenado no alvo.',{r:125,cd:2.7,m:2.1,st:{poison:[.18,5]},ic:'envenom',fx:'envenom'}),
 ],
};
// Aprendiz T. (Aprendiz renascido): no Ragnarok só tem as habilidades de Aprendiz, as mesmas do solo.
const novice = [
 add('firstaid','Primeiros Socorros',5,'heal','Recupera uma pequena parte da sua vida.',{self:1,amt:[14,3.8],cd:5.4,ic:'firstaid',fx:'firstaid'}),
 add('playdead','Fingir de Morto',5,'buff','Finge de morto: os monstros perdem você de vista por alguns segundos.',{cd:12,dur:2,durLv:.2,stats:{hidden:[1,0]},ic:'playdead',fx:'playdead'}),
];
for (const line of [sword, mage, archer, acolyte, merchant, thief]) line.novice = novice;
// V25.2: MELHORIAS de treino (não são habilidades: passivas que aparecem na escolha de nível) para as classes evoluídas
// com kit fraco — Aprendiz T. (só Primeiros Socorros e Fingir de Morto, sem dano) e a 1ª transclasse, que recomeça do
// nível 1 com o kit da 1ª classe. Dão dano em área ao ataque básico, ritmo, força, EXP e resistência.
const boon = [
 add('treino_amplo','Golpe Amplo',5,'passive','Melhoria: o ataque básico atinge também até 5 monstros em volta do alvo (12% do dano por nível).',{stats:{cleave:.12},boon:1,ic:'bash'}),
 add('treino_onda','Onda de Choque',5,'passive','Melhoria: 5% de chance por nível de o ataque básico soltar uma onda que fere todos em volta do alvo.',{stats:{quake:.05},boon:1,ic:'magnum'}),
 add('treino_ritmo','Ritmo de Batalha',5,'passive','Melhoria: +5% de velocidade de ataque por nível.',{stats:{aspd:.05},boon:1,ic:'concentration'}),
 add('treino_forca','Força de Treino',5,'passive','Melhoria: +6% de dano por nível.',{stats:{dmg:.06},boon:1,ic:'mastery'}),
 add('treino_saber','Sede de Saber',5,'passive','Melhoria: +6% de experiência recolhida por nível.',{stats:{xp:.06},boon:1,ic:'blessing'}),
 add('treino_pele','Pele Grossa',5,'passive','Melhoria: menos dano recebido e regeneração de HP por nível.',{stats:{def:.025,regen:.4},boon:1,ic:'endure'}),
];
for (const line of [sword, mage, archer, acolyte, merchant, thief]) line.boon = boon;
// V26.4: herança — as habilidades marcantes da 1ª classe continuam na 2ª classe e na transclasse
// (ex.: o Ferreiro mantém Mammonita, Cavalo-de-Pau e Usar Carrinho; o Cavaleiro mantém Golpe Fulminante).
const heritage = { sword:['bash','magnum','mastery'], mage:['fire','cbolt','lbolt'], archer:['arrows','shower','owl'],
 acolyte:['heal','blessing','agiup'], merchant:['mammon','cartrev','pushcart'], thief:['envenom','doubleattack','hide'] };
for (const [name, line] of Object.entries({ sword, mage, archer, acolyte, merchant, thief })) {
  line.heritage = heritage[name].map(id => { if (!line.first.includes(id)) throw new Error('herança sem ' + id); return id; });
}
const lines = { sword, mage, archer, acolyte, merchant, thief };
const starters = { sword: 'bash', mage: 'fire', archer: 'arrows', acolyte: 'heal', merchant: 'mammon', thief: 'envenom' };
// estágio da jornada -> conjuntos liberados
// V25.9: cada classe só recebe as PRÓPRIAS habilidades (pedido do jogador). 1ª classe e 1ª transclasse: as da 1ª classe;
// 2ª classe: as da 2ª; transclasse: as da 2ª + as dela; 3ª classe: só as da 3ª (com as Melhorias de treino, que
// completam o pool curto). Para usar as skills das classes anteriores, o jogador escolhe "Jogar como" na Progressão.
// V26.4: 2ª classe e transclasse também levam a 'herança' (3 habilidades marcantes da 1ª classe).
const stages = [['first'], ['second','heritage'], ['novice','boon'], ['first','boon'], ['second','trans','heritage'], ['third','boon']];
const classes = {
 sword: ['sword','knight','highnovice','highsword','lordknight','runeknight'], mage: ['mage','wizard','highnovice','highmage','highwizard','warlock'],
 archer: ['archer','hunter','highnovice','higharcher','sniper','ranger'], acolyte: ['acolyte','priest','highnovice','highacolyte','highpriest','archbishop'],
 merchant: ['merchant','blacksmith','highnovice','highmerchant','whitesmith','mechanic'], thief: ['thief','assassin','highnovice','highthief','assassincross','guillotine'],
};
// Imbuimentos (mesmos nomes e textos do modo solo, run-items.js). for: 'phys' | 'magic' limita por tipo de classe.
const relics = {
 morroc:{slot:'ring',n:'Anel de Morroc',d:'Imbuimento Sanguíneo: rouba 2,5% do dano real como HP.',stats:{drain:.025}},
 ullr:{slot:'ring',n:'Anel de Ullr',d:'Imbuimento da Caçada: dano +18% contra elites e MVPs.',stats:{boss:.18}},
 geffen:{slot:'necklace',n:'Colar de Geffen',d:'Imbuimento Arcano: dano mágico +10% e recarga das habilidades -6%.',for:'magic',stats:{dmg:.10,cdr:.06}},
 valkyrie:{slot:'necklace',n:'Colar da Valquíria',d:'Imbuimento da Tenacidade: HP máximo +10%.',hp:.10,stats:{}},
 payon:{slot:'necklace',n:'Colar de Payon',d:'Imbuimento do Vento: movimento +7%, crítico +4.',stats:{speed:.07,crit:.04}},
 einbroch:{slot:'ring',n:'Anel de Einbroch',d:'Imbuimento da Forja: dano físico +10%, velocidade de ataque +5%.',for:'phys',stats:{dmg:.10,aspd:.05}},
 odin:{slot:'necklace',n:'Colar de Odin',d:'Imbuimento da Sabedoria: experiência recolhida +10%.',stats:{xp:.10}},
 poring:{slot:'ring',n:'Anel de Poring',d:'Imbuimento da Sorte: SOR +4, crítico +3.',stats:{crit:.04}},
 munak:{slot:'ring',n:'Anel de Munak',d:'Imbuimento do Espírito: redução de dano físico de 4%.',stats:{def:.04}},
 payonmoon:{slot:'necklace',n:'Colar da Lua de Payon',d:'Imbuimento Lunar: regeneração de HP +0,8 por segundo.',stats:{regen:.8}},
 prontera:{slot:'necklace',n:'Colar de Prontera',d:'Imbuimento Real: DEF +8 e VIT +3.',hp:.03,stats:{def:.03}},
 ygg:{slot:'necklace',n:'Colar da Folha de Yggdrasil',d:'Imbuimento da Vida: HP máximo +7% e regeneração +0,6.',hp:.07,stats:{regen:.6}},
 glastblade:{slot:'ring',n:'Anel de Glast Heim',d:'Imbuimento da Lâmina: FOR +3 e ATK físico +7%.',for:'phys',stats:{dmg:.09}},
 whisper:{slot:'ring',n:'Anel de Sussurro',d:'Imbuimento da Esquiva: AGI +5 e FLEE +7.',stats:{dodge:.03,aspd:.02}},
 clock:{slot:'necklace',n:'Colar do Tempo',d:'Imbuimento da Aceleração: recarga das habilidades -8%.',stats:{cdr:.08}},
 rune:{slot:'ring',n:'Anel do Rúnico',d:'Imbuimento Rúnico: INT +4 e MATK +7%.',for:'magic',stats:{dmg:.09}},
 falcon:{slot:'ring',n:'Anel do Falcão',d:'Imbuimento da Pontaria: DES +5 e precisão +6.',stats:{dmg:.04,range:10}},
 guardian:{slot:'necklace',n:'Colar do Guardião',d:'Imbuimento da Fortaleza: VIT +5 e HP máximo +5%.',hp:.10,stats:{}},
 orc:{slot:'ring',n:'Anel Orc',d:'Imbuimento da Fúria: dano físico +11%, esquiva -5.',for:'phys',stats:{dmg:.11,dodge:-.0125}},
 chaos:{slot:'necklace',n:'Colar de Morroc Caótico',d:'Imbuimento da Tempestade: MATK +12%, HP máximo -4%.',for:'magic',hp:-.04,stats:{dmg:.12}},
 wild:{slot:'ring',n:'Anel Selvagem',d:'Imbuimento da Fera: movimento +4%, crítico +4.',stats:{speed:.04,crit:.04}},
 ember:{slot:'necklace',n:'Colar de Brasa',d:'Imbuimento do Ardor: dano físico +6% e mágico +6%.',stats:{dmg:.06}},
 temple:{slot:'necklace',n:'Colar do Templo',d:'Imbuimento Sagrado: defesa mágica +10 e regeneração de SP.',stats:{spregen:.6,def:.02}},
 // V23 Etapa 4: imbuimentos do solo que faltavam no online (elementos e eco). Regra do solo vale nos dois modos.
 niflheim:{slot:'ring',n:'Anel de Niflheim',d:'Imbuimento do Eco: a cada 2s, um acerto replica 18% do dano em até 3 inimigos próximos.',stats:{echo:1}},
};
const out = { version: 1, slots: 5, lines, starters, stages, classes, skills: S, relics };
const file = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'online-skills.json');
fs.writeFileSync(file, JSON.stringify(out));
console.log('online-skills.json:', Object.keys(S).length, 'habilidades');
for (const [l, t] of Object.entries(lines)) console.log(' ', l, Object.entries(t).map(([k, v]) => k + ':' + v.length).join(' '));
