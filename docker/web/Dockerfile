FROM node:22-alpine AS builder

WORKDIR /app

ARG VITE_CLIENT_ID
ARG VITE_TENANT_ID

ENV VITE_CLIENT_ID=$VITE_CLIENT_ID
ENV VITE_TENANT_ID=$VITE_TENANT_ID

COPY client/package.json client/package-lock.json ./

RUN npm ci

COPY client/ .

RUN npm run build

FROM nginx:1.27-alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
