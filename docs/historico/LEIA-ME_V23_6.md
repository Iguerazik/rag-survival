# Ecos de Rune-Midgard — V23.6 · correções do teste de jogo

Correções e pedidos do teste da V23 (Etapa 5). Contas e progresso continuam iguais: a única coisa nova no banco é a tabela
de recordes, criada vazia ao lado das outras.

## Como atualizar (desta vez)
1. **Feche** a janela do servidor (`01_SERVIDOR_ONLINE_V22.cmd`). O servidor aberto agora ainda usa o modo antigo.
2. Por segurança, copie a pasta `midgard-survivors\data` para outro lugar (backup).
3. Extraia este zip **por cima** da pasta `midgard-survivors` e escolha "Substituir". O zip não traz `data/` nem `cloudflared.exe`.
4. Abra o `01_SERVIDOR_ONLINE_V22.cmd` de novo.
5. Peça aos amigos **Ctrl+F5**.

### Das próximas vezes: atualizar sem derrubar
O `01_SERVIDOR_ONLINE_V22.cmd` antigo usava `node --watch`, que reiniciava o servidor **na hora**, a cada arquivo trocado,
e derrubava as partidas. Agora:
- extraia a versão nova por cima da pasta **com o servidor aberto**;
- o servidor percebe os arquivos novos, espera a extração terminar e não deixa começar partida nova;
- quando não houver partida em andamento, ele reinicia sozinho, em menos de 1 s, e a janela continua aberta;
- os **lobbies abertos são guardados** e voltam depois do reinício; quem está neles reconecta sozinho;
- quem estiver com a página antiga vê o aviso "Nova versão do jogo disponível" e recarrega quando quiser;
- `/api/version` continua respondendo `22.0.0`, e o `02_PUBLICAR_LINK_PARA_AMIGOS.cmd` não muda.

## Correções
- **Aba Pet / "Pets e loja" travava o jogo.** A lista de melhorias do pet usava uma variável que não existe, a janela não
  abria e o jogo ficava preso. Corrigido. Além disso, agora a run só pausa **depois** de a janela abrir: um erro futuro não
  trava mais nada.
- **Personagens andando sem virar.** O motor e a tela contavam a direção girada em 180°. Agora o motor usa o padrão do
  Ragnarok (0 = sul, 2 = oeste, 4 = norte, 6 = leste), igual aos sprites. Corrige você, os colegas e os monstros.
- **Aprendiz com habilidades de outra classe.** O Aprendiz T. (depois do renascimento) usava as habilidades da classe
  anterior. Agora, como no Ragnarok e no solo antigo, ele só tem **Primeiros Socorros** (cura só você) e
  **Fingir de Morto** (os monstros perdem você de vista). Todas as classes foram conferidas: cada uma só recebe as
  habilidades da própria etapa.
- **Jogo fácil demais, muita "mana" no chão, drop alto.** O motor tinha herdado números do online antigo: poção vermelha
  em 10,5% dos abates, cura de 25% ao subir de nível e poção azul em 7,5%. Tudo voltou aos números do solo:
  - poção vermelha em 4,5%; a poção azul não cai mais;
  - Zeny do solo;
  - subir de nível não cura;
  - regeneração do solo;
  - Curar com o valor do solo.

  Medido no Chrome, com um Espadachim parado no modo automático, no Normal: na V22.6 ele morre em 23 s; agora morre em
  24 s, com os mesmos 17 abates. O dano recebido por segundo ficou praticamente igual (10,9 na V22.6, 10,3 agora).
- **Escolhas demais / subir de nível muito rápido.** Subir de nível ficou cerca de 40% mais lento: no teste, uma escolha a
  cada 30 s em média, em vez de uma a cada 15 s.
- **Imbuimentos removidos.** Os colares elementais e o relicário saíram das ofertas e dos baús da missão e da fenda.
- **Tela de escolher habilidade:**
  - tem o **ícone da habilidade** em cada opção;
  - o texto ficou claro sobre fundo escuro (antes não dava para ler);
  - **não some mais sozinha** (antes escolhia a 1ª opção depois de 18 s);
  - no **solo o jogo pausa** até você escolher, como no solo antigo; no online a partida continua.
- **Cura com vírgula.** Os números de cura são inteiros.
- **Alcance da cura e dos buffs.** Curar alcança 160 (antes 300) e os buffs de grupo 200 (antes 340).
- **Buffs (Aumentar Agilidade, Bênção…).** Os buffs aparecem numa barra acima dos atalhos, com o tempo restante.
  Aumentar Agilidade deixa o grupo mais rápido por alguns segundos e Bênção aumenta o dano.
