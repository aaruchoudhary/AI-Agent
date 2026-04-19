# --- build TypeScript ---
FROM node:22-bookworm AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc -p tsconfig.json

# --- runtime: browsers + Node for Playwright ---
# Pin to a tag that is consistently available on MCR
ARG PLAYWRIGHT_TAG=v1.49.1-jammy
FROM mcr.microsoft.com/playwright:${PLAYWRIGHT_TAG}
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY public ./public

ENV NODE_ENV=production
# PORT is set by Render at runtime; local default is 3847 in server.ts
EXPOSE 3847

CMD ["node", "dist/server.js"]
