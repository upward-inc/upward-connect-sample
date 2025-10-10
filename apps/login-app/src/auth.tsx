import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react"
import { env } from "./env"

const AUTH_TOKEN_KEY = "auth.token"
const AUTH_USER_KEY = "auth.user"

interface UserData {
	id: string
	username: string
	firstName: string
	lastName: string
}

interface AuthState {
	isAuthenticated: boolean
	user: UserData | null
	token: string | null
}

export interface AuthContextType extends AuthState {
	login: (username: string, password: string) => Promise<void>
	logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

interface AuthProviderProps {
	children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
	const [authState, setAuthState] = useState<AuthState>({
		isAuthenticated: false,
		user: null,
		token: null,
	})

	// 初回マウント時に認証情報をローカルストレージから復元
	useEffect(() => {
		const token = localStorage.getItem(AUTH_TOKEN_KEY)
		const userData = localStorage.getItem(AUTH_USER_KEY)

		if (token && userData) {
			try {
				const user = JSON.parse(userData) as UserData
				setAuthState({
					isAuthenticated: true,
					user,
					token,
				})
			} catch (error) {
				localStorage.removeItem(AUTH_TOKEN_KEY)
				localStorage.removeItem(AUTH_USER_KEY)
			}
		}
	}, [])

	// ログイン処理
	const login = useCallback(async (username: string, password: string) => {
		const formData = new FormData()
		formData.append("username", username)
		formData.append("password", password)

		const response = await fetch(`${env.API_URL}/auth/login`, {
			method: "POST",
			body: formData,
		})

		if (!response.ok) {
			const errorMessage = await response.json().then((data) => data.message)
			throw new Error(errorMessage)
		}

		const data = await response.json()

		const token = data.access_token
		const userData = {
			id: data.id,
			username: data.user_name,
			firstName: data.first_name,
			lastName: data.last_name,
		}

		localStorage.setItem(AUTH_TOKEN_KEY, token)
		localStorage.setItem(AUTH_USER_KEY, JSON.stringify(userData))

		setAuthState({
			isAuthenticated: true,
			user: userData,
			token,
		})
	}, [])

	// ログアウト処理
	const logout = useCallback(async () => {
		localStorage.removeItem(AUTH_TOKEN_KEY)
		localStorage.removeItem(AUTH_USER_KEY)

		setAuthState({
			isAuthenticated: false,
			user: null,
			token: null,
		})
	}, [])

	return (
		<AuthContext.Provider value={{ ...authState, login, logout }}>
			{children}
		</AuthContext.Provider>
	)
}

// 認証コンテキストを使用するためのフック
export function useAuth() {
	const auth = useContext(AuthContext)
	if (!auth) {
		throw new Error("useAuth must be used within an AuthProvider")
	}
	return auth
}
