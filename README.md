# RAG SURVIVAL

Jogo de sobrevivência contra hordas de monstros inspirado em **Ragnarok Online**, jogado no navegador.
Antigo nome: *Ecos de Rune-Midgard*. Solo ou cooperativo com até 6 amigos, com classes até a terceira
classe, renascimento, árvores de habilidades, equipamentos, cartas, Zeny, MVPs com 4 fases, fendas e baús.

> Jogo de fã sem fins lucrativos. Ragnarok Online e seus recursos gráficos pertencem à Gravity.

## Estrutura do projeto

| Caminho | O que é |
|---|---|
| `server.mjs` | Servidor HTTP + WebSocket: salas, lobby, laço de simulação (60 TPS), arquivos estáticos |
| `engine/core.mjs` | **Motor único** de combate (servidor autoritativo no online e "sala local" no solo) |
| `engine/*.mjs` | Dados do motor (combate, cartas, run) e matemática determinística |
| `authoritative-world.mjs` | Adaptador do servidor para o motor (carrega mapas e catálogo) |
| `accounts.mjs` | Contas, sessões e progresso em **SQLite** (`node:sqlite`) |
| `server-gear.mjs` | Equipamento/cartas da conta calculados no servidor (mesmo `items.js` do navegador) |
| `data-admin.mjs` | Backup e restauração do banco pela API administrativa (`ADMIN_TOKEN`) |
| `ws.mjs` | WebSocket mínimo (RFC 6455) sem dependências, com permessage-deflate |
| `index.html`, `*.js`, `*.css` | Cliente do jogo (navegador) |
| `assets/` | Sprites, ícones, efeitos, sons e mapas |
| `online-skills.json`, `server-maps.json` | Catálogo de habilidades e grades de colisão (usados pelo motor) |
| `tests/` | Testes automatizados (`node --test`) |
| `tools/` | Scripts de geração de dados e `bench-tps.mjs` (benchmark de ticks) |
| `docs/historico/` | Notas de versões anteriores (V4 → V23.7), guardadas só como histórico |
| `Dockerfile`, `docker-entrypoint.sh` | Publicação no Railway (ou qualquer Docker) |

## Tecnologias

- **Node.js 22.13+** (testado no 22.23), ES modules, **sem dependências npm**
- `node:sqlite` (contas e progresso), `node:crypto` (scrypt, tokens), `node:zlib` (compressão)
- WebSocket próprio, HTTP puro, cliente em JavaScript/CSS sem build

## Multiplayer: TPS, snapshots e FPS

| Grandeza | Valor | Onde |
|---|---|---|
| **TPS** (simulação do servidor) | **60/s** (16,67 ms por tick), passo fixo | `TICK_RATE` em `server.mjs` |
| **Snapshot rate** (estado enviado pela rede) | **20/s** (a cada 3 ticks) | `SNAPSHOT_RATE` |
| **FPS** (desenho no navegador) | o do monitor (requestAnimationFrame) | `game.js` |

- O servidor é **autoritativo**: o navegador envia só intenção (movimento, habilidade, escolha); dano, drops e
  recompensas são decididos no servidor.
- O cliente **interpola** os outros jogadores (atraso adaptativo de 85–450 ms conforme o ritmo e a oscilação dos
  pacotes), **prevê** o próprio movimento e faz **reconciliação** com o servidor (`game.js`, seção *netcode*).
- Até a V23 a simulação era a 20 TPS. Na V24 ela passou a 60 TPS mantendo o **ritmo de jogo idêntico**: os prazos do
  motor (spawns, cadência de ataque, recargas, durações) seguem a mesma grade de 50 ms da V23 (`timerGrid`), enquanto
  comandos, movimento, colisões e projéteis são processados a cada 16,7 ms.
- O modo solo continua a 20 passos/s no navegador (mesmo motor, mesmas regras).
- `GET /api/health` mostra o TPS medido e a duração dos ticks (média, p95, p99, máximo, ticks acima de 16,67 ms).
  No Railway o servidor também registra essas medidas no log a cada minuto de partida.

## Forja (refino até +10)

Configuração central em `items.js` → `RefineRules` (chances, chance de quebra, custos e bônus por nível).
Com conta, o **servidor** sorteia e grava (`POST /api/account/refine`, transação SQLite com `requestId` contra repetição);
sem conta, o navegador usa as mesmas regras. Detalhes e tabela: `docs/FORJA.md`.

## Requisitos

- Node.js **22.13 ou superior** (`node -v`)
- Nenhum `npm install` é necessário

## Rodar localmente

```bash
node server.mjs            # http://localhost:3000
# ou no Windows: INICIAR_WINDOWS.bat (porta 3001)
```

Variáveis úteis no PC: `PORT=3001`, `DATA_DIR=./data`. O banco é criado sozinho em `data/midgard.sqlite`.

## Variáveis de ambiente

