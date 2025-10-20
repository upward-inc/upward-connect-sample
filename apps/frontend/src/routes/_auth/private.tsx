import { createFileRoute } from "@tanstack/react-router"
import { useAuth } from "../../auth"

export const Route = createFileRoute("/_auth/private")({
	component: PrivatePage,
})

function PrivatePage() {
	const auth = useAuth()

	if (!auth.user) {
		return null
	}

	const fullName = `${auth.user.lastName}${auth.user.firstName}`

	return (
		<section className="grid gap-2 p-2">
			<p className="mb-2">ようこそ、{fullName} さん！</p>
			<p className="text-sm text-gray-700 mb-4">
				これは認証済みユーザーのみアクセスできるページです。
			</p>
		</section>
	)
}
