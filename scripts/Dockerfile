FROM node:16 as AppBuild
WORKDIR /usr/app
COPY . .
RUN npm i
RUN npm run build:ssr

FROM aries_with_node
COPY --from=AppBuild /usr/app/dist/e-ijaza ./app
ENV LOGS_DIR="/home/indy/logs"
ENV NODE_OPTIONS="--max-old-space-size=8192"
ENV PORT="4000"
ENV ARIES_PORT="4001"
ENV ARIES_ADMIN_PORT="10000"
ENTRYPOINT ["/bin/bash", "-c", "node ./app/server/main.js >/home/indy/logs/app.log 2>/home/indy/logs/app.error.log"]
