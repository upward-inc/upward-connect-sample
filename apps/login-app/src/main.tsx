import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { LoginPage } from "./pages/login/login.tsx"

const rootElement = document.getElementById("root")
if (rootElement) {
	createRoot(rootElement).render(
		<StrictMode>
			<LoginPage />
		</StrictMode>,
	)
} else {
	console.error("Root element not found")
}
