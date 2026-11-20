### 依存経路の調べ方

- ロックファイルはルートの `bun.lock` だけである。1 パッケージが 1 行で、その行に依存先が並ぶ
- 直接依存がどのアプリのものかは、`bun.lock` の先頭の `workspaces` の節で確かめる。ルート（キーが `""`）と `apps/` の各アプリの `dependencies` / `devDependencies` がまとまっている
- ルートの `package.json` の `overrides` で推移依存の版を引き上げていることがある。アラートの対象の版は `overrides` ではなく、`bun.lock` で解決された版で確かめる
- CI で使われているかを、`.github/workflows` で確かめる

### `osv-scanner.toml` の waiver

依存パッケージのアラート（`kind` が `dependency`）のときだけ調べる。
ルートの `osv-scanner.toml` を `Read` し、アラートの ID（別名を含むすべて）に一致する `[[IgnoredVulns]]` があるかを調べる。
`notes` に waiver の有無を書く。
あれば、理由（`reason`）と期限（`ignoreUntil`）も書く。

### 対処の候補

方針の根拠は `docs/security/dependency-vulnerability-policy.md` の waiver と overrides の節にある。
依存パッケージのアラート（`kind` が `dependency`）では、「対処の候補」の「リポジトリの方針に従った対処」を、次の順で検討する。

1. ルートの `package.json` の `overrides` で修正版へ引き上げるか。下限は、上流が宣言する major の中で最も低い修正版にする。0.x のパッケージは、minor を跨ぐ上書きも major を跨ぐ場合と同じに扱う
2. 修正版がない、または更新できない理由があるときだけ、`osv-scanner.toml` に理由と期限を付けた waiver を足す

### 出力

`title` と本文の各項目の書き方は、`.claude/skills/creating-issue/SKILL.md` を `Read` で読み、「タイトルの規則」と「記述の原則」に従う。
ここに書き写さない。

`labels` は、`creating-issue` の実行フローのラベルの規則（`Type` 以外は文脈に明確に合うものだけ）に従う。
