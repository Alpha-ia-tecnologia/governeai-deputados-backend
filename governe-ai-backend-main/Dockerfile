FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache dumb-init wget

COPY package*.json ./

RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/voters/test || exit 1

ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "dist/main"]
