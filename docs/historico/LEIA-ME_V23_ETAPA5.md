# Ecos de Rune-Midgard — V23 · Etapa 5: eventos do mapa, labirinto, consumíveis e rota da missão

Esta é a última etapa do motor único. Agora o solo e o online rodam **as mesmas regras, no mesmo arquivo**
(`engine/core.mjs`). O `game.js` ficou só com tela, controles e efeitos.

## Como atualizar
1. Feche o servidor (a janela do `01_SERVIDOR_ONLINE_V22.cmd`).
2. Extraia este zip **por cima** da pasta `midgard-survivors`. Ele já inclui as Etapas 1 a 4.
   O zip **não** traz a pasta `data/` nem o `cloudflared.exe`: contas e progresso ficam intactos.
3. Abra o `01_SERVIDOR_ONLINE_V22.cmd` de novo. Os scripts não mudaram: `/api/version` ainda responde `22.0.0`,
   e o número da atualização aparece como `patch: 23.5-etapa5`.
4. Peça aos amigos **Ctrl+F5**.

O formato do progresso salvo não mudou (sem migração). Asas, poções e itens continuam nos mesmos campos de antes.

## O que mudou

### Eventos do mapa, nos dois modos (regra do solo)
- **Elites de campo a cada 90 s**, 7 por expedição. O 4º é um **Comandante** (miniBoss). Eles têm nome
  ("Veterano …" / "Comandante …"), são 10% mais lentos, causam 25% a mais de dano e atacam com aviso no chão.
- **Fendas** aos 2, 4, 6, 8 e 10 minutos. A dos 6 minutos tem um miniBoss. O portal fica aberto por 110 s.
- **Itens de campo com prazo**: a partir de 55 s, a cada 65 s aparece um item a cerca de 230 de distância, em rodízio:
  Poção de Cura (+25% HP) → Ímã de EXP → Bolsa de Zeny (25 + 10 por mapa). No máximo 5 no chão; somem em 95 s.
- **Ímãs escondidos**: um Ímã de EXP e um Ímã de Zeny já começam no mapa, a pelo menos 300 do início.

### Forja durante a run (baú verde), nos dois modos
- Cai com 0,11% de chance por monstro comum (no máximo 5 no chão, some em 70 s). Também é **garantido** ao derrotar
  o Comandante, o Guardião dos Portais e a Prova da Guilda, e ao concluir a rota Purificar.
- Abre 3 opções de atributo para os itens **equipados**: +1 por escolha, até +4 por atributo em cada item.
  Vale só até o fim da expedição; o item permanente não muda. Sem equipamento, o baú vira 30 Zeny.
- No online o baú é **compartilhado**: cada jogador escolhe a sua forja.

### Asa de Mosca, Asa de Borboleta e Poção de Cura, nos dois modos
- **Asa de Mosca**: teleporta para longe (pelo menos 280, na mesma sala no labirinto). Dá 2,5 s de proteção,
  cura 3% do HP por segundo durante 4 s e tem recarga de 60 s. Perseguidores aparecem depois de 3,4 s, como no solo.
  O uso automático abaixo do HP escolhido (Inventário → Itens de run) também funciona no online.
- **Asa de Borboleta**: leva o grupo inteiro a uma fenda contra um MVP sorteado, por 120 s. Carta do MVP: 1%.
  Ele chama reforços a cada 9 s. Não funciona depois que o portal do MVP de 12:00 abriu.
- **Poção de Cura** comprada na Forja & Zeny: +25% do HP, recarga de 30 s.
- Asas caem de monstros com as mesmas taxas do solo (por exemplo, Asa de Mosca: 2% por elite, 4% por miniBoss).
- **Solo:** o estoque é atualizado no save na hora. **Online:** o servidor lê o estoque da sua conta, decide o uso
  e grava no fim da partida as asas ganhas e as asas e poções usadas.
- **Sair no meio da partida online** continua sem dar prêmio, como antes. Mas agora o que você **gastou**
  (asas e poções) é descontado da conta. Antes daria para usar uma asa, sair e ficar com ela.

### Labirinto da Floresta, nos dois modos
- Os monstros nascem **na sua sala**. Os portais nas bordas levam a outra sala:
  - **solo**: sala sorteada;
  - **grupo**: destino fixo de cada portal, para todos conseguirem se seguir.
- **Guardião dos Portais (encontro secreto)**: depois de 55 s e de algumas viagens entre salas, ele pode aparecer
  na sala e chamar o grupo. Enquanto ele vive, os portais ficam selados. Ao derrotá-lo: baú do segredo,
  baú de forja, Zeny e EXP.

### Rota da missão, nos dois modos
- No selo da missão aparecem os botões **Purificar** e **Relíquia**. No online, qualquer jogador pode escolher;
  vale a primeira escolha. Ficar 3 s no selo sem escolher escolhe **Relíquia**.
  - **Purificar**: 2 elites, depois consagrar → +40 EXP, baú de forja e **+12% de dano contra o MVP**.
  - **Relíquia**: 3 elites, depois recuperar → +90 EXP e baú de elite.
- Enquanto canaliza no selo, você recebe 38% menos dano, e levar dano pausa a canalização por 0,5 s.

