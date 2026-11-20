# Security Alert の自動起票

Security Alert（Dependabot / Code scanning）の新規アラートを受けて、Linear の UPWARD Connect チームに Issue を起票する仕組みをまとめる。

起票の処理は共通リポジトリ `upward-inc/triage-to-linear` の reusable workflow にあり、このリポジトリは設定と受け口のワークフローだけを持つ。
仕組みの設計と設定の項目は triage-to-linear の文書を参照する。

- 全体の流れ・導入の手順・版の固定・送り直し: [README](https://github.com/upward-inc/triage-to-linear/blob/main/README.md)
- 重複の扱い・完了の判定・本文の組み立て・失敗したとき: [docs/security-alert/design.md](https://github.com/upward-inc/triage-to-linear/blob/main/docs/security-alert/design.md)
- 設定ファイルの全項目: [docs/security-alert/settings.md](https://github.com/upward-inc/triage-to-linear/blob/main/docs/security-alert/settings.md)

リンクは `main` を指す。
受け口が参照している版と `main` で動きが異なりうるため、細部を確かめるときは受け口のコメントにある版のタグの文書を読む。

waiver と overrides の方針は [dependency-vulnerability-policy.md](./dependency-vulnerability-policy.md) を参照する。

## このリポジトリに置いているもの

- [`.github/workflows/security-alert.yml`](../../.github/workflows/security-alert.yml): 共有ワークフロー（`upward-inc/github-foundation`）を呼び、新規アラート 1 件につき 1 回、このリポジトリの `repository_dispatch` を呼ばせる
  - 認証には呼び出し job の `GITHUB_TOKEN` を使う。渡した `GITHUB_TOKEN` の権限は、共有ワークフローの中で送信する job が宣言した権限に絞られる。その job が Contents の書き込みを宣言していないと、送信は権限不足（403）で失敗する
  - 自動起票の対象とする重大度は `webhook-severity` で決まり、Slack 通知の `slack-severity` と同じ variable `SECURITY_ALERT_SEVERITY` を渡している
- [`.github/workflows/security-alert-intake.yml`](../../.github/workflows/security-alert-intake.yml): 受け口。`repository_dispatch` で起動し、triage-to-linear の reusable workflow を呼ぶ。`workflow_dispatch` は送り直しと検証に使う
- [`.github/triage-to-linear/security-alert.yml`](../../.github/triage-to-linear/security-alert.yml): 設定。Linear のチームとテンプレート、起票後の状態、ラベル、場所の定義、優先度の条件、waiver の条件を決める
- [`.github/triage-to-linear/security-alert-assessment.md`](../../.github/triage-to-linear/security-alert-assessment.md): Claude に渡すこのリポジトリ固有の評価の手順。ロックファイルの場所、waiver の調べ方、対処の方針、タイトルとラベルの規則を書く
- [`.github/actionlint.yaml`](../../.github/actionlint.yaml): 受け口だけ、actionlint が知らない権限 `vulnerability-alerts` の指摘を除く

## このリポジトリで決めた値と理由

### 起票の対象とする重大度

起票の対象とする重大度（`webhook-severity`）と Slack 通知の対象とする重大度（`slack-severity`）は、同じ variable `SECURITY_ALERT_SEVERITY` で決める。

同じ variable にするのは、起票したアラートが Slack にも通知され、そのスレッドに返信できるようにするためである（例外は、「運用上の注意」にある、アラートがまとめて届いたとき）。
起票の重大度が Slack 通知より広いと、Slack に通知されないアラートも起票される。
その Issue には返信先のスレッドがないため、Issue へのリンクも起票の失敗の通知も Slack に届かず、失敗には GitHub Actions の run の失敗でしか気づけない（triage-to-linear の `src/finalize.ts`）。
その代わり、Slack 通知だけを広げることはできない。

variable が未登録で値が空になると、共有ワークフローが重大度の値を検査して失敗する。
起票も通知もされないまま、知らないうちに止まることはない。

### 場所の定義

設定の `assessment.locations` は、デプロイ先・開発者の端末・CI のそれぞれに何が含まれるかを、アプリの名前を挙げずに規則で書く。
アプリが増えるたびに設定を直さずに済むようにするためである。

デプロイ先は「`apps/` の各アプリが、デプロイ先で実行時に使う依存」である。
このリポジトリには `packages/` がないので、アプリの外のパッケージは含めない。

### 完了とみなす状態

設定の `linear.finishedStateNames` は書かない。
UPWARD Connect チームに `Merged` はなく、状態の型が `completed` なのは `Done` だけで、書かなくても完了とみなされる。
`In Review` は型が `started` で、PR のレビュー中であって完了ではないため、完了とみなす状態には足さない。
型が `started` のまま完了を意味する状態を足したときだけ、この項目に書く。

### 起票後の状態

設定の `linear.readyStateName` は `Todo` にし、評価を反映し終えた Issue を Todo に動かす。
評価を反映し終えた Issue は着手できる状態にあり、人が Todo へ上げる手間を省くためである。

### ラベル

- 設定の `linear.labelCandidates.excludeGroups` は `[Type]` にする。Type のラベルは Security テンプレートが付けるので、Claude に選ばせない
- 設定の `linear.sourceLabels` には UPWARD Connect チームの `Source:` のラベルを書く。どのツールのアラートから起票したかを、ラベルで絞り込めるようにするためである

### 優先度

設定の `priority` には、重大度が `critical` のときに Urgent にする規則だけを置く。
全体の判定が「発生しない」のときは、`critical` でも規則を当てはめない（triage-to-linear の仕様）。
規則に当てはまらないアラートの優先度は決めず、Security テンプレートの既定に任せる。

Urgent はすぐに手を止めて対応するものに限る。
`critical` 未満のアラートまで Urgent にすると、Urgent の Issue が増え、本当に急ぐものが埋もれる。
`critical` 未満のアラートの優先度は、起票された Issue の評価を読んだ人が必要に応じて上げる。

### waiver の条件

依存パッケージのアラートの DoD に足す完了の条件（`issue.dependencyWaiver`）は、「`osv-scanner.toml` に、理由と期限を付けた waiver がある」とする。
このリポジトリの waiver はルートの [`osv-scanner.toml`](../../osv-scanner.toml) にまとめて置く。
OSV-Scanner は `--recursive ./` でルートの `bun.lock` を読み、同じディレクトリにある `osv-scanner.toml` が当たる（[`.github/workflows/osv-scanner.yml`](../../.github/workflows/osv-scanner.yml)）。

### Slack の返信先とメンション

Issue へのリンクと失敗の通知は、共有ワークフローが通知したメッセージのスレッドに返信する。
通知先のチャンネルは variable `SECURITY_ALERT_SLACK_CHANNEL_ID` で決まり、GitHub の Security Alert をまとめて受ける `#tech-github-security-alert` にしている。

メンションは起票の失敗の通知にだけ付ける。
共有ワークフローのアラートの通知と Issue へのリンクの返信には付けない（`security-alert.yml` は `slack-mentions` を渡さない）。
通知されるアラートは多く、そのたびにメンションすると煩わしい一方で、起票の失敗は人が対応しないと Issue が作られないためである。

失敗の通知のメンションは、variable `SECURITY_ALERT_MENTIONS` を受け口の input `slack-mentions` に渡して付ける（[`security-alert-intake.yml`](../../.github/workflows/security-alert-intake.yml)）。
設定の `slack.mentions` には書かない。
メンションする相手が替わったときに、variable を直すだけで済み、PR が要らないためである。
variable を定義しなければメンションは付かない。

## 登録している値

secret と variable の名前は、受け口のワークフローが正である。

- Linear: OAuth アプリ「Security Alert Intake (upward-connect-internal)」の client credentials（variable `SECURITY_ALERT_LINEAR_CLIENT_ID` と secret `SECURITY_ALERT_LINEAR_CLIENT_SECRET`）。アプリとして起票するため、Linear の課金対象のユーザー枠（シート）を使わず、特定の個人にも紐付かない
- Claude: Workload Identity Federation（リポジトリの variable `ANTHROPIC_FEDERATION_RULE_ID`・`ANTHROPIC_SERVICE_ACCOUNT_ID` と、組織の variable `ANTHROPIC_ORGANIZATION_ID`）。静的な API キーを持たずに、GitHub Actions の OIDC で Claude の API へ認証する。リポジトリのほかの Claude のワークフローと同じ設定を共有する。Claude を動かす job は triage-to-linear の reusable workflow が定義しているので、ルールの条件でワークフローを絞るときは、reusable workflow からの呼び出しも受け付けるようにする
- Slack: 組織の secret `SLACK_DEVOPS_BOT_TOKEN`。アラート通知のスレッドへの、Issue へのリンクと失敗の通知の返信に使う

## 版の固定と更新

受け口は triage-to-linear の reusable workflow を、リリースのタグが指す commit の SHA で参照する。
SHA と版は、受け口の `uses` が正である。
失敗の通知にだけメンションを付ける input `slack-mentions` を使うため、v1.1.0 以降が要る。

triage-to-linear は internal のリポジトリで、pinact（pinact-action の `GITHUB_TOKEN`）と Dependabot から読めない。
Dependabot は読めないと更新の確認が失敗し、github-actions の更新の job 全体が止まる。
このため、[`.pinact.yaml`](../../.pinact.yaml) と [`.github/dependabot.yml`](../../.github/dependabot.yml) で検査と更新の対象から除外しており、新しい版が出ても更新の PR は作られない。
pinact の除外は完全な SHA での参照に限っているので、タグやブランチでの参照に変えると検査で落ちる。

版は手で上げる。

1. triage-to-linear のリリースを見て、上げる版のタグを決める
2. `gh api repos/upward-inc/triage-to-linear/git/ref/tags/<タグ> --jq .object.sha` でタグが指す SHA を引く
3. 受け口の `uses` の SHA とコメントの版を差し替える
4. マージした後に、受け口を `workflow_dispatch` で起動し、open のアラートで起票まで動くことを確かめる。設定の誤りや版の間の非互換を検査する CI はなく、次のアラートが届くまで気づけないため

`main` の commit を指すと、ビルド済みの action がなく起動しない（triage-to-linear の README の「版の固定」）。

## 送り直す

起票に失敗したアラートや、設定を直した後のアラートは、受け口を `workflow_dispatch` で起動して送り直す。
入力と、送り直しても重複しない仕組みは、triage-to-linear の README の「送り直す」を参照。

## 運用上の注意

- Webhook を初めて有効にした直後や、共有ワークフローの状態が消えた直後は、直近 7 日分のアラートがまとめて届く（共有ワークフローの `dependabot-security-alert.yml` と `code-scanning-security-alert.yml` の `filter_alerts`）。処理の時点で open でないアラートは起票しない
  - 共有ワークフローは処理済みのアラートの状態を Slack と Webhook で別々に持つ。Webhook の本文に Slack のスレッドが入るのは、同じ run で Slack に通知したアラートだけである。このため、まとめて届いたアラートのうち以前の run で Slack に通知済みのものは、スレッドなしで送られ、Issue へのリンクも失敗の通知も Slack に出ない。このときの起票の結果は Linear と受け口の run で確かめる
- 検証などで起票した Issue を別の用途に転用するときは、添付をすべて外す。添付が残ったまま未完了だと、同じパッケージのアラートがその Issue に追記される
- 処理の時点でアラートが open かは GitHub の API で確かめる。ロックファイルがすでに修正版でも、次回のスキャンまではアラートが open なので起票される。triage-to-linear の共通の評価の手順では、その場合に本文の補足へその旨を書くよう指示している
- 設定の `linear.sections` と、`linear.templateId` が指す Linear の Security テンプレートの見出しは、両方を合わせて変える。人が起票するときも同じテンプレートを使うため、その都合で見出しを変えるときも設定を直す。合わない間に届いたアラートは起票されずに失敗するので、直した後に送り直す
