FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --include=dev

COPY src ./src
COPY tsconfig.json ./

RUN npm install -g typescript
RUN npm install -g tsx
RUN npm install -g nodemon

EXPOSE 6000

RUN npm run build

CMD ["npm", "run", "dev"]
