interface AppIconProps {
	iconSvg: string | null;
	className?: string;
}

export const AppIcon = ({ iconSvg, className = '' }: AppIconProps) => {
	if (!iconSvg) {
		// Fallback placeholder if no icon is provided
		return <div className={`shrink-0 rounded-md bg-zinc-200 ${className}`}></div>;
	}

	const processedSvg = iconSvg.replace('<svg', `<svg class="${className}"`);

	return <span className="contents" dangerouslySetInnerHTML={{ __html: processedSvg }} />;
};
