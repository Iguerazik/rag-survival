# Ecos de Rune-Midgard — V22.1 (correções do online)

Atualização de correções sobre a V22. **Nenhum modelo de personagem, monstro ou sprite foi removido ou trocado.**
Mapas, classes, cartas, contas e progresso continuam os mesmos.

## Como atualizar (sem perder contas e progresso)

1. Feche o servidor antigo (janela do `01_SERVIDOR_ONLINE_V22.cmd`) e o link do Cloudflare.
2. Extraia o zip **por cima** da sua pasta `midgard-survivors` atual e confirme "Substituir os arquivos".
   O zip **não** traz a pasta `data` (contas e progresso, `midgard.sqlite`) nem o `cloudflared.exe`,
   então os seus continuam exatamente onde estão.
   - Se preferir extrair em uma pasta nova, copie para ela a pasta `data` e o `cloudflared.exe` da versão antiga.
3. Abra `01_SERVIDOR_ONLINE_V22.cmd` e depois `02_PUBLICAR_LINK_PARA_AMIGOS.cmd`, como sempre.
4. Peça aos amigos para recarregarem a página (Ctrl+F5) se já estavam com o jogo aberto.

Os scripts continuam com o nome V22 e a verificação de versão continua `22.0.0` (o patch aparece como
`"patch":"22.1"` em `/api/version`), então nada muda no seu jeito de abrir o servidor.

## O que foi corrigido

### Servidor "lagado"
- O online agora usa **WebSocket**: o servidor envia o mundo **20 vezes por segundo** e aplica seus comandos
  na hora. Antes, o navegador perguntava ao servidor, esperava a resposta e ainda aguardava 155 ms para
  perguntar de novo (com 150 ms de ping, eram ~330 ms entre atualizações; agora são ~50 ms).
- Se o WebSocket não conectar (rede/antivírus), o jogo volta sozinho para o modo HTTP, mais rápido que antes.
- Pacotes menores: cada jogador recebe só os monstros e itens perto dele (elites, MVP, cartas e baús sempre),
  dados arredondados e compressão `permessage-deflate`.
- Cliente lento não acumula atraso: quadros velhos são descartados em vez de enfileirados.

### Personagem "sabonetado"
- O seu personagem anda **na hora** em que você aperta a tecla e para **na hora** em que solta.
  Antes ele era puxado em direção a uma posição antiga do servidor (deslizava e "elastiquava").
- O servidor continua com a palavra final: valida a velocidade, a colisão do mapa do servidor e o caminho
  (não dá para atravessar paredes nem se teleportar). Se algo for recusado, só a diferença é corrigida.
- Os colegas e os monstros são desenhados com **interpolação** entre as atualizações do servidor
  (movimento contínuo, sem trancos), com o relógio de exibição ajustado ao ritmo real da rede.
- Velocidade do personagem igual no cliente e no servidor (antes havia duas fórmulas diferentes).

### Fenda
- **A fenda é do grupo inteiro:** quando qualquer jogador pisa no portal violeta (ou usa o botão
  "Entrar na fenda com o grupo" a até 150 px), **todos** são levados juntos para a arena da fenda.
- Arena própria no servidor: Guardião, 2 sentinelas e **3 selos rúnicos**. Enquanto houver selos, o guardião
  recebe só 30% do dano; com 55% de vida começa a **Fase II** com novos selos; reforços a cada 12 s.
- 90 segundos de limite. O cronômetro da expedição (elites, MVP às 12:00) **pausa** enquanto o grupo está lá.
- Vitória: todos voltam para onde estavam, +60 Zeny cada, cura de 15% e um baú no lugar do portal
  (EXP/Zeny que ficou no chão da arena é repartido). Tempo esgotado: todos voltam sem recompensa. Se o grupo inteiro cair na fenda, todos voltam com 25% de HP (a run não acaba por causa de uma fenda que só um jogador abriu).
- No modo solo, pisar no portal agora abre a confirmação de entrada (antes só funcionava pelo botão do painel).

### Animações
- Personagens parados não "tremem" mais: os 3 quadros "parado" do RO são direções da cabeça e estavam sendo
  tocados em sequência como animação.
- Monstros não piscam mais entre "andando" e "parado" a cada pacote de rede.
- Monstros no online agora mostram a animação de **ataque** quando acertam alguém.
- Ao levar dano no online, o personagem pisca e toca o som de impacto (antes só a barra de HP mudava).
- A pose de ataque do seu personagem segue o evento exato do servidor (sem iniciar duas vezes).
- Nome e porcentagem de vida de elites/guardiões não ficam mais um em cima do outro.

### Outras correções
- A sala **não cai mais depois de 1 hora** de partida (o limite contava desde a criação da sala).
- Se o líder sair ou cair, a liderança passa para o próximo jogador em vez de encerrar a sala de todos.
- Conexões WebSocket mantêm o jogador na sala mesmo com a aba em segundo plano (ping a cada 10 s).
- O relógio do servidor avança pelo tempo real decorrido (não atrasa se o processo engasgar).
- Habilidades em área não "somem" quando o alvo morre antes do impacto: atingem o local mirado.
- Texto do painel da expedição atualizado para a nova fenda em grupo.

## Para quem hospeda em outro lugar

- Proxies precisam permitir WebSocket em `/api/coop/ws` (Cloudflare Tunnel e Caddy já permitem por padrão).
- `WS_DEFLATE=0` desliga a compressão do WebSocket se algum proxy tiver problema com ela.
- `MIDGARD_TEST_RIFT_AT=10` (somente para testes locais) abre a primeira fenda aos 10 s.

## Testes

`npm test` — 59 testes, incluindo novos testes de WebSocket (20 atualizações/s, origem bloqueada, mensagens
comprimidas), movimento validado (passo aceito, teleporte cortado, parede) e fenda compartilhada (entrada do
grupo, relógio pausado, vitória e tempo esgotado).
