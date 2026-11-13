# Ecos de Rune-Midgard · V9 — Interface de cliente clássico

**Base:** V8 (progressão e balanceamento, elites, minibosses, guardião secreto do Labirinto, venda de equipamentos e atalhos).

Esta V9 foi construída numa **nova pasta**, sem substituir a V7, V8 ou os ZIPs originais fornecidos pelo dono do projeto. O conteúdo publicado no ChatGPT Sites não foi modificado.

## HUD clássica — o que mudou

- Informações básicas no canto superior esquerdo, com classe, personagem em pixel art, barras HP/SP, nível e Zeny.
- Minimapa separado no canto superior direito, com tempo, abates, onda e próxima batalha.
- Missão da expedição numa janela independente, que pode ser recolhida pelo botão `−`.
- Barra de habilidades com ícones e árvore centralizada na parte inferior, e EXP contínua no rodapé.
- Novo **MENU da expedição** inspirado no cliente do Ragnarok, com botões e imagens provenientes da skin enviada pelo usuário: Status, Equipamentos, Itens, Cartas, Códex, Pets, Tema, Som e Pausa. Cada botão indica a tecla de atalho. O painel pode ser recolhido.
- Janelas movidas individualmente segurando seus cabeçalhos, inclusive o MENU e o controle de áudio; posições personalizadas ficam gravadas por tipo de tela (computador/tablet/celular).
- Botões `↺ HUD` para restaurar e `🔒` para bloquear/desbloquear o arraste.
- Inventário e Códex em tema claro de **janelas do cliente**, com layout compacto, abas e sprites pixelados. As silhuetas de combinações ainda bloqueadas continuam borradas.
- Layout específico para celular e tablet, com atalhos em uma linha na região inferior e painel de música compacto.

## Mantenha as funcionalidades da V8

A V9 inclui toda a V8 — níveis de habilidades com teto crescente por mapa (4, 5, 6, 7, 8, 10); EXP de run menos acelerada; elites e minibosses com baús melhores; chefe secreto aleatório do Labirinto; drops comuns mais raros; baús comuns expiram e se convertem em pouco Zeny; venda de itens não equipados; atalhos e fechamento de menus por clique fora. O servidor de salas de até 6 jogadores permanece incluído, mas partidas remotas longas não foram validadas nesta revisão.

## Atalhos

**Alt+S** Status; **Alt+E** Equipamento; **I** Inventário; **C** Cartas; **D** Códex; **P** Pets; **T** Árvore; **ESC** Pausa. As teclas aparecem nos ícones do menu rápido. Para jogar no celular, use os botões.

## Como executar

1. Extraia o `V9_COMPLETO` **numa pasta nova**.
2. Instale Node.js 20 ou superior.
3. Na pasta `midgard-survivors` rode `npm start`.
4. Abra `http://localhost:3000`.

O servidor online requer hospedagem externa, e o Site estático publicado não recebe essas alterações automaticamente.

## Mesclagem manual com edições em paralelo

No pacote `V9_APENAS_ALTERACOES` existem apenas os arquivos alterados desde a V8:

- `index.html` (nova estrutura do painel MENU, estrutura das janelas e referência de CSS)
- `ro-hud-layout.js` (posicionamento, persistência, arraste, bloqueio, recolhimento)
- `v9-ragnarok-hud.css` (tema visual e responsividade)
- `LEIA-ME_V9.md` e `V9_MANIFESTO.json` (documentação)

**Atenção:** se você alterou o mesmo `index.html` ou `ro-hud-layout.js` no seu projeto, compare as diferenças antes de copiar. A cópia não faz merge automático.

## O que não está incluído

Não incluí músicas oficiais licenciadas. O menu continua preparado para ler a faixa `assets/bgm/ro/08.mp3` quando você fornecer um arquivo autorizado. Os ícones da interface reutilizam o material original de skin que você forneceu, além das artes já existentes na build; nenhum jogo publicado foi substituído.

## Testes V9

- Chromium 1366×860, 1024×768, 780×950, 390×844: carregamento, painel de atalhos, controles, inventário, recolher/expandir missão, e ausência de exceções JavaScript nos fluxos verificados.
- Interação de arrastar, salvar posição, restaurar padrão, bloquear arraste.
- Reteste da V8 em desktop e celular: teto de habilidade por mapa, spawn/recompensa de elite, guardião secreto do Labirinto, drops e venda de item com preço baixo.

Esta build é um jogo de fã: Ragnarok Online e seus ativos pertencem aos respectivos titulares.
