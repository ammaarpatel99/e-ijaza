FROM aries_with_node
# workspace mounted at /home/indy/app
ENTRYPOINT ["/bin/bash", "-c", "cd ./app && npm run dev:ssr"]
