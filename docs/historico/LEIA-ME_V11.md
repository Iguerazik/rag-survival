# Ecos de Rune-Midgard — V11

Continuação do cliente V10 enviado nesta conversa. O ZIP original foi preservado. Esta edição contém o jogo completo para navegador, o servidor Node e o código-fonte; não requer um serviço de build.

## Executar

1. Extraia o ZIP em uma pasta nova.
2. Instale Node.js 20 ou superior, caso ainda não o tenha.
3. Abra um terminal na pasta `midgard-survivors` e execute `npm start`.
4. Abra **http://localhost:3000** no navegador.

No Windows, também é possível executar `INICIAR_WINDOWS.bat`. No Linux/macOS: `sh iniciar.sh` e abrir o endereço acima. Para testes das regras: `npm test`. Não é necessário instalar pacotes npm para executar o jogo ou esses testes.

O progresso continua usando a chave de salvamento local da V10. Use o mesmo navegador e endereço/origem para reencontrar o progresso anterior. Equipamentos, cartas, refinos, sets, pets, progressão de classes e Reborn existentes foram mantidos. As asas coletadas e suas configurações ficam nesse mesmo salvamento local; não foi criado um serviço novo de contas na nuvem.

## Expedição e MVP

- O MVP principal aparece aos **12 minutos no mapa normal**. O personagem não é levado para outra arena; os monstros comuns permanecem e novas levas continuam chegando.
- O combate single-player pausa nas escolhas e janelas apropriadas. O tempo da expedição é suspenso dentro das fendas opcionais. A luta contra o MVP continua além do marco de 12 minutos.
- O MVP tem piso de HP equivalente a 2,8 vezes a referência de miniboss, respeitando dificuldade, tamanho do grupo e mapa. Seus ataques continuam sinalizados no chão.
- Ataques e habilidades automáticas priorizam MVPs e elites dentro do alcance. Na fenda com escudo, os selos que precisam ser destruídos têm prioridade. A mira manual continua permitindo escolher outro alvo.
- Habilidades de alvo único ganham 25% de potência contra elites/MVPs. Conjurações e projéteis guiados tentam procurar outro alvo se o alvo original morrer.
- A geração de monstros distribui candidatos por oito setores, evita a proximidade imediata do herói e respeita o limite populacional da dificuldade. Monstros comuns muito distantes de todo o grupo são descartados sem recompensas. Alguns monstros rápidos usam aproximação lateral, com suavização de direção.

## Missões que renovam entre expedições

Cada mapa recebe um contrato com nome próprio: investigar uma relíquia, escolher seu destino, caçar comandantes e consagrar um selo. Para investigar/consagrar, fique perto do selo sem andar e evite dano; afastar-se ou sofrer dano faz o progresso decair.

- **Purificar:** investigar por 6s, vencer 2 comandantes e consagrar por 10s. Recompensa: 40 EXP, forja e +12% de dano contra o MVP daquele mapa.
- **Recuperar relíquia:** exige 3 comandantes; recompensa final de 90 EXP e baú de elite.
- Investigar também libera um relicário de imbuimentos temporários.
- Ao seguir para outra expedição, missão, progresso, eventos, MVP e mapas são renovados. A build, os níveis da run e os imbuimentos permanecem enquanto o personagem estiver vivo.

## Fendas de elite

Aos 2, 4, 6, 8 e 10 minutos, uma fenda opcional pode surgir perto do jogador. Aproxime-se e use o botão da missão para ler o objetivo antes de entrar. Uma fenda não aceita desaparece depois de 110s.

- **Selo de Glast Heim:** destruir três selos remove a proteção de 70% do guardião.
- **Ritual de Geffen:** círculos e anéis de maldição; a pressão de ataques é renovada periodicamente.
- **Cerco dos Orcs:** investidas e reforços limitados; priorize o comandante.

O limite é de 90s. Vencer libera um relicário para escolher um imbuimento e recupera 15% do HP. Esgotar o tempo devolve o personagem sem prêmio; ficar sem HP segue a condição de derrota da run. Ao retornar, os monstros e objetos da expedição são restaurados. Não há coleta automática gratuita dos itens deixados para trás.

## Combos e escolhas roguelike

Há **30 sequências de habilidades**, para primeiras classes, transclasses e terceiras classes. Os requisitos completos aparecem no **Códex de Combinações**, com filtros por classe e função.

- Duas habilidades aprendidas em nível 2; usar a segunda em até 6s depois da preparação.
- Recarga de 10s por combinação.
- Combos de caça-MVP: dano adicional de 65% da potência da habilidade final contra um elite/MVP.
- Combos de hordas: dano adicional de 38% em até cinco inimigos próximos.
- A primeira descoberta de uma sequência rende 120 pontos de Códex. As combinações anteriores de habilidade + equipamento continuam rendendo 240 pontos na primeira descoberta.
- Três usos de **Sortear novamente** nas escolhas de nível por run. Não gastam pontos de habilidade e só ficam disponíveis quando existem alternativas diferentes.

Essas combinações são adaptações próprias para este Survivors, usando os nomes e a temática de Ragnarok.

## Inventário, equipamentos e imbuimentos

