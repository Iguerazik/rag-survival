# Ecos de Rune-Midgard V19 — Servidor autoritativo (primeira versão jogável)

## O que mudou

**Antes (V18):** o anfitrião simulava o combate no navegador, enviava a lista de monstros e podia enviar dano, HP e recompensas. Isso permitia adulterar a partida pelo console do navegador.

**Agora (V19):** durante partidas cooperativas online, o Node.js mantém uma simulação independente em memória e avança o mundo com um relógio de **20 atualizações por segundo**. O navegador envia **intenções** de movimento, ataque, skill e escolha entre melhorias autorizadas. O servidor valida os comandos e calcula posições, obstáculos, inimigos, dano, HP/SP, recarga, XP, evolução, elites, MVP, drops, coleta e fim da partida. Um navegador não pode enviar HP, posição, dano, acertos, inventário de drop ou vitória válidos para substituir os dados do servidor.

Itens do chão são concedidos ao **jogador vivo mais próximo** dentro do raio de coleta, sem privilégio ao líder da sala. Todos os participantes, inclusive o líder da sala, recebem um **snapshot calculado no servidor**. O frontend prevê o movimento visual do próprio personagem e reconcilia a posição com os snapshots recebidos. A comunicação, por enquanto, é **polling HTTP same-origin**, não WebSocket.

### Regras incluídas no multiplayer V19

- Salas de **2 a 6 pessoas**, contas obrigatórias, nick único por conta e classe selecionada por cada participante.
- O líder escolhe mapa e dificuldade; os **desbloqueios são checados pelo servidor para cada linhagem** antes de começar.
- Elites a cada **2 minutos**; MVP ao chegar aos **12 minutos**. Vitória somente quando o MVP é derrotado, derrota se toda a equipe morrer.
- Movimentação limitada pela velocidade de cada classe, validada contra uma representação de colisão do mapa preparada no servidor.
- Combate automático com recarga, habilidades enviadas como comandos, barras de HP, experiência, escolha de 1 entre 3 habilidades e drops sorteados no servidor.
- Recompensas de partida registradas com transação **SQLite idempotente**: uma mesma partida não pode pagar Zeny/cartas duas vezes para a mesma conta.
- Bloqueio de alterações enviadas pelo navegador nos campos econômicos protegidos da conta quando `STRICT_ONLINE_PROGRESS=1` (padrão).
- Estado das partidas separado por sala. Partidas e monstros ficam na memória do processo Node; contas/recompensas persistem no banco.

## Iniciar no Windows

1. **Extraia o ZIP completo** numa pasta nova. Não copie por cima da V18.
2. Instale **Node.js 22.13 ou superior**. Confirme com `node --version`.
3. Entre na pasta `midgard-survivors`. Dê dois cliques em `INICIAR_WINDOWS.bat`, ou abra o terminal nessa pasta e execute `npm start`.
4. Abra **http://localhost:3000/**. Crie sua conta em **Entrar / Criar conta**.
   **Se já possuía contas na V18 local:** pare o servidor antigo, faça backup de toda a pasta `data/` (incluindo arquivos SQLite WAL/SHM) e configure `DATA_DIR` para apontar para esse mesmo banco ou migre a pasta de dados com o servidor desligado. Uma nova pasta sem o banco antigo começa com contas vazias; a V19 não as transfere automaticamente.
5. Seu amigo acessa o **mesmo servidor** (endereço da sua máquina na LAN ou domínio HTTPS), cadastra outra conta e entra pelo código da sala. Não abra duas instâncias de `node server.mjs` na mesma porta.

Não é preciso `npm install`: o projeto utiliza módulos nativos do Node.js.

### Jogar com amigos na rede local

Descubra seu IP local com `ipconfig` (por exemplo `192.168.0.20`). No computador dos amigos, use `http://192.168.0.20:3000` e permita acesso à porta TCP **3000** no firewall do Windows para **rede privada**. A máquina anfitriã deve permanecer ligada. **Não exponha HTTP sem criptografia diretamente na internet pública.**

### Hospedar pela internet

Use um **VPS com Node.js 22.13+ ou Docker** e um domínio HTTPS com proxy reverso confiável. Há `Dockerfile`, `compose.yaml`, `Caddyfile.example` e `.env.example` no projeto.

