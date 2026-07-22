# Last Mile

## 前提

このファイルは Claude の操作ルールを定義する。コードレビューやプロジェクト規約ではない。

当然の内容であるが、Claude がレビューの指摘根拠として言及することがあるため明記している。

## プロジェクト概要

### UPWARD CONNECT とは

UPWARD CONNECT は、顧客の CRM・基幹システムを UPWARD 製品（UPWARD AGENT）から利用可能にするための標準連携仕様である。  
OIDC 1.0 / OAuth 2.0 に準拠した認証・認可と、OpenAPI 準拠の REST API（リソース API）から構成される。

インプリベンダーが自社システム上にこの仕様を実装することで、UPWARD AGENT はその実装を Salesforce や Dynamics と同様の外部 CRM として扱い、システムごとの個別開発なしにデータ連携できる。

主なリソース: エンティティ（取引先・商談・リード等）、レコード（検索・作成・更新・削除）、システムユーザー／ロール／プロファイル、ファイル。

### このリポジトリの役割

このリポジトリは、UPWARD CONNECT の仕様に準拠した社内用の開発資産である。  
以下の 4 つの役割を担う。

1. OpenAPI スキーマの提供
2. 社内展開用の UPWARD CONNECT 環境の実コード（OpenAPI 準拠の REST API）
3. 構築ガイド・API 仕様ドキュメントの提供
4. 顧客提供用サンプルコードリポジトリ（[upward-connect-sample](https://github.com/upward-inc/upward-connect-sample)）のベース資産

実装された資産はまず社内に展開され、UPWARD AGENT による API 連携開発・検証の対象となる。  
連携に問題ないと判断されたのち、コードが Public リポジトリ（upward-connect-sample）へ展開され、顧客（インプリベンダー）は構築ガイド・API 仕様とサンプルコードを参考に構築を進める。

### リポジトリ構成（モノレポ）

- `/apps/backend` : UPWARD CONNECT の認証・認可 API とリソース API（OpenAPI 準拠）を提供する REST API サーバー
- `/apps/frontend` : ユーザー認証（ログイン）と認証済みエリアを持つ Web フロントエンド
- `/apps/docs` : 構築ガイド・API 仕様ドキュメントのサイト

## プロジェクト管理

Linear 「UPWARD Connect」 チーム (https://linear.app/upward-inc/team/UC/) で Issue を管理。

## プランモード

プランモードの成果物は `docs/plans/{issue-id}_{簡易なタイトル}.md` に出力すること。  
例: `docs/plans/uc-123_offline-sync.md`

## スクリプト実行

- パッケージマネージャーは Bun を使うこと
- `package.json` に定義されたスクリプトのみ使用すること
- ルートの `package.json` スクリプトの利用を推奨するが、作業内容に応じて `bun run --filter` で子階層のスクリプトを直接呼んでもよい
  - `--filter` 経由で子階層スクリプトに追加引数（テスト対象パス等）を渡す場合、そのパスはリポジトリルートではなく対象パッケージのルートからの相対パスになる
- 以下の操作は禁止
  - `cd` で作業ディレクトリを変更する: 後続コマンドが意図しないディレクトリで実行されるため
  - `package.json` にスクリプトとして定義済みのコマンドを `bunx` / `npx` で直接呼ぶ: スクリプトに書かれたオプション・パス指定がバイパスされ意図しない動作になることがあるため (未定義の一時利用ツールを `bunx` で実行するのは OK)
- どうしてもディレクトリ変更が必要な場合（子階層へのパッケージ追加等、ルートから実行できない操作）は、subshell でスコープを閉じる

```bash
# OK（ルートの package.json スクリプト）
bun run check
bun run be#test

# OK（--filter で子階層スクリプトを直接呼び出し）
bun run --filter backend test
bun run --filter frontend build

# OK（--filter + 追加引数。パスは対象パッケージのルートからの相対）
bun run --filter backend test -- src/routes/api/v1/record/router.get.test.ts

# OK（package.json 未定義の一時利用ツール）
bunx -y knip@latest

# OK（ディレクトリ変更が必要なときは subshell でスコープを閉じる）
(cd apps/backend && bun add some-package)

# NG
cd apps/backend && bun add some-package  # 以降のコマンドが意図しないディレクトリで実行される。subshell で閉じる
bunx biome check --write                 # check スクリプトが定義済みなので bun run check を使う
```
