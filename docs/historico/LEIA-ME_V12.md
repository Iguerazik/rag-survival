# Ecos de Rune-Midgard — V12

Revisão jogável da V11 com correções de interface, progressão, hordas, sprites e encontros. A V11 enviada anteriormente foi preservada em uma cópia separada.

## Instalação

Extraia o ZIP em uma pasta nova. Com Node.js 20 ou superior instalado, execute `INICIAR_WINDOWS.bat`, ou abra um terminal na pasta do jogo e execute `npm start`. Acesse **http://localhost:3000**. Não é necessário instalar dependências npm.

Os salvamentos locais continuam usando a mesma chave. Use o mesmo navegador e a mesma origem/endereço para manter personagens, equipamentos, cartas, pets e configurações. Não exclua os dados do navegador ao trocar de versão.

Antes de iniciar, encerre o servidor da V11. O inicializador detecta uma versão antiga na porta 3000 e avisa para fechá-la. O endereço `http://localhost:3000/?v=12` mantém a mesma origem do salvamento e evita carregar a página anterior do cache. Se necessário, use Ctrl+F5.

## Interface e inventário

- Ícones de Status, Equipamentos, Inventário, Opções e Skills substituídos por símbolos legíveis, sem as palavras minúsculas embutidas nos botões antigos.
- A tela de encaixe/equipamento tem **Voltar ao inventário**, mesmo quando foi aberta pelo menu de equipamentos.
- **Itens de run** tem cartões próprios, com descrições e configurações de asas em largura normal. O texto não usa mais a coluna de 54px reservada ao ícone de equipamento.
- Aba **Minha classe** mostra apenas itens compatíveis com a classe e o estágio atuais.
- Filtro por T1, T2, T3 ou T4 e ordenação dos melhores tiers primeiro.
- Baús apresentam **duas colunas verticais**: inventário/equipados à esquerda e escolhas à direita. A comparação inclui cartas, opções, refinos e melhorias de forja.
- Ao entrar na escolha de imbuimento de um baú normal, **Voltar às opções de itens** retorna ao mesmo sorteio. Entrar e voltar não gera outros itens nem muda suas opções aleatórias.
- 68 ícones oficiais de equipamentos foram armazenados localmente para evitar esperas por imagens externas durante a comparação.

## Tiers e opções de equipamento

| Tier | Cor | Opções adicionais nos novos drops |
|---|---|---:|
| T1 · Comum | Cinza | 0 |
| T2 · Incomum | Verde | 1 |
| T3 · Raro | Azul | 2 |
| T4 · Épico | Roxo | 3 |

As opções são atributos reais aplicados ao personagem quando o item está equipado. Elas são sorteadas uma única vez e preservadas junto ao item. O baú mostra as opções antes de você escolher a recompensa. Os equipamentos antigos não são re-sorteados: suas cartas, refinos e melhorias continuam intactos.

A venda em lote continua protegendo itens equipados, refinados, com cartas e de tiers altos. Também é possível filtrar por tier e vender peças individualmente.

## Zeny: usos efetivos

Abra **Inventário → Forja & Zeny**.

| Serviço | Custo | Regra |
|---|---:|---|
| Refino garantido +1 | `(40 + 20 × tier) × próximo refino²` | Limite +8; preserva cartas e opções. |
| Poção de Cura | 180 z | Cura 25% do HP ao usar; recarga de 30s. |
| Sorteio extra de melhorias | `500 + 150 × índice da expedição` | Uma compra por expedição, além dos três sorteios iniciais da run. |
| Reset de atributos | Regra existente | O primeiro reset continua gratuito; os próximos cobram Zeny. |

A forja usa primeiro o Zeny coletado na run e depois o saldo guardado, sem duplicar o dinheiro ao encerrar. Poções são usadas em **Itens de run**. Asas raras e cartas de MVP não são vendidas nessa loja. Pets continuam usando pontos de Códex.

## Experiência e clear de hordas

