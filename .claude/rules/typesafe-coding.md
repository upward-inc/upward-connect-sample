---
paths:
  - "**/*.ts"
  - "**/*.tsx"
---

# TypeSafe コーディングルール

型安全な TypeScript コードのための記述ルール。

本ルールに記載がなくとも型安全性を考慮したコーディングを意識すること。

なお、このプロジェクトでは Zod を導入済みである。
外部入力（API レスポンス、URL パラメータ、フォーム入力等）のバリデーションには、手動の型ガードや型アサーションよりも Zod スキーマを優先して使用すること。

## テストファイルでの緩和

テストコード (`*.test.{ts,tsx}`) の目的は本番コードの挙動を検証することであり、その目的が達成できている限りテストコード自体が型安全である必要性は薄い。
むしろ「どのようなテストを行っているか」が把握しやすい可読性のほうが重要。

そのため、本ファイル内の型安全ルールはテストファイルでは厳格に適用しない。
型安全になるに越したことはないが、テストの可読性を下げてまで型ガード・cast 回避等を徹底する必要はない。

## ルール一覧

### `any` を使わず `unknown` を使う

型が不明な値には `any` ではなく `unknown` を使い、使用前に型チェックを強制すること。

#### 理由

- `any` は型チェックを完全に無効化し、誤った操作がコンパイル時に検出されない
- `unknown` は使用前に型の絞り込みを要求するため、安全にアクセスできる

#### NG パターン

```ts
function parseJson(input: string): any {
	return JSON.parse(input)
}

// 型チェックなしで自由にアクセスできてしまう
const name = parseJson(raw).name
```

#### OK パターン

```ts
function parseJson(input: string): unknown {
	return JSON.parse(input)
}

const parsed = parseJson(raw)
if (isUser(parsed)) {
	const name = parsed.name
}
```

### `as` による型アサーションを避ける

型アサーション（`as`）は型チェックをバイパスするため、型ガードや型の絞り込みで解決すること。

#### 理由

- `as` は実行時の型チェックを行わず、実際の値と型が一致しなくても通ってしまう
- リファクタリング時に型の不整合が検出されなくなる

#### NG パターン

```ts
const user = response.data as User
```

#### OK パターン

```ts
function isUser(data: unknown): data is User {
	if (typeof data !== "object" || data === null) return false
	return (
		"id" in data && typeof data.id === "string" && "name" in data && typeof data.name === "string"
	)
}

if (isUser(response.data)) {
	const user = response.data
}
```

```ts
// OK: Zod スキーマによるバリデーション（外部入力に推奨）
import { z } from "zod"

const userSchema = z.object({
	id: z.string(),
	name: z.string(),
})

const user = userSchema.parse(response.data)
```

### 型ガード関数には型述語（`is`）を使う

型チェック用の関数は `boolean` ではなく型述語（`x is T`）を返り値に指定し、後続の型の絞り込みを有効にすること。

#### 理由

- `boolean` を返すだけでは TypeScript が型の絞り込みを行えず、呼び出し側で型が広いままになる
- 型述語を使うことで `if` の中で自動的に型が絞り込まれる

#### NG パターン

```ts
function isString(value: unknown): boolean {
	return typeof value === "string"
}

if (isString(value)) {
	// value は依然として unknown のまま
	console.log(value.toUpperCase()) // コンパイルエラー
}
```

#### OK パターン

```ts
function isString(value: unknown): value is string {
	return typeof value === "string"
}

if (isString(value)) {
	// value は string に絞り込まれる
	console.log(value.toUpperCase())
}
```

### `??` と `||` を正しく使い分ける

デフォルト値の設定には、`0` や `''` を有効値として扱う必要があるかを考慮し、`??`（nullish coalescing）と `||`（論理OR）を使い分けること。

#### 理由

- `||` は `0`、`''`、`false`、`NaN` などの falsy な値もすべてフォールバック対象にする
- `??` は `null` と `undefined` のみをフォールバック対象にするため、falsy だが有効な値を保持できる
- `??` を使うことで「nullish な場合のみフォールバックする」という意図がコード上で明確になり、可読性が向上する

#### NG パターン

```ts
// count が 0 の場合、意図せず 10 になる
const count = input.count || 10

// name が '' の場合、意図せず 'anonymous' になる
const name = input.name || "anonymous"
```

#### OK パターン

```ts
// count が 0 でもそのまま 0 が使われる
const count = input.count ?? 10

// name が '' でもそのまま '' が使われる
const name = input.name ?? "anonymous"
```

### 定数オブジェクト/配列には `as const` を使う

定数として扱うオブジェクトや配列には `as const` を付与し、リテラル型を保持すること。

#### 理由

- `as const` なしでは型が widening され、`string[]` や `{ key: string }` のように広い型に推論される
- リテラル型が失われると、Union 型の生成やキーの網羅性チェックに利用できなくなる

#### NG パターン

```ts
const roles = ["admin", "editor", "viewer"]
// 型: string[] — リテラル型が失われる

type Role = (typeof roles)[number]
// 型: string — union型にならない
```

#### OK パターン

```ts
const roles = ["admin", "editor", "viewer"] as const
// 型: readonly ['admin', 'editor', 'viewer']

type Role = (typeof roles)[number]
// 型: 'admin' | 'editor' | 'viewer'
```

### `enum` ではなく Union 型 + `as const` オブジェクトを使う

