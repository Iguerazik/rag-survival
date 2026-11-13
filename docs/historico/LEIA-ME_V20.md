# Ecos de Rune-Midgard V20 — Lobby e cooperação

**Cópia de trabalho independente da V19.** Não substitua o servidor em execução antes de fazer backup da pasta `data/` (SQLite, senhas e progressão).

## Mudanças
- O botão **Como jogar online** abre uma janela de instruções dentro do navegador; não baixa arquivos.
- O lobby passou para o topo da página, após o banner, com até 6 vagas mostradas e status Pronto/Aguardando.
- Adicionada mecânica autoritativa de ressurreição: um jogador vivo segura **R** perto do companheiro caído por **3,25 s**, o servidor valida distância, tempo, HP e invulnerabilidade de 3 s após ressuscitar. Dupla derrotada se todos caírem.
- Agora morte é informada em uma sobreposição evidente, com indicador de ressurreição.
- Corrigida exportação das poses de ataque do servidor (a V19 enviava `animProgress=.5` e não enviava `attack`, portanto as poses online não eram exibidas). Poses, sequência e duração agora são remetidas nos snapshots para os colegas e o próprio jogador.
- Predição de movimento ajustada à velocidade do servidor e erro posicional suavizado, para reduzir saltos abruptos. **Sem implementação de reconciliação por input/ack completa**, lag elevado ainda pode causar correções.
- Duo com escalonamento menos agressivo e menos monstros simultâneos.
- Armas nas mãos redesenhadas com silhuetas pequenas e ancoradas ao corpo em vez de ícones de inventário aumentados.

## Instalação e preservação do progresso
1. Extraia em uma **pasta separada**. Feche o servidor antigo.
2. Copie somente a pasta `data/` da sua V19 para esta cópia (com o servidor antigo desligado), se quiser manter contas e progresso.
3. Inicie com `npm start` em `midgard-survivors/` ou `INICIAR_WINDOWS.bat` e acesse o endereço local configurado.
4. Se usar Cloudflare Tunnel, aponte o túnel para a mesma porta; o novo front-end precisa estar no servidor atualizado.

## Testes ainda necessários
- Dois computadores com latência real em partida completa; desvio de movimento em parede/obstáculos; revive em rede ruim.
- Escolhas de equipamentos, progressão e balanceamento online ainda têm limitações herdadas da V19 (motor multiplayer simplificado).
