# Ecos de Rune-Midgard — V6 · Interface Clássica

Nova versão independente, criada **a partir do ZIP completo V5.2**. Nenhum dos arquivos originais do usuário foi sobrescrito. A versão publicada no ChatGPT Sites também não foi alterada.

## Como iniciar
1. Extraia o arquivo V6 completo em **uma nova pasta**.
2. Instale Node.js 20+ e execute `npm start` no diretório `midgard-survivors/`.
3. Abra `http://localhost:3000` no navegador. Para multiplayer pela internet, siga `COMO_JOGAR_ONLINE.md`.

## Janelas baseadas no Ragnarok
- **Status:** painel com FOR, AGI, VIT, INT, DES, SOR, atributos derivados, HP/SP, nível base e de classe. A alocação de atributos fica disponível no lobby.
- **Equipamento:** modelo do personagem, oito slots clicáveis, ícones dos equipamentos e cartas encaixadas; do slot você pode abrir o gerenciamento.
- **Acesso rápido:** botões no lobby e HUD; atalhos `Alt+S` (status) e `Alt+E` (equipamentos).
- **Inventário, Códex, cartas e pets:** os diálogos agora podem abrir durante uma partida sem ficarem ocultos atrás do menu.
- **Skin fornecida:** 23 BMPs do pacote enviado `default_skin_template.zip` foram convertidos para PNG (transparência magenta preservada) e aplicados nos painéis. As imagens originais não foram editadas.

## Música de Prontera na tela inicial
A música oficial de Prontera é **Theme of Prontera, faixa 08**.
- Para tocar o arquivo original que você **possui direito de usar**, copie `08.mp3` para `assets/bgm/ro/08.mp3`, mantendo "Originais: ativados" no menu; ou use o seletor "Ouvir 08.mp3" (vale apenas até atualizar a aba).
- Na ausência de `08.mp3`, o jogo toca `assets/bgm/ambient/menu.ogg`, composição **alternativa original**, não a faixa do Ragnarok.
- O som inicia após o primeiro clique/interação por restrição padrão dos navegadores.
- Ao iniciar a expedição, a trilha muda para a música do mapa; ao voltar ao menu, retorna a Prontera.
- A OST oficial **não está incluída** porque não foi fornecida com permissão de redistribuição.

## Habilidades e legibilidade
- 24 novas folhas de animações em pixel art para magias, golpes, efeitos de gelo, fogo, relâmpago, cura, bênçãos, tiros e áreas.
- Melhorias no círculo de conjuração e texto da habilidade: fundo escuro, borda dourada, letras claras e contorno preto para qualquer terreno/tema.
- As novas animações são **originais, inspiradas no visual 2D clássico**; não são sprites extraídos nem cópias idênticas das animações oficiais. Para fidelidade literal, é necessário fornecer assets autorizados.
- Conserva os projéteis, combate, classes, mapas, dificuldade, Códex, drops e multiplayer da versão V5.2.

## Integração segura com seu projeto
O arquivo `Ecos_Rune_Midgard_V6_APENAS_ALTERACOES.zip` contém somente arquivos novos ou diferentes em relação ao `Ecos_de_Rune_Midgard_V5_2_COMPLETO_NOVA_COPIA.zip`. Faça backup da sua árvore atual e use uma ferramenta de diff/merge, pois o seu código pode ter avançado em paralelo.

## Testes
Testado em Chromium com assets servidos pelo harness offline: carregamento, tema, música do menu (fallback), seleção de classes, janela de equipamento e status, ajuste de atributos, inventário/cartas em menu e durante run, pausa/retomada, vários efeitos simultâneos, viewport desktop 1366x860 e mobile 390x844. Sem exceções JavaScript nesses fluxos. **Não é uma validação exaustiva de uma run longa/multiplayer remoto.**
