# Midgard Survivors: o que mudou

## Arquivos novos
- `status.js`: sistema de atributos do Ragnarok (custo dos pontos, pontos por nível e atributos derivados)
- `cards.js`: banco das cartas dos monstros, encaixes de equipamento e arte das cartas
- `skillfx.js`: animações das habilidades
- `warps.js`: portais do Labirinto da Floresta
- `features.css`: janela de atributos, equipamento e álbum
- `theme.css`: modo escuro

## Arquivos alterados
- `index.html`: carrega os arquivos novos, botão de tema e janela do álbum
- `game.js`: combate com HIT/FLEE/CRIT/ASPD, cartas no chão, portais, animações e tema
- `renewal.js`: pontos de status do RO ao subir de nível e ao renascer
- `expedition.js`: remove as cartas antigas das melhorias de nível
- `assets/ro/`: ícones de habilidade que faltavam no pacote (skill-*.png)

## Regras do Ragnarok usadas
- Custo para subir um atributo de X para X+1: floor((X-1)/10)+2 (acima de 100: 4*floor((X-100)/5)+16)
- Pontos por nível: floor(nível/5)+3 (a partir do 100: floor(nível/10)+13); começa com 48, ou 100 após o renascimento
- Limite de 99 por atributo (130 na terceira classe)
- ATK = floor(nível/4 + FOR + DES/5 + SOR/3) (à distância: DES no lugar da FOR), MATK = floor(nível/4 + INT + INT/2 + DES/5 + SOR/3)
- HIT = 175 + nível + DES + SOR/3; FLEE = 100 + nível + AGI + SOR/5; esquiva perfeita = 1 + SOR/10; CRIT = 1 + SOR*0,3
- DEF = VIT/2 + AGI/5 + nível/2; MDEF = INT + VIT/5 + DES/5 + nível/4; HP +1% por VIT; SP +1% por INT
- ASPD pela fórmula Renewal (raiz de AGI*9,999 + DES*0,19212); conjuração reduzida por (DES*2 + INT)/530
- FLEE cai 10% por monstro atacando além do segundo; crítico ignora FLEE e dá +40% de dano

## Taxa de drop das cartas
No jogo original a chance é 0,02%. Aqui está em 0,25% (monstros) e 5% (MVPs) para que uma partida de 5 minutos ainda dê chance de achar uma. Ajuste em `CARD_DROP_RATE` e `MVP_CARD_DROP_RATE`, no início de `cards.js`.

# Versão 3

## Mapas novos
- `mapgen.js` gera os três mapas: Esgotos de Prontera (corredores de pedra com canais de água e pontes), Caverna de Payon (cavernas de rocha ligadas por túneis largos) e Labirinto da Floresta (25 salas de sebe com portais aleatórios).
- Toda parede que bloqueia o caminho é desenhada como parede: não existem mais paredes invisíveis.
- Os mapas são maiores (cerca de 6.400 a 7.400 unidades de lado, contra 4.000 antes) e os corredores têm pelo menos 6 células de largura.
- Os arquivos antigos `assets/ro/field.js`, `renewal-fields.js`, `renewal-props.js`, `*-field.webp` e `*-minimap.webp` não são mais usados e podem ser apagados do site.

## Progressão
- Ordem: Esgotos de Prontera → Caverna de Payon → Labirinto da Floresta.
- Derrotar o MVP de um mapa libera o próximo. No menu, só dá para escolher mapas já liberados.
- Ao derrotar o MVP (jogando solo), você pode seguir direto para o próximo mapa na mesma partida, mantendo nível de partida, habilidades e equipamento. Cada mapa seguinte é mais forte.

## Baús, itens e cartas
- `items.js`: 64 itens clássicos do RO (armas por classe, armaduras, escudos, capas, calçados, chapéus e acessórios) com encaixes [n].
- Monstros deixam cair o Baú Azul Antigo (1,2% de chance, `CHEST_DROP_RATE`); o MVP sempre deixa o Baú do MVP.
- Cada classe começa com a arma inicial e uma Camisa de Algodão. A ATK da arma entra na fórmula de ATK.
- Armas de duas mãos (arcos, katares, martelos, Claymore) não permitem escudo. Katares só para Mercenário, Algoz e Sicário.
- No menu, em Equipamento: troque itens e encaixe cartas do álbum nos encaixes livres. Cartas de arma só entram em armas, de escudo em escudos, e assim por diante.
- Cartas pegas na partida vão direto para um encaixe livre do item certo; sem encaixe, vão para o álbum.

## Sprites de efeito
- `assets/fx/manifest.js` aceita folhas de sprite por habilidade. Se houver uma folha declarada para a skill, ela substitui o efeito desenhado. As instruções estão no próprio arquivo.


# Versão 4 — expansão (11 de novembro de 2026)

Consulte `LEIA-ME_V4.md` para todas as novidades de baús, refinamentos, códex, pets, seis mapas, progressão, interface e servidor cooperativo até seis pessoas.
