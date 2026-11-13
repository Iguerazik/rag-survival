# Ecos de Rune-Midgard V22 — Correções para o multiplayer cooperativo

Esta versão **é uma cópia independente da V21**, não substitui a publicação no Sites e não inclui o banco de contas `data/`.

## Correções integradas

- **Sincronização:** tempo da dungeon exclusivamente do servidor; correções de predição local reduzidas; resposta de `/sync` compactada com gzip quando aceito pelo navegador; eventos por delta com sequência confirmada. O transporte continua HTTP periódico; **ainda não é WebSocket**.
- **Experiência:** cada cristal coletado distribui a EXP a todos os jogadores da sala, incluindo aliados incapacitados.
- **Habilidades:** o servidor registra habilidades aprendidas, permite selecioná-las, calcula usos automáticos e manuais, SP e cooldown. Noviço conjura Cura quando o grupo precisa. Eventos de conjuração, projéteis, cura, impacto e nomes das habilidades são enviados ao cliente e renderizados. As classes avançadas ainda usam regras básicas por linhagem: não há paridade total com o single-player.
- **Combate e paredes:** ataques e habilidades exigem linha de visão; monstros usam navegação em grade para contornar obstáculos. Drops são reposicionados em células transitáveis do mapa do servidor.
- **Monstros:** densidade cresce ao longo da fase com grupos de aparição e escalonamento adequado a 1–6 pessoas; dano/HP reajustados após os últimos nerfs.
- **Baús:** elites deixam baús com três opções de melhorias temporárias, aplicadas no servidor mediante escolha validada. Monstros comuns podem deixar poções de HP.
- **Fendas:** o servidor abre portais em intervalos da expedição; aproximar-se ativa uma pequena defesa em três inimigos, com recompensas ao derrotar todos. É uma mecânica online inicial, não a fenda completa da campanha solo.
- **MVP:** elite a cada dois minutos, MVP a partir dos 12 minutos contabilizados pelo servidor. O chefe pode continuar vivo após o cronômetro atingir 12 minutos; matar o MVP encerra a partida.
- **Interação/HUD:** clique no mapa passa a produzir comandos de movimento online; indicador de ping arrastável (pela alça ⠿ REDE); textos de ressuscitação e menus corrigidos; barra de vida e números de dano continuam discretos.

## Como atualizar sem perder suas contas

1. **Encerre os servidores V21 e o túnel Cloudflare**, se estiver usando o túnel temporário. Não mantenha dois servidores na porta 3001.
2. Extraia a V22 em **outra pasta**. Faça uma cópia de segurança da pasta `data/` da versão ativa mais recente. Com o servidor antigo desligado, **copie `data/` integralmente para `midgard-survivors/data/` da V22**. Isso mantém SQLite, contas e progresso. Nunca publique o banco ou credenciais.
3. Coloque `cloudflared.exe` na nova pasta se usar túnel temporário e não tiver o programa no PATH.
4. Para usar com os amigos na porta 3001, execute `01_SERVIDOR_ONLINE_V22.cmd`, depois `02_PUBLICAR_LINK_PARA_AMIGOS.cmd`. Todos acessam o endereço HTTPS que o Cloudflare mostrar. Para túnel permanente, mantenha sua rota para `http://127.0.0.1:3001` e inicie apenas o servidor V22.
5. Para teste local, use `INICIAR_WINDOWS.bat` e abra `http://localhost:3001/?v=22`. Para contas com `REQUIRE_HTTPS=1`, abra o **endereço HTTPS público**, não o localhost.

Requisitos: **Node.js 22.13+**. `npm start` é um comando executado no terminal **dentro de `midgard-survivors`**. Não é necessário `npm install`, pois o pacote continua sem dependências externas.

## Validação e limitações

Foram executados os testes automáticos existentes e novos testes de EXP compartilhada, cura, fendas, baús, elite/MVP, ressurreição. O servidor iniciou com HTTP e `GET /api/version` e `POST /api/coop/rooms` foram testados. A execução do navegador foi bloqueada por política do ambiente, portanto **não foi possível confirmar visualmente gameplay nem testar seis computadores conectados pela internet**. Recomenda-se iniciar com dois jogadores, depois ampliar.

Limitações atuais: o multiplayer não possui todas as habilidades/itens/fendas do modo solo; o cliente ainda usa HTTP polling (não WebSocket), logo pode haver latência de correção, especialmente em túneis temporários. As animações são adaptações e não quadros exatos oficiais do Ragnarok.
