FROM node:22-alpine

WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

COPY package.json .

RUN npm ci --only=production && npm cache clean --force

COPY . .

RUN npm run build

EXPOSE 5000

CMD ["npm", "start"]