### Golpe básico no quadro de impacto (regra do solo)
- O crítico e o erro são sorteados quando o golpe começa, mas **o dano só entra quando a arma encosta** (ou o
  disparo sai): espada 53%, adaga 43%, machado 64%, maça 60%, arco 62%, cajado 63% da animação. São os mesmos
  números da animação desenhada. Se o alvo sair do alcance antes do impacto, o golpe não acerta.
  Na V22.6 isso só existia no solo; no online o dano entrava no primeiro quadro.

### Código antigo do solo apagado
- O `game.js` passou de **4.163 para 2.762 linhas**. Saíram a simulação antiga (movimento e ataque dos monstros,
  dano, magias, loot, ondas, árvore de habilidades dentro da run e o MVP de campo) e o caminho antigo do convidado
  no online.
- Ficaram só tela, controles e efeitos: desenho do mapa e dos personagens, HUD, janelas, inventário, menus, sons,
  previsão do movimento e interpolação dos outros jogadores.
- O botão "Árvore" continua no HTML, mas fica escondido dentro da run.
- Nenhum sprite, ícone, modelo ou efeito foi removido: a pasta `assets/` tem os mesmos **484** arquivos de antes.

### Correções encontradas nos testes
- Ao entrar numa fenda MVP pela Asa de Borboleta, o aviso dizia "destrua os 3 selos" (texto da fenda comum).
  Agora diz "Derrote o MVP em até 2 minutos".
- O desconto de asas e poções de quem sai no meio do online (explicado acima).

## O que ficou de fora
- Os scripts `roguelike.js`, `v12-systems.js`, `trials.js`, `run-loot.js` e `run-items.js` ainda guardam as
  **funções antigas da run** do solo: fenda, elite de campo, Prova da Guilda, efeitos de dano. Ninguém mais chama
  essas funções; o motor faz tudo isso. Continuam nesses arquivos as partes usadas: dados, textos, inventário e HUD
  da missão. Os testes comparam os dados desses arquivos com o motor. Dá para limpar esses restos numa próxima
  versão, sem mudar o jogo.
- O Guardião dos Portais **não foi testado no navegador**, só nos testes do motor. Os portais do labirinto foram
  testados no navegador, no online.
- A Poção de Cura no online foi testada só pelo motor. No navegador o personagem estava com HP cheio, e a poção não
  é usada com HP cheio.

## Testes
`npm test` roda **117 testes** (108 das etapas anteriores + 9 novos em `tests/v23-field.test.cjs`):
- os dados do motor são iguais aos scripts do jogo:
  - forja, taxas das asas e cronograma das fendas;
  - as 25 salas e 100 portais do labirinto são os mesmos do gerador de mapas;
- elites de campo a cada 90 s (4º Comandante), fendas aos 2/4/6/8/10 min e itens com prazo a cada 65 s;
- Asa de Mosca: fuga, proteção, cura, recarga, uso automático e sem estoque. Poção de Cura: estoque e recarga;
- Asa de Borboleta: o grupo vai junto, o MVP tem 120 s e carta de 1%, e não funciona depois do portal do MVP;
- queda de asas (taxa do solo). A conta grava ganhos e usos, nunca fica negativa, e quem sai no meio perde o que
  gastou;
- forja: opções dos itens equipados, máximo de +4, garantida no Comandante e 30 Zeny sem equipamento;
- rota da missão: escolha automática, a rota não muda depois de escolhida, Purificar dá forja e +12%, e a
  canalização pausa;
- labirinto: monstros nascem na sala, portais funcionam, o Guardião aparece, sela os portais e dá o baú;
  em grupo o destino é fixo;
- a tela manda asas, poção e rota para o motor.

Testes antigos ajustados à mudança do golpe básico:
- V16 e V17 conferem a espera do impacto no motor (e que os números são os mesmos da animação);
- V21 espera o impacto antes de procurar o dano.

O teste de **paridade** (Node x Chrome) agora também escolhe rota, usa Asa de Mosca e Poção de Cura no meio da
partida, e o resultado é idêntico nos dois.

### Testado no navegador (Chrome, sem erros no console)
- **Solo**:
  - estoque de asas e poções vindo do save;
  - botões de rota;
  - Asa de Mosca pelo inventário (teleporte, estoque 3→2, recarga de 60 s);
  - poção (estoque 2→1; o HP subiu mais que 25% porque somou com a cura da Asa de Mosca usada logo antes);
  - baú verde da forja (painel com os itens equipados, escolha aplicada);
  - elite de campo com nome;
  - item de campo com prazo;
  - Asa de Borboleta levando à fenda contra o Doppelganger;
  - **60 FPS**; o motor gasta cerca de 0,5 ms por passo.
- **Online** (2 navegadores, WebSocket):
  - o convidado escolhe "Purificar" e os dois veem a mesma rota;
  - Asa de Mosca decidida pelo servidor (posição e estoque 2→1);
  - depois de sair, a conta ficou com 1 asa;
  - **labirinto**: o jogador andou até o portal da sala e o servidor o levou para a sala 18.
- **Desempenho do servidor**:
  - 6 jogadores, 280 monstros, 10 minutos: em média **1,67 ms por tick** (de um orçamento de 50 ms);
  - snapshots dos 6 jogadores: 0,8 ms.
