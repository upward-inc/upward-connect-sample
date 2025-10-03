# multi-platform-sample

このリポジトリは、UPWARDが標準対応しないCRMを使用するお客様が、UPWARDのアプリケーションと接続するために構築するAPIのサンプルです。

## セットアップ

1. [Bun](https://bun.sh/)のインストール
2. パッケージ依存関係のインストール
   1. `bun install`
3. 環境変数ファイルの作成
   1. `apps/api/.env`（`apps/api/.env.template`をコピー）
4. ローカルデータベース（Docker）の起動
   1. `bun db#up`
5. マイグレーションの実行（テーブルの作成）
   1. `bun db#migrate`
6. ビューの作成
   1. `apps/api/prisma/views/dbo`配下のビュー作成スクリプトを手動で実行
7. Prismaクライアントの最新化
   1. `bun prisma#generate`
8. サンプルデータの投入
   1. `bun db#seed`

## コマンド

```bash
# APIアプリケーションを開発モードで起動
bun api#dev

# ログイン用Webアプリケーションを開発モードで起動
bun login#dev
```

## DBスキーマ変更手順

1. マイグレーションファイルを作成
   1. `bun db#migratefile`
2. 生成した`migration.sql`にスキーマ変更を行うスクリプトを記述
3. マイグレーションを実施
   1. `bun db#migrate`
4. `prisma/schema.prisma`にDBの状態を反映
   1. `bun db#pull`
5. Prismaクライアントの最新化
   1. `bun prisma#generate`
6. (Optional)必要であればサンプルデータを作成し、DBにデータを投入
