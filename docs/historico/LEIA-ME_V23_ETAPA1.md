# Ecos de Rune-Midgard — V23 · Etapa 1: motor único

## Como atualizar
1. Feche o servidor (a janela do `01_SERVIDOR_ONLINE_V22.cmd`).
2. Extraia este zip **por cima** da pasta `midgard-survivors`, substituindo os arquivos.
   O zip **não** traz a pasta `data/` nem o `cloudflared.exe`: suas contas, níveis, álbum, itens e Zeny ficam intactos.
3. Abra o `01_SERVIDOR_ONLINE_V22.cmd` de novo. Os scripts `.cmd` continuam iguais
   (o `/api/version` ainda responde `22.0.0`; o número da atualização aparece como `patch: 23.1-etapa1`).
4. Peça aos amigos **Ctrl+F5** no navegador.

Nenhum formato de progresso salvo mudou nesta etapa, então não há migração e nada é apagado.

## O que mudou

### Motor único (solo e online usam o MESMO código)
- As regras de combate saíram do `authoritative-world.mjs` e foram para a pasta nova **`engine/`**:
  - `engine/core.mjs`: monstros, dano, habilidades, SP, fenda, missão, imbuimentos, baús e Prova da Guilda;
  - `engine/dmath.mjs`: matemática que dá o mesmo resultado em qualquer computador e navegador;
  - `engine/cards-data.mjs`: lista dos monstros que têm carta;
  - `engine/browser.mjs`: carrega o motor no navegador.
- O `authoritative-world.mjs` virou só um adaptador: o servidor lê os arquivos e entrega ao motor.
- **Solo = sala local de 1 jogador** (arquivo novo `local-room.js`). O motor roda dentro do navegador a
  20 passos por segundo, igual ao servidor, e a tela usa o mesmo código que desenha o online.
- Agora, qualquer ajuste de regra feito em `engine/core.mjs` vale nos dois modos automaticamente.
- Habilidades nos dois modos: leque sorteado do catálogo do RO (`online-skills.json`), no máximo 5 ativas
  por run e passivas livres. A árvore fixa não aparece mais dentro da run; o botão "Árvore (T)" some na partida.
- O progresso do solo continua sendo gravado como antes (EXP de Base e Classe, Zeny, mapas liberados,
  cartas no álbum, Prova da Guilda, metas de mudança de classe). Se você estiver logado, ele também vai para a conta.

### Regras unificadas (vale a do solo)
- **Sorte (SOR), agilidade e destreza**, iguais nos dois modos:
  - CRIT = 1 + SOR×0,3 (%). O crítico vale só no ataque físico básico, causa ×1,4 e a Katar dobra a chance.
    Antes, no solo, o crítico de equipamento e bênção era somado duas vezes.
  - Esquiva Perfeita = 1 + SOR/10 (%).
  - FLEE = 100 + nível + AGI + SOR/5. Cada monstro além de 2 colado em você tira 10% do FLEE.
  - HIT = 175 + nível + DES + SOR/3. O ataque básico pode **errar** monstro de nível alto (aparece "Errou").
  - Magia não crita nem erra.
  - A sorte **não** mexe em drop.
- **Cartas:** a taxa continua 0,035% por monstro comum. Foi corrigido o bug do online que sorteava
  "carta" até de monstro que não tem carta (ex.: Gatuna e Gatuno), o que fazia aparecer "CARTA RARA!" com
  nome estranho e deixava a carta parecer mais fácil no online.

### Outras correções
- **"undefined" na forja da expedição:** a opção de velocidade de ataque não tinha nome. Agora aparece
  "Velocidade de ataque".
- **Pets com o sprite dos monstros** (o mesmo do Bestiário): Poring, Lunático e Bafomé Jr. O Poporing usa o
  sprite do Poring tingido de verde. A loja de pets também mostra o retrato. **Familiar e Alice** ainda não têm
  arte no jogo e continuam com o desenho antigo, aguardando sua decisão.
- Segurança: o servidor só entrega arquivos `.mjs` da pasta `engine/`. O código do servidor
  (`server.mjs`, `accounts.mjs` e outros) continua bloqueado.

## O que ainda falta (próximas etapas)
Como combinado (opção B), o solo agora roda só no motor novo. Até as próximas etapas, **o solo não tem**:
- **Etapa 2:** efeito de equipamentos e cartas equipadas dentro da partida (refino, opções, cartas).
- **Etapa 3:** bênçãos de nível (baús azuis), Cadeia Rúnica, Propagação, Área Amplificada e bônus dos pets.
  O pet aparece e segue você, mas ainda não dá bônus nem coleta itens.
- **Etapa 4:** ataques de MVP e elite com aviso no chão, elementos e fraquezas, arena do MVP pelo portal.
  Por enquanto o MVP aparece no próprio mapa aos 12:00, como no online.
- **Etapa 5:** eventos de mapa, teleportes e encontro secreto do labirinto, Asa de Mosca, Asa de Borboleta,
  poções compradas, forja durante a run, escolha de rota da missão.

Outras diferenças do solo, que agora funciona como o online:
- Ao subir de nível, a escolha aparece num painel e **a partida não pausa** (escolha automática depois de 18 s).
  A pausa do jogo (Esc/Pausa) continua parando tudo.
- Ao vencer o MVP, a partida termina e o botão "Próximo mapa" começa o mapa seguinte do zero, em vez de
  seguir com o mesmo nível de run.
- O código antigo do solo continua no `game.js`, desligado, só como referência para portar os sistemas nas
  próximas etapas. Ele será apagado na Etapa 5.

## Testes
`npm test` roda **82 testes** (eram 69). Os novos:
- `tests/v23-parity.test.cjs`: **paridade**. Mesma semente e mesmos comandos dão exatamente o mesmo resultado
  com o motor rodando no Node e no navegador (Chrome ou Edge sem janela). Se o computador não tiver Chrome nem
  Edge, esse teste aparece como "pulado" (skipped), com o motivo.
- `tests/v23-engine.test.cjs`: carta só de monstro com carta, sorte/CRIT/HIT/FLEE/Esquiva Perfeita, crítico só
  no ataque básico, nomes da forja, pets.
- `tests/v23-solo-browser.test.cjs`: abre o jogo de verdade, joga o solo, morre e confere se a EXP e o Zeny
  foram gravados; confere também quais arquivos o servidor entrega.

Os testes com navegador abrem o Chrome ou o Edge sozinhos e sem janela, sem instalar nada.
