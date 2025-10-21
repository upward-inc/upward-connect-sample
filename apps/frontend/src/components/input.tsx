import { twMerge } from "tailwind-merge"

type InputProps = React.ComponentPropsWithRef<"input">

export function Input({ className, ...restProps }: InputProps) {
	return (
		<input
			className={twMerge(
				"block w-full px-3 py-2 border border-gray-300 rounded",
				"focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
				className,
			)}
			{...restProps}
		/>
	)
}
