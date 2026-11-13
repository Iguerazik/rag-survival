# Ecos de Rune-Midgard — V23 · Etapa 4: MVP na arena, ataques com aviso no chão e elementos

## Como atualizar
1. Feche o servidor (a janela do `01_SERVIDOR_ONLINE_V22.cmd`).
2. Extraia este zip **por cima** da pasta `midgard-survivors`. Ele já inclui as Etapas 1, 2 e 3.
   O zip **não** traz a pasta `data/` nem o `cloudflared.exe`: contas e progresso ficam intactos.
3. Abra o `01_SERVIDOR_ONLINE_V22.cmd` de novo. Os scripts não mudaram: `/api/version` ainda responde `22.0.0`,
   e o número da atualização aparece como `patch: 23.4-etapa4`.
4. Peça aos amigos **Ctrl+F5**.

O formato do progresso salvo não mudou (sem migração). Itens ganhos no tesouro do MVP entram na lista de itens
que já existia.

## O que mudou

### MVP na arena pelo portal, nos dois modos (sua decisão)
- Aos 12:00 abre o **portal do MVP** (luz roxa). Pisar nele, ou usar o botão a até 150 de distância, leva
  **o grupo inteiro** para a arena do MVP, como na fenda. A horda do mapa fica para trás.
- Observação: na V22.6, o MVP do solo na verdade aparecia direto no mapa (as funções de portal só redirecionavam).
  Agora os dois modos usam a arena.
- Na arena, o MVP chama reforços (2 a cada 9 s, enquanto houver menos de 9 monstros).
- Ao derrotar o MVP, cada jogador escolhe **1 equipamento permanente** entre até 4 do **tesouro do MVP**, com a
  mesma regra do baú do MVP do solo:
  - itens da sua classe, raridade de acordo com o mapa, com opções (atributos extras);
  - item repetido vira +1 de refino até +8; depois disso, vira Zeny.
  A expedição termina quando todos escolhem, ou depois de 25 s (quem não escolheu leva a primeira opção).
  Cartas que ficaram no chão vão para quem está mais perto.
- **Solo:** o item vai para o seu save. **Online:** o servidor sorteia as opções e grava o item escolhido na sua
  **conta** no fim da partida (só em vitória).

### Ataques com aviso no chão, nos dois modos (regra do solo)
- MVPs, guardiões das fendas e os elites de 2 em 2 minutos atacam com aviso: **linha**, **círculo**, **anel**
  (o centro é seguro) e **invocação**. Os MVPs e guardiões também dão **investida** em linha quando você se afasta.
- O golpe acerta todos os jogadores que estiverem na área, no solo e no online. Sair da área escapa.
- O nome do ataque aparece na tela, como no solo (por exemplo "Coluna de Fogo", "Convocar Besouros").
- Ataques mágicos do MVP (Flor do Luar: círculo e anel; Bafomé: anel) são bloqueados pela
  **Carta Besouro-Ladrão Dourado** (aparece "Imune").
- Dentro das arenas, um golpe **com aviso** não tira mais que 23% do HP (MVP e guardião) ou 34% (outros), como no solo.

### Elementos e imbuimentos elementais, nos dois modos
- A tabela de fraquezas do solo (bROWiki, 10 elementos, 4 níveis) vale no motor. Cada habilidade usa o elemento
  dela no catálogo do RO. O ataque básico e as habilidades sem elemento usam o **imbuimento do colar**.
- Aparece "Fogo ×1,5" quando há fraqueza ou resistência, e "Imune · Fogo" quando o golpe não causa dano.
- Entraram no catálogo único os imbuimentos do solo que faltavam no online:
  - Colar de Brasão Ígneo (Fogo);
  - Colar de Cristal Glacial (Água);
  - Colar de Vento de Payon (Vento);
  - Colar de Rocha de Einbroch (Terra);
  - Colar de Aspersio (Sagrado);
  - Anel de Niflheim (eco: a cada 2 s, um acerto replica 18% do dano em até 3 inimigos).

### Correções encontradas nos testes
- O item escolhido no tesouro não ia para o inventário quando a partida terminava no mesmo instante da escolha.
  Agora o jogo processa todos os eventos do último pacote antes de mostrar a tela de vitória.
- O MVP não solta mais um baú de bênção além do tesouro; o prêmio dele é o equipamento, como no solo.

## O que ainda falta (Etapa 5)
- Forja durante a run (baú verde), eventos de campo, teleportes e encontro secreto do labirinto, Asa de Mosca,
  Asa de Borboleta, poções compradas e escolha de rota da missão (Purificar ou Relíquia).
- Apagar o código antigo do solo, hoje desligado no `game.js`.

## Testes
`npm test` roda **108 testes** (99 das etapas anteriores + 9 novos):
- `tests/v23-mvp.test.cjs` (8):
  - elementos, padrões dos MVPs e itens do motor são idênticos aos scripts do jogo;
  - a tabela de fraquezas dá o mesmo valor do solo em todas as combinações; imbuimento do colar; imunidade;
  - MVP só na arena e o grupo entra junto;
  - avisos no chão acertam só quem está na área; investida, invocação e bloqueio da Carta Besouro-Ladrão Dourado;
  - tesouro do MVP: opções válidas da classe, escolha, fim da expedição, escolha automática em 25 s;
  - regra de item repetido (refino ou Zeny);
  - servidor grava o item na conta só em vitória e ignora item inventado.
- `tests/v23-solo-browser.test.cjs` (+1): no Chrome, o solo chega ao portal, entra na arena, vê o aviso no chão,
  derrota o MVP, escolhe o item e confere que ele foi para o save.

O teste de **paridade** (Node x Chrome/Edge) agora também entra na arena e luta contra o MVP (golpes com aviso).

Para testar o online sem esperar 12 minutos, há uma variável **só de teste** no servidor:
`MIDGARD_TEST_MVP_AT=25` faz o portal abrir aos 25 s (no mesmo padrão da `MIDGARD_TEST_RIFT_AT` que já existia).
Não use em partidas de verdade.
