# Ecos de Rune-Midgard — V5.2, expansão segura

Esta é uma **cópia independente** da build V4. Os ZIPs originais e o jogo publicado no ChatGPT Sites **não** foram alterados. Para instalar, extraia em uma **pasta nova** e mantenha uma cópia da sua versão editada simultaneamente.

## Melhorias desde a V4

- Interface inicial reorganizada como cliente de jogo clássico (menus de Equipamentos, Cartas, Códex, Pets e Multiplayer na parte de cima). Mantidos os modos claro e escuro.
- Itens em pixel art já presentes na V4; a versão não inclui a arte comercial original dos ícones do Ragnarok.
- Códex com **silhuetas borradas** de habilidades e itens ainda não descobertos, em vez de caixas cinzas ilegíveis.
- **Provas de Guilda** para mudança de 2ª e 3ª classe: inimigos especiais aparecem ao cumprir as contagens da expedição; também continuam necessários nível base, nível de classe e selos MVP.
- Atração de Zeny de ~100 unidades, puxando automaticamente as moedas. Pets continuam ampliando a coleta.
- Animações diferenciadas por skill, feitiços com **tempo de conjuração**, **projéteis visíveis** até o inimigo e impacto no acerto. Nome da habilidade com placa de alto contraste.
- Inimigos avançam em 8 direções, alternando entre perseguição diagonal e navegação para evitar paredes.
- Travamentos: limites de partículas/efeitos/projéteis, busca de projéteis otimizada e ciclo principal que não interrompe a execução por um erro isolado. **Nível 4**: pausa normal para escolha da habilidade ficou destacada e visível.
- 6 mapas com música por expedição. **As seis faixas incluídas são temas originais alternativos, e não a OST do Ragnarok.** Para tocar a trilha oficial, forneça MP3s que você tem permissão de usar. Veja `assets/bgm/ro/COLOQUE_AS_SUAS_MUSICAS_AQUI.txt`.
- Continuidade do multiplayer cooperativo de 2 a 6 pessoas na versão Node.js. Consulte `COMO_JOGAR_ONLINE.md`.

## Associação das músicas originais do RO

| Mapa do jogo | Nome da faixa de Ragnarok | Arquivo local esperado |
|---|---|---|
| Esgotos de Prontera | Under the Ground | `assets/bgm/ro/19.mp3` |
| Caverna de Payon 4F | Welcome Mr. Hwang | `assets/bgm/ro/47.mp3` |
| Labirinto da Floresta | Labyrinth | `assets/bgm/ro/16.mp3` |
| Calabouço dos Orcs | Help Yourself | `assets/bgm/ro/48.mp3` |
| Torre de Geffen 2F | Through the Tower | `assets/bgm/ro/21.mp3` |
| Floresta de Payon 11 | Peaceful Forest | `assets/bgm/ro/03.mp3` |

No menu, use o botão **Usar arquivos do RO** para tentar os originais. Sem o MP3 local, toca o tema alternativo. A opção Som é persistente e o volume é ajustável.

## Executar

1. Instale Node.js **20 ou superior**.
2. Abra um terminal na pasta que contém `package.json`.
3. Execute `npm start` e abra `http://localhost:3000` no navegador.
4. Para multiplayer na internet, é necessário **hospedar o servidor Node** em HTTPS. A hospedagem estática do ChatGPT Sites por si só não executa a API de salas.

## Limitações e testes

A versão foi submetida a testes de interface por navegador headless com recursos substitutos, verificação sintática JavaScript e testes de lógica para a evolução, projéteis e Zeny. **Não é garantia de compatibilidade com todas as classes** nem teste de latência de seis jogadores reais. A OST original e os sprites comerciais do jogo não acompanham o ZIP. A funcionalidade de troca de classe por mini-bosses é adaptação ao jogo, não réplica exata das quests do RO.
