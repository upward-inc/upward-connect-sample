# upward-connect-internal

このリポジトリは、UPWARD CONNECTの仕様に準拠した社内用の開発資産です。  
以下の役割を担っています。
- 顧客提供用サンプルコードリポジトリ（[upward-connect-sample](https://github.com/upward-inc/upward-connect-sample)）のベース資産
- 社内展開用のUPWARD CONNECT環境の実コード

以下の技術スタックを用いて実装されています。

### 共通

- [mise](https://mise.jdx.dev/) - 開発ツールのバージョン管理
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

1. [mise](https://mise.jdx.dev/) のインストール
   1. 手順は [公式ドキュメント](https://mise.jdx.dev/getting-started.html) を参照
   2. mise 本体の版の下限は `mise.toml` の `min_version` で決まる。下回ると mise がエラーで更新を促す
   3. Bun などの開発ツールは、`mise.toml` で固定した版を mise が入れる。個別にインストールする必要はない
2. シェルの rc ファイルに `mise activate` を設定
   1. 例: zsh なら `~/.zshrc` に `eval "$(mise activate zsh)"` を追記する
   2. 設定しないと、リポジトリのディレクトリに入っても固定した版のツールが PATH に載らない
   3. 設定したらシェルを開き直す。今のシェルには設定が効いておらず、別に入れた bun などが使われる
3. （初回のみ、リポジトリのルートで実行）mise の設定ファイルの信頼
   1. `mise trust`
4. 開発ツールのインストール
   1. `mise install`
5. パッケージ依存関係のインストール
   1. `bun install`
   2. Node.js は不要（`bunfig.toml` の設定により、`bun run` のスクリプトは Bun ランタイムで実行される）
   3. Node.js がインストールされている場合、`bun install` のライフサイクルスクリプトと `bunx` はその Node.js で動くため、セキュリティ修正版に更新しておく
6. 環境変数ファイルの作成
   1. `mise run env#init`（`apps/backend/.env` と `apps/frontend/.env` を、それぞれの `.env.template` から作る。既にある `.env` は上書きしない）
7. （必要に応じて）環境変数ファイル内の値を調整
8. ローカルデータベース（Docker）の起動
   1. `bun db#up`
9. マイグレーションの実行（テーブルの作成）
   1. `bun db#migrate`
10. ビューの作成
    1. `apps/backend/prisma/views/dbo`配下のビュー作成スクリプトを手動で実行
11. Prismaクライアントの最新化
    1. `bun prisma#generate`
12. サンプルデータの投入
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