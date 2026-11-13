# Ecos de Rune-Midgard V17 — jogar cooperativo (beta)

## Rodar no Windows

1. Extraia o arquivo ZIP **completo** em uma pasta nova. Não substitua a V16.
2. Instale Node.js versão 20 ou superior.
3. Abra `midgard-survivors/INICIAR_WINDOWS.bat` (ou `npm start` na pasta).
4. Entre em `http://localhost:3000/?v=17` no navegador.
5. Opcional: execute `INSTALAR_WINDOWS.cmd` para instalar uma cópia da V17 no seu perfil do Windows e criar atalho. **Não é um executável nativo e requer Node.js**.

## Jogar com outras pessoas na mesma rede (LAN)

- Mantenha o terminal do servidor aberto.
- Descubra o IP local do anfitrião com `ipconfig` (por exemplo, `192.168.1.40`).
- Autorize conexões TCP para a porta **3000** no firewall do Windows na rede privada.
- Os amigos acessam `http://IP-DA-SUA-MAQUINA:3000/` **no navegador deles**. `localhost` funciona apenas na máquina do anfitrião.
- Clique em **Jogar online**, defina seu nome/classe e crie uma sala. Compartilhe o código de seis caracteres ou o link de convite.
- Os convidados entram, escolhem sua classe e clicam **Estou pronto**. O líder define o mapa e a dificuldade e inicia quando todos estiverem prontos.
- Se o líder alterar mapa ou dificuldade, o status de pronto é zerado para os convidados.

## Internet pública / VPS

- O modo cooperativo precisa do **servidor Node.js rodando**: um host de páginas estáticas isolado (incluindo ChatGPT Sites) não consegue executar este backend sozinho.
- Em uma VPS: `docker compose up -d --build` na pasta do jogo; encaminhe um domínio HTTPS para a porta interna 3000 via proxy reverso. Exemplo em `Caddyfile.example`.
- Ative HTTPS público (e uma política de atualizações, backup e monitoramento) antes de divulgar amplamente o domínio.
- Alternativamente, para testar com amigos sem expor a porta da sua máquina, use VPN privada ou túnel HTTPS de um provedor que você confia; a URL precisa encaminhar requisições HTTP para Node.js, inclusive `/api/coop/rooms`.
- Port forwarding da porta 3000 é possível, mas expõe a máquina à internet e **não é recomendado** para uso público sem proxy HTTPS e isolamento.
- Verifique servidor em `/api/health`; a resposta deve conter `ok:true`.

## Limites técnicos da V17

- O lobby é validado no servidor: 2–6 pessoas, líder, mudança de mapa/dificuldade, confirmação de prontidão, bloqueio de sétimo jogador, tempo de sessão e reentrada por convite até começar.
- Posições, ações, animações e mundo dos inimigos são sincronizados por HTTP curto (*polling*). A movimentação dos aliados é suavizada na tela.
- **O anfitrião ainda simula os monstros, chefes e dano.** Não é servidor autoritativo de combate: o cliente dos convidados transmite acertos com validação parcial. Isto funciona para testes entre amigos, mas não é seguro para placares competitivos, economia ou servidores públicos com progresso confiável.
- Salas e sessões ficam na **memória** do processo; reiniciar o servidor desfaz as salas. Não existe login, cadastro persistente online nem reconexão automática após recarregar a página.
- Os equipamentos, o Códex e os desbloqueios permanentes ainda são salvos em `localStorage` de cada navegador. Não use esta build como base de uma economia compartilhada. Mapas e dificuldades pessoais continuam bloqueados por linhagem.
- Não inclui MP3s oficiais ou sprites licenciados que não tenham sido fornecidos no projeto.

## Para chegar a um multiplayer público de produção

Migrar para simulação autoritativa (dano, IA, EXP, loot, drops e recompensas no servidor), transporte WebSocket, autenticação, PostgreSQL, persistência de contas, reconexão com token de sessão, controle de fraude, replay/testes de carga e limites anti-abuso. Esses itens **não estão prontos nesta build**.
