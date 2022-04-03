FROM aries-cloudagent-run
USER root
RUN apt-get update
RUN apt-get install -y build-essential
RUN curl -fsSL https://deb.nodesource.com/setup_16.x | bash -
RUN apt-get install -y nodejs
USER indy
