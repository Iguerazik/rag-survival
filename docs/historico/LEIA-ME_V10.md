# Ecos de Rune-Midgard — V10 (cópia segura da V9)

Esta pasta é uma cópia independente da V9. Nenhum ZIP antigo foi alterado.

## Alterações
- HUD e menu inicial redesenhados como janelas do cliente Ragnarok, tanto no modo claro quanto no escuro.
- O tema afeta também janelas internas, inventário, cartas, equipamentos, status, codex e painéis em dungeon.
- WASD e setas controlam movimento. O Códex foi transferido do D para K.
- Tela de **Opções** no menu e no jogo para mudar teclas, com prevenção de conflitos e salvamento em localStorage.
- Drops de cartas: 0,035% monstros comuns, 0,75% MVP, 0,08% miniboss, 0,25% guardião especial; sem cartas ao retirar monstros da memória.
- Cartas Lunático (SOR +1, CRIT +1, esquiva perfeita +1) e Esporo (VIT +2) foram incluídas nos drops de monstros existentes.
- Coleta não encaixa cartas automaticamente: a carta rara vai para o álbum, para o jogador decidir o equipamento e a build.
- Encaixe, remoção e refino atualizam os bônus do personagem ainda durante a expedição.
- Carta Nove Caudas mantém seu bônus de FLEE +20 ao atingir +8 nesta edição, pois o limite de refino é +8 (+9 no RO original).
- Efeitos de cartas permanecem vinculados a equipamento e respeitam os bônus/efeitos cadastrados no banco do projeto; não são bônus genéricos multiplicados sem relação com Ragnarok.

## Teclas padrão
W A S D (ou setas) movimento | I inventário | C cartas | K códex | P pets | Alt+S status | Alt+E equipamentos | T árvore | E portal | Esc pausa. Acesse Opções para remapear.

## Integração com sua versão
O ZIP de diferenças contém somente arquivos modificados em relação à V9 usada como base. Se você editou a V9 em paralelo, faça merge destes arquivos em vez de sobrescrevê-los. Para testar: `npm start` em Node.js 20+, abra `http://localhost:3000`.

## Limites
O jogo publicado no ChatGPT Sites não foi alterado. As cartas usam os efeitos cadastrados no motor e alguns efeitos dependentes de propriedades especiais ainda podem requerer verificações adicionais de balanceamento em partidas longas.
