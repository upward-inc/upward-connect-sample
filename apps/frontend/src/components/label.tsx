import { twMerge } from "tailwind-merge"

type LabelProps = React.ComponentPropsWithRef<"label">

export function Label({ className, children, ...restProps }: LabelProps) {
	return (
		// biome-ignore lint/a11y/noLabelWithoutControl: inputを別コンポーネントとして定義しているため
		<label
			className={twMerge("block text-sm font-medium text-gray-700", className)}
			{...restProps}
		>
			{children}
		</label>
	)
}