- Limite da run ampliado de 90 para **150 níveis**.
- Experiência necessária por nível reduzida, principalmente nas partes intermediária e final.
- Até o nível 12, cada nível rende ponto; até 60, níveis pares rendem ponto; depois, um ponto a cada três níveis.
- As skills continuam limitadas a **nível 10**, com os limites por mapa mantidos. Mais níveis não significam multiplicadores de dano ilimitados.
- A experiência permanente de Base e Classe recebida ao encerrar a partida foi multiplicada por 1,5.
- **Cadeia Rúnica desbloqueada no nível 3:** um acerto a cada 1,1s pode saltar para mais dois inimigos próximos, com dano decrescente e linhas visíveis. Os saltos não ativam outros saltos ou roubo de vida.
- Novas escolhas de nível modificam skills específicas: **Cadeia Rúnica** aumenta os saltos; **Propagação** espalha dano em até três alvos; **Área Amplificada** dá +12% de raio e +8% de potência por melhoria. Cada modificação tem limite de duas melhorias por skill.
- A mira automática de área busca grupos densos, com peso para elites; ataques básicos e skills de alvo único continuam priorizando elites/MVPs. A mira manual é preservada.
- Nevasca agora é uma zona persistente de cinco pulsos de dano e desaceleração.
- Magias e habilidades de área receberam uma revisão de potência; os bônus continuam sujeitos à tabela elemental.

As modificações competem pelos mesmos pontos usados para evoluir skills. Seus efeitos atuais aparecem em **Itens de run**.

## Hordas, elites e zonas

A população e a frequência de chegada aumentaram. O limite solo Normal passa a 215 monstros comuns; a dificuldade e o tamanho do grupo ajustam o teto, com limite base de 380. Encontros especiais têm uma pequena reserva limitada para poder aparecer com a horda cheia.

A velocidade cresce pelo tempo da expedição atual, com teto. Ela não acumula indefinidamente ao atravessar todos os mapas.

**Elites voltaram a aparecer nas hordas**, independentemente das fendas: aos 90, 180, 270, 360, 450, 540 e 630 segundos. O encontro de 360s é um miniboss. Eles têm identificação visual, padrões sinalizados e recompensas próprias.

Os monstros comuns foram escolhidos das listas dos mapas correspondentes:

| Expedição | Mapa de referência | Exemplos |
|---|---|---|
| Esgotos | prt_sewb4 | Besouros-Ladrões Fêmea/Macho, Drainliar, Cãibra |
| Payon | pay_dun04 | Esqueleto Arqueiro, Horong, Dokebi, Nove Caudas |
| Labirinto | prt_maze03 | Bafomé Jr., Mosca Caçadora, Louva-a-Deus, Sorrateiro |
| Calabouço Orc | orcsdun01 | Orc Zumbi, Orc Esqueleto, Drainliar, Chonchon de Aço |
| Geffen | gef_dun02 | Mosca Caçadora, Marionete, Sussurro, Pesadelo, Deviruchi |
| Floresta de Payon | pay_fild10 | Selvagem, Besouro-Rei, Guardião da Floresta |

A Floresta de Payon agora referencia `pay_fild10`, onde Eddga aparece na lista consultada. Os MVPs principais continuam sendo as invasões temáticas definidas pelo projeto; o Calabouço Orc mantém o Herói Orc como encontro final adaptado.

## Fendas e MVPs mais difíceis

As fendas opcionais de elite continuam separadas dos encontros da horda. Seus guardiões usam monstros locais que se movem, **sem usar MVPs**. A exceção intencional é a Asa de Borboleta, cujo propósito já era abrir uma fenda de MVP.

- HP de guardião considera estágio do personagem, nível de Base, mapa e dificuldade. Não aumenta a cada compra de equipamento ou refino.
- Um único impacto não remove mais que 16% do HP do guardião.
- Aos 55% de HP, uma segunda fase bloqueia a passagem direta e exige romper três selos, enquanto os ataques continuam.
- Os três padrões mantêm diferenças: proteção inicial por selos, ritual com pressão de ataques e cerco com reforços limitados.
- A entrada da fenda é marcada com símbolo e texto **FENDA** no minimapa após aparecer na tela. A marca permanece ao se afastar, até a entrada expirar ou ser usada.
- A geração na arena usa suas coordenadas diretamente e não percorre a navegação do mapa anterior.

