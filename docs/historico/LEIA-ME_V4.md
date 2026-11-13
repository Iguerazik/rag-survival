# Ecos de Rune-Midgard — Expansão V4 (versão de desenvolvimento independente)

Esta é uma **cópia de trabalho independente**, criada a partir de `midgard-survivors-v3.zip`. Nenhum ZIP enviado pelo usuário foi editado ou substituído. O jogo hospedado no ChatGPT Sites também **não foi alterado**: para publicar, é necessário levar as mudanças ao projeto hospedado.

## Como iniciar

1. Extraia o ZIP `...V4_COMPLETA.zip` numa **nova pasta**.
2. Instale Node.js **20 ou superior** se ainda não tiver.
3. Na pasta `midgard-survivors`, execute `npm start` (ou `node server.mjs`). Não são necessárias dependências NPM.
4. Abra `http://localhost:3000` no navegador. Para testar o multiplayer, outros jogadores precisam acessar o **mesmo servidor publicado** via HTTPS (com proxy ou hospedagem que execute Node.js), não apenas abrir o HTML localmente.
5. Seu site atual do ChatGPT Sites não é atualizado automaticamente por esse ZIP. A API multiplayer `/api/coop/rooms` requer a publicação do `server.mjs` ou adaptação do backend do seu site.

## Como mesclar sem perder suas próprias edições

- O ZIP `...V4_SOMENTE_ALTERACOES.zip` contém somente os arquivos adicionados/modificados relativamente ao **ZIP V3 que você enviou**. Use-o apenas para **comparar diferenças** e incorporar alterações cuidadosamente. Não extraia por cima da sua pasta de trabalho sem comparar.
- Copie os arquivos novos de `assets/items/`, `assets/fx/` e `assets/ro/`, mas faça a mesclagem dos arquivos de código de forma assistida, em especial `game.js`, `items.js`, `renewal.js`, `index.html` e `coop.js`.
- Os arquivos de progresso do navegador ficam salvos no `localStorage` da origem; mudar domínio ou porta pode criar progresso separado. Faça backup das suas edições e do progresso que quiser preservar.

## Melhorias integradas

| Recurso | Comportamento |
|---|---|
| Sprites de itens | 68 ícones individuais `.png` originais, em pixel art, e atlas de visualização. |
| Baús de equipamento | Oferecem **três escolhas**; baús de MVP oferecem **quatro escolhas**, priorizando itens melhores. |
| Refinamento por repetição | Selecionar novamente um equipamento já possuído sobe seu refinamento em +1, até +8; cada nível acrescenta atributos de combate. |
| Baús de melhoria | Oferecem três melhorias para algum item equipado: FOR, AGI, VIT, INT, DES, SOR, HP máximo, regeneração, dano físico/mágico, movimento; cada bônus pode chegar a nível 8. |
| Cartas | Drop raro no chão; carta do MVP com chance própria; podem ser encaixadas em equipamentos compatíveis, conferindo bônus. |
| Conjuração/skills | Efeitos diferenciados, animações de cast, tempo de conjuração e nome da habilidade aparecendo acima do personagem. |
| Dificuldades | Exploração, Fácil, Normal, Difícil, Pesadelo, com HP, dano, frequência e quantidade de monstros escalando de 1 a 6 pessoas. |
| Mapas | Seis mapas na progressão: Esgotos de Prontera, Caverna de Payon, Labirinto da Floresta, Calabouço dos Orcs, Torre de Geffen e Floresta de Payon. Ambientes maiores e corredores amplos. |
| Zeny | Moedas com queda física no chão, coletadas pelo jogador ou pet equipado com melhoria apropriada. |
| Inventário e sets | Janela para examinar equipamentos, cartas, refinamentos, atributos e efeitos de sets: Calcinha+Camiseta e Sapatos da Maré+Cachecol de Lã. |
| Atributos | Painel 'O que faz cada atributo?', custos progressivos Renewal, reset gratuito uma vez e resets posteriores pagos em zeny. |
| Evoluções/Códex | 18 receitas de skill nível 2 + item equipado, desbloqueios registrados e recompensas em pontos de Códex. |
| Loja de pets | Seis pets: Poring, Lunático, Poporing, Familiar, Alice e Bafomé Jr. São invulneráveis, concedem buffs diferentes e possuem preços diferenciados. |
| Melhorias de pet | Coleta automática de zeny, EXP, poções de vida e ampliação do alcance de coleta. |
| Evolução de classe | Experiência base/classe mais lenta, exigência adicional de selos por vitórias contra MVPs e confirmação de prova para mudar de classe; treino de 3ª classe continua como modo separado. |
| Balanceamento | Redução de potência e/ou aumento de tempo de recarga de algumas habilidades de Bruxo, progressão de dificuldade de mapa para mapa. |
| Multijogador | Servidor básico com salas de até seis pessoas; validação de limite e sincronização periódica de estado. |
| Visual | Modo claro/escuro preservado, câmera afastada, portais do labirinto ligando salas aleatoriamente. |

## Regras e parâmetros

- Ajuste as cinco dificuldades em `difficulty.js`.
- Ajuste probabilidade de cartas em `cards.js`, de baús de itens em `items.js` (`CHEST_DROP_RATE`) e de baús de reforço/zeny em `game.js` (`hurt`).
- Ajuste níveis e provas de classe em `renewal.js`; efeitos e duração de cast em `game.js` / `skillfx.js`.
- Ajuste receitas, preços e habilidades dos pets em `codex.js`.
- Regere sprites procedurais com `python tools/build_pixel_assets.py`, requer Pillow somente durante geração (não durante jogo).

## Limitações conhecidas

- **As animações são criações em pixel art e canvas inspiradas na estética do RO; não são os efeitos oficiais idênticos do Ragnarok.** Substituir por sprites originais exige arquivos de origem e autorização para uso. Já existe `assets/fx/manifest.js` para mapear folhas de animação por habilidade.
- O sistema de status segue os **custos de atributo** do Renewal, enquanto o dano, HP de monstros e outras fórmulas foram ajustados à escala de um *survivors*; portanto não reproduz exatamente toda a matemática de servidores Ragnarok.
- Multiplayer: o backend é uma primeira implementação de lobby com **sincronização por polling**, anfitrião autoritativo para o mundo. Não inclui proteção anti-cheat, contas, persistência de salas, recuperação de host, validação independente de movimentos ou infraestrutura escalada; 6 jogadores simultâneos via internet **ainda precisam de testes reais de latência**.
- Loja, inventário e Códex são persistidos localmente no navegador, não vinculados a contas entre dispositivos.
- Cartas/sets são um subconjunto do catálogo de Ragnarok, não a base completa.

## Verificações realizadas neste pacote

- Sintaxe de todos os arquivos JavaScript e do servidor (`node --check`).
- Inicialização de menus, janela de inventário, 18 receitas e seis pets em navegador de teste isolado.
- Seis mapas gerados e início em posição caminhável; Labirinto com 100 pontos de portal.
- Baús normais com três opções, baús MVP com quatro; refinamento +1; baús de melhoria, reset de atributos, compra de pet e coleta de moeda por pet.
- Derrota de MVP que libera o mapa seguinte.
- Criação de sala, entrada de cinco convidados, bloqueio do 7º jogador, sincronização de lobby e remoção da sala após saída do anfitrião via HTTP.

**Aviso:** testes de interface usaram desenho do personagem simulado para contornar restrições de rede do ambiente de testes; não equivalem a uma validação visual completa de todos os sprites/animações. Recomendado revisar a aparência e o balanceamento em execução local antes de publicar.
