# Testar no seu PC e com amigos (Cloudflare Tunnel), sem mexer na produção

Fluxo: **desenvolvimento local → testes locais → testes com amigos pelo Cloudflare → sua aprovação → GitHub → deploy**.

Esta pasta de teste é **independente** do jogo publicado no Railway e de qualquer outra cópia do jogo no seu computador:

| | Teste (esta pasta) | Produção (Railway) |
|---|---|---|
| Endereço | `http://localhost:3101/` e um link `https://….trycloudflare.com` | `https://rag-survival-production.up.railway.app` |
| Contas e saves | `dados-teste\` (nesta pasta) | volume `/data` do Railway |
| Salas | só as do teste | só as da produção |
| TPS | 60 TPS / 20 snapshots por segundo | 60 TPS / 20 snapshots por segundo |

As contas da produção **não** existem no teste: você e seus amigos criam contas novas no link de teste.

## Requisitos (uma vez só)

1. **Node.js 22.13 ou mais novo** (22 LTS): <https://nodejs.org/>. O jogo não usa pacotes do npm, então não há `npm install`.
2. **cloudflared** (para o link dos amigos). No PowerShell ou no Prompt: `winget install --id Cloudflare.cloudflared`.
   Se preferir, baixe o `cloudflared.exe` no site da Cloudflare e coloque nesta pasta. Não precisa de conta: o link usa o serviço gratuito *Quick Tunnel* (trycloudflare.com).

## Iniciar

Dê dois cliques em **`INICIAR_RAG_SURVIVAL_TESTE.bat`**. Ele:

1. confere o Node.js;
2. cria `dados-teste\` e uma chave do painel só deste teste (`dados-teste\admin_token.txt`);
3. inicia o servidor em `127.0.0.1:3101` (só o túnel chega nele);
4. abre o túnel do Cloudflare e mostra o **link para os amigos**;
5. abre o jogo no seu navegador.

Logs: `logs-teste\servidor.log` e `logs-teste\cloudflared.log`. O último link fica em `logs-teste\link-publico.txt`.
O link muda toda vez que o túnel reinicia (normal no Quick Tunnel).

Porta diferente: no Prompt, `set RAG_TEST_PORT=3102` e depois rode o `.bat`.

## Encerrar

Dê dois cliques em **`PARAR_RAG_SURVIVAL_TESTE.bat`**. Ele fecha **só** o servidor que está ouvindo na porta do teste e o túnel dessa porta. Outros programas Node.js e outros túneis não são tocados. Os dados do teste ficam guardados.

## Painel "quem está online"

Abra `…/admin.html` (local ou pelo link do Cloudflare) e cole a chave de `dados-teste\admin_token.txt`.
Na produção, a chave é a `ADMIN_TOKEN` das Variables do Railway.

## Checklist rápido de teste com amigos

- [ ] O link `https://….trycloudflare.com` abre o jogo no celular/PC de um amigo.
- [ ] Criar conta e entrar no link de teste.
- [ ] Criar sala, o amigo entra pelo código ou pela lista de salas.
- [ ] Movimento dos aliados suave, sem "puxões" (rubberbanding).
- [ ] Mesmo cronômetro e mesmo MVP para todos.
- [ ] Reconectar: fechar a aba do amigo e entrar de novo na sala.
- [ ] Painel `admin.html` mostra os dois na sala.
- [ ] Em `…/api/health`, `tick.measuredTps` perto de 60.
