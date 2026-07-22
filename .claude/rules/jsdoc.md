---
paths:
  - "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---

# JSDoc / TSDoc 記法ルール

ドキュメントコメントを**書く場合**の記法を定める。JSDoc を必須とするルールではない。

本ルールを適用する際は `writing-style.md` も併せて読むこと。改行・句読点等の散文スタイルはそちらの規則に従う。

## 前提

- TypeScript プロジェクトでは **TSDoc** 記法を用いる (JSDoc の TS 向けサブセット)
- JSDoc との最大の違い: 型注釈 `{Type}` を書かない。型は TypeScript コンパイラが保証する
- ドキュメントコメントは関数・型・クラス・モジュールの**外部仕様**を書く場所であり、実装詳細ではない

## ルール

### 1. 型注釈 `{Type}` を書かない

TS では型はコンパイラが保証するため、JSDoc 式の型表記は冗長で実装との齟齬の原因になる。

**`{Type}` と `{@link Type}` の区別に注意:** 前者は型注釈 (NG)、後者は TSDoc のリンク参照 (OK)。本文中や `@throws` の型参照には後者を用いる。

NG (JSDoc 式):

```ts
/**
 * @param {string} id - ユーザー ID
 * @returns {Promise<User>} ユーザー情報
 */
async function getUser(id: string): Promise<User>
```

OK (TSDoc):

```ts
/**
 * @param id - ユーザー ID
 * @returns ユーザー情報
 */
async function getUser(id: string): Promise<User>
```

### 2. 自明な内容は書かず、非自明な情報を優先する

関数名・型シグネチャから自明な内容は書かない。呼び出し側が「いつ使うか」「なぜこの関数があるか」「型から読めない挙動はあるか (副作用・キャッシュ・計算量等)」で迷うポイントを書く。

NG (自明な言い換え):

```ts
/**
 * ユーザーを取得する関数。ユーザー ID を受け取ってユーザーを返す。
 */
function getUser(id: string): User
```

OK (非自明な情報):

```ts
/**
 * キャッシュ経由でユーザー情報を取得する。
 *
 * キャッシュミス時のみ DB にアクセスするため、常に最新データが必要な場合は {@link getUserFresh} を使うこと。
 */
function getUser(id: string): User
```

### 3. 最初の 1 文は簡潔な要約

先頭 1 文は 1 行に収まる概要にし、詳細は空行を挟んで続ける。IDE のホバー表示や API ドキュメントの一覧では先頭 1 文のみが抜粋されることが多い。

タグなしの先頭テキストが暗黙に description として扱われるため、`@description` タグは書かない (TSDoc 公式仕様に存在せず、JSDoc でも冗長)。

例外として、`@deprecated` 単独で意図が完結する関数 (廃止予告 + 代替関数の提示で十分なケース) は要約文を省略し、`@deprecated` 行から始めてよい (詳細はルール 8 参照)。廃止予告自体が要約を兼ねるため、別途要約文を書くと冗長になる。

`@remarks` タグは使わない。要約と詳細の分離は空行を挟んだ段落で行う方針のため、`@remarks` で詳細部を切り出す必要はない。

NG (1 文目が長く、段落分けがない):

```ts
/**
 * キャッシュ経由でユーザー情報を取得し、キャッシュミスの場合は DB からデータを取得してキャッシュに格納してから返す関数。`options.forceRefresh = true` でキャッシュをバイパスできる。
 */
function getUser(id: string, options?: GetUserOptions): User
```

OK:

```ts
/**
 * キャッシュ経由でユーザー情報を取得する。
 *
 * キャッシュミス時は DB からロードし、結果をキャッシュに格納する。
 * `options.forceRefresh = true` でキャッシュをバイパスできる。
 */
function getUser(id: string, options?: GetUserOptions): User
```

### 4. `@param` は型・名前から読めない情報を補うときだけ書く。書く場合は実パラメータ名と一致させる

