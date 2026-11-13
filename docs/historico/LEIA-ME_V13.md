# Ecos de Rune-Midgard — V13 · Campanha por personagem e Códex visual

## Instalar sem perder o original

Extraia o ZIP **V13 COMPLETO** numa pasta nova. Requer Node.js 20 ou superior. No terminal da pasta extraída, execute `npm start` e abra `http://localhost:3000/?v=13` (ou use `INICIAR_WINDOWS.bat`). A V12 enviada foi mantida intacta. O pacote de alterações contém somente os arquivos mudados.

**Salvamentos:** o jogo continua usando a mesma chave de `localStorage` (`midgard-survivors-v1`). Se estiver usando o mesmo navegador e a mesma origem, mantém a maior parte do progresso. Antes de testar, exporte/copie o save do navegador se for importante. Jogar em outro endereço/porta não traz automaticamente o save existente. A conta online persistente não foi adicionada nesta versão; a base multiplayer da V12 é mantida.

## Melhorias

- **10 expedições:** as seis originais + Prisão de Glast Heim, Mina Abandonada, Templo Esquecido e Bosque das Sombras. Mapas novos têm layout procedural, amplas salas e corredores, monstros selecionados de tipos já existentes. Os MVPs nas quatro novas zonas reutilizam bosses já disponíveis; arte e bosses únicos poderão ser adicionados depois.
- **Mapas por personagem:** cada linhagem selecionável (`sword`, `mage`, `archer`, `acolyte`, `merchant`, `thief`) guarda as próprias vitórias. Concluir o primeiro mapa com Bruxo não libera Payon para Espadachim. O mapa seguinte abre ao derrotar o MVP anterior com o próprio personagem. Neste protótipo existe um único personagem local por linhagem, não múltiplos personagens da mesma classe.
- **Dificuldades:** Fácil e Normal disponíveis de início. Difícil abre após concluir **todos os 10 mapas no Normal com a mesma linhagem**; Pesadelo após concluir todos os 10 no Difícil com ela. Mudanças entre personagens recalculam a seleção de dificuldade e os bloqueios. Treino não libera fases.
- **Progresso V12:** o histórico antigo de `cleared` era global; na migração V13, ele é atribuído somente ao personagem selecionado no primeiro carregamento. Não é possível reconstruir de forma confiável qual personagem concluiu cada fase antes da migração. O histórico original permanece no save para recuperação manual.
- **Inventário:** itens equipáveis aparecem com comparação estimada frente ao equipamento do mesmo slot — ATK, MATK, DEF, MDEF, FLEE, CRIT e HP, considerando bônus aplicados por `Gear.bonuses` (itens, refino, cartas e sets). O indicador de “tendência melhor/pior” usa pesos para builds físicas/mágicas; é uma sugestão, não uma comparação exata de DPS para toda habilidade.
- **Atributos:** personagens novos recebem pontos de status conforme sobem de **Nível Base**. A XP Base é creditada **ao concluir a expedição** (mecânica atual); assim os pontos aparecem ao final da run. O custo progressivo de FOR, AGI, VIT, INT, DES e SOR segue a curva Renewal adaptada. Para não destruir progresso, os pontos já existentes em personagens V12 são preservados. Renascimento reinicia atributos e concede 20 pontos iniciais nesta versão (ajuste próprio do jogo).
- **Guia de evolução:** botão de acesso direto em Jornada e a janela `Progressão` original (V12), que detalha requisitos para segunda classe, Renascimento, primeira classe T., transclasse e terceira classe, incluindo níveis, selos MVP, provas de guilda e objetivos de run.
- **Códex:** todas as 18 combinações de item + habilidade e todas as 30 combinações de duas habilidades exibem **dois ícones** na lista. Descobertas ficam nítidas; as não descobertas apresentam silhuetas desfocadas. Arquivos locais foram verificados, com fallback quando faltar recurso.
- **Ícones e menus:** CSS adicional impede imagens de ultrapassarem limites, corrige ajuste das ilustrações dos mapas e altera o dimensionamento dos botões da barra de navegação em desktop/celular.
- **BGM:** as quatro novas regiões reaproveitam composições alternativas existentes. A música original protegida do Ragnarok não acompanha este pacote.

## Testes executados

`npm test`: **15 testes automatizados passaram**. Eles cobrem as regras de progressão, isolamento entre personagens, dificuldades, migração da V12, pontos por nível, caminhos dos ícones do Códex, layout básico de integração e geração dos quatro novos mapas com spawn navegável. Checagem sintática de `game.js`, `mapgen.js` e `campaign.js` realizada. Servidor Node.js responde ao endpoint de versão.

**Limitação:** a execução em navegador Chromium foi bloqueada pelo ambiente de testes (`ERR_BLOCKED_BY_ADMINISTRATOR`), portanto os tamanhos reais de elementos na tela, interações completas e visual dos novos mapas ainda precisam ser validados no navegador do jogador. Os testes automatizados não equivalem a uma partida real longa ou seis jogadores simultâneos. Nenhuma implantação no site publicado foi feita.
