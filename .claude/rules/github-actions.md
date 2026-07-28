---
paths:
  - ".github/workflows/**/*.yml"
  - ".github/workflows/**/*.yaml"
  - ".github/actions/**/*.yml"
  - ".github/actions/**/*.yaml"
---

# GitHub Actions ワークフロールール

安全で保守しやすい GitHub Actions ワークフローのための記述ルール。

## ルール一覧

### ジョブレベル

#### ランナーのバージョンを明示的に指定する

`runs-on:` には `-latest` サフィックスを使わず、具体的なバージョンを指定すること。

##### 理由

- `-latest` は GitHub 側で指すバージョンが予告なく変更される
- ビルド環境の変更により、意図しないCI失敗やサイレントな挙動変化が起こりうる
- バージョンを固定することで、再現性のあるビルドを保証できる

##### NG パターン

```yaml
runs-on: ubuntu-latest
```

##### OK パターン

```yaml
runs-on: ubuntu-22.04
```

#### ジョブに `timeout-minutes` を設定する

各ジョブには `timeout-minutes` を明示的に設定すること。

##### 理由

- デフォルトのタイムアウトは 360 分（6 時間）であり、ハングしたジョブが長時間ランナーを占有する
- 課金対象の実行時間が不必要に膨らむリスクがある
- 想定所要時間に適切なマージンを加えた値を設定することで、異常を早期に検知できる

##### OK パターン

```yaml
jobs:
  build:
    runs-on: ubuntu-22.04
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6.0.2
```

### ステップレベル

#### アクションのバージョンはコミット SHA でピン留めする

`uses:` に指定するアクションのバージョンは、タグではなくコミット SHA を使用し、コメントでバージョン番号を併記すること。（`pinact run` で自動修正可能）

##### 理由

- タグは上書き可能であり、サプライチェーン攻撃のリスクがある
- SHA は不変であり、同一のコードが実行されることを保証できる

##### NG パターン

```yaml
uses: actions/checkout@v6.0.2
```

##### OK パターン

```yaml
uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6.0.2
```

#### `run:` ブロック内で `${{ }}` を直接展開しない

`${{ }}` 式は `env:` に定義し、シェル変数として参照すること。

##### 理由

- `${{ }}` は YAML 展開時にシェルコマンドへ直接埋め込まれるため、スクリプトインジェクションのリスクがある
- 特にユーザー制御可能な値（ユーザー名、Issue/PR のタイトル・本文など）は危険
- `env:` 経由であればシェル変数として安全にクォートされる

##### NG パターン

```yaml
run: |
  echo "User: ${{ github.event.comment.body }}"
```

##### OK パターン

```yaml
env:
  COMMENT_BODY: ${{ github.event.comment.body }}
run: |
  echo "User: ${COMMENT_BODY}"
```

##### 例外

- `with:` ブロック内（シェル実行ではないため安全）
- `if:` 条件式内

#### HEREDOC や複数行文字列のインデントに注意する

YAML のインデントが HEREDOC やシェル変数の内容に混入しないようにすること。

##### 理由

- YAML ブロック内の HEREDOC は、YAML のインデント分の空白がそのまま文字列に含まれる
- GitHub のマークダウンでは 4 スペース以上のインデントがコードブロックとして解釈される

##### NG パターン

```yaml
run: |
  gh issue comment "$NUMBER" --body "$(cat <<EOF
    本文がインデントされているため
    コードブロックとしてレンダリングされる
  EOF
  )"
```

##### OK パターン

```yaml
run: |
  BODY="本文をシェル変数に格納すれば
  インデントの問題を回避できる"
  gh issue comment "$NUMBER" --body "$BODY"
```
