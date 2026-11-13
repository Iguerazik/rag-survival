# RAG SURVIVAL — imagem de produção (Railway ou qualquer Docker).
# Node 22 LTS: node:sqlite estável a partir do 22.13. Sem dependências npm.
FROM node:22-alpine
RUN apk add --no-cache su-exec tini
WORKDIR /app
COPY --chown=node:node . .
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    DATA_DIR=/data \
    TICK_RATE=60 \
    SNAPSHOT_RATE=20 \
    MIDGARD_AUTO_UPDATE=0 \
    SAVE_LOBBIES_ON_EXIT=1 \
    NODE_OPTIONS=--disable-warning=ExperimentalWarning
EXPOSE 3000
# O volume do Railway é montado como root: o script ajusta a pasta de dados e roda o jogo como usuário "node".
ENTRYPOINT ["/sbin/tini","--","/app/docker-entrypoint.sh"]
CMD ["node","server.mjs"]
