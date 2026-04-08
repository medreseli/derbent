import type { PropsWithChildren } from 'hono/jsx';

export interface ButtonProps extends PropsWithChildren {
	variant?: 'primary' | 'secondary' | 'danger';
	href?: string;
	type?: 'button' | 'submit' | 'reset';
	className?: string;
	disabled?: boolean;
	target?: string;
	[key: string]: any;
}

export const Button = ({ variant = 'primary', href, type = 'button', className = '', disabled, children, ...props }: ButtonProps) => {
	const baseClass = 'btn';
	const variantClass = `btn-${variant}`;

	// Filter out extra whitespace
	const combinedClass = `${baseClass} ${variantClass} ${className}`.trim();

	if (href) {
		return (
			<a href={href} className={combinedClass} {...props}>
				{children}
			</a>
		);
	}

	return (
		<button type={type} className={combinedClass} disabled={disabled} {...props}>
			{children}
		</button>
	);
};
