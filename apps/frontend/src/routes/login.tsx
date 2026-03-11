import {
	createFileRoute,
	redirect,
	useNavigate,
	useSearch,
} from "@tanstack/react-router"
import { useRef, useState } from "react"
import { z } from "zod"
import { useAuth } from "../auth"
import { Button } from "../components/button"
import { Input } from "../components/input"
import { Label } from "../components/label"

const SearchParamsSchema = z.object({
	redirect: z
		.string()
		.refine((url) => url.startsWith("/") && !url.startsWith("//"), {
			message: "Only relative paths are allowed",
		})
		.optional(),
})

const fallback = "/private" as const

export const Route = createFileRoute("/login")({
	beforeLoad: ({ context, search }) => {
		// すでに認証済みの場合はリダイレクト
		if (context.auth.isAuthenticated) {
			throw redirect({ href: search.redirect ?? fallback })
		}
	},
	component: Login,
	validateSearch: SearchParamsSchema,
})

function Login() {
	const { redirect } = useSearch({ from: "/login" })
	const [isLoading, setIsLoading] = useState(false)
	const [errorMessage, setErrorMessage] = useState("")
	const formRef = useRef<HTMLFormElement>(null)
	const navigate = useNavigate()
	const auth = useAuth()

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

		setErrorMessage("")
		setIsLoading(true)

		try {
			const formData = new FormData(e.target as HTMLFormElement)
			const username = formData.get("username") as string
			const password = formData.get("password") as string

			await auth.login(username, password)

			// フォームをリセット
			if (formRef.current) {
				formRef.current.reset()
			}

			// リダイレクト処理
			navigate({ href: redirect ?? fallback })
		} catch {
			setErrorMessage(
				"ログインに失敗しました。ユーザー名とパスワードを確認してください。",
			)
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<div className="flex items-center justify-center min-h-screen bg-gray-100">
			<div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow">
				<div className="text-center">
					<h1 className="text-2xl font-bold text-gray-900">ログイン</h1>
				</div>

				{errorMessage && (
					<div className="p-3 text-sm text-red-800 bg-red-100 rounded">
						{errorMessage}
					</div>
				)}

				<form ref={formRef} className="mt-8 space-y-6" onSubmit={handleSubmit}>
					<div>
						<Label htmlFor="username">ユーザー名</Label>
						<Input id="username" name="username" type="text" required />
					</div>

					<div>
						<Label htmlFor="password">パスワード</Label>
						<Input id="password" name="password" type="password" required />
					</div>

					<Button type="submit" disabled={isLoading}>
						{isLoading ? "ログイン中..." : "ログイン"}
					</Button>
				</form>
			</div>
		</div>
	)
}
