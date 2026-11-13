# Validação V12

- 6 testes de regras Node aprovados (`npm test`).
- 35 scripts JS/MJS aprovados na análise sintática.
- 62 verificações de integração no Chromium aprovadas, sem erros JavaScript registrados.
- 37 pares de sprites comparados visualmente; imagens em VALIDACAO_SPRITES/.
- Dois clientes: entrada/saída de fenda com identidade e nome do guardião preservados.
- Menu/inventário comparados em temas claro e escuro e viewport de 390px.
- Cena de desenho com 215 monstros exercitada sem erros; essa medição de comandos de desenho não equivale a uma garantia de FPS.

## Cenários de integração

- 150 run levels
- faster experience curve
- Orc dungeon roster
- Eddga actual map
- sewer model thief_female
- sewer model thief_male
- sewer model drainliar
- sewer model cramp
- payon model archer_skeleton
- payon model horong
- payon model dokebi
- payon model nine_tail
- maze model baphometjr
- maze model hunterfly
- maze model mantis
- maze model sidewinder
- orc model orc_zombie
- orc model orc_skeleton
- orc model drainliar
- orc model steel_chonchon
- geffen model hunterfly
- geffen model marionette
- geffen model whisper
- geffen model nightmare
- geffen model deviruchi
- payonfield model savage
- payonfield model beetle_king
- payonfield model greatestgeneral
- early chain hits two other targets
- visible bounded chain
- imbue has back action
- back preserves chest roll and affixes
- two-column loot comparison
- rift discovered on screen gets map marker
- rift marker remains when leaving screen
- rift uses local non-MVP guardian
- two hits cannot kill guardian
- guardian phase damage gate
- second phase creates seals
- guardian protected until phase seals are broken
- guardian victory returns to map
- elites return to hordes
- field elite is not a portal
- timed map collectibles
- main MVP stronger than guardian
- MVP telegraphs gap closer
- MVP closes distance
- mobs still attack after MVP dies
- T4 has three rolled options
- Zeny refines an item
- refine persists and spends currency
- Zeny buys usable potion
- one purchased reroll per expedition
- third class requires run milestone
- third class unlocks with complete requirements
- compatible inventory tab
- run milestone persists on character
- timed healing waits while HP full
- timed healing can be collected when hurt
- base spell radius excludes distant target
- area upgrade reaches another target
- area upgrade grants exactly 8 percent power

## Ensaio de combate

Foi simulado um trecho de 30 segundos com Bruxo em Payon final, skills nível 8 e três modificações de skill, para verificar a execução da área/cadeia com o mapa cheio. HP do jogador protegido durante esse ensaio: ele verifica a mecânica ofensiva, não comprova sobrevivência ou balanceamento da campanha.

```json
{
  "stats": {
    "durationSeconds": 30,
    "kills": 157,
    "peakPopulation": 185,
    "mvpMaxHP": 70698.79908000001,
    "mvpRemainingHP": 38492.615898117954,
    "simulationCpuMs": 1861,
    "chainUpgrades": {
      "stormgust": {
        "wide": 1
      },
      "vermilion": {
        "split": 1
      },
      "fire": {
        "splash": 1
      }
    },
    "diagnostic": ""
  },
  "errors": []
}
```

## Limites

Não foram feitas campanha completa, sessão de seis jogadores em rede real, testes prolongados ou comparação estatística de todas as builds. Os sprites originais foram conferidos quanto à identidade; alguns modelos têm apenas animação frontal de prévia, como descrito no LEIA-ME_V12.md.
