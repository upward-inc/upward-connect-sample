# 開発環境のセットアップ

社内の開発者が、このリポジトリの開発ツールを揃えるための手順を定める。

開発ツールの版は `mise.toml` で固定し、[mise](https://mise.jdx.dev/) で導入する。
この仕組みは社内の開発用であり、公開リポジトリ（[upward-connect-sample](https://github.com/upward-inc/upward-connect-sample)）には含めない。
そのため、公開リポジトリと共有する `README.md` には書かず、ここに書く。

## mise で管理するツール

対象のツールと版は `mise.toml` の `[tools]` が唯一の情報源である。
CI でも使うツールは CI と同じ版に揃えており、揃える相手のファイルは `mise.toml` のコメントに書いてある。

Biome は `package.json` の `devDependencies` で管理するため、mise では管理しない。

## 手順

1. mise をインストールする
   1. 手順は [公式ドキュメント](https://mise.jdx.dev/getting-started.html) を参照
   2. 版の下限は `mise.toml` の `min_version` で決まる。下回ると mise がエラーで更新を促す
2. シェルの rc ファイルに `mise activate` を設定する
   1. 例: zsh なら `~/.zshrc` に `eval "$(mise activate zsh)"` を追記する
   2. 設定しないと、リポジトリのディレクトリに入っても固定した版のツールが PATH に載らない
   3. 設定したらシェルを開き直す。今のシェルには設定が効いておらず、別に入れた bun などが使われる
3. リポジトリのルートで `mise trust` を実行する（初回のみ）
   1. mise は、信頼していない設定ファイルを読まない
4. リポジトリのルートで `mise install` を実行する
   1. `mise.lock` に記録したハッシュで、取得したファイルを検証してから入れる
5. `README.md` の「セットアップ」に進む
   1. README の手順 1 のうち、Bun 本体のインストールは不要（上の手順 4 の `mise install` で入っている）。Node.js の注記はそのまま当てはまる
   2. `bun install` の postinstall で、lefthook の Git フックも入る

## mise.lock の扱い

- `mise.toml` の版を変えたら、`mise install` で更新される `mise.lock` も一緒にコミットする
- mise は読み込んだ設定のルートごとに `mise.lock` を書く。`.claude/worktrees/` 配下の worktree で実行すると、メインのチェックアウトの `mise.lock` も書き換わることがある。意図しない変更なので、メイン側で `git restore mise.lock` を実行して戻す

## Git フックが動かないとき

mise が無い環境で `bun install` すると、postinstall はフックを入れられなかったことを案内して終わる（`scripts/install-lefthook.ts`）。
この状態ではコミット前の検査（`.lefthook.yml` の `pre-commit`）が行われないことがある。

mise の導入前にフックを入れた既存の clone では、フックの job が `mise: command not found` で失敗し、コミットや pull の後処理が止まることがある。

どちらの場合も、上の手順で mise を導入してから `bun install` をやり直す。