O MVP principal continua surgindo aos 12 minutos no mapa normal, com a horda. Ele tem HP mínimo superior ao de um guardião, dano de contato ampliado, **investidas com aviso de 1,05s** e aceleração de perseguição quando está distante. É possível desviar lateralmente; fugir em linha reta por tempo indefinido fica mais difícil.

Ao morrer o MVP, os monstros restantes **continuam perseguindo e atacando** enquanto a recompensa está pendente. Eles não ficam congelados para serem mortos sem reação.

## Coletáveis ao longo do tempo

Além dos drops por abate, surge um coletável perto de uma posição caminhável aos 55s e depois a cada 65s de combate da expedição. O ciclo alterna cura, orbe de EXP, bolsa de Zeny e ímã de Zeny. Existem limites de objetos e prazo de coleta para evitar acumulação infinita.

- Cura temporal: 25% do HP; permanece no chão enquanto o personagem está com HP cheio.
- Bolsa de Zeny: 25 z no primeiro mapa, +10 z por índice de expedição.
- Orbe de EXP e ímã de Zeny recolhem recursos já caídos; não geram EXP ou moedas extras.
- Asas continuam raras, com as chances documentadas. A agenda de coletáveis não fornece asas gratuitamente.

A missão, o cronograma de elites e o cronograma de coletáveis renovam ao avançar de mapa. Nível, skills e imbuimentos da run permanecem enquanto o personagem estiver vivo.

## Como desbloquear as classes

Abra **Progressão** no menu inicial ou no menu dentro da partida. O guia mostra requisitos e progresso do personagem atual.

| Mudança | Base / Classe | Selos MVP | Objetivo de run | Prova |
|---|---|---:|---|---|
| Primeira → segunda classe | Base 1 / Classe 40 | 1 | Nível 30 com a primeira classe | Prova de guilda após 24 abates |
| Segunda → renascimento | Base 99 / Classe 50 | 2 | Nível 45 com a segunda classe | — |
| Aprendiz T. → primeira classe T. | Base 1 / Classe 10 | 2 | Nível 15 como Aprendiz T. | — |
| Primeira T. → transclasse | Base 1 / Classe 50 | 3 | Nível 40 com a primeira classe T. | — |
| Transclasse → terceira classe | Base 99 / Classe 70 | 5 | Nível 60 e duas fendas vencidas com a transclasse | Prova após 48 abates |

Os selos são cumulativos. O melhor nível é registrado ao ser alcançado; as duas fendas podem ser vencidas em runs diferentes da mesma transclasse. A mudança é confirmada pelo menu da Jornada ao cumprir tudo. O modo de treino não registra desbloqueios. Classes já desbloqueadas no salvamento não são removidas.

## Sprites e desempenho

Foram comparados os **37 tipos de monstros** com imagens de referência. Os cinco MVPs que usavam modelos simplificados foram substituídos; Bafomé já usava o monstro correto. Eddga agora usa sua folha original com espera, caminhada e ataque.

Limite visual conhecido: 19 tipos usam animações de prévia originais do catálogo, sem todos os quadros direcionais de caminhada/ataque. Isso preserva a identidade correta dos monstros, mas não equivale à animação completa do cliente Ragnarok para cada direção. As demais folhas existentes foram mantidas, e Eddga recebeu a composição própria.

Filtros caros por sprite foram reduzidos nas hordas e efeitos/cadeias têm limites. A validação inclui uma cena com 215 monstros, mas não garante a mesma taxa de quadros em todo dispositivo.

Veja `VALIDACAO_V12.md`, `FONTES_V12.md`, `TABELA_DE_DROPS_V12.md` e a pasta `VALIDACAO_SPRITES/`. Testes das regras: `npm test`.

Não foi feita uma campanha completa de seis jogadores, teste prolongado de carga ou validação estatística de todas as builds. O multiplayer mantém a arquitetura de anfitrião autoritativo da base. Esta entrega é o ZIP atualizado; nenhuma hospedagem externa existente foi substituída.
