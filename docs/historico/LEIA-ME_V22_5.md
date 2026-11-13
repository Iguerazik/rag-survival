# Ecos de Rune-Midgard — V22.5

**Como atualizar:** extraia o zip **por cima** da pasta `midgard-survivors` (a pasta `data` e o `cloudflared.exe`
não vêm no zip). Desta vez é preciso fechar e abrir o `01_SERVIDOR_ONLINE_V22.cmd` uma última vez; o link do
Cloudflare pode ficar aberto. Peça aos amigos Ctrl+F5.

**A partir desta versão o servidor se reinicia sozinho quando os arquivos mudam** (`node --watch`). Nas próximas
atualizações basta extrair por cima com tudo aberto: o servidor volta em ~1 s e o link continua o mesmo.
Partidas em andamento caem nesse instante (as salas ficam na memória); contas e progresso não são afetados.

## Habilidades do online: as do Ragnarok, por classe
- O online agora usa um catálogo único (`online-skills.json`, 134 habilidades) com os nomes do bRO.
  1ª classe completa (ex.: Mago com Lanças de Fogo/Gelo, Relâmpago, Bolas de Fogo, Barreira de Fogo, Rajada
  Congelante, Tempestade de Raios, Espíritos Anciões, Ataque Espiritual, Escudo Mágico, Petrificar, Chama
  Reveladora, Proteção Arcana e Aumentar Recuperação de SP). Personagens evoluídos também recebem as da 2ª classe
  (Cavaleiro, Bruxo, Caçador, Sacerdote, Ferreiro, Mercenário), da transclasse e da 3ª classe.
- Cada run: no máximo **5 habilidades ativas** (teclas 1–5) e passivas livres. A cada nível vêm 3 opções sorteadas
  do leque inteiro da classe; "NOVA · …" é habilidade nova e "Melhorar · … nível 2 → 3" é melhoria de uma que você tem.
- Níveis máximos iguais aos do RO (ex.: Golpe Fulminante 10, Disparo Violento 1).
- Ficaram de fora só as que não fazem sentido no jogo (Teleporte, Portal, Identificar Item, Comércio etc.).
- Habilidades sem ícone no pacote usam um ícone simples desenhado pelo jogo. Para trocar, coloque
  `assets/ro/skill-<id>.png` e aponte o campo `ic` em `tools/build-online-skills.mjs`.

## SP (mana)
- A barra de **SP aparece** em "Informações básicas" no online (ficava escondida no modo automático).
- O Mago gastava muito mais SP do que recuperava, e por isso as magias quase não saíam. Agora: custo menor,
  regeneração maior (INT da conta ajuda), **poção azul** que cai dos monstros (+35% SP) e +30% de SP ao subir de nível.
- No automático as habilidades se revezam (a que está pronta há mais tempo sai primeiro) em vez de uma só gastar tudo.
- "Aumentar Recuperação de SP" continua sendo recuperação de SP.

## Outras correções do online
- **Curar** cura você e todos os aliados feridos por perto.
- **Baús**: alguns jogadores não recebiam a escolha (o painel ficava escondido quando a opção nova repetia a
  anterior). Corrigido; o mesmo valia para escolhas de nível, que agora também ficam em fila em vez de se perder.
- **Lobby mantido**: no fim da partida, "Voltar ao lobby da sala" mantém a sala com todos dentro.
- **Horda por jogador**: cada jogador tem a própria cota de monstros por perto (maior em grupo), então quem se
  afasta também recebe horda. Cada monstro persegue o jogador para quem nasceu, em vez de todos irem em um só.
- **Atributos da conta** (FOR/AGI/VIT/INT/DES/SOR e nível de Base) valem no online, com as fórmulas do solo.
- **Mudança de classe pelo online**: melhor nível de run, fendas vencidas, selos de MVP e **Prova da Guilda**
  (aparece após 24 abates) agora contam e são gravados pelo servidor.
- **Missão "Investigar"** (investigar → caçar 2 elites → consagrar) existe no online, para o grupo.
- **Imbuimentos** no online: relicário ao investigar e ao vencer a fenda, com 2 anéis + 1 colar como no solo.
  Dá para **descartar** o relicário sem trocar nada (no solo também).
- **Orbe de Experiência e Ímã de Zeny** aparecem no mapa a cada ~65 s.
- **Cartas**: mesmas chances do solo (comum 0,035% · elite 0,045% · miniboss 0,08% · MVP 0,75%).
- Dificuldade: começo mais leve, monstros mais fortes com o tempo e nos mapas mais avançados.
- Corpo a corpo (Espadachim, Mercador, Gatuno) acerta em arco os monstros colados no alvo.
- O efeito da habilidade toca onde ela acerta (antes também tocava em cima de quem conjurava).

## Solo
- **Investigar** funcionava só depois de escolher a rota no painel. Agora, 3 s parado no selo escolhem "Relíquia".
- A horda do solo voltou a um ritmo mais leve e, jogando sozinho, os monstros batem 12% mais fraco.
- Nomes iguais ao RO: "Olhos de Águia", "Aumentar Recuperação de HP", "Mina Terrestre".

## O que ainda é diferente entre solo e online
O solo roda no navegador e o online roda no servidor, com regras próprias. Ainda não foram levados ao online:
equipamentos e cartas equipadas, bênçãos de nível (Lâmina Temperada etc.), runas de habilidade, pets, padrões de
ataque dos MVPs, a escolha de rota da missão e os imbuimentos elementais. O solo ainda usa a árvore fixa de
habilidades por classe, não o leque sorteado do online.

`npm test`: 69 testes.
