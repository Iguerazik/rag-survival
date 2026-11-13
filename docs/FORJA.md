# Forja de refinamento — V24 (até +10)

Configuração central: **`items.js` → `RefineRules`**. É o único lugar com chances, custos e bônus.
O mesmo arquivo roda no navegador, no servidor (`server-gear.mjs` carrega `items.js`) e nos testes.

## Tabela definitiva

| Refino desejado | Sucesso | Quebra se falhar | Falha sem quebra (efetiva) | Destruição (efetiva) | Custo |
|---|---:|---:|---:|---:|---:|
| +1 | 100% | 0% | 0% | 0% | 500 |
| +2 | 100% | 0% | 0% | 0% | 1.000 |
| +3 | 95% | 0% | 5% | 0% | 2.000 |
| +4 | 90% | 0% | 10% | 0% | 4.000 |
| +5 | 80% | 5% | 19% | 1% | 8.000 |
| +6 | 70% | 10% | 27% | 3% | 16.000 |
| +7 | 55% | 20% | 36% | 9% | 35.000 |
| +8 | 40% | 30% | 42% | 18% | 75.000 |
| +9 | 25% | 50% | 37,5% | 37,5% | 150.000 |
| +10 | 15% | 70% | 25,5% | 59,5% | 300.000 |

A chance de quebra é **condicional à falha**. Um único número aleatório `u ∈ [0,1)` decide a tentativa:
`u < sucesso` → **sucesso**; senão `(u − sucesso)/(1 − sucesso) < quebra` → **destruído**; senão → **falha sem quebra**.
Não existe resultado contraditório, e cada tentativa cobra o custo uma única vez, qualquer que seja o resultado.

## Fórmulas de atributos (as mesmas desde a V12, agora até +10)

| Categoria | Bônus por nível de refino |
|---|---|
| Arma | ATQ + (3 + 2 × tier) e ATQM + (2 + tier) |
| Armadura, escudo, capa, calçado, chapéu, acessório | DEF + 1,25 |

A prévia da forja (`RefineRules.preview`) e o cálculo do personagem (`Gear.bonuses`) usam a mesma
`RefineRules.perLevel`. Há um teste que confere, para **todos os 68 itens e todos os níveis de 0→10**, que o ganho
mostrado é exatamente o ganho aplicado.

## Regras de destruição

- O item destruído sai do inventário, sai de qualquer personagem que o tinha equipado e **leva junto as cartas
  encaixadas** (como no RO). A confirmação avisa isso antes da tentativa.
- Com conta, o identificador do item destruído fica no registro `refine_log`. Um save antigo do navegador que tente
  trazê-lo de volta é recusado.

## Segurança e transação

- **Com conta (solo ou online):** `POST /api/account/refine {uid, from, requestId, revision}`.
  O servidor sorteia com `crypto.randomInt`, desconta o Zeny e grava o item numa transação SQLite (`BEGIN IMMEDIATE`).
  - Repetir o mesmo `requestId` (reconexão) devolve o resultado já gravado, sem cobrar de novo.
  - Revisão antiga (outra aba) ou nível diferente do esperado (clique duplo) → 409, sem cobrar.
  - Item inexistente ou de outra conta → 404. Sem login → 401. Zeny insuficiente → 400. Acima de +10 → 400.
  - O save do navegador (`PUT /api/account/progress`) não consegue subir refino acima de +8, baixar refino, nem
    ressuscitar itens destruídos.
- **Sem conta (visitante):** as mesmas regras rodam no navegador, com `crypto.getRandomValues`.
- A forja fica no **menu principal**, fora de expedições, porque o equipamento da partida é lido no início dela.
- A forja não toca no laço de simulação (60 TPS): cada pedido é uma transação curta no SQLite, fora do tick.

## Compatibilidade

- Itens antigos (+0 a +8) continuam iguais. O limite do servidor subiu de +8 para +10.
- **Cópia repetida do tesouro do MVP:** continua dando +1 de graça, mas só até **+8** (`DUPLICATE_CAP`). Acima disso
  vira Zeny, e +9/+10 só saem pela forja.
- Carta Nove Caudas: o bônus de FLEE +20 continua valendo a partir de capa +8.

## Economia (dados reais do banco anexado)

- Partidas online registradas: 25. Zeny médio por partida: **32.140**; por vitória: **44.392**; mediana: 7.673.
- Saldo das 8 contas: mediana 100.000, máximo 318.313.
- Esperado com a tabela atual:

| Etapa | Chega lá | Zeny esperado gasto |
|---|---:|---:|
| +4 → +5 | 98,8% | 9.877 |
| +6 → +7 | 85,9% | 54.688 |
| +7 → +8 | 69,0% | 129.310 |
| +8 → +9 | 40,0% | 240.000 |
| +9 → +10 | 20,1% | 402.685 |

- De +8 a +10: **8,1%** de chance por item, ou seja, cerca de **5 milhões de Zeny por +10 obtido**
  (~112 vitórias online). Isso fica dentro do objetivo de "+9/+10 difíceis e caros", mas bem acima do que as contas têm hoje.

**Proposta, ainda não aplicada (só mudaria `TABLE` em `items.js`):** +9 com quebra de 35% e custo de 120.000;
+10 com quebra de 50% e custo de 220.000. De +8 a +10 a chance iria para **12,7%**, cerca de 3,3 milhões por +10
(~74 vitórias). Os níveis até +8 ficam iguais.
