FROM node:22-alpine AS build
WORKDIR /app
# Shared design system (a file: dependency at ../design-system), passed with
# --build-context design-system=design-system
COPY --from=design-system . ../design-system
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG PUBLIC_STRAPI_URL
ARG PUBLIC_TURNSTILE_SITE_KEY
ENV PUBLIC_STRAPI_URL=$PUBLIC_STRAPI_URL PUBLIC_TURNSTILE_SITE_KEY=$PUBLIC_TURNSTILE_SITE_KEY
RUN npm run build

FROM nginx:1.27-alpine
COPY infra-nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=3s CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
