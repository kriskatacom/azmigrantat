FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json tsconfig.json ./
RUN npm install --ignore-scripts
COPY src ./src
RUN npm run build
ENV NODE_ENV=production
EXPOSE 3100
CMD ["node", "dist/server.js"]
