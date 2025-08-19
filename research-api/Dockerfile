FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci || npm i --production
COPY tsconfig.json ./
COPY src ./src
RUN npm run build
EXPOSE 5100
CMD ["npm", "start"]


