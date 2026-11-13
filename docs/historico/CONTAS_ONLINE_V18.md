# Ecos de Rune-Midgard V18 — contas online e multiplayer (beta)

## O que a V18 entrega

- Cadastro com **usuário**, **e-mail**, **nick público único** e senha de 8+ caracteres.
- Login/logout; sessões de 7 dias armazenadas no SQLite, com **cookie HttpOnly** e tokens aleatórios armazenados apenas como hash no banco.
- Senhas com **scrypt** e sal individual (scrypt N=32768, r=8, p=3). Não há senha ou token no `localStorage`.
- Progresso **por conta** no SQLite: personagens/linhagens, mapas, dificuldades, itens, cartas, Zeny, Códex, pets. Autosave com revisão e detecção de conflito de abas, cópia local para falhas de rede.
- **Importação manual** do progresso antigo de visitante, feita pelo botão no perfil (substitui o progresso online, com confirmação).
- Multiplayer para até seis jogadores: cada participante deve entrar em uma conta; o **nick é validado no servidor**, não o texto do navegador.
- Não importa automaticamente saves anteriores de outros usuários ou visitantes.

**AVISO IMPORTANTE:** por enquanto o jogo V17/V18 ainda é multiplayer cooperativo beta, com simulação principal feita pelo anfitrião e progresso declarado pelo cliente. Assim, *não* é à prova de trapaça e não é adequado para economia competitiva, rankings valiosos ou distribuição de recompensas de alto valor. Para isso, migrar lógica de combates, loot e concessão de progresso para um **servidor autoritativo**.

## Requisitos

- Node.js **22.13 ou superior** (módulo integrado `node:sqlite`; melhor manter uma versão LTS corrigida/atualizada).
- Sem dependências de NPM, não precisa rodar `npm install`.
- Salvar **dados da pasta `data/`** em um volume persistente / backup. SQLite usa arquivo `midgard.sqlite`, e pode manter `-wal`/`-shm`; para backup consistente, pare o servidor ou use API de backup SQLite apropriada.

## Windows (uso local)

1. Extraia o ZIP V18 em pasta própria; **não substitua a V17**.
2. Instale Node.js 22.13+.
3. Execute `INICIAR_WINDOWS.bat` ou, via terminal, `npm start` na pasta `midgard-survivors`.
4. Acesse `http://localhost:3000`. Clique **Entrar / Criar conta**, registre o usuário e o nick.
5. Progresso salvo no banco na mesma máquina enquanto o servidor estiver executando. Teste persistência fechando e abrindo o jogo.

Em rede local, seu amigo pode acessar `http://SEU-IP-LOCAL:3000` após liberação controlada de firewall. **Não use HTTP puro na internet pública:** senhas e sessões podem ser interceptadas.

## Internet (HTTPS obrigatório)

1. Coloque os arquivos num servidor Node.js 22.13+ ou use o `Dockerfile` / `compose.yaml`.
2. Configure domínio com TLS válido (ex.: Caddy usando `Caddyfile.example` no mesmo servidor).
3. Defina `REQUIRE_HTTPS=1` para impedir autenticação em HTTP. Com TLS terminado pelo proxy reverso **confiável**, defina `TRUST_PROXY=1`. Não exponha Node diretamente à internet se `TRUST_PROXY=1`.
4. Defina `DATA_DIR=/app/data` com volume persistente no Docker; `compose.yaml` já declara o volume `midgard-accounts`.
5. Use `docker compose up -d --build` e monitore `/api/health`.
6. Amigos entram pelo **mesmo endereço HTTPS**, criam suas contas e acessam o botão **Jogar online**. O líder cria a sala e envia código/link.
7. Faça backup do banco e atualize Node regularmente. Para mais usuários, migrar de SQLite para banco gerenciado, adicionar validação de e-mail, recuperação de senha, logs de auditoria, controle de abuso distribuído e limites por IP no proxy.

Ajustes `.env` importantes:

```ini
PORT=3000
DATA_DIR=./data
REQUIRE_HTTPS=0
TRUST_PROXY=0
ALLOW_GUEST_MULTIPLAYER=0
```

A configuração acima é apenas para **desenvolvimento local**. Em produção HTTPS, defina `REQUIRE_HTTPS=1` e, se houver proxy HTTPS confiável, `TRUST_PROXY=1`.

## Persistência e conflito de abas

- O servidor fornece o estado salvo ao carregar a página com login válido; páginas de convidados continuam usando o save local antigo.
- O autosave é disparado após mudanças de progresso; existe debounce e cópia local temporária caso a internet caia.
- Se outra aba gravar primeiro, a gravação posterior recebe **409 Conflito**, e o cliente exibe alerta e **não sobrescreve silenciosamente** o progresso remoto.
- Contas diferentes no mesmo navegador não compartilham seus saves.
- Jogar em outra máquina só requer entrar na mesma conta, desde que ambas acessem o mesmo servidor persistente.

## Limitações ainda pendentes

- Sem recuperação de senha por e-mail ou verificação de e-mail (implementar antes de lançamento público maior).
- Sem reconexão completa a uma run depois do navegador fechar.
- Salas continuam em memória e são perdidas se reiniciar o servidor.
- O sync do multiplayer ainda utiliza polling HTTP e mundo controlado pelo anfitrião, não um servidor autoritativo.
- Em conflito de salvamento, a cópia local não é mesclada automaticamente com o progresso online; precisa de resolução manual.
- Instalação Windows via `.cmd` é um **instalador de arquivos/atalho**, não executável `.exe` autônomo.

**Testes:** `npm test` verifica login, cadastro, unicidade, persistência após reinício, sessão, logout, tentativas inválidas, conflito de revisões, proteção do banco, salas e regressões existentes.
