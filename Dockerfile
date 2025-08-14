# Install dependencies and rebuild the source code only when needed
FROM node:alpine AS builder
ENV NODE_ENV production

# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat

WORKDIR /app
COPY . .

RUN cd /app && echo 'YARN VERSION IN BUILDER: ' && yarn --version
RUN yarn rebuild && yarn build

# Prod image, copy all files and start
FROM node:alpine AS runner

ENV NODE_ENV production
ENV APP_NAME snakey-mouse
ENV APP_ORIGIN http://localhost:8080
ENV SOCKET_ORIGIN localhost
ENV SOCKET_PORT 8080
ENV APP_ENV production
ENV SERVER_ORIGIN http://localhost
ENV SERVER_PORT 8080
WORKDIR /app

# Copy files from build
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/.yarn ./.yarn
COPY --from=builder /app/yarn.lock ./yarn.lock
COPY --from=builder /app/.yarnrc.yml ./.yarnrc.yml
COPY --from=builder /app/.pnp.cjs ./.pnp.cjs
COPY --from=builder /app/package.json ./package.json

# rebuild unplugged node modules
RUN rm -rf /app/.yarn/unplugged && yarn rebuild

EXPOSE 8080

CMD ["yarn", "start"]
