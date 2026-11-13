# Atualização V23.7 — MVPs e hordas

## Modificações
- Mantido motor compartilhado `engine/core.mjs` (solo e online) e integração com servidor existente, sem alterar a movimentação, protocolo de rede ou frequência de 20 ticks/s.
- MVP permanece no mapa principal. Aviso visual/sonoro no início e avisos de novas fases.
- Fases únicas em 75%, 50% e 25% do HP; cada uma gera reforços, modifica cadência dos ataques e na última fase aumenta velocidade e dano.
- Hordas comuns continuam crescendo durante o MVP; removida redução prévia de 60% na cota. Limites dinâmicos de entidades por tamanho da equipe.
- Reforços periódicos do MVP a cada 9 segundos e spawn com checagens de terreno e afastamento de jogadores.
- Tesouro e encerramento do evento preservados.
- Removida a antiga função morta `enterMvp` que transportava o grupo a uma arena. A *fenda por Asa de Borboleta* segue separada, pois é outra mecânica e não o MVP programado da fase.

## Limpeza segura
- LEIA-ME_V20.md
- LEIA-ME_V13.md
- LEIA-ME_V8.md
- LEIA-ME_V21.md
- LEIA-ME_V16.md
- LEIA-ME_V10.md
- LEIA-ME_V6.md
- LEIA-ME_V17.md
- LEIA-ME_V12.md
- LEIA-ME_V9.md
- LEIA-ME_V14.md
- LEIA-ME_V15.md
- LEIA-ME_V5_2.md
- LEIA-ME_V11.md
- LEIA-ME_V4.md
- LEIA-ME_V7.md
- 01_SERVIDOR_ONLINE_V21.cmd

Arquivos de recursos com hashes iguais **não foram apagados**: podem estar referenciados por caminhos diferentes. `cloudflared.exe` foi mantido por ser usado para publicar link de acesso externo no Windows. Os manifestos JSON e scripts de inicialização atuais foram mantidos.

## Testes
- Suíte original antes das alterações: 119/122 passaram.
- Suíte depois das alterações: 121/124 passaram (incluindo dois testes novos).
- Os mesmos três testes que já falhavam antes continuam falhando por dependência do ambiente de automação do navegador: `v23-parity` e dois testes de `v23-solo-browser`.
- Testes específicos de fases e hordas: 2/2 passaram.
- Não foi realizado teste de carga com vários navegadores reais nem medição de ping em ambiente externo; esses pontos exigem validação adicional antes de publicação.
