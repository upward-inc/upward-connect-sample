import { RouterProvider, createRouter } from "@tanstack/react-router"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { type AuthContextType, AuthProvider, useAuth } from "./auth"
import { routeTree } from "./routeTree.gen"

// Create a new router instance
const router = createRouter({
	routeTree,
	defaultPreload: "intent",
	scrollRestoration: true,
	context: {
		// 初期値は空値で、後でAuthProviderから渡す
		auth: {} as AuthContextType,
	},
})

// Register the router instance for type safety
declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router
	}
}

function InnerApp() {
	const auth = useAuth()
	return <RouterProvider router={router} context={{ auth }} />
}

function App() {
	return (
		<AuthProvider>
			<InnerApp />
		</AuthProvider>
	)
}

// Render the app
const rootElement = document.getElementById("root")
if (rootElement) {
	createRoot(rootElement).render(
		<StrictMode>
			<App />
		</StrictMode>,
	)
} else {
	console.error("Root element not found")
}
