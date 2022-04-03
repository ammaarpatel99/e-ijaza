FROM aries_with_node
# workspace mounted at /home/indy/app
ENV LOGS_DIR="/home/indy/logs"
ENTRYPOINT ["/bin/bash", "-c", "cd ./app && npm run dev:ssr -- --port 4000 >/home/indy/logs/app.log 2>/home/indy/logs/app.error.log"]
