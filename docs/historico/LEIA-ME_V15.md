# Ecos de Rune-Midgard — V15 (patch de estabilidade, HUD e qualidade de vida)

**Origem:** cópia separada da build V14 ROGUELIKE ARMAS. Nenhum arquivo anterior foi sobrescrito; o jogo publicado no Sites não foi alterado.

## Alterações

1. **Asa de Mosca:** rastreia os IDs dos comandantes/elites/minibosses vivos no momento do teleporte. Após 3,4 segundos eles reaparecem em posições seguras próximas do jogador, dentro da mesma sala do labirinto quando aplicável. Não duplica inimigos nem ressuscita mortos.
2. **Missão de canalização do selo:** os 6/10 segundos são acumulados na área marcada, sem exigir invencibilidade. Receber dano pausa a canalização por 0,5 segundo e reduz 0,18 segundo do progresso (em vez de zerar). Perto do selo o dano recebido é reduzido em 38%. A área foi ampliada e o texto de ajuda esclarece a regra.
3. **Coletores de EXP e Zeny:** esvaziam os arrays reais de gemas/moedas com `splice()`, concedem os recursos existentes e não podem reaplicar a mesma coleta por UID. A próxima renderização já não desenha os drops coletados.
4. **Fendas:** limite de partículas, efeitos, projéteis e lacaios ativos na arena; cap de efeitos de habilidade especial; menos invocações simultâneas. Conserva os selos, o guardião, as fases e as recompensas.
5. **HUD / equipamentos:** camada visual V15 com janelas estilo cliente Ragnarok em tema claro/escuro, títulos e rótulos de alto contraste, barra rápida de maior legibilidade, nova disposição do paper-doll, slots nomeados e detalhes de equipamentos mais organizados.
6. **Windows:** corrigido `INICIAR_WINDOWS.bat` para a versão 15 e atualizado o endpoint `/api/version`.

## Instalação

1. Extraia a versão completa em uma pasta **nova**.
2. Abra a pasta `midgard-survivors`.
3. Instale Node.js 20+ se ainda não tiver.
4. No Windows, dê duplo clique em `INICIAR_WINDOWS.bat`; ou abra o terminal nesta pasta e execute `npm start`.
5. Visite `http://localhost:3000/?v=15`. **Não** abra o index.html diretamente para usar os serviços do servidor.
6. Antes de abrir a V15, encerre qualquer servidor V14 ou anterior que esteja ocupando a porta 3000.

## Testes e limitações

Execute `npm test` na pasta do jogo. Os testes cobrem coletores, rastreamento de miniboss após asa, progresso parcial da missão, limites de fenda e arquivos de HUD. A verificação visual automatizada pelo Chromium neste ambiente foi impedida por restrição de navegação; verifique o layout na sua resolução.

O multiplayer permanece o mesmo mecanismo de salas da V14; este patch **não** transforma a sincronização existente em um servidor autoritativo de produção. Para hospedar publicamente ainda é necessário revisar segurança, persistência, escalabilidade e autenticação. O balanceamento de fendas em partidas reais pode precisar de novos ajustes após medir FPS, número de inimigos e hardware.

## Mesclagem com sua edição paralela

Arquivos de código modificados: `game.js`, `roguelike.js`, `run-items.js`, `skillfx.js`, `ro-windows.js`, `server.mjs`, `index.html`, `package.json`, `INICIAR_WINDOWS.bat`. Novos: `v15-polish.css`, `tests/v15.test.cjs`, este README. Compare pelo pacote **APENAS_ALTERACOES**. Faça backup ou mescle as diferenças por arquivo antes de copiar sobre um projeto editado em paralelo.
