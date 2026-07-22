---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

# コーディングスタイルルール

可読性・簡潔性を高めるための一般的なスタイル規則。

型安全に関するルールは `.claude/rules/typesafe-coding.md` を参照。

## ルール一覧

### 冗長な null/undefined 比較を避ける

オブジェクト型や enum 文字列型の null/undefined 判定は、明示的な `=== null` / `!== undefined` を並べるのではなく、truthy 判定または optional chain でまとめること。

#### 理由

- オブジェクト型は truthy ⟺ 非 null/非 undefined と等価で、明示比較は冗長
- 列挙的な文字列型 (例: `"A" | "B" | "C" | null`) も空文字列が値域に無いため truthy で十分
- `obj !== undefined && obj.prop !== null` のような連鎖チェックは optional chain で 1 行にできる
- 比較演算が減ると意図 (「値が存在するか」) が読み取りやすくなる

#### NG パターン

```ts
// 連鎖した null/undefined チェック
const industryName =
    account !== undefined && account.industry_code !== null
        ? industryMap.get(account.industry_code)
        : undefined

// オブジェクト型に対する明示比較
if (refreshPromiseRef.current === null) {
    refreshPromiseRef.current = ...
}

// 列挙的文字列型に対する明示比較
const typeInfo = schedule.schedule_type !== null ? typeConfig[schedule.schedule_type] : null
```

#### OK パターン

```ts
// optional chain で連鎖チェックをまとめる
const industryName = account?.industry_code
    ? industryMap.get(account.industry_code)
    : undefined

// オブジェクト型は truthy 判定で十分
if (!refreshPromiseRef.current) {
    refreshPromiseRef.current = ...
}

// 列挙的文字列型 (空文字列が値に含まれない型) も truthy で十分
const typeInfo = schedule.schedule_type ? typeConfig[schedule.schedule_type] : null
```

#### 例外: 0 / `false` / `""` を「有効な値」として扱いたい場合

`number` や `boolean` 等で falsy 値が意味を持つ場合は明示比較を残す。これは `typesafe-coding.md` の「`??` と `||` を正しく使い分ける」と同じ判断軸。

```ts
// NG: count が 0 のとき「未入力」とみなしてしまう (本来は 0 入力済み)
if (!count) { ... }

// OK: 「未入力」と「0 入力」を区別したいので明示比較
if (count === undefined) { ... }
```

`string | null` 型で `null` と `""` を**別状態として区別したい**場合も同じ判断軸が当てはまる。`!str` は両方をまとめて falsy にしてしまうため、`=== null` / `=== ""` の明示比較に切り替える。

```ts
// NG: null (未登録) と "" (匿名) が両方 falsy になり区別できない
if (!name) return "?"

// OK: 状態ごとに明示比較
if (name === null) return "未登録"
if (name === "") return "(匿名ユーザー)"
return name
```

### 冗長な空判定 (`.length` 比較) を避ける

文字列の空判定は `.length === 0` / `.length > 0` ではなく truthy 判定 (`!str`) を用いること。
配列の空判定は `.length === 0` / `.length > 0` ではなく length の truthy 判定 (`!arr.length`) を用いること。

#### 理由

- 「空かどうか」を表すコードとして truthy/falsy のほうが短く意図が伝わる
- 文字列の場合は `value` 自体の truthy 判定で「null/undefined/空文字列」を一括除外できる (連鎖チェックを 1 つに集約できる)
- 配列の場合は `.length` の truthy/falsy で十分 (`length` が 0 のときに `0` が表示される懸念は JSX 内の number 直接埋め込みのケースだけ。条件式としての評価は安全)

#### NG パターン

```ts
// 文字列: 空判定 (null と空文字列の両方)
if (account.postal_code === null || account.postal_code.length === 0) return null

// 文字列: 非空判定 (null でも空でもない)
if (notes !== null && notes.length > 0) return <p>{notes}</p>

// 配列
if (accountsQuery.data.length === 0) return <EmptyState />
```

#### OK パターン

```ts
// 文字列: null と空文字列を一括除外 (空判定)
if (!account.postal_code) return null

// 文字列: null と空文字列を一括除外 (非空判定)
if (notes) return <p>{notes}</p>

// 配列: length の truthy 判定
if (!accountsQuery.data.length) return <EmptyState />
```

#### 注意: JSX で number を `&&` の左辺に直接置かない

`{count && <X />}` は count が 0 のとき React に `0` が描画されてしまう。JSX 内で number を `&&` で扱うときは `> 0` を残すか `Boolean(count)` を挟むこと。

### 冗長な `?? null` を避ける

受け側が `null` と `undefined` を同等に扱う場合 (`React.ReactNode` 引数や optional プロパティへの代入など)、optional chain の結果に `?? null` を付ける必要はない。

#### 理由

- `string | undefined` と `string | null` は受け側にとって等価なケースが多く、`?? null` は値域を変換しているだけで意味を増やさない
- 余計な変換を入れない方が「源泉の型のまま流している」ことが読み取れる
- 型シグネチャ上 `null` が必要 (例: prop 型が `string | null` で `undefined` を受けない) なときだけ `?? null` を残す

#### NG パターン

```tsx
// ReactNode は null/undefined を同じく「描画なし」として扱う
<ReadonlyField label="取引先">{account?.name ?? null}</ReadonlyField>
```

#### OK パターン

```tsx
<ReadonlyField label="取引先">{account?.name}</ReadonlyField>
```

#### 例外: 受け側の型が `string | null` で `undefined` を許容しないとき

呼び出し先の型シグネチャが `null` を要求する場合は `?? null` を残す。

```ts
// fn の引数が string | null のとき undefined を渡せない
fn(account?.name ?? null)
```
