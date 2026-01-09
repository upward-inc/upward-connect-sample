import { twMerge } from "tailwind-merge"

type ButtonProps = React.ComponentPropsWithRef<"button">

export function Button({ className, children, ...restProps }: ButtonProps) {
	return (
		<button
			className={twMerge(
				"flex justify-center w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded",
				"disabled:opacity-50",
				"hover:bg-blue-700 hover:cursor-pointer",
				"focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
				className,
			)}
			{...restProps}
		>
			{children}
		</button>
	)
}
