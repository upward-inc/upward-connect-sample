# backend のイメージ。ビルドコンテキストはリポジトリのルートで、除外設定は隣の Dockerfile.dockerignore を使う。
# ルートの bun.lock をコンテキストに含め、依存をロックファイルで解決された版に固定するため。
# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
# tag: oven/bun:1.4.4-alpine
FROM oven/bun:1.4.4-alpine@sha256:4cf82f5686b196504fe119db3fcd9185b191f82ece82c40680e597228ec6070a AS base
WORKDIR /usr/src/app

# backend の依存を devDependencies まで含めて入れる（prisma generate と bun build に必要）。
# --frozen-lockfile により、依存の宣言が bun.lock で満たせないとビルドが失敗する。
# --ignore-scripts は、ルートの postinstall（Prisma Client の生成）をこの時点で走らせないため。
# 依存のライフサイクルスクリプトも走らないが、Prisma Client は prisma ステージで生成するため不要。
FROM base AS deps
COPY package.json bun.lock ./
COPY apps/backend/package.json ./apps/backend/
# --frozen-lockfile が bun.lock の全 workspace と照合するために必要。install は --filter で backend だけに絞る。
COPY apps/frontend/package.json ./apps/frontend/
RUN bun install --filter=backend --frozen-lockfile --ignore-scripts

# Prisma clientの生成
FROM deps AS prisma
COPY apps/backend/prisma.config.ts ./apps/backend/
COPY apps/backend/prisma ./apps/backend/prisma/
# prisma generateの実行にはDATABASE_URLが必要のため、ダミーの値を設定
ENV DATABASE_URL="sqlserver://localhost:1433"
WORKDIR /usr/src/app/apps/backend
RUN bun run prisma generate

# backend のソースと依存をひとつのファイルに bundle する。
# release ステージでは node_modules を持たず、この bundle だけを使う。
FROM prisma AS bundle
COPY apps/backend/src ./src
RUN bun build --target=bun --sourcemap=linked --outdir dist src/index.ts

# bundle だけを最終イメージに置く
FROM base AS release

ENV NODE_ENV=production

COPY --from=bundle /usr/src/app/apps/backend/dist ./apps/backend/dist

# run the app
WORKDIR /usr/src/app/apps/backend
USER bun
EXPOSE 8787/tcp
ENTRYPOINT ["bun", "dist/index.js"]
