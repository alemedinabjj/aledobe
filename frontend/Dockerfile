ARG NODE_IMAGE=node:22-bookworm-slim
ARG NGINX_IMAGE=nginx:1.27-alpine
FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/ui/package.json packages/ui/
COPY apps/editor/package.json apps/editor/
COPY apps/shell/package.json apps/shell/
RUN npm ci
COPY . .
ARG VITE_API_URL=/api
ARG VITE_DEV_LOGIN=false
ARG VITE_SENTRY_DSN=
ENV VITE_API_URL=$VITE_API_URL VITE_DEV_LOGIN=$VITE_DEV_LOGIN VITE_SENTRY_DSN=$VITE_SENTRY_DSN
RUN EDITOR_BASE=/editor/ npm run build -w @aledobe/editor \
  && VITE_EDITOR_URL=/editor npm run build -w @aledobe/shell \
  && mkdir -p /out && cp -r apps/shell/dist/. /out/ && cp -r apps/editor/dist /out/editor

FROM ${NGINX_IMAGE} AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /out /usr/share/nginx/html
EXPOSE 80
