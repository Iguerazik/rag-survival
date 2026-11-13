# Fontes e assets — V11

Consulta realizada em 11/11/2026.

## Regras elementais

- bRO Wiki, tabela de propriedades, quatro níveis: https://browiki.org/wiki/Monstros#Propriedade
- bRO Wiki, propriedades dos MVPs: https://browiki.org/wiki/MVP
- Divine Pride, propriedades e níveis dos monstros comuns, identificado por ID abaixo. Esse é o banco de monstros referenciado pelos links da bRO Wiki: https://www.divine-pride.net/database/monster/

A tabela foi transcrita com **linhas = propriedade defensiva do alvo** e **colunas = propriedade do ataque**. Os valores incluem resistências e imunidades, e não apenas as vantagens do ciclo elemental. Os percentuais de dano e os níveis elementais estão em `elements.js`; os tipos de propriedade estão em `cards.js`.

Cometa foi conferido também em https://browiki.org/wiki/Cometa e usa propriedade Neutro.

As habilidades do Survivors e seus combos são adaptações do jogo existente. As melhorias especiais de cartas Orc Herói, Doppelganger e Eddga estão identificadas como adaptações Survivors, sem serem apresentadas como estatísticas oficiais do Ragnarok.

## Skin fornecida pelo usuário

`default_skin_template.zip`, arquivo anexado nesta conversa. Foram convertidos 45 componentes BMP para PNG em `assets/skin-v11/`, preservando sua aparência e aplicando transparência à cor magenta de fundo. Nenhum arquivo do ZIP original foi alterado.

## Sprites de referência

Catálogo indicado pelo usuário: https://nn.ai4rei.net/dev/npclist/?q=type%3Amonster

Os GIFs abaixo foram salvos localmente em `assets/monsters/` e são usados no Bestiário e nas prévias de MVPs. Os sprites direcionais completos já existentes continuam no combate; uma animação de prévia em GIF não substitui uma folha completa de movimento/ataque.

| Monstro no código | ID | GIF de origem |
|---|---:|---|
| poring | 1002 | https://nn.ai4rei.net/dev/npclist/i/PORING.gif |
| lunatic | 1063 | https://nn.ai4rei.net/dev/npclist/i/LUNATIC.gif |
| fabre | 1007 | https://nn.ai4rei.net/dev/npclist/i/FABRE.gif |
| spore | 1014 | https://nn.ai4rei.net/dev/npclist/i/SPORE.gif |
| baphometjr | 1101 | https://nn.ai4rei.net/dev/npclist/i/BAPHOMET_.gif |
| hunterfly | 1035 | https://nn.ai4rei.net/dev/npclist/i/HUNTER_FLY.gif |
| mantis | 1139 | https://nn.ai4rei.net/dev/npclist/i/MANTIS.gif |
| sidewinder | 1037 | https://nn.ai4rei.net/dev/npclist/i/SIDE_WINDER.gif |
| munak | 1026 | https://nn.ai4rei.net/dev/npclist/i/MUNAK.gif |
| bongun | 1188 | https://nn.ai4rei.net/dev/npclist/i/BON_GUN.gif |
| sohee | 1170 | https://nn.ai4rei.net/dev/npclist/i/SOHEE.gif |
| nine_tail | 1180 | https://nn.ai4rei.net/dev/npclist/i/NINE_TAIL.gif |
| thiefbug | 1051 | https://nn.ai4rei.net/dev/npclist/i/THIEF_BUG_LARVA.gif |
| tarou | 1175 | https://nn.ai4rei.net/dev/npclist/i/TAROU.gif |
| drainliar | 1111 | https://nn.ai4rei.net/dev/npclist/i/DRAINLIAR.gif |
| cramp | 1209 | https://nn.ai4rei.net/dev/npclist/i/CRAMP.gif |
| baphomet | 1039 | https://nn.ai4rei.net/dev/npclist/i/BAPHOMET.gif |
| moonlight | 1150 | https://nn.ai4rei.net/dev/npclist/i/MOONLIGHT.gif |
| goldenbug | 1086 | https://nn.ai4rei.net/dev/npclist/i/GOLDEN_BUG.gif |
| orc_hero | 1087 | https://nn.ai4rei.net/dev/npclist/i/ORK_HERO.gif |
| doppelganger | 1046 | https://nn.ai4rei.net/dev/npclist/i/DOPPELGANGER.gif |
| eddga | 1115 | https://nn.ai4rei.net/dev/npclist/i/EDDGA.gif |

Os gráficos relacionados a Ragnarok são creditados à Gravity e a Lee Myoungjin, conforme o catálogo de origem. Organização das prévias do catálogo: Ai4rei/AN. O código e a interface mantêm o aviso de jogo de fã já presente no projeto.

## Referências de jogabilidade

Vampire Survivors e Azeroth Survivors (https://wow.aethus.pl/) orientaram os pedidos do usuário sobre cercamento por hordas, escolhas de build, imbuimentos de run e coletáveis. O endereço de Azeroth Survivors foi consultado; sua página informa que o jogo exige WebGPU. Os novos efeitos foram implementados sobre o motor local do projeto, sem copiar código, tabelas de balanceamento ou recursos desse jogo.

## The Spriters Resource: personagens e efeitos

Catálogo adicional indicado pelo usuário: https://www.spriters-resource.com/pc_computer/ragnarokonline/

Foram integradas três folhas de efeitos ao combate, em `assets/fx/ro-catalog/`:

- Frost Diver, folha 42206, crédito de extração RO455: https://www.spriters-resource.com/pc_computer/ragnarokonline/asset/42206/ . Cristais de Rajada Congelante/Nevasca.
- Blessing, folha 127413: https://www.spriters-resource.com/pc_computer/ragnarokonline/asset/127413/ . Anjos sobre o conjurador de Bênção.
- Dragon Breath, folha 127417: https://www.spriters-resource.com/pc_computer/ragnarokonline/asset/127417/ . Chamas ao longo do Sopro do Dragão.

Os arquivos de origem foram preservados ao lado dos atlases recortados. `tools/pack_ro_effects.py` regenera os atlases com Pillow. O tempo de reprodução e a escala foram adaptados ao motor local; os efeitos de colisão continuam sendo calculados pelo combate, não pelos pixels da animação.

A folha Mage 141305 foi examinada como referência de personagem: https://www.spriters-resource.com/pc_computer/ragnarokonline/asset/141305/ . Ela contém camadas de corpo que precisam ser compostas com cabeça/cabelo. Para manter personagens completos e animações direcionais corretas, esta versão conserva as folhas já montadas da V10. Não foram importadas montarias, roupas sazonais ou outros tipos fora do escopo solicitado.
