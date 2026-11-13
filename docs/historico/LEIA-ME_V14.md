# Ecos de Rune-Midgard V14 — builds roguelike e armas na mão

Esta é uma **cópia independente**. O código anterior não foi sobrescrito.

## Novo ciclo de recompensas

* Baús comuns, elites e recompensas de fendas agora oferecem 3 **bênçãos temporárias** com raridades e requisitos de classes; o jogador escolhe uma. Não criam um novo equipamento permanente por baú.
* Bênçãos podem ser melhoradas até seus limites (2–4), e existem **16 sinergias** entre pares de bênçãos, que são descobertas ao longo das runs. A primeira descoberta rende 75 pontos de Códex.
* Baús de melhoria reforçam os atributos dos equipamentos **somente na run**, com escolha entre atributos temporários da forja.
* MVPs continuam oferecendo equipamento permanente raro. Cópias de um mesmo item podem refinar até +8; cópias extras após +8 viram Zeny de baixo valor. Cartas continuam sendo drops raros e permanentes.
* Abra **Itens > Itens de run** (ou o botão **Build**) para consultar a build atual.
* As escolhas temporárias somem ao fim da expedição. XP, classes, Códex, Zeny de vitória, cartas e equipamentos permanentes seguem no seu perfil local.

## Sprites das armas durante o combate

* Espadachim, Arqueiro, Mago, Noviço, Mercador e Gatuno exibem na mão a **sprite do equipamento atualmente equipado**, usando imagens de `assets/items/`.
* Trocar ou refinar arma muda automaticamente a sprite renderizada; não é necessário reiniciar a partida.
* A arma acompanha direção, movimento e ataque, inclusive em personagens cooperativos quando a informação é enviada pelo servidor.
* Visual usa os **ícones de armas existentes no jogo** transformados em acessórios de mão. Ainda não são folhas de animação de arma independentes no estilo Gravity.

## Como iniciar

Na pasta que contém `package.json`, execute `npm start` (Node.js >= 20), e acesse `http://localhost:3000/`. Para outras pessoas da internet, será necessário publicar o servidor em um host acessível com HTTPS/WSS; não basta enviar o `localhost`.

### Validação

Execute `npm test`. Os testes cobrem tabelas de equipamento e progressão anteriores, escolhas temporárias e o desenho de armas. O multiplayer remoto continua baseado na sincronização HTTP da build original, e não foi transformado em servidor autoritativo nesta atualização.
