FROM node:latest

WORKDIR /src/
RUN git clone https://github.com/ton-link/ton-link-warden-v4.git
WORKDIR /src/ton-link-warden-v4
COPY .env .env
RUN npm install
RUN npm install tsc -g
RUN npm run build
CMD ["node", "index.js"]