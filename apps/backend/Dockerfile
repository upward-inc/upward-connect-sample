# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1.2.12-alpine AS base
WORKDIR /usr/src/app

# install dependencies into temp directory
# this will cache them and speed up future builds
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# install with --production (exclude devDependencies)
RUN mkdir -p /temp/prod
COPY package.json /temp/prod/
RUN cd /temp/prod && \
	bun install --frozen-lockfile --production

# Prisma clientの生成はNode.jsに依存するため、Node.jsの公式イメージを使用して実行
FROM node:22-alpine AS prisma
WORKDIR /usr/src/app
# @prismaに依存するため、/devからnode_modulesをコピー
COPY --from=install /temp/dev/node_modules ./node_modules
COPY package.json ./
COPY prisma ./prisma/
RUN npx prisma generate

# copy node_modules from temp directory
# then copy all (non-ignored) project files into the image
FROM base AS prerelease
COPY . .

# copy production dependencies and source code into final image
FROM base AS release

ENV NODE_ENV=production

COPY --from=install /temp/prod/node_modules node_modules
COPY --from=prisma /usr/src/app/node_modules/.prisma node_modules/.prisma
COPY --from=prerelease /usr/src/app/package.json .
COPY --from=prerelease /usr/src/app/src src

# run the app
USER bun
EXPOSE 8787/tcp
ENTRYPOINT [ "bun", "run", "src/index.ts" ]