# Tabela de drops — V11

Valores aplicados no código desta edição. As rolagens são independentes, por abate elegível; não representam garantia depois de um número fixo de mortes. Não há bônus oculto de sorte nem sistema de pity.

## Asas e ímãs

| Inimigo | Asa de Mosca | Asa de Borboleta | Orbe de EXP | Ímã de Zeny |
|---|---:|---:|---:|---:|
| Monstro comum | 0,04% | — | 0,08% | 0,06% |
| Elite | 2% | 0,10% | 4% | 3% |
| Miniboss / guardião | 4% | 0,25% | 8% | 6% |
| MVP (principal ou Borboleta) | 6% | 0,50% | 12% | 10% |

A Asa de Borboleta não cai de monstros comuns. Em média, a Asa de Mosca comum equivale a 1 rolagem bem-sucedida em 2.500 abates; a Borboleta de um MVP, 1 em 200. Médias não garantem resultados individuais.

Asas e ímãs não caem de selos, monstros invocados ou alvos de prova de guilda. Descartar um monstro por distância ou trocar de mapa não gera drops. Existe limite de 30 objetos de baú/coletáveis ativos para essas rolagens; no limite, o drop adicional é suprimido. Esses coletáveis aleatórios expiram no chão após 100 segundos. Em grupo, a rolagem pertence ao mundo do anfitrião e cada participante pode recolher sua própria unidade do objeto compartilhado.

Além das rolagens, cada expedição recebe **um Orbe de EXP e um Ímã de Zeny** em posições caminháveis do mapa. Essas unidades iniciais não usam as chances da tabela e não têm prazo de desaparecimento.

## Cartas

| Origem | Chance por vitória/abate |
|---|---:|
| Monstro comum | 0,035% |
| Elite | 0,045% |
| Miniboss | 0,08% |
| Guardião secreto do Labirinto | 0,25% |
| MVP principal da expedição | 0,75% |
| MVP aleatório da fenda da Asa de Borboleta | 1,00% |

A carta é a do monstro derrotado e só pode cair se existir no banco de cartas. O MVP da Borboleta é sorteado igualmente entre os seis MVPs existentes: 1/6 para cada um. A chance de 1% é a carta **do MVP sorteado**, não 1% para cada uma das seis cartas. A carta acompanha o retorno da fenda; é preciso recolhê-la para guardá-la no álbum. Não há carta garantida.

## Cura, Zeny e baús comuns

| Objeto | Chance por abate comum | Observação |
|---|---:|---|
| Poção de cura | 4,5% | Limite de 12 no chão; cura pelo sistema de poções existente. |
| Moedas de Zeny | 55% | Limite de 240 pilhas; valor depende da expedição. |
| Baú de equipamento | 0,35% | Sujeito ao limite de baús comuns ativos. |
| Baú de forja | 0,30% | Requer espaço abaixo do limite de baús de melhoria. |

Os limites e condições podem suprimir um drop; portanto estas são chances nominais de rolagem, não garantias por inimigo. O ímã não fabrica Zeny nem EXP: recolhe o que já existe no chão. Cura e moedas continuam com as regras da base V10; as chances de asas e ímãs foram acrescentadas em `run-items.js`.

## Recompensas garantidas por objetivo

- Investigar a relíquia da missão: 1 relicário de imbuimento.
- Vencer uma fenda de elite ou a fenda de Borboleta: 1 relicário e recuperação de 15% do HP.
- Concluir contrato Purificar: 40 EXP, uma forja e +12% de dano contra o MVP do mapa.
- Concluir contrato Recuperar relíquia: 90 EXP e baú de elite.
- MVP principal: baú de MVP; a carta continua dependendo da rolagem de 0,75%.

Cada relicário oferece três imbuimentos distintos entre os 13 disponíveis, sem peso de raridade. Cada imbuimento tem **3/13 (aproximadamente 23,08%)** de aparecer entre as três opções; o jogador recebe apenas um. O espaço escolhido é substituído e o imbuimento anterior é destruído.
