# Ecos de Rune-Midgard V16 — ataques clássicos

Esta versão parte **exclusivamente da V15 completa** e não sobrescreve nenhum projeto publicado.

## Animações implementadas

- Reprodução temporal dos quadros de ataque já presentes em `assets/ro/*.png` (grupo de ação 40, oito direções). A versão anterior avançava quadros pela diferença entre `run.time` e o fim da animação; agora cada ataque tem uma linha do tempo única e não reinicia em loop antes de terminar.
- Ataques físicos com preparação, contato e recuperação. Duração por arma: adagas/katar mais ágeis; espadas e maças intermediárias; machados mais pesados.
- Arqueiros puxam a corda do arco e só disparam a flecha no ponto de soltura; projétil nasce próximo da mão do personagem em vez de aparecer aos pés dele.
- Magos e noviços utilizam quadros de conjuração (grupo de ação 88) em habilidades mágicas com tempo de cast; cajados têm efeito visual discreto.
- Ataque normal: dano ou lançamento do projétil acontece no quadro de contato. O jogador não pode acertar um inimigo que já morreu ou saiu do alcance antes do contato.
- Armas equipadas acompanham o movimento; são renderizadas na frente ou atrás do personagem de acordo com a direção.
- No cooperativo, a posição da animação do aliado é transmitida junto com seu estado, para sincronizar a pose de ataque nas outras telas.

## Limitações

- Os quadros reaproveitados são os **assets de personagens que já existiam no projeto**. As armas são sobreposições de ícones adaptados ao personagem; elas não substituem os sprites oficiais de armas equipadas em todas as classes. As durações e contatos foram adaptados ao combate contínuo do estilo Survivors. Não representa uma reprodução quadro-a-quadro de todas as ações oficiais do cliente Ragnarok para cada combinação de classe, arma e montaria.
- Testes automatizados passaram; a validação visual real por navegador foi **bloqueada neste ambiente**. Recomenda-se uma conferência jogando 1 minuto de Espadachim, Arqueiro, Mago e Mercador antes de publicar.

## Como executar (Windows)

1. Extraia o ZIP completo em uma pasta **nova**.
2. Instale Node.js 20 ou mais recente, se necessário.
3. Abra `midgard-survivors/INICIAR_WINDOWS.bat`. Alternativamente, abra o terminal dentro da pasta `midgard-survivors` e execute `npm start`.
4. Entre em `http://localhost:3000/?v=16`.
5. Para testes de integração, execute `npm test` no terminal.

**Não substitua a versão V15 original ao testar.** Se já houver outro servidor rodando na porta 3000, feche-o antes de iniciar este.
