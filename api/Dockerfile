FROM node:22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    vips-dev \
    pkgconfig

RUN npm install -g typescript

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

FROM node:22-alpine AS production

WORKDIR /app

RUN apk add --no-cache \
    vips \
    python3 \
    make \
    g++

COPY package*.json ./

RUN npm ci --only=production && \
    npm uninstall sharp && \
    npm install --platform=linuxmusl --arch=x64 sharp && \
    npm cache clean --force

COPY --from=builder /app/dist ./dist

EXPOSE 5000

CMD ["npm", "start"]
