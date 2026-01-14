# upward-connect-sample

このリポジトリは、UPWARDが標準対応しないCRMを使用するお客様が、UPWARDのアプリケーションと接続するために構築するAPIのサンプルです。

## セットアップ

1. [Bun](https://bun.sh/)のインストール
2. パッケージ依存関係のインストール
   1. `bun install`
3. 環境変数ファイルの作成
   1. `apps/backend/.env`（`apps/backend/.env.template`をコピー）
4. ローカルデータベース（Docker）の起動
   1. `bun db#up`
5. マイグレーションの実行（テーブルの作成）
   1. `bun db#migrate`
6. ビューの作成
   1. `apps/backend/prisma/views/dbo`配下のビュー作成スクリプトを手動で実行
7. Prismaクライアントの最新化
   1. `bun prisma#generate`
8. サンプルデータの投入
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
   1. `git checkout develop && git pull`
2. ローカルデータベース（Docker）の起動
   1. `bun db#up`
3. マイグレーションを実施
   1. `bun db#migrate`
4. Prismaクライアントの最新化
   1. `bun prisma#generate`

### カラムに制約(CONSTRAINT)を追加する際の注意事項

**制約名(constraint name)は以下の命名ルールで追加すること**

| 種別 | 命名規則 |
|:--|:--|
| 主キー | `pk_[table_name]` |
| 外部キー | `fk_[table_name]_[column_name]` |
| デフォルト値 | `df_[table_name]_[column_name]` |
| UNIQUEキー | `uk_[table_name]_[連番(1, 2, ...)]` |