# Imagem de produção do Volkswagen, em três estágios.
#
# O que justifica os três: `npm ci` é lento e só muda quando o lockfile muda, o
# build só muda quando o código muda, e a imagem final não deve carregar nem um
# nem outro. Assim um deploy que só mexeu em código reaproveita a instalação.

# --- dependências -----------------------------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# `ci` e não `install`: respeita o lockfile e falha se ele estiver defasado, em
# vez de resolver versões diferentes das que foram testadas.
RUN npm ci

# --- build ------------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --- execução ---------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Usuário sem privilégio: se o código de um hook escapar, ele escapa como
# ninguém. O editor de fontes executa JavaScript no servidor — está escrito no
# README que não há isolamento, e rodar como root pioraria muito o estrago.
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# O `standalone` traz o servidor e as dependências dele; estático e `public`
# ficam de fora do pacote e precisam ser copiados à mão.
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000
ENV PORT=3000
# 0.0.0.0 e não localhost: em contêiner, escutar só no loopback é o mesmo que
# não escutar — nada de fora da imagem alcança.
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
