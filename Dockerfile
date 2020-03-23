FROM ubuntu:16.04 as build

MAINTAINER SDF Ops Team <ops@stellar.org>

ADD . /app/src

WORKDIR /app/src

RUN apt-get update && apt-get install -y curl git make build-essential && \
    curl -sL https://deb.nodesource.com/setup_6.x | bash - && \
    apt-get update && apt-get install -y nodejs && \
    /app/src/jenkins.bash

FROM nginx:1.17

COPY --from=build /app/src/.tmp/webpacked/* /usr/share/nginx/html/account-viewer/
