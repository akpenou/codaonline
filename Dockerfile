FROM ghcr.io/puppeteer/puppeteer:latest

WORKDIR /usr/src/app

COPY . .
RUN yarn
RUN yarn build
CMD yarn start