1. Configure armazenamento persistente: `DATA_DIR` (ou volume Docker `midgard-accounts`) para o SQLite.
2. Configure no proxy HTTPS `TRUST_PROXY=1`, `REQUIRE_HTTPS=1`, `STRICT_ONLINE_PROGRESS=1`, `ALLOW_GUEST_MULTIPLAYER=0`.
3. Não exponha diretamente a porta Node com `TRUST_PROXY=1`: faça essa comunicação apenas pelo proxy confiável.
4. Inicie `docker compose up -d --build` ou `npm start` se usar Node diretamente.
5. Consulte `https://SEU_DOMINIO/api/health` e `https://SEU_DOMINIO/api/version`. Compartilhe **o mesmo domínio HTTPS** com seus amigos.
6. Faça cópias de segurança consistentes do banco de dados; não copie um arquivo SQLite ativo sem considerar o WAL.

**Controles de segurança:** não publique seu arquivo `data/midgard.sqlite` nem a pasta `data/`. O servidor bloqueia o acesso HTTP a arquivos privados. Para um lançamento público, também adicione confirmação de e-mail, recuperação de senha, controles de abuso/rate-limit no proxy, logs de auditoria e observabilidade.

## Progresso persistente — atenção

Na V18, o navegador enviava todo o inventário, Zeny, cartas, mapas e níveis para o banco. Isso era inseguro para partidas públicas. Agora, **somente as recompensas confirmadas pelo servidor multiplayer** entram na economia online protegida.

O jogo **single-player continua com a simulação antiga no navegador** e pode ser usado localmente; porém, em `STRICT_ONLINE_PROGRESS=1`, ele **não poderá gravar unilateralmente Zeny, itens ou desbloqueios na economia protegida da conta**. Dados de personagens antigos podem precisar de migração administrativa controlada. A configuração `STRICT_ONLINE_PROGRESS=0` preserva o comportamento anterior de salvar pela interface, **mas permite falsificações** — use apenas em ambiente isolado e não em produção.

## Limitações reais desta primeira implementação

Este é o **núcleo do servidor autoritativo**, não uma migração completa do jogo para lógica 100% equivalente ao modo solo:

- O combate cooperativo usa uma seleção de habilidades e valores simplificados. Nem todos os efeitos oficiais de classes, combos de Códex, cartas, pets, imbuimentos, fendas, teletransportes do labirinto, refinamentos e itens da V18 foram traduzidos para o motor do servidor.
- As recompensas co-op atualmente incluem Zeny, cartas raras e desbloqueio de mapa/dificuldade; baús encontrados durante a partida concedem **Zeny no servidor**, ainda sem o fluxo completo de seleção/equipamento de itens. A economia de equipamentos permanente precisa de tabelas e regras server-side adicionais.
- O jogo usa **polling HTTP** (~8 Hz na partida) com simulação a 20 TPS. WebSocket e interpolação avançada ficam para uma próxima versão.
- Salas ficam **na memória** e se perdem no reinício do processo. Há timeout de inatividade; reconexão ao mesmo personagem não está completa.
- Ainda são necessários testes reais de equilíbrio, latência e jogabilidade com 2–6 pessoas e partidas completas de 12 minutos; o navegador visual automatizado foi bloqueado no ambiente de produção desta build.
- O instalador `INSTALAR_WINDOWS.cmd` cria arquivos/atalho, **não gera um executável `.exe` independente**.

## Testes

Execute `npm test`. Foram verificados 37 testes automatizados, incluindo: cadastro/autenticação, seis participantes, permissões de sala, resistência a manipulação de HP/posição/dano/estado enviadas pelo anfitrião, movimento server-side, spawn de elites/MVP por tempo, recusa de falsificação de Zeny e cartas e pagamento idempotente no SQLite. Os testes de unidade não substituem uma partida visual completa nem um teste de carga público.

## Arquivos de maior interesse

- `server.mjs`: HTTP, autenticação, salas, controle de acesso, relógio do jogo e pagamento.
- `authoritative-world.mjs`: movimento, IA dos inimigos, HP, combate, experiência, drops e relógio server-side.
- `server-maps.json`: dados de colisão, usados **somente no servidor**.
- `accounts.mjs`: SQLite, sessões, progressão protegida e registro idempotente das recompensas.
- `coop.js`: cliente de salas que envia comandos e recebe snapshots.
- `game.js`: renderização/sincronização de co-op e modo solo preservado.
- `v19-authority.css`: painel de seleção de melhoria confirmado pelo servidor.
- `tests/v19-authority.test.cjs`, `tests/v19-ledger.test.cjs`: testes de regressão e segurança.

**Não sobrescreva uma pasta onde você também esteja editando!** Compare o ZIP de alterações ou utilize uma branch Git para mesclar manualmente.
