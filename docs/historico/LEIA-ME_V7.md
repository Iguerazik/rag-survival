# Ecos de Rune-Midgard V7 — patch paralelo à V6

> **Não sobrescreve sua build publicada nem os ZIPs fornecidos.** Esta é uma cópia da V6.

## Interface
- Barra superior com atalhos compactos (Status, Equipamentos, Cartas, Inventário, Códex, Pets e Multiplayer), aproveitando os botões e molduras da skin Ragnarok enviada.
- Janelas HUD de informação, minimapa, missão, habilidades e controlador de música podem ser arrastadas por seus cabeçalhos com mouse ou toque. As posições são gravadas em `localStorage` com chave `midgard-hud-layout-v7-desktop/tablet/phone`.
- `↺ HUD` restaura a posição padrão. `🔓 / 🔒` libera e bloqueia os arrastos.
- Os botões da HUD foram deslocados para uma barra separada, evitando sobreposição sobre o HP/SP.

## Sprites dos itens
- Os ícones de equipamentos são **referências aos ícones do RO da Divine Pride** usando seus IDs reais, com fallback para os ícones que já existiam na V6. Foi consultada também a base de IDs da RateMyServer. A conexão é necessária para baixar os PNGs a partir do servidor da Divine Pride; caso o servidor bloqueie hotlink, a versão cai no ícone anterior.
- Os dados, efeitos, nomenclaturas e desenhos originais continuam sendo propriedade dos respectivos titulares. Verifique permissão de uso/redistribuição antes de publicar.
- Arquivos de código para ajustar mapeamentos: `items.js` (`roOfficialItemIds`). Os nomes do jogo são adaptações; itens com nomes equivalentes mas diferentes IDs merecem conferência final.

## Música
- Na tela inicial há só o botão `♫ Música`, que abre um painel de tocar/pausar, volume, escolha de faixa e importação de MP3/OGG autorizado. Na partida, um minipainel controla pausar e volume.
- A faixa de menu **tenta carregar `assets/bgm/ro/08.mp3`** quando habilitado (é Theme of Prontera). **Esse MP3 oficial não foi fornecido** e não é incluído no ZIP. Se ausente, o jogo usa uma trilha alternativa, portanto sem seu arquivo não vai soar exatamente como Prontera.
- A música também pode ser escolhida pelo arquivo local no navegador (apenas a faixa de menu selecionada); para funcionar sempre a cada visita, inclua legalmente o MP3 na pasta indicada.
- Arquivos da pasta `assets/bgm/ambient` são trilhas alternativas criadas para o protótipo.

## Gameplay
- Conjurações e efeitos de sprites duram mais tempo, e skills de área têm cooldown mínimo maior que habilidades simples para reduzir spam.
- A lógica geral, mapas, quests, classes, multiplayer e save da V6 foram preservados.

## Como rodar
- Node.js >=20: na pasta do projeto rode `npm start`, depois abra `http://localhost:3000`.
- Para coop com amigos, hospede o Node.js com HTTPS/WebSockets, acesse a mesma URL hospedada, abra `Multiplayer` e compartilhe o código da sala.