| Variável | Padrão | Railway | Descrição |
|---|---|---|---|
| `PORT` | 3000 | 8080 (automática) | Porta HTTP (o Railway define) |
| `HOST` | 0.0.0.0 | 0.0.0.0 | Interface de rede |
| `TICK_RATE` | 60 | 60 | Ticks de simulação por segundo |
| `SNAPSHOT_RATE` | 20 | 20 | Snapshots de rede por segundo |
| `DATA_DIR` | `./data` | `/data` | Pasta do SQLite (volume persistente) |
| `TRUST_PROXY` | 0 | **1** | Confia no HTTPS/IP informados pelo proxy do Railway |
| `REQUIRE_HTTPS` | 0 | **1** | Conta/login só por HTTPS, cookie `Secure` |
| `ADMIN_TOKEN` | vazio | segredo aleatório | Liga `/api/admin/backup`, `/status` e `/restore` |
| `MAX_ROOMS` | 150 | 150 | Limite de salas simultâneas |
| `STRICT_ONLINE_PROGRESS` | 1 | 1 | Limites de plausibilidade para o progresso do solo |
| `ALLOW_GUEST_MULTIPLAYER` | 0 | 0 | Convidados sem conta no online (só testes) |
| `MIDGARD_AUTO_UPDATE` | 1 | 0 | Reinício automático ao trocar arquivos (Windows) |

Veja `.env.example`. **Nunca** envie um `.env` com valores reais ao Git.

## Testes

```bash
npm test                      # suíte completa (inclui testes de navegador se houver Chrome/Chromium)
node tools/bench-tps.mjs . 60 780 7 6 god   # partida completa com 6 bots: duração dos ticks a 60 TPS
```

## Persistência dos dados

- Contas, personagens, níveis, classes, renascimentos, EXP, Zeny, inventário, cartas, equipamentos e recordes ficam no
  **SQLite** em `DATA_DIR` (`midgard.sqlite`). No navegador ficam só preferências (tema, teclas, volume) e o save de quem
  joga **sem conta** (`localStorage`, chave técnica `midgard-survivors-v1`, mantida para não perder saves antigos).
- Nomes técnicos antigos (`midgard_sid`, `midgard-*`, `midgard.sqlite`, `MIDGARD_*`) foram **mantidos de propósito**:
  trocá-los apagaria sessões e saves existentes.
- No Railway o disco do container é **temporário**: o banco precisa ficar num **Volume** montado em `/data`.
- O `ADMIN_TOKEN` fica em Railway → serviço → *Variables*. Backup a qualquer momento (sem parar o jogo):
  ```bash
  curl -H "Authorization: Bearer $ADMIN_TOKEN" -o backup.sqlite https://rag-survival-production.up.railway.app/api/admin/backup
  ```
- Restaurar/migrar um banco (só sem partida em andamento; o atual vai para `/data/backups/`):
  ```bash
  curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" --data-binary @midgard.sqlite https://rag-survival-production.up.railway.app/api/admin/restore
  ```
  O servidor valida o arquivo, apaga as sessões antigas (todos entram de novo com usuário e senha) e reinicia.

## Publicação no Railway

**Endereço público:** https://rag-survival-production.up.railway.app
(projeto `rag-survival`, ambiente `production`, região **US East · Virginia**, 1 réplica).

Configuração aplicada no painel do Railway (o Railway não lê mais `railway.json` em serviços novos):

| Item | Valor |
|---|---|
| Origem | GitHub `Iguerazik/rag-survival`, branch `main`, deploy automático com **Wait for CI** |
| Build | `Dockerfile` (Node 22 Alpine), detectado automaticamente |
| Start | `node server.mjs` (CMD do Dockerfile) |
| Porta | o Railway injeta `PORT=8080`; o domínio aponta para a porta **8080** |
| Healthcheck | `/api/health` (120 s), reinício **On Failure** (até 10 tentativas) |
| Volume | `rag-survival-volume--v_B`, montado em `/data` (Virginia) |
| Variáveis | `TRUST_PROXY=1`, `REQUIRE_HTTPS=1`, `DATA_DIR=/data`, `TICK_RATE=60`, `SNAPSHOT_RATE=20`, `ADMIN_TOKEN` (segredo) |

O serviço é **um só** (frontend + backend + SQLite). HTTPS e WSS são automáticos; o cliente usa o mesmo endereço
(`wss://<domínio>/api/coop/ws`), sem `localhost`. Para criar de novo do zero: *New Project → Deploy from GitHub repo*,
adicionar o Volume em `/data`, as variáveis acima e *Generate Domain* na porta 8080.

## Atualizar o jogo

1. Trabalhe numa branch (`git switch -c minha-mudanca`), rode `npm test`.
2. Abra um Pull Request para `main`; o GitHub Actions roda os testes (`.github/workflows/test.yml`).
3. Com tudo verde, faça o merge: o Railway publica a `main` sozinho. O **"Wait for CI"** está ligado no serviço:
   o Railway só publica se os testes do GitHub Actions passarem.
4. **Rollback:** Railway → *Deployments* → deploy anterior → *Redeploy*.

Cada deploy reinicia o processo: partidas em andamento terminam (lobbies voltam sozinhos por até 3 minutos).
Publique quando ninguém estiver jogando.

## Reiniciar o servidor

Railway → serviço → *Deployments* → menu do deploy ativo → **Restart**. O banco no volume não é afetado.
