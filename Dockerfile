# Stage 1: Build Vite frontend and install production dependencies
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci || npm install

COPY . .
RUN npm run build

# Stage 2: Runtime image
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev

# Include tsx for running server.ts directly and built static assets
RUN npm install -g tsx

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/server ./server
COPY --from=builder /app/cli ./cli
COPY --from=builder /app/src/types ./src/types

RUN mkdir -p /app/data /app/logs

EXPOSE 3000

CMD ["tsx", "server.ts"]
