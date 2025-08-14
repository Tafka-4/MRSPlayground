FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --include=dev

COPY src ./src
COPY tsconfig.json ./

RUN npm install -g nodemon

EXPOSE 3001

RUN npm run build

CMD ["npm", "run", "dev"]
