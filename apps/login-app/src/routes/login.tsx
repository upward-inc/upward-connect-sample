import { createFileRoute } from "@tanstack/react-router"
import { useRef, useState } from "react"
import { Button } from "../components/button"
import { Input } from "../components/input"
import { Label } from "../components/label"

export const Route = createFileRoute("/login")({
	component: Login,
})

function Login() {
	const [isLoading, setIsLoading] = useState(false)
	const [errorMessage, setErrorMessage] = useState("")
	const formRef = useRef<HTMLFormElement>(null)

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

		setErrorMessage("")
		setIsLoading(true)

		try {
			const formData = new FormData(e.target as HTMLFormElement)
			const username = formData.get("username") as string
			const password = formData.get("password") as string

			// ログイン処理
			console.log("ログイン試行:", username, password)

			// 仮の遅延処理
			await new Promise((resolve) => setTimeout(resolve, 1000))

			// 成功時の処理
			alert("ログイン成功!")

			// フォームをリセット
			if (formRef.current) {
				formRef.current.reset()
			}
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
						<Input id="username" name="username" type="username" required />
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
