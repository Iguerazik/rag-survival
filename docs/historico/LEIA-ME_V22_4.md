# Ecos de Rune-Midgard — V22.4

**Como atualizar:** feche o servidor, extraia o zip **por cima** da pasta `midgard-survivors` e substitua os arquivos
(a pasta `data` e o `cloudflared.exe` não vêm no zip). Peça aos amigos Ctrl+F5.

## O progresso do solo agora conta na conta
- Jogando **solo com a conta logada**, os níveis de Base/Classe, o Zeny, as cartas, os itens e os mapas liberados
  passam a ser salvos no servidor, igual ao online. O topo mostra "☁ Salvo online".
- O servidor continua barrando valores impossíveis numa única gravação:
  - Zeny: mais de 80.000 de uma vez.
  - Cartas: mais de 12 de uma vez.
  - Itens: mais de 40 de uma vez.
  - EXP: mais do que uma partida inteira consegue dar.
  - Nível: acima do limite da classe.
  - Classe: pular mais de uma mudança de classe.

  Quando algo é recusado, aparece o motivo e a cópia local fica guardada no navegador.
- Se o progresso mudar no servidor enquanto você joga (uma partida online, ou a mesma conta em outro aparelho),
  o jogo junta os dois automaticamente e mantém o que estiver mais avançado em cada personagem.
  Antes ficava preso em "⚠ Nuvem pendente".

## Configuração (opcional)
O `01_SERVIDOR_ONLINE_V22.cmd` continua com `STRICT_ONLINE_PROGRESS=1`, que agora significa
"solo conta, com limites". Se um dia quiser voltar ao bloqueio total antigo (só partidas online alteram a
economia da conta), troque para `STRICT_ONLINE_PROGRESS=2`.

> Como o solo roda no navegador, alguém que mexa no código da página ainda consegue inflar o progresso
> dentro desses limites. Para um servidor entre amigos isso costuma ser aceitável.

`npm test`: 63 testes.