列挙的な値の定義には `enum` ではなく、`as const` オブジェクトと Union 型を使用すること。

#### 理由

- `enum` は数値への暗黙的な割り当てにより、意図しない値が代入されうる
- `enum` は独自の型空間を作るため、DB や API から取得した文字列値をそのまま代入できず、型の相互運用性が悪い
- `as const` + Union 型はプレーンな JavaScript の値として扱われ、型推論との相性が良い

#### NG パターン

```ts
enum Status {
  Active = 'active',
  Inactive = 'inactive',
  Pending = 'pending',
}

function handle(status: Status) { ... }
```

#### OK パターン

```ts
const Status = {
  Active: 'active',
  Inactive: 'inactive',
  Pending: 'pending',
} as const

type Status = (typeof Status)[keyof typeof Status]
// 型: 'active' | 'inactive' | 'pending'

function handle(status: Status) { ... }
```

### Discriminated Union を活用する

複数の状態を持つ型は、optional プロパティの組み合わせではなく、判別フィールド（discriminant）付きの Union 型で表現すること。

#### 理由

- optional プロパティでは「`data` はあるが `error` もある」のような本来あり得ない状態を型が許容してしまう
- 判別フィールドにより `switch` や `if` で型が自動的に絞り込まれ、各状態で利用可能なプロパティが明確になる

#### NG パターン

```ts
type Result<T> = {
	status?: "success" | "error" | "loading"
	data?: T
	error?: Error
}

// data と error の両方が存在する状態を型が許容してしまう
function handle(result: Result<User>) {
	if (result.data) {
		// result.error も存在する可能性がある
	}
}
```

#### OK パターン

```ts
type Result<T> =
	| { status: "success"; data: T }
	| { status: "error"; error: Error }
	| { status: "loading" }

function handle(result: Result<User>) {
	switch (result.status) {
		case "success": {
			// result.data が確実に存在する
			console.log(result.data.name)
			break
		}
		case "error": {
			// result.error が確実に存在する
			console.error(result.error.message)
			break
		}
		case "loading": {
			break
		}
		default: {
			throw new Error(`Unexpected status: ${result satisfies never}`)
		}
	}
}
```

### Union 型の分岐にはコンパイル時の網羅性チェックを入れる

Union 型に対して条件分岐する場合、コンパイル時に網羅性が保証される手段を使うこと。`if` / `else if` による分岐では網羅性が検証されないため、型にメンバーが追加された際に未処理のケースが暗黙的にスルーされる。

網羅性を保証する手段は以下の2つ。用途に応じて使い分けること。

- **`Record<K, V>` マッピング**: 値の変換や同質な処理の場合に適する。型制約により全キーの定義が強制される
- **`switch` + `satisfies never`**: 分岐ごとに異なるロジックを実行する場合に適する。`default` ケースで未処理の型がコンパイルエラーとして検出される

#### NG パターン

```ts
type Role = "admin" | "editor" | "viewer"

// if/else if では型にメンバーが追加されても検出できない
let label: string
if (role === "admin") {
	label = "管理者"
} else if (role === "editor") {
	label = "編集者"
} else if (role === "viewer") {
	label = "閲覧者"
}
```

#### OK パターン: `Record` マッピング

値の変換や同質な処理には `Record` を使用する。

```ts
type Role = "admin" | "editor" | "viewer"

const roleLabel: Record<Role, string> = {
	admin: "管理者",
	editor: "編集者",
	viewer: "閲覧者",
}

const label = roleLabel[role]
```

#### OK パターン: `switch` + `satisfies never`

分岐ごとに異なるロジックを実行する場合は `switch` + `satisfies never` を使用する。

```ts
switch (action) {
	case "sendEmail": {
		await this.emailService.send(user.email, subject, body)
		break
	}
	case "sendSlack": {
		await this.slackClient.postMessage(channel, body)
		break
	}
	case "createTask": {
		await this.taskRepository.create(user.id, subject, body, dueDate)
		break
	}
	default: {
		throw new Error(`Unexpected action: ${action satisfies never}`)
	}
}
```

### `type` よりも `interface` を優先する

オブジェクト型の定義には `type` ではなく `interface` を使用すること。

`type` を使うべき場面は以下に限定する:

- Union 型（`type Status = 'active' | 'inactive'`）
- Intersection 型（`type Combined = A & B`）
- Mapped 型・条件型（`type Keys = keyof T`）
- プリミティブや関数のエイリアス（`type Handler = () => void`）

#### 理由

- `interface` は宣言マージが可能で、ライブラリの型拡張に対応できる
- TypeScript コンパイラは `interface` を名前付き型として扱い、エラーメッセージやホバー表示が読みやすくなる
- `type` のオブジェクト型は毎回インライン展開されるため、複雑な型ではデバッグが困難になる
- `interface` と `type` の使い分けが明確になり、「これはオブジェクト構造の定義」という意図が伝わる

#### NG パターン

```ts
type User = {
	id: string
	name: string
	email: string
}

type CreateUserParams = {
	name: string
	email: string
}
```

#### OK パターン

```ts
interface User {
	id: string
	name: string
	email: string
}

interface CreateUserParams {
	name: string
	email: string
}
```

```ts
// type を使うべき場面
type Status = "active" | "inactive"
type Handler = (event: Event) => void
type Nullable<T> = T | null
```
