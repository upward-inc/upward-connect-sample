# upward-connect-sample

このリポジトリは、UPWARD CONNECTに対応したAPIサーバーの構築サンプルです。

以下の技術スタックを用いて実装されています。

### 共通

- [Bun](https://bun.sh/) - JavaScript/TypeScript ランタイム / パッケージマネージャー
- [TypeScript](https://www.typescriptlang.org/) - 型付き JavaScript
- [Vitest](https://vitest.dev/) - テストフレームワーク
- [Biome](https://biomejs.dev/) - Linter / Formatter

### バックエンド

- [Hono](https://hono.dev/) - Web フレームワーク
- [Prisma](https://www.prisma.io/) - ORM
- [Zod](https://zod.dev/) - バリデーション

### フロントエンド

- [React](https://react.dev/) - UI ライブラリ
- [Vite](https://vite.dev/) - ビルドツール
- [TanStack Router](https://tanstack.com/router) - ルーティング
- [Tailwind CSS](https://tailwindcss.com/) - CSS フレームワーク

### データベース

- SQL Server (Docker)

## セットアップ

1. [Bun](https://bun.sh/)のインストール
2. パッケージ依存関係のインストール
   1. `bun install`
3. 環境変数ファイルの作成
   1. `apps/backend/.env`（`apps/backend/.env.template`をコピー）
   2. `apps/frontend/.env`（`apps/frontend/.env.template`をコピー）
4. （必要に応じて）環境変数ファイル内の値を調整
5. ローカルデータベース（Docker）の起動
   1. `bun db#up`
6. マイグレーションの実行（テーブルの作成）
   1. `bun db#migrate`
7. ビューの作成
   1. `apps/backend/prisma/views/dbo`配下のビュー作成スクリプトを手動で実行
8. Prismaクライアントの最新化
   1. `bun prisma#generate`
9. サンプルデータの投入
   1. `bun db#seed`

## コマンド

```bash
# バックエンドアプリケーションを開発モードで起動
bun be#dev

# フロントエンドアプリケーションを開発モードで起動
bun fe#dev
```

## DBスキーマ変更手順

### 自らが変更を実施する場合

1. マイグレーションファイルを作成
   1. `bun db#migratefile`
2. 生成した`migration.sql`にスキーマ変更を行うスクリプトを記述
3. ローカルデータベース（Docker）の起動
   1. `bun db#up`
4. マイグレーションを実施
   1. `bun db#migrate`
5. ビューの作成
   1. `apps/backend/prisma/views/dbo`配下のビュー作成スクリプトを手動で実行
6. `prisma/schema.prisma`にDBの状態を反映
   1. `bun db#pull`
7. Prismaクライアントの最新化
   1. `bun prisma#generate`

### 他の開発者が実施した変更を取り込む場合

1. 最新のブランチをローカルに取り込む
   1. `git checkout main && git pull`
2. ローカルデータベース（Docker）の起動
   1. `bun db#up`
3. マイグレーションを実施
   1. `bun db#migrate`
4. Prismaクライアントの最新化
   1. `bun prisma#generate`