パラメータ名と型から意図が自明なら省略してよい (例: `id: string` で「ID を受け取る」が読み取れる場合に `@param id - ユーザー ID` を付けるのは冗長)。書く判断基準は、単位・許容値の制約・特殊値・複合オブジェクトの構造など型に表れない情報を補うとき。

書くときは名前を実パラメータと一致させる。名前がずれるとドキュメントの信頼性が失われ、リファクタ時に検出漏れが起きる。

NG:

```ts
/**
 * @param userId - ユーザー ID
 */
function getUser(id: string): User
```

OK:

```ts
/**
 * @param id - ユーザー ID
 */
function getUser(id: string): User
```

### 5. `@returns` は戻り値が型から自明でないときだけ

型シグネチャで表現済みの内容 (「User を返す」等) は書かない。nullable、条件付き、特殊ケースがあるときに書く。

戻り値が部分的に非自明な場合 (例: `User | null` で null 条件が型から読めない) は、**非自明部分のみ**を書く。型そのものは再掲しない。

`@returns` の対象は「何が返るか」(値の種類・null 条件・特殊ケース) に限る。型に表現できない戻り値の**特性** (シャローコピーで非破壊・遅延評価・副作用・計算量等) は要約文または詳細段落に書き、`@returns` には載せない。

NG (型から自明):

```ts
/**
 * ユーザーを取得する。
 * @returns ユーザー
 */
function getUser(id: string): User
```

OK (非自明な挙動):

```ts
/**
 * ユーザーを取得する。
 * @returns 指定 ID のユーザーが存在しない場合は `null`
 */
function getUser(id: string): User | null
```

NG (型名を日本語に言い換えただけで実質的に再掲している):

```ts
/**
 * @returns ユーザー。存在しない場合は `null`
 */
function getUser(id: string): User | null
```

### 6. `@throws` で型に現れない例外を明示する

TypeScript の型システムは例外を表現しない。投げる可能性のあるエラーは `@throws` で明記する。

**例外型の参照は `{@link ...}` を使う** ({Type} 形式は JSDoc 式の型注釈でありルール 1 に反する)。

NG (例外条件が外から分からない):

```ts
/**
 * ユーザーを取得する。
 */
function getUser(id: string): User
```

NG (`{Type}` 形式は型注釈扱いで不可):

```ts
/**
 * ユーザーを取得する。
 * @throws {UserNotFoundError} 指定 ID のユーザーが存在しないとき
 */
function getUser(id: string): User
```

OK (`{@link}` で参照):

```ts
/**
 * ユーザーを取得する。
 * @throws {@link UserNotFoundError} 指定 ID のユーザーが存在しないとき
 * @throws {@link DatabaseConnectionError} DB 接続に失敗したとき
 */
function getUser(id: string): User
```

### 7. 型・関数への参照は `{@link ...}` または バッククォートで囲む

識別子を地の文に裸で書くと埋もれ、IDE のナビゲーションも効かない。

`@see` との使い分け: 文脈の中で意味を持って言及するなら本文中の `{@link}` (例: 「常に最新が必要なら {@link getUserFresh} を使う」)。文脈に組み込まず純粋な関連リンクとして示すだけなら `@see` (例: `@see UserRepository`)。両方併用すると重複になるためどちらか一方にする。

NG:

```ts
/**
 * User を返す。存在しない場合は UserNotFoundError を投げる。
 */
function getUser(id: string): User
```

OK (`{@link}` 使用):

```ts
/**
 * {@link User} を返す。存在しない場合は {@link UserNotFoundError} を投げる。
 */
function getUser(id: string): User
```

OK (バッククォート使用):

```ts
/**
 * `User` を返す。存在しない場合は `UserNotFoundError` を投げる。
 */
function getUser(id: string): User
```

### 8. `@deprecated` は代替手段を示す

廃止予告だけでは呼び出し元が移行できない。代替 API・削除予定時期を添える。

NG:

```ts
/**
 * @deprecated 使わないこと
 */
function oldGetUser(id: string): User
```

OK:

