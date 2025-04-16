FROM node:18-alpine

WORKDIR /app

COPY . .

RUN npm install

RUN mkdir -p /app/rooms

EXPOSE 3000

CMD ["node", "server.js"]