- **Revelação.** Funcionava, mas só contra inimigos muito colados e com pouco dano. Agora alcança 150 e causa 145% de
  dano Sagrado.
- **Todas as habilidades revisadas.** Um teste passou pelas 136 habilidades do catálogo, cada uma com um personagem da
  classe certa e monstros por perto. Todas são usadas e fazem o que prometem: dano, efeito no alvo, buff, cura, área no
  chão ou ressurreição. A única que não causa dano é o Pântano dos Mortos, que só deixa os monstros lentos, como no
  Ragnarok.
- **Chapéu e escudo não caíam.** O tesouro sorteava entre todos os itens, e as armas (34 itens) dominavam. Agora ele
  sorteia primeiro o **tipo**, com chance igual e sem repetir, e depois o item. Em 2.000 sorteios cada tipo
  (arma, armadura, escudo, chapéu, capa, bota, acessório) saiu de 13,7% a 14,8% das vezes.
- **MVP volta para o mapa.** Aos 12:00 ele aparece perto do grupo, no mapa normal, sem arena e sem portal. Continua
  chamando reforços a cada 9 s, a horda segue junto, e os ataques com aviso no chão continuam. O tesouro de equipamento
  continua no fim.
- **Fenda: o baú ficava para trás.** Antes, o grupo saía sozinho no instante em que o guardião morria. Agora abre um
  **portal de saída no centro**: recolham os prêmios e saiam com **E**. Se ninguém sair, a saída automática acontece
  depois de 90 s.
- **Portais só com E.** Entrar na fenda, sair dela e usar os portais do labirinto: só com **E** (ou o botão que aparece
  perto do portal, com o nome da ação). Encostar não faz mais nada.

## Online
- **Dessincronia.** Cada movimento agora leva o horário do **relógio do próprio jogador** (antes levava uma estimativa do
  relógio do servidor, que oscilava com a internet). Cada colega reproduz o movimento exatamente no ritmo em que
  aconteceu, com um atraso de exibição que se ajusta devagar. Medido com uma conexão simulada que atrasa cada pacote entre
  40 e 220 ms:
  - V22.6: 8 saltos;
  - V23 (Etapa 5): 13 saltos;
  - agora: **0 saltos**, com a mesma suavidade do seu próprio personagem.

  Numa conexão boa, o colega aparece cerca de 90 ms atrás.
- **Salas abertas.** O lobby lista as salas que ainda não começaram e têm vaga (anfitrião, mapa, dificuldade, jogadores).
  É só clicar em "Entrar"; ainda dá para entrar pelo código.
- **Recordes.** Botão "Recordes" no menu, com três tabelas:
  - maior nível de run;
  - mais abates;
  - vitórias.

  Vale a melhor partida de cada conta, no solo e no online. No online o servidor grava o resultado; no solo o jogo envia
  ao terminar, e o servidor confere se os números são possíveis.
- **Deslogar ao fechar o jogo.** Fechar a aba (ou o navegador) encerra a sessão; ao abrir de novo é preciso entrar.
  **F5 e uma segunda aba do jogo continuam logados.** O progresso que ainda não tinha subido fica guardado no navegador e
  é enviado no próximo login.

## O que ficou de fora
- **Desempenho do online com muitos jogadores:** não medi de novo nesta versão. A Etapa 5 mediu 1,67 ms por tick com 6
  jogadores.
- **Logout ao fechar:** o comportamento depende do navegador. Num navegador configurado para "continuar de onde parou",
  o Chrome pode restaurar a aba e a sessão junto.

## Testes
`npm test`: **122 testes** passando:
- 117 testes anteriores, 10 deles reescritos para as regras novas (MVP no mapa, portais com E, fenda com saída);
- 5 novos em `tests/v23-6.test.cjs`:
  - direção do Ragnarok;
  - Aprendiz T.;
  - drops e nível do solo;
  - carimbo do movimento online;
  - janela de pets à prova de erro.

O teste de paridade Node × Chrome continua passando.

No navegador (Chrome sem janela):
- **Pets e loja** abre pelo menu e durante a run.
- **Direção** certa nas 4 teclas, no motor e na tela.
- **Equilíbrio** comparado com a V22.6 lado a lado (números acima).
- **Painel de escolha:** com ícone, pausa o solo e continua aberto depois de 25 s.
- **Barra de buffs** aparece.
- **Fenda:** pisar não entra; E entra; o guardião morto abre a saída; E na saída volta com o baú.
- **Recordes** abrem.
- **Online com 2 navegadores:** entrar pela lista de salas e suavidade com a rede oscilando.

A pasta `assets/` tem os mesmos 484 arquivos de antes, iguais byte a byte.