```ts
/**
 * @deprecated v2.0 で削除予定。代わりに {@link getUser} を使うこと。
 */
function oldGetUser(id: string): User
```

### 9. `@example` は誤用しやすい API・複雑な使い方に限定

全関数に付けると読みづらい。呼び出し側が迷うケースに限定する。

NG (自明な使い方に例を付ける):

```ts
/**
 * 2 つの数を足す。
 * @example
 * add(1, 2);  // 3
 */
function add(a: number, b: number): number
```

OK (誤用しやすい API):

```ts
/**
 * 複数キーでソートする。キー名先頭の `-` で降順指定。
 *
 * @example
 * sortBy(users, ['lastName', 'firstName']);  // 姓 → 名の順
 * sortBy(users, ['-age', 'name']);           // age 降順 → name 昇順
 */
function sortBy<T>(items: T[], keys: string[]): T[]
```

### 10. Markdown 記法を節度をもって活用する

TSDoc / 現代の JSDoc は本文中の Markdown を解釈する。読みやすさを上げるために使うが、装飾過多は逆に重要箇所を埋もれさせる。

**使ってよい記法:**

- インラインコード (バッククォート): 識別子・キーワード・リテラル値 (ルール 7 で既述)
- コードブロック (` ``` `): `@example` のコード、本文中の長めのスニペット
- 箇条書き (`-` `1.`): 複数の条件・パラメータの整理
- 強調 (`**bold**`): 重要な注意点 (副作用、破壊的操作、契約違反等)
- リンク (`[text](url)`): 外部仕様 (RFC、MDN 等) への参照

**避けるべき記法:**

- 見出し (`#`, `##`): TSDoc のタグ (`@remarks`, `@example` 等) で構造化されているため不要。レンダラ間で扱いも不統一
- テーブル: IDE ホバー・ドキュメントジェネレータでの表示が不安定
- 強調の多用: 太字を多用すると重要箇所が逆に埋もれる

NG (装飾過多):

```ts
/**
 * # ユーザー取得
 *
 * **重要**: この関数は **必ず** **最新版** を **使うこと**。
 *
 * ## パラメータ
 *
 * | name | type   | description |
 * | ---- | ------ | ----------- |
 * | id   | string | ユーザー ID |
 */
function getUser(id: string): User
```

OK (節度ある活用):

```ts
/**
 * ユーザー ID からユーザー情報を取得する。
 *
 * 結果はキャッシュされるため、最新データが必要な場合は次の条件で再取得する:
 *
 * - `options.forceRefresh = true` を渡す
 * - キャッシュ TTL (デフォルト 5 分) を経過する
 *
 * **注意:** キャッシュ層は LRU で動作するため、頻繁に呼ばれない ID は早期に追い出される可能性がある。
 * 詳細仕様は [RFC 7234](https://tools.ietf.org/html/rfc7234) を参照。
 */
function getUser(id: string, options?: GetUserOptions): User
```

## 主要タグ早見表

| タグ           | 使う場面                                            |
| -------------- | --------------------------------------------------- |
| `@param`       | パラメータの意図が型から読めないとき                |
| `@returns`     | 戻り値が型から自明でないとき (nullable、条件付き等) |
| `@throws`      | 型に現れない例外を投げるとき                        |
| `@example`     | 誤用しやすい・複雑な使い方があるとき                |
| `@deprecated`  | 廃止予告 + 代替手段                                 |
| `@see`         | 関連 API への参照                                   |
| `{@link Name}` | 本文中で他の型/関数を参照                           |

## チェック観点

書き終わった直後に以下を自問する:

- 型シグネチャから読めることを繰り返し書いていないか?
- 実装詳細 (アルゴリズム、内部フラグ等) を書いていないか? → 書くべきは外部仕様
- 識別子を地の文に裸で書いていないか? → `{@link}` か バッククォート
- `@deprecated` に代替手段を添えたか?
- 装飾 (太字、見出し、テーブル) を過剰に使っていないか?
- `@description` を使っていないか? (タグなしの先頭テキストで足りる)
