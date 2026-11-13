# Validação V11

Data: 11/11/2026.

- `npm test`: 6 testes de regras aprovados.
- Análise sintática: 31 scripts JavaScript/MJS aprovados.
- Chromium: 53 verificações de integração e itens aprovadas, sem erros JavaScript registrados.
- Verificações adicionais: 345 condições aprovadas (geração segura de monstros nos seis mapas, requisitos dos 30 combos, missão e compatibilidade de loot).
- Dois clientes: recebimento do estado de entrada/saída da fenda conferido em um segundo navegador.
- Menu em 1440px e 390px; 22/22 imagens do Bestiário carregadas.

## Cenários de integração

- 12-minute dungeon
- five timed rifts
- elite targeting priority
- combo preparation
- boss combo activation
- combo cannot repeat without preparation
- rift arena entry
- three destructible seals
- seal shield reduces damage
- shield removed after seals
- rift returns to original world
- rift reward chest
- return position
- timed-out rift returns without reward
- loot opens choice
- explicit equipment choice
- inventory opens during loot
- inventory returns to pending loot
- loot stored as separate item
- loot resumes game
- all combos visible in codex
- MVP stronger than elite baseline
- MVP fights on expedition field
- hordes continue during MVP
- MVP does not teleport player
- reroll spends charge without skill point
- reroll changes available selection
- water doubles damage against Fire 3
- Fire 3 immunity
- holy weakness against Shadow 3
- verified MVP property levels
- elemental necklace imbues weapon
- lifesteal has shared per-second HP cap
- lifesteal ignores overkill
- consumable pickup cannot duplicate
- automatic fly wing consumes and teleports
- fly wing protection
- fly wing cooldown prevents repeated consumption
- active items visible in inventory
- player configurable fly threshold
- butterfly wing activation
- random MVP challenge
- butterfly wing consumed once
- butterfly returns without ending expedition
- rare challenge MVP card survives return
- challenge MVP does not clear expedition
- XP orb collects existing gems
- gold magnet collects existing coins
- new expedition renews mission
- living build survives expedition transition
- rare wing rates
- temporary jewellery lost at end of run
- unused wings retained on account

## Limites da verificação

Não equivale a uma campanha completa, sessão de carga prolongada ou validação estatística do balanceamento. A sincronização de fenda foi exercitada por snapshots em dois clientes; não foi feita uma campanha de seis jogadores em rede real.

- Três atlas de efeitos importados: todos carregados e reproduzidos no Chromium.
- Propriedades dos 22 monstros conferidas automaticamente contra os registros verificados.
