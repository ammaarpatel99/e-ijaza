FROM aries_with_node
# workspace mounted at /home/indy/app
ENV LOGS_DIR="/home/indy/logs"
ENV NODE_OPTIONS="--max-old-space-size=8192"
ENV PORT="4000"
ENV ARIES_PORT="4001"
ENV ARIES_ADMIN_PORT="10000"
ENTRYPOINT ["/bin/bash", "-c", "cd ./app && npm run dev:ssr -- --port 4000 >/home/indy/logs/app.log 2>/home/indy/logs/app.error.log"]
