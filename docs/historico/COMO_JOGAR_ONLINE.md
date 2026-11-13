# Como jogar online com até seis aventureiros

O multiplayer desta build usa **um servidor Node.js**, não apenas HTML/CSS/JavaScript. Por isso, não funciona ao publicar os arquivos como um site estático, sem a API.

## No mesmo computador

- Instale Node.js 20+.
- Extraia a build completa em uma pasta nova.
- Execute `npm start` nesta pasta.
- Entre em `http://localhost:3000/`, clique em **Multiplayer** → **Criar sala**.
- O anfitrião compartilha o código de seis caracteres. Os convidados entram no mesmo servidor, colocam o código e escolhem suas classes.
- Com ao menos 2 participantes, o anfitrião clica em **Iniciar com o grupo**. Limite de 6 pessoas, incluindo o anfitrião.

## Na rede de casa (LAN)

Abra no computador hospedeiro um terminal e use `ipconfig` para ver o IP local. Os amigos na mesma rede entram em `http://IP-LOCAL:3000/`. Libere a porta 3000 no firewall para conexões locais, conforme necessário.

## Pela internet

Hospede a pasta completa em um provedor que execute **Node.js** (e não apenas páginas estáticas) ou em um servidor seu. Configure o comando `npm start`, disponibilize a variável `PORT` fornecida pelo provedor e utilize **HTTPS**. Compartilhe o endereço HTTPS do seu servidor com os amigos, depois crie uma sala.

### Notas

- Salas ficam apenas **na memória RAM do servidor**; reiniciar o servidor as encerra. É uma implementação cooperativa de teste, sem contas e sem banco de dados.
- Para partidas públicas de longa duração é necessário aprimorar reconexão, validação do servidor e persistência.
- O domínio publicado via ChatGPT Sites não ativa automaticamente o backend Node deste ZIP.