Baús apresentam comparação com o equipamento atual, permitem consultar o inventário e oferecem a escolha explícita entre **guardar** e **receber e equipar**. Duplicatas ficam separadas; não são mais consumidas para refinar automaticamente. Refino manual, cartas e sets permanecem disponíveis. As recompensas de equipamentos são filtradas para a classe; o jogo não completa a seleção com itens incompatíveis.

Além dos acessórios permanentes existentes, há **dois espaços de anel e um de colar de run**. Eles não ocupam nem substituem o equipamento permanente da conta. Os 13 imbuimentos possíveis incluem:

- Anel de Morroc: roubo de vida.
- Anel de Ullr: dano contra elites/MVPs.
- Anel de Niflheim: eco de dano em poucos inimigos, com recarga.
- Anel de Einbroch: dano físico e velocidade de ataque.
- Colares de Geffen, Valquíria, Payon e Odin: magia/recarga, HP, mobilidade/crítico ou EXP.
- Cinco colares elementais: Fogo, Água, Vento, Terra e Sagrado.

Relicários oferecem três opções aleatórias, com chances iguais de inclusão para cada imbuimento. Escolha o espaço a ocupar ou substituir. Acessórios temporários são destruídos ao morrer ou encerrar a run; permanecem ao avançar para outro mapa sem morrer. É possível descartá-los em **Inventário → Itens de run**. Equipamentos permanentes não são apagados.

## Sustain e asas

O roubo de vida usa o dano real, sem contar overkill. Todas as fontes de roubo, inclusive a Carta Mosca Caçadora, compartilham um teto de **1,5% do HP máximo por segundo**. O Anel de Morroc rouba 2,5% do dano; dois anéis são limitados a 4% do dano antes do teto de cura. Isso exige continuar causando dano e não compensa a pressão constante de uma horda.

As asas começam com quantidade zero e têm drops raros. Quantidades guardadas persistem entre runs até serem consumidas.

- **Asa de Mosca:** uso manual ou automático, com configuração entre 5% e 50% de vida (padrão 25%). Teleporta para outra posição caminhável, concede 2,5s de proteção e recupera 12% do HP máximo ao longo de 4s. Recarga de 60s. Não ressuscita um personagem já sem HP. No labirinto, permanece na mesma sala para evitar deixar o MVP inacessível.
- **Asa de Borboleta:** consome uma unidade para entrar numa fenda de 120s com um dos seis MVPs, sorteado igualmente, com reforços limitados. A chance da carta desse MVP é **1% por vitória**, contra 0,75% no encontro principal. Não existe garantia. Não pode ser usada dentro de outra fenda ou durante o MVP principal; em grupo, a entrada é comandada pelo anfitrião. A carta que cair acompanha o retorno à expedição.

## Coletáveis

Poções de cura e moedas continuam sendo objetos no chão. Foram acrescentados o **Orbe de Experiência**, que recolhe todas as gemas já caídas, e o **Ímã de Zeny**, que recolhe todas as moedas já caídas. Eles não geram recursos novos. Cada expedição recebe também uma unidade de cada ímã em posições caminháveis do mapa, além dos drops aleatórios.

Consulte **TABELA_DE_DROPS_V11.md** para todas as chances e os limites aplicados.

## Elementos, skin e sprites

- Tabela elemental de dez propriedades e quatro níveis extraída de https://browiki.org/wiki/Monstros#Propriedade .
- Propriedade e nível dos seis MVPs conferidos em https://browiki.org/wiki/MVP . Monstros comuns conferidos no Divine Pride, banco também referenciado pela bRO Wiki.
- Habilidades elementais mantêm sua propriedade fixa; colares imbuem os ataques e habilidades sem propriedade fixa. A relação é aplicada também a projéteis, veneno e zonas persistentes.
- O alvo prioritário mostra sua propriedade. A barra do chefe mostra propriedade e fraqueza; o Bestiário permite consultar todos os monstros com seus sprites animados.
- A skin enviada em `default_skin_template.zip` foi convertida para PNG, preservando os componentes originais e tratando a cor magenta como transparência. O menu usa janelas compactas e barras clássicas, com suporte ao tema escuro existente.
- Efeitos de Rajada Congelante/Nevasca, Bênção e Sopro do Dragão agora usam também folhas do The Spriters Resource, empacotadas para o motor local. Personagens completos e suas direções existentes foram mantidos; montarias ficaram fora do escopo.
- Foram importados 22 GIFs do catálogo https://nn.ai4rei.net/dev/npclist/?q=type%3Amonster para o Bestiário e as prévias de MVPs. Os GIFs são prévias de animação, não folhas completas de movimento; o combate mantém as folhas direcionais existentes. Fontes e créditos em **FONTES_V11.md**.

## Validação e limites

Foram executados testes de regras com Node e verificações no Chromium: combos, alvos, fendas, selos, retorno ao mapa, loot/inventário, asas, sustain, elementos, ímãs, renovação da missão, preservação da build e perda dos imbuimentos ao encerrar. Também foi verificada a recepção dos estados de entrada/saída de fenda em outro cliente.

O multiplayer continua usando o modelo original de **anfitrião autoritativo**, com transporte pelo servidor Node. Não foi substituído por uma simulação de combate autoritativa no servidor. Não foram feitos testes de campanha completa, carga prolongada ou balanceamento estatístico de todas as builds; os números são uma primeira revisão jogável, ajustável a partir de partidas reais. O jogo hospedado fora deste ZIP não foi publicado ou alterado.
