# Alternative to Cloudflare Workers (Swarm stack): runs the same Worker build in workerd via
# `wrangler dev`, which also serves dist/client and public/_redirects. Pages are rendered on
# demand from the CMS, so the CMS no longer has to be reachable during `docker build`.
# Debian base: workerd needs glibc. Untested in a real Swarm.
FROM node:22-slim AS build
WORKDIR /app
# Shared design system (a file: dependency at ../design-system), passed with
# --build-context design-system=design-system
COPY --from=design-system . ../design-system
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG STRAPI_URL
ARG PUBLIC_STRAPI_URL
ARG PUBLIC_AUTH_PROVIDERS
ARG PUBLIC_TURNSTILE_SITE_KEY
ARG SITE_URL
ENV STRAPI_URL=$STRAPI_URL PUBLIC_STRAPI_URL=$PUBLIC_STRAPI_URL PUBLIC_AUTH_PROVIDERS=$PUBLIC_AUTH_PROVIDERS PUBLIC_TURNSTILE_SITE_KEY=$PUBLIC_TURNSTILE_SITE_KEY SITE_URL=$SITE_URL
RUN npm run build

FROM node:22-slim
WORKDIR /app
COPY --from=build /app /app
ENV WRANGLER_SEND_METRICS=false
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=3s CMD node -e "fetch('http://127.0.0.1/robots.txt').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["npx", "wrangler", "dev", "--ip", "0.0.0.0", "--port", "80"]
