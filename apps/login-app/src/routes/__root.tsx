import { Outlet, createRootRouteWithContext } from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools"
import type { AuthContextType } from "../auth"

interface MyRouterContext {
	// The ReturnType of your useAuth hook or the value of your AuthContext
	auth: AuthContextType
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	component: () => (
		<>
			<Outlet />
			<TanStackRouterDevtools />
		</>
	),
})
