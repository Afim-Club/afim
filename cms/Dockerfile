FROM node:22-alpine AS build
WORKDIR /app
RUN apk add --no-cache build-base vips-dev
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache vips-dev
COPY --from=build --chown=node:node /app ./
USER node
EXPOSE 1337
HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=5 \
  CMD wget -qO- http://127.0.0.1:1337/_health >/dev/null || exit 1
CMD ["npm", "run", "start"]
