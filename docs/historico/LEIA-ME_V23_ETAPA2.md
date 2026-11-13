# Ecos de Rune-Midgard — V23 · Etapa 2: equipamentos e cartas nos dois modos

## Como atualizar
1. Feche o servidor (a janela do `01_SERVIDOR_ONLINE_V22.cmd`).
2. Extraia este zip **por cima** da pasta `midgard-survivors`, substituindo os arquivos.
   Ele já inclui tudo da Etapa 1: se você pulou a Etapa 1, pode extrair só este.
   O zip **não** traz a pasta `data/` nem o `cloudflared.exe`: contas, níveis, álbum, itens e Zeny ficam intactos.
3. Abra o `01_SERVIDOR_ONLINE_V22.cmd` de novo (os scripts continuam iguais; `/api/version` ainda responde `22.0.0`,
   e o número da atualização aparece como `patch: 23.2-etapa2`).
4. Peça aos amigos **Ctrl+F5**.

O formato do progresso salvo não mudou: sem migração, nada é apagado.

## O que mudou

### Equipamentos e cartas valem no solo E no online
- Arma (ATK/MATK e refino), armaduras (DEF, MDEF), atributos dos itens, opções (afixos), melhorias permanentes
  dos itens, conjuntos (Calcinha + Camiseta; Sapatos da Maré + Cachecol de Lã) e todas as cartas equipadas
  agora entram no motor único, com as fórmulas do `status.js` (as mesmas que o solo sempre usou).
- **Uma fonte só:** o `items.js` e o `cards.js` continuam sendo os únicos lugares com os dados e a soma dos
  bônus. O navegador usa esses arquivos como sempre; o servidor roda **os mesmos arquivos** num ambiente
  isolado (arquivo novo `server-gear.mjs`). O teste confere em 300 combinações aleatórias que os dois dão
  exatamente o mesmo resultado.
- **No online o servidor continua sendo a autoridade:** ele lê o equipamento e as cartas da **conta**
  (SQLite) no começo de cada mapa. O navegador não informa nada sobre equipamento. Se tentar mandar HP ou
  equipamento "inventado", o servidor ignora (há teste para isso).
- **Validação:** só vale item que existe, no espaço certo, que a classe pode usar (Katar só para Mercenário),
  com refino até +8, e cartas do tipo certo até o número de encaixes do item. Arma de duas mãos anula o escudo.
- **Efeitos especiais das cartas, agora nos dois modos:**
  - Mosca Caçadora: rouba HP no ataque físico (aparece "+N" verde);
  - Bongun: Golpe Fulminante automático;
  - Bafomé: ataque normal em área;
  - Sidewinder: Ataque Duplo;
  - Cãibra: 1% de chance de 1 a 500 Zeny por abate;
  - Drainliar: +20% de dano físico contra Água;
  - Munak: −5% de dano de monstros de Terra;
  - Eddga: dano recebido −8%;
  - Besouro-Ladrão Dourado: custo de SP dobrado;
  - Lua Crescente: velocidade de movimento;
  - Doppelganger: velocidade de ataque;
  - Herói Orc: VIT e HP;
  - Sohee: SP;
  - Rabo de Nove (+8): FLEE;
  - e as de atributo (Lunático, Esporo, Bafomé Jr., Louva-a-deus, Tarou e as outras).
- **Solo:** trocar equipamento ou encaixar carta no meio da partida vale na hora, sem perder o que a run já ganhou.
- **Online:** o equipamento é lido no começo de cada mapa. Troca feita no meio da partida vale a partir do próximo mapa.
- Se o personagem estiver sem arma equipada, vale a arma inicial da classe (ninguém fica com ATK 0).
  Convidado sem conta usa a arma de referência de antes.

### Pets
- **Familiar virou Esporo e Alice virou Sohee.** Os dois são pets domesticáveis do RO e já tinham sprite no jogo.
  Preço e bônus são os mesmos, e quem já tinha comprado continua com o pet (a chave no save não mudou).
- Todos os pets agora usam o sprite dos monstros do jogo: Poring, Poporing (Poring em verde), Lunático,
  Esporo, Sohee e Bafomé Jr.

## Observações de equilíbrio
- Antes, no online, todo mundo batia como se usasse uma arma de ATK 25 (ou MATK 15). Agora vale a arma de verdade.
  Quem usa arma boa e refinada bate bem mais forte. Um Arqueiro só com o Arco inicial (ATK 15) bate um pouco
  menos que antes.

## O que ainda falta
- **Etapa 3:** bênçãos de nível, Cadeia Rúnica, Propagação, Área Amplificada e **bônus dos pets** (por enquanto
  o pet só acompanha você). As evoluções do Códex (habilidade + item) também entram aqui, porque dependem das
  habilidades do catálogo do RO.
- **Etapa 4:** ataques de MVP e elite com aviso no chão, elementos e fraquezas completos, arena do MVP pelo
  portal, baú do MVP com equipamento permanente. As cartas que dependem de magia de monstro (Besouro-Ladrão
  Dourado: imunidade a magia) e de atordoamento (Herói Orc: imunidade) já são lidas, mas só fazem efeito
  quando esses ataques existirem, na Etapa 4.
- **Etapa 5:** eventos de mapa, labirinto, Asa de Mosca, Asa de Borboleta, poções compradas, forja durante a
  run e rota da missão.

## Testes
`npm test` roda **89 testes** (82 da Etapa 1 + 7 novos em `tests/v23-gear.test.cjs`):
- servidor e navegador somam o equipamento igual, em 300 combinações aleatórias;
- equipamento inválido é recusado (encaixes, tipo de carta, refino, classe, Katar, duas mãos);
- cada tipo de bônus muda o personagem no motor (arma, refino, DEF, HP, SP, ASPD, movimento);
- os efeitos especiais acontecem de verdade numa partida simulada (roubo de HP, Golpe automático, área,
  Ataque Duplo, Zeny, +20% contra Água, −5% de Terra com −8% de Vigor, SP dobrado);
- troca de equipamento no meio do solo;
- **online de ponta a ponta:** duas contas na mesma sala, o servidor dá mais HP a quem tem o equipamento na
  conta e ignora valores forjados pelo navegador.

O teste de **paridade** (Node x Chrome/Edge) agora também usa personagens equipados com cartas de efeito especial.
