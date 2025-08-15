FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc
RUN mkdir -p dist/public && cp -r src/public dist/ || true
EXPOSE 3200
CMD ["node", "./dist/index.js"]


