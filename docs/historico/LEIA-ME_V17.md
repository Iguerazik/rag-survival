# Ecos de Rune-Midgard V17 — animações e multiplayer cooperativo

Base: **V16 completa**. Esta entrega foi criada separadamente, sem modificar os ZIPs originais nem o Site publicado.

## Animações de combate

- Mantidos os sprites clássicos existentes. Adicionadas **linhas de conjuração para 28 classes que só tinham idle/andar/ataque**, usando poses derivadas dos próprios frames já presentes nos arquivos (4 direções-base, intermediárias por fallback). Espadachim, Mago e Arqueiro já possuíam as linhas de cast. Agora há ataque e conjuração para **31 classes jogáveis**. A duração e o instante do impacto variam por tipo de arma.
- **Skills físicas agora liberam dano/projéteis no quadro de contato**, em vez de antes da animação; habilidades mágicas respeitam o tempo de conjuração. Ataques básicos preservam seus quadros de disparo/impacto.
- Camada de efeitos sincronizados (`combat-v17.js`): runas de conjuração, pulsos elementais, arcos de arma, liberação da flecha e reação ao dano.
- Aliados cooperativos compartilham tipo, habilidade e progresso da pose; renderização de movimento suavizada.
- Não substitui os assets existentes por sprites oficiais que não estejam no projeto. **Não é uma reprodução quadro a quadro de todas as animações oficiais de Ragnarok** para toda combinação de classe, arma e montaria.

## Multiplayer beta

- Atualizado servidor Node.js e interface do lobby: líder configura mapa/dificuldade, convidados confirmam pronto, partida para 2–6 jogadores.
- Limitação de sexto jogador, sanitização de entrada, endpoints de saúde e proteção contra acesso HTTP a arquivos internos.
- Preparação para LAN, Docker/VPS/HTTPS e instalador básico para Windows com Node.js, sem dependências extras no npm.
- **Estado do combate ainda é gerenciado pelo anfitrião**. Consulte `COMO_HOSPEDAR_V17.md` antes de publicar.

## Verificação

- Execute `npm test` — inclui testes dos sistemas anteriores e cenários de 6 conexões, lobby, salas, segurança de arquivos e sincronização.
- Testes visuais completos de navegador, seis jogadores reais e latência externa **não foram validados aqui** (o navegador automatizado bloqueou acesso ao servidor de testes). Ainda são necessários antes de uso público.

## Arquivos alterados/adicionados

`combat-animations.js`, `combat-v17.js`, `assets/ro/v17-cast-actions.js`, 28 PNGs de classe expandidos, `game.js`, `coop.js`, `server.mjs`, `index.html`, `v17.css`, `package.json`, testes V14/V16 ajustados ao versionamento e `tests/v17-coop.test.cjs`, `tests/v17-cast.test.cjs`. Adicionados também `Dockerfile`, `compose.yaml`, `.dockerignore`, `.env.example`, `Caddyfile.example`, `INICIAR_WINDOWS.bat`, `INSTALAR_WINDOWS.cmd`, `COMO_HOSPEDAR_V17.md` e este documento.
