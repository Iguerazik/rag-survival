# Ecos de Rune-Midgard — V23 · Etapa 3: bênçãos, runas, pets e Códex nos dois modos

## Como atualizar
1. Feche o servidor (a janela do `01_SERVIDOR_ONLINE_V22.cmd`).
2. Extraia este zip **por cima** da pasta `midgard-survivors`. Ele já inclui as Etapas 1 e 2.
   O zip **não** traz a pasta `data/` nem o `cloudflared.exe`: contas, níveis, álbum, itens, pets e Zeny ficam intactos.
3. Abra o `01_SERVIDOR_ONLINE_V22.cmd` de novo. Os scripts não mudaram: `/api/version` ainda responde `22.0.0`,
   e o número da atualização aparece como `patch: 23.3-etapa3`.
4. Peça aos amigos **Ctrl+F5**.

O formato do progresso salvo não mudou (sem migração). Os campos `codexCoins`, `codexFound` e `runSynergies`,
que já existiam, agora também recebem o que se ganha no online.

## O que mudou

### Bênçãos da run nos dois modos (regra do solo)
- Baú azul, baú de elite e tesouro do MVP oferecem **3 bênçãos** para escolher, com o mesmo sorteio do solo:
  a raridade depende do tipo de baú e do mapa, e as bênçãos respeitam a classe.
  No online, cada jogador do grupo escolhe a sua.
- Antes, no online, esses baús davam bônus genéricos ("+ Dano", "+ HP"). Agora dão bênçãos, como no solo.
- O **baú azul comum** (0,35% por monstro, no máximo 4 no chão, some depois de 65 s) agora também cai no online.
- As 33 bênçãos e as 16 **combinações** (por exemplo, Lâmina Temperada + Juramento do Caçador = Lâmina das Valquírias)
  funcionam no motor único:
  - atributos, % de dano, HP, SP, velocidade, recarga, EXP, Zeny e alcance de coleta;
  - dano contra elites e MVPs, resistência a dano;
  - efeitos no acerto: lentidão, queimadura, roubo de vida e o raio do Eco do Trovão.
- O inventário da run (aba Itens) mostra as bênçãos e as combinações ativas também no online.

### Runas de habilidade nos dois modos
- **Cadeia Rúnica:** a partir do nível 3 da run, um acerto salta para mais 2 inimigos (a cada 1,1 s).
- Ao subir de nível (a partir do 3), uma das 3 opções pode ser uma **runa** para uma habilidade ativa já aprendida:
  - **Cadeia Rúnica:** +1 salto;
  - **Propagação:** espalha dano em até 3 inimigos;
  - **Área Amplificada:** raio +12% e potência +8% (só em habilidades de área).
  No máximo 2 de cada tipo por habilidade.

### Combinações de habilidades e evoluções do Códex nos dois modos
- As 30 combinações de habilidades do solo voltaram, agora com as habilidades do catálogo do RO: usar a 1ª e depois
  a 2ª em até 6 s (as duas no nível 2 ou mais). As de "caça-MVP" só disparam contra elite ou MVP. Todas as
  habilidades dessas combinações existem no catálogo.
- As 18 evoluções do Códex (habilidade nv. 2 + item equipado, por exemplo Golpe Fulminante + Tsurugi = Lâmina Valente)
  dão o bônus durante a partida.
- **Pontos do Códex:** valores iguais aos de antes, só na primeira vez: evolução 240, combinação de habilidades 120,
  combinação de bênçãos 75, e +18 por evolução ativa ao vencer (até 100).
  No solo, o navegador grava como antes; no **online, o servidor grava na conta**. Os pontos ganhos no online não são
  perdidos quando o navegador junta o progresso local.

### Pets nos dois modos
- O pet ativo dá o **bônus dele** e **coleta itens** conforme as melhorias compradas (Coletar Zeny, Coletar EXP,
  Coletar Cura, Ímã do Pet).
- No online, o servidor lê o pet e as melhorias da **conta**; no solo, do save. Bônus e alcance saem sempre da mesma
  tabela do motor, então o navegador não consegue "inventar" um pet mais forte.
- No solo, trocar de pet ou comprar melhoria no meio da partida vale na hora. No online, vale a partir do próximo mapa.

## O que ainda falta
- **Etapa 4:** ataques de MVP e elite com aviso no chão, elementos e fraquezas completos, imbuimentos elementais,
  arena do MVP pelo portal, baú do MVP com equipamento permanente.
- **Etapa 5:** forja durante a run (baú verde), eventos de mapa, labirinto, Asa de Mosca, Asa de Borboleta,
  poções compradas, rota da missão (Purificar ou Relíquia).
- No fim da Etapa 5 o código antigo do solo, hoje desligado no `game.js`, será apagado.

## Testes
`npm test` roda **99 testes** (89 das Etapas 1 e 2 + 10 novos em `tests/v23-run.test.cjs`):
- os dados do motor (bênçãos, combinações, evoluções, pets) são idênticos aos dos scripts do jogo;
- todas as habilidades das combinações e evoluções existem no catálogo do RO;
- baús dão 3 bênçãos diferentes, com raridade pelo tipo de baú e respeitando a classe;
- bênçãos sobem até o limite, mudam o personagem e formam combinações;
- efeitos de acerto acontecem numa partida simulada; a Cadeia Rúnica só começa no nível 3;
- runas aparecem nas ofertas de nível e respeitam o máximo de 2;
- combinação de habilidades e evolução do Códex disparam;
- pet dá bônus, coleta só o que as melhorias permitem, e pet não comprado ou inventado é recusado;
- baú azul cai a 0,35% e some em 65 s;
- o servidor grava os pontos do Códex na conta só na primeira vez e ignora identificadores inválidos.

Dois testes antigos (V22 e V22.5) foram atualizados porque as regras mudaram de propósito: o baú agora dá bênção,
e as ofertas de nível podem ter runa.

O teste de **paridade** (Node x Chrome/Edge) agora usa equipamento, pet, baús com bênçãos e runas.
