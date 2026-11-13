# Ecos de Rune-Midgard V21 — Coop mais fluido e interface de combate

Esta cópia foi criada a partir da V20, sem alterar os arquivos da versão anterior.

## Alterações

- **Movimentação**: previsão visual do personagem local com reconciliação suavizada e compensação limitada pelo RTT. O servidor continua calculando posição e regras; correções grandes ainda podem ocorrer.
- **Animações**: as poses de ataque e conjuração agora usam o relógio de exibição local e eventos de combate de servidor, inclusive para o próprio personagem. Armas pixeladas de itens existentes são usadas quando disponíveis. São aproximações, não reproduções completas das animações do RO oficial.
- **Vida e dano**: pequenas barras de HP aparecem temporariamente sobre monstros normais atingidos; elites e MVPs mantêm barras próprias. Números de dano do jogador local são limitados para não poluir a tela.
- **Progressão e dificuldade**: em partidas online, subir de nível recupera ao menos 18 HP ou 24% da vida máxima. Dano e densidade de monstros do início da run foram reduzidos, sobretudo com 2 jogadores. Regeneração leve de HP ao longo do tempo.
- **Ressurreição**: um aliado vivo a até 66 unidades do caído ressuscita automaticamente após cerca de 2,8 segundos de proximidade, sem tecla R. O progresso é exibido para ambos. Servidor valida a ação.
- **HUD**: arraste os painéis pelo cabeçalho com o símbolo ⠿. As posições são salvas no navegador e podem ser restauradas pelas opções de layout.
- **Performance**: redução de atualizações redundantes na HUD online e limites de partículas/números.

## Iniciar no Windows

Exige Node.js >= 22.13. Na pasta `midgard-survivors` execute `INICIAR_WINDOWS.bat`, ou use `01_SERVIDOR_ONLINE_V21.cmd` para hospedagem por Cloudflare Tunnel na porta 3001.

**Não execute V20 e V21 simultaneamente na porta 3001.**

## Compartilhar com amigos usando Cloudflare Tunnel

1. Feche **servidor antigo e túnel antigo**. Faça backup de `data` e copie a pasta de dados da V20 para a pasta V21 (ex.: `data/midgard.sqlite`). Não apague ou substitua um banco de dados mais recente por uma cópia antiga.
2. Copie `cloudflared.exe` para esta pasta, caso seu Cloudflare não esteja no PATH. Não compartilhe tokens nem o banco de dados com seus amigos.
3. Rode `01_SERVIDOR_ONLINE_V21.cmd` (porta 3001).
4. Rode `02_PUBLICAR_LINK_PARA_AMIGOS.cmd` e compartilhe apenas o endereço HTTPS gerado.
5. Amigos entram pela mesma URL, fazem login, entram em Multiplayer e usam o código da sala.

Para túnel nomeado fixo, continue usando a configuração de serviço que você já fez; apenas aponte para o servidor V21 na porta 3001.

## Validação e limites

Os testes de integração locais (`npm test`) verificam a ressurreição por proximidade, eventos de ataque e de dano, cura por nível, e mecanismos básicos de visualização. Testes em rede real com seis computadores e latências variadas ainda não foram realizados. O cliente ainda se comunica por requisições HTTP periódicas em vez de WebSocket; redes com alta latência e perda de pacotes ainda podem sofrer correções de posição. O motor multiplayer não tem ainda paridade com todas as funcionalidades de single-player.

Se o Windows acusar porta ocupada, confira se a V20 ainda está rodando. Para mudar a porta, configure `PORT` no inicializador do servidor e atualize os endereços do arquivo do túnel de forma correspondente.
