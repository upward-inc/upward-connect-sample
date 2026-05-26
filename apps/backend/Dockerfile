# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
# tag: oven/bun:1.3.9-alpine
FROM oven/bun:1.3.9-alpine@sha256:9028ee7a60a04777190f0c3129ce49c73384d3fc918f3e5c75f5af188e431981 AS base
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

# Prisma clientの生成
FROM base AS prisma
WORKDIR /usr/src/app
# prisma generateに必要なdev依存をコピー
COPY --from=install /temp/dev/node_modules ./node_modules
COPY prisma.config.ts .
COPY prisma ./prisma/
# prisma generateの実行にはDATABASE_URLが必要のため、ダミーの値を設定
ENV DATABASE_URL="sqlserver://localhost:1433"
RUN bun run prisma generate

# copy node_modules from temp directory
# then copy all (non-ignored) project files into the image
FROM base AS prerelease
COPY . .

# copy production dependencies and source code into final image
FROM base AS release

ENV NODE_ENV=production

COPY --from=install /temp/prod/node_modules node_modules
COPY --from=prisma /usr/src/app/prisma/generated prisma/generated
COPY --from=prerelease /usr/src/app/package.json .
COPY --from=prerelease /usr/src/app/src src

# run the app
USER bun
EXPOSE 8787/tcp
ENTRYPOINT [ "bun", "run", "src/index.ts" ]