FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc
RUN mkdir -p dist/public && cp -r src/public dist/ || true
EXPOSE 3100
CMD ["node", "./dist/index.js"]


