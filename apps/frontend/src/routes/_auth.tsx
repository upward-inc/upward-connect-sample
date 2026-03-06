import {
	createFileRoute,
	Outlet,
	redirect,
	useRouter,
} from "@tanstack/react-router"
import { useAuth } from "../auth"
import { Button } from "../components/button"

export const Route = createFileRoute("/_auth")({
	beforeLoad: ({ context, location }) => {
		if (!context.auth.isAuthenticated) {
			throw redirect({
				to: "/login",
				search: {
					// ログイン後のリダイレクト先を指定
					redirect: location.href,
				},
			})
		}
	},
	component: AuthLayout,
})

function AuthLayout() {
	const router = useRouter()
	const navigate = Route.useNavigate()
	const auth = useAuth()

	const handleLogout = () => {
		if (window.confirm("ログアウトしますがよろしいですか？")) {
			auth.logout().then(() => {
				router.invalidate().finally(() => {
					navigate({ to: "/" })
				})
			})
		}
	}

	return (
		<div className="p-2 h-full space-y-3">
			<div className="p-2 space-y-2">
				<h1>Authenticated Route</h1>
				<p>This route's content is only visible to authenticated users.</p>
				<Button className="w-max" onClick={handleLogout}>
					Logout
				</Button>
			</div>

			<hr />

			<Outlet />
		</div>
	)
}
