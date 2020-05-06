FROM node:10
WORKDIR /webapp
COPY package.json /webapp
RUN npm install
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]