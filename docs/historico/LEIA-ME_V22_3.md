# Ecos de Rune-Midgard — V22.3

**Como atualizar:** igual às anteriores. Feche o servidor, extraia o zip **por cima** da pasta `midgard-survivors`
e substitua os arquivos (a pasta `data` e o `cloudflared.exe` não vêm no zip). Peça aos amigos Ctrl+F5.

## Correção
- **O multiplayer agora dá EXP de Base e de Classe ao personagem.** Antes, a partida online gravava só Zeny,
  cartas e mapas liberados.
  - O servidor calcula a EXP com a mesma fórmula do solo (abates próprios, tempo de expedição e bônus de vitória)
    e grava na conta. O navegador não envia EXP, então ela não pode ser forjada.
  - A tela final mostra o ganho, por exemplo "Base 1 → 14 · Classe 1 → 12", e avisa quando a mudança de classe
    fica disponível.
  - Vale para vitória e derrota (a derrota dá menos EXP, como no solo), para todo o grupo, na linhagem usada na sala.
- Depois da partida, o jogo busca o progresso verificado no servidor e junta com o progresso local sem
  diminuir níveis. Isso também tira o aviso "⚠ Nuvem pendente" que aparecia depois de partidas online.

## Progresso do solo
A partir da V22.4 o progresso do solo também é salvo na conta (veja `LEIA-ME_V22_4.md`).
