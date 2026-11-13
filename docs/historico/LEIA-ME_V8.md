# Ecos de Rune-Midgard V8 – Progressão, elites e labirinto

Esta é uma **cópia nova**, gerada sobre a versão V7, com arquivos diferentes dos ZIPs originais. A build publicada no ChatGPT Sites NÃO foi alterada.

## Progressão da expedição
- Nível máximo de habilidades da run: 10 (adaptação Survivors, não uma reprodução de todos os limites oficiais de cada skill do RO).
- Limite por mapa, seguindo a ordem de desbloqueio: Esgotos 4, Payon 5, Labirinto 6, Orc 7, Geffen 8, Floresta de Payon 10.
- Curva da EXP da run mais demorada, e pontos de habilidades deixam de ser concedidos a cada nível após o começo.
- A árvore guarda pontos excedentes para os mapas seguintes e exibe o limite atual na HUD.
- Evolução de mapas no mesmo percurso preserva os talentos e habilita novas opções.

## Elites e minibosses
- Em cada mapa normal: elite aos 65 s, miniboss aos 150 s, segundo elite aos 235 s (aproximado, se houver espaço para spawn).
- Elite: barra de HP e aura, baú raro garantido e Zeny adicional.
- Miniboss: mais vida, aura, baú raro garantido e baú de melhoria.
- Cartas continuam com chance baixa – a carta só existe para monstros que já possuem cartas cadastradas.

## Labirinto
- Os teletransportes continuam aleatórios no solo.
- Depois de 2 visitas e do primeiro minuto há uma chance de 24% por teleporte de despertar o Guardião dos Portais. Até 8 visitas o encontro é garantido.
- O guardião bloqueia os portais durante a luta, telegráfa ataques e invoca monstros, e ao morrer deixa baú especial, forja e Zeny.
- É um encontro de design próprio para o mapa, inspirado no Ragnarok, não um boss oficial.

## Itens e economia
- Redução da chance de baú comum dos monstros para 0,35% e baú de melhoria comum para 0,3%. Elites/minibosses garantem recompensas.
- Baús comuns esquecidos somem em aproximadamente 65–70 s e deixam um pequeno valor em Zeny. Recompensas de MVP e elites não expiram.
- Inventário com botão Vender por item. Os itens equipados não podem ser vendidos.
- Itens com cartas podem ser vendidos individualmente, mas as cartas retornam ao álbum.
- Vender sobras: vende apenas itens de tier 1–2 não equipados, sem refino e sem cartas. Nunca vende automaticamente itens melhores.
- Preços deliberadamente baixos: 11 a 101 Zeny, conforme tier e refinamento.

## Janelas/atalhos
- Inventário tecla I, cartas C, códex D, pets P, árvore T, pausa ESC.
- Status Alt+S e Equipamento Alt+E para não atrapalhar o movimento WASD.
- Atalhos e seus nomes aparecem na HUD.
- Clicar no fundo escurecido fecha inventário, álbum, códex, pets e janelas opcionais.
- Ao abrir encaixes de equipamento pelo inventário, há um botão Voltar ao inventário.
- Escolhas obrigatórias de baú e aumento de nível NÃO são descartadas com um clique fora.

## Executar
1. Extraia o ZIP completo em uma PASTA NOVA, sem substituir a build em que você está trabalhando.
2. Instale Node.js >=20, execute `npm start` na pasta `midgard-survivors`.
3. Abra `http://localhost:3000` em seu navegador.
4. Para integrar em outra edição, compare os arquivos do pacote APENAS_ALTERACOES com a versão que você continua desenvolvendo.

## Verificações efetuadas
- Syntax check de game.js, items.js, progression.js, encounters.js.
- Chromium desktop 1366x860 e celular 390x844: carregar assets, iniciar run, nível de skill por mapa, spawn/derrota de elite, guardião secreto, geração de baús e venda.
- Interface desktop: venda, abrir encaixes, voltar ao inventário, clique fora de modais, hotkeys I/C/D/P/Esc.
- Não foram executados testes de longa duração com seis jogadores remotos; multiplayer real continua exigindo validação adicional.

Jogo de fã. Ragnarok Online e suas marcas, sprites e músicas pertencem aos respectivos titulares.
