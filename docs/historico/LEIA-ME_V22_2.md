# Ecos de Rune-Midgard — V22.2

Segundo pacote de correções sobre a V22.1. Nenhum modelo de personagem, monstro ou sprite foi removido.
**Como atualizar:** igual à V22.1. Feche o servidor, extraia o zip **por cima** da pasta `midgard-survivors` e
substitua os arquivos (a pasta `data` e o `cloudflared.exe` não vêm no zip, então os seus ficam intactos).
Abra os mesmos `01_` e `02_` de sempre. Peça aos amigos para recarregarem com Ctrl+F5.

## O que mudou

- **Fenda sem travar:** o FPS despencava na fenda (e nas lutas contra elite/MVP). Havia dois motivos:
  - o chão da arena era redesenhado com recorte a cada quadro (agora é desenhado uma vez só);
  - o brilho de "monstro atingido" usava um filtro de canvas caríssimo (agora é uma segunda passada leve do mesmo sprite).

  Nos testes, a fenda passou de ~35 FPS, com travadas, para 60 FPS estáveis.
- **Janela de música do menu:** ela abria cortada, saindo pela esquerda da tela. Agora abre no canto direito, inteira.
- **Senha:** mínimo de **8** caracteres (antes 12). Senhas antigas continuam valendo.
- **Horda progressiva:** a quantidade e o ritmo de monstros crescem a cada minuto do mapa. Para 2 jogadores
  são ~24 no começo, ~50 aos 3 min e ~100 aos 9 min. Monstros esquecidos longe do grupo reaparecem perto de vocês.
  O solo também ficou progressivo.
- **Elite não para a horda:** os elites não contam no limite de monstros, então a horda continua vindo.
  Durante o MVP continua vindo uma horda menor.
- **Baús de elite, MVP e fenda são do grupo:** quando alguém pega o baú, **cada jogador** escolhe a própria melhoria.
  Se você já tiver uma escolha aberta, o baú novo fica na fila.
- **Baús mais fortes e sem números quebrados:**
  - A tela mostra só **"+ Dano"**, **"++ Velocidade de ataque"** etc. Os sinais "+", "++" e "+++" indicam
    baú comum, de elite e lendário (MVP/fenda).
  - Os bônus ficaram maiores e há dois novos: **Velocidade de movimento** e **SP máximo**.
- **Fim do mapa:**
  - **Online:** o líder vê **"Próximo mapa: …"**, **"Jogar este mapa de novo"** e **"Voltar ao menu"**,
    e o grupo inteiro vai junto para o mapa escolhido. Na derrota, o líder vê "Tentar de novo com o grupo".
  - **Solo:** aparecem os botões "Próximo mapa", "Jogar de novo" e "Voltar ao menu".
- **Descrição das habilidades:**
  - Passe o mouse em cima de uma habilidade na barra para ver o nome, o que ela faz e o nível.
  - Ao subir de nível no online, cada opção mostra uma descrição curta.
- **Passivas do online funcionam de verdade:** antes podiam ser escolhidas, mas não faziam nada. Agora:
  - Perícia: +6% de dano por nível.
  - Recuperação: mais regeneração de HP.
  - Recuperação de SP: mais regeneração de SP.
  - Olhos de Abutre: mais alcance.
  - Olhos de Coruja: ataques mais rápidos.
  - Esquiva: chance de desviar.
  - Desconto: mais Zeny.

## Somente para testes locais
`MIDGARD_TEST_RIFT_AT=10` abre a primeira fenda aos 10 s. `MIDGARD_TEST_WIN_AT=5` vence o mapa aos 5 s
(para testar a tela final). Não use essas variáveis no servidor de verdade.

`npm test`: 61 testes.
