---
name: replying-to-review-comments
description: |
  Use when review comments on a pull request need a reply, from a review bot or a human reviewer.
  Also use when triaging received review feedback, when checking which review threads are still unanswered, when a reply to a review thread was missed, or when an already posted reply needs correcting.
argument-hint: "[optional: reply target]"
model: inherit
---

# レビュー指摘への返信

PR のレビュー指摘に対する返信文を作り、ユーザーの承認を得てから投稿する。

## このスキルの位置付け

- 目的は普段の返信作業の効率化であり、遵守を強制する規約ではない。場面に合わなければユーザーの指示を優先する
- 出力は返信文の叩き台であり、投稿はユーザーの承認後に行う
- 指摘の是非を判断するのは呼び出し元のセッション。このスキルが定めるのは返信の形式と投稿手順

## 前提条件

- [GitHub CLI](https://cli.github.com/) がインストール・認証済みであること
- 投稿は `gh` の認証アカウント（ユーザー本人）名義になる
- 対象の `{Org名}`・`{リポジトリ名}`・`{PR番号}` を確定させる。いずれも PR の URL に含まれる
  - URL が無い場合は `gh repo view --json nameWithOwner -q .nameWithOwner` と `gh pr view --json number -q .number` で取る

## 引数の扱い

- PR 番号・PR の URL を受け取った場合は、その PR の全スレッドを対象にする
- スレッドを指すもの（discussion の URL・トリアージで振った番号）を受け取った場合は、そのスレッドにだけ返信し、残りの未返信スレッドは手順 7 で報告する
- 引数が無い場合は現在のブランチの PR を対象にする

## 実行フロー

1. 対応コミットがあれば push する。未 push のまま返信すると、指摘者は対応を確認できないまま返信だけを読むことになる
2. スレッドを取得し、未返信のものを洗い出す
3. 各指摘を「対応済み」「非対応」「誤指摘」に分類する。分類は返信の書き方を選ぶために行う
4. 分類ごとに返信文を書く（「返信の規則」に従う）
5. 下書きを全文ユーザーに提示し、投稿範囲の承認を得る
6. 承認された分だけ投稿する
7. 再度スレッドを取得し、返信漏れが無いことを確認する

下書きは会話の本文に全文載せる。`AskUserQuestion` は使わない。ユーザーが修正指示をそのまま書けるようにするため。
下書きは指摘ごとに区切り線（`---`）で分ける。
見出しは通し番号と指摘の要約にする。
その直下に「**分類** ・ スレッドへのリンク（`{PR の URL}#discussion_r{comment_id}`）」の 1 行を置き、本文は引用ブロックで書く。

ユーザーに出す文章では、コメント ID を裸で書かずスレッドへのリンク（`{PR の URL}#discussion_r{comment_id}`）にする。
下書きの中に限らず、トリアージの一覧や未返信の報告にも適用する。画面上で照合できないため。

判断が出ていない指摘には返信を書かない。未返信のまま残っていることをユーザーに伝える。
この PR では扱わないと決まった時点で「非対応」として返信する。

### スレッドの取得

```bash
gh api graphql -f query='
query($owner: String!, $repo: String!, $pr: Int!) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $pr) {
      reviewThreads(first: 50) {
        pageInfo { hasNextPage }
        nodes {
          id
          isResolved
          path
          comments(first: 50) { nodes { databaseId author { login __typename } viewerDidAuthor body } }
        }
      }
    }
  }
}' -f owner={Org名} -f repo={リポジトリ名} -F pr={PR番号} --jq '.data.repository.pullRequest.reviewThreads
  | (if .pageInfo.hasNextPage then "打ち切り: スレッドが取得上限を超えている" else empty end),
    (.nodes[]
      | {resolved: .isResolved, path,
         comment: .comments.nodes[0].databaseId,
         mine: .comments.nodes[0].viewerDidAuthor,
         kind: .comments.nodes[0].author.__typename,
         login: .comments.nodes[0].author.login,
         replied: .comments.nodes[-1].viewerDidAuthor,
         body: .comments.nodes[0].body})'
```

- `replied` はスレッド末尾のコメントを自分が書いたかどうかを表す。`false` が未返信で、返信後に追問が付いたスレッドも `false` になる
- 手順 7 では、返信対象のスレッド（`resolved` が `false` かつ判断が出ているもの）に `replied` が `false` のものが残っていないことを確認する
- 対象外として残したスレッドは、理由とともにユーザーに伝える
- 打ち切りが出た場合は取得できた範囲しか見えていないため、返信漏れの確認が成立しないことをユーザーに伝える
- `kind` が `Bot` なら bot、`User` なら人間として扱う
- ユーザートークンで動く bot も `User` で返るが、API 上は人間と区別できない。判断が付かない相手がいる場合は、文体を決める前にユーザーに確認する

## 返信の規則

根拠として書くのは、セッションで確認した事実・コード・ルールに限る。確認していないことを書かない。

対象はレビュースレッドに限る。レビュー本文や PR のコメント欄に書かれた指摘は、返信スレッドを作れないため扱わない。
`gh pr view {PR番号} --json reviews,comments` で拾い、指摘があればユーザーに伝える。コメント欄に自分で書くかどうかを判断できるようにするため。
bot の自動投稿（Linear の linkback 等）は指摘ではないので除く。
`resolved` が `true` のスレッドはレビュアーが片付けたものとして返信対象から外す。
`mine` が `true` のスレッドは自分が出した指摘なので返信対象から外す。他人の PR をレビューした側のアカウントで実行したときに現れる。
残りのスレッドには、受けた指摘としてすべて返信する。無返信のまま resolve・マージしない。

### 文体

- 感謝・前置き・謝罪を書かない。事実と根拠から入る
- 長さは 1 指摘あたり 1〜3 文を目安にする。根拠を尽くすのに足りなければ伸ばしてよいが、目安に収めるために根拠を削らない
- 人間への返信は 1 行目に `@{login}` だけを置き、本文は次の行から書く。bot には付けない
- 日本語で返信する場合、相手が bot なら常体、人間なら敬体を使う

### 対応済み

本文の末尾に空行を挟み、対応コミットを 1 行で載せる。

```markdown
[{コミットタイトル}](https://github.com/{Org名}/{リポジトリ名}/pull/{PR番号}/commits/{フルハッシュ})
```

- コミットタイトルは prefix 込みで原文のまま使う。本文（2 行目以降）は含めない。`git log -1 --format=%s {ハッシュ}` で取る
- ハッシュは短縮せず 40 桁を使う
- 複数コミットにまたがる場合は 1 行 1 コミットで、コミットの適用順（古いものが上）に並べる

補足が不要なときは、対応した旨の一文とコミットリンクだけを返す。

```markdown
対応した。

[{コミットタイトル}](https://github.com/{Org名}/{リポジトリ名}/pull/{PR番号}/commits/{フルハッシュ})
```

対応済みであることを理由に返信を省略しない。

指摘のとおりに直さなかった場合は、diff から読み取れないため必ず理由を書く。

### 非対応

対応しない根拠を書く。根拠は仕様・プロダクト方針・実測値など、指摘者が確認できる形にする。

### 誤指摘

指摘が誤っていることは明示する。そのうえで、なぜ誤りかの根拠を書く。「誤りです」の一言で済ませない。

### 例（bot 宛・指摘の一部だけを受け入れた場合）

> `code_challenge` と `code_challenge_method` は zod のスキーマ検証で検証済みなのでロジック不要。
>
> ただし PKCE の検証は必須にしたいので `if` 構文を削除した。
>
> [Always check code_verifier](https://github.com/upward-inc/upward-connect-internal/pull/117/commits/42046a756c52b33e8bf3cf9f5268d62e5c5d3a14)

## 投稿

```bash
gh api "repos/{Org名}/{リポジトリ名}/pulls/{PR番号}/comments/{comment_id}/replies" \
  -f body="$(cat <<'EOF'
{返信本文}
EOF
)" --jq '.html_url'
```

- `comment_id` はスレッド先頭コメントの ID（取得クエリの `comment`）を使う。返信への返信は作れない
- body は日本語・バッククォート・角括弧を含むため、必ず上記の HEREDOC 形式（`<<'EOF'` のシングルクォート付き）で渡す

投稿済みの返信を書き換えるときは PATCH を使う。パスに PR 番号は入らない。

```bash
gh api "repos/{Org名}/{リポジトリ名}/pulls/comments/{reply_comment_id}" --method PATCH \
  -f body="$(cat <<'EOF'
{返信本文}
EOF
)" --jq '.html_url'
```

返信本文に含まれる語がガードレールに当たり、投稿コマンドが実行できないことがある。
コマンドを組み替えて通そうとせず、本文をユーザーに渡して投稿を依頼する。

## スレッドの resolve

返信後の resolve はユーザーが GitHub 上で行う。

## よくある誤り

| NG                                 | OK                                                         |
| ---------------------------------- | ---------------------------------------------------------- |
| ハッシュを短縮して載せる           | 40 桁のフルハッシュを使う                                  |
| コミット参照を本文に混ぜる         | 本文と空行で分けた 1 行にする                              |
| 人間の指摘に常体で返す             | 人間には敬体、bot には常体                                 |
| bot への返信にメンションを付ける   | メンションは人間にだけ付ける                               |
| 対応済みなので返信を省く           | 対応済みの指摘にもコミットリンクを返す                     |
| 下書きを見せずに投稿する           | 全文提示 → 承認 → 投稿                                     |
| 下書きの外でコメント ID を裸で書く | トリアージの一覧や未返信の報告でもスレッドへのリンクにする |
| 「ご指摘ありがとうございます」     | 感謝は書かず事実から入る                                   |
| 投稿して終わりにする               | 未返信スレッドが残っていないか確認                         |
