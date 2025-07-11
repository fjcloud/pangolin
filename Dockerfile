FROM registry.redhat.io/ubi9/nodejs-20 AS builder
USER 0

WORKDIR /app

# COPY package.json package-lock.json ./
COPY package*.json ./
RUN npm ci

COPY . .

RUN echo 'export * from "./sqlite";' > server/db/index.ts

RUN npx drizzle-kit generate --dialect sqlite --schema ./server/db/sqlite/schema.ts --out init

RUN npm run build:sqlite
RUN npm run build:cli

FROM registry.redhat.io/ubi9/nodejs-20 AS runner
USER 0

WORKDIR /app

# COPY package.json package-lock.json ./
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/init ./dist/init

COPY ./cli/wrapper.sh /usr/local/bin/pangctl
RUN chmod +x /usr/local/bin/pangctl ./dist/cli.mjs

COPY server/db/names.json ./dist/names.json

COPY public ./public
RUN chown -R 1001:1001 /app
USER 1001

CMD ["npm", "run", "start:sqlite"]
