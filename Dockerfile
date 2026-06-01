FROM node:24-alpine AS build

WORKDIR /app

ARG VITE_REQUEST_PREFIX
ARG VITE_API_ORIGIN=https://interview.civicplus.com
ARG VITE_CLIENT_SECRET

ENV VITE_REQUEST_PREFIX=$VITE_REQUEST_PREFIX
ENV VITE_API_ORIGIN=$VITE_API_ORIGIN
ENV VITE_CLIENT_SECRET=$VITE_CLIENT_SECRET

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.29-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
