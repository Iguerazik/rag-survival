# Sprites que faltam (atualização de cidades e eventos)

Situação em 13/11/2026. Todos os monstros e chefes que o jogo **já usa hoje** têm sprite.
A lista abaixo é do que a nova atualização (seis regiões, eventos e menu) pede e **não existe** em `assets/`.
Enquanto não houver sprite, esses monstros ficam de fora (ou entram depois, quando o sprite chegar).

Formato que o jogo usa:
- **folha de animação** em `assets/ro/<id>.png` (todas as ações e direções numa imagem) + a entrada em `assets/ro/sprites.js`
  (largura/altura do quadro, ponto de origem e quadros por ação);
- **ícone animado** em `assets/monsters/<id>.gif` (bestiário e listas).

## Monstros comuns

| Região / evento | Monstro | Observação |
|---|---|---|
| Prontera | Creamy | — |
| Prontera | Poporing | dá para fazer como Poring recolorido (verde), é o mesmo modelo no jogo original |
| Prontera (Invasão de Porings) | Poring Dourado | recolorido do Poring |
| Payon | Willow | — |
| Payon | Wolf | — |
| Payon | Bigfoot | — |
| Geffen | Familiar | — |
| Geffen | Poison Spore | dá para fazer como Spore recolorido (roxo) |
| Morroc | Peco Peco | — |
| Morroc | Mummy | — |
| Morroc | Matyr | — |
| Niflheim | Disguise | — |
| Niflheim | Dullahan | — |
| Niflheim | Loli Ruri | — |
| Glast Heim | Raydric | — |
| Glast Heim | Khalitzburg | — |
| Marcha dos Orcs | Orc Warrior | (hoje só existem Orc Zombie, Orc Skeleton e Orc Hero) |
| Marcha dos Orcs | Orc Archer | — |
| Chuva de Tesouros | Mimic | — |

## MVPs

| Região | MVP |
|---|---|
| Geffen | Dracula (Doppelganger já existe) |
| Morroc | Osiris |
| Morroc | Phreeoni |
| Niflheim | Lord of Death |
| Glast Heim | Dark Lord |

Já existem e podem ser usados: Besouro-Ladrão Dourado (Prontera), Flor do Luar (Payon), Doppelganger (Geffen),
Bafomé, Herói Orc e Eddga.

## NPCs e cenário (menu e eventos)

| Onde | O que falta |
|---|---|
| Menu (cidade viva) | NPCs decorativos de Prontera (guardas, mercadores, Kafra) |
| Caravana da Kafra | Kafra e a carroça da caravana |
| Eventos sazonais (Natal em Lutie, Festival de Porings) | monstros temáticos (ex.: Santa Poring, Christmas Cookie) |

O fundo de Prontera do menu pode começar com o que já existe (`assets/prontera-expedition.webp` e `assets/ro/renewal-props.webp`).

## Já disponíveis para as novas regiões

Poring, Lunatic, Fabre, Spore, Horong, Dokebi, Sohee, Munak, Bongun, Nine Tail, Tarou, Thief Bug, Sidewinder, Nightmare,
Marionette, Whisper, Deviruchi, Archer Skeleton, Orc Zombie, Orc Skeleton, Hunter Fly, Mantis, Savage, Beetle King,
Greatest General, Steel Chonchon, Drainliar, Cramp, Baphomet Jr.
