FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm install -g tsx typescript
RUN npm run build

EXPOSE 3002

CMD ["node", "dist/index.js"]