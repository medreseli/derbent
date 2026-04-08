import derbentSvg from '../../assets/icons/derbent.svg';
import googleSvg from '../../assets/icons/google.svg';
import githubSvg from '../../assets/icons/github.svg';
import logInSvg from '../../assets/icons/log-in.svg';
import logOutSvg from '../../assets/icons/log-out.svg';
import keySquareSvg from '../../assets/icons/key-square.svg';
import shieldCheckSvg from '../../assets/icons/shield-check.svg';
import globeSvg from '../../assets/icons/globe.svg';
import externalLinkSvg from '../../assets/icons/external-link.svg';
import powerSvg from '../../assets/icons/power.svg';
import ellipsisSvg from '../../assets/icons/ellipsis.svg';

export interface IconProps {
	className?: string;
	strokeWidth?: number | string;
}

const BaseIcon = ({ src, className = '', strokeWidth }: IconProps & { src: string }) => {
	if (!src) return null;

	let processedSvg = src;

	// Inject custom classes (Tailwind sizing, colors, etc.)
	if (className) {
		processedSvg = processedSvg.replace('<svg', `<svg class="${className}"`);
	}

	// Override default stroke-width if provided
	if (strokeWidth !== undefined) {
		processedSvg = processedSvg.replace(/stroke-width="[^"]+"/, `stroke-width="${strokeWidth}"`);
	}

	return <span className="contents" dangerouslySetInnerHTML={{ __html: processedSvg }} />;
};

export const DerbentIcon = (props: IconProps) => <BaseIcon src={derbentSvg} {...props} />;
export const GoogleIcon = (props: IconProps) => <BaseIcon src={googleSvg} {...props} />;
export const GithubIcon = (props: IconProps) => <BaseIcon src={githubSvg} {...props} />;
export const LogInIcon = (props: IconProps) => <BaseIcon src={logInSvg} {...props} />;
export const LogOutIcon = (props: IconProps) => <BaseIcon src={logOutSvg} {...props} />;
export const KeySquareIcon = (props: IconProps) => <BaseIcon src={keySquareSvg} {...props} />;
export const ShieldCheckIcon = (props: IconProps) => <BaseIcon src={shieldCheckSvg} {...props} />;
export const GlobeIcon = (props: IconProps) => <BaseIcon src={globeSvg} {...props} />;
export const ExternalLinkIcon = (props: IconProps) => <BaseIcon src={externalLinkSvg} {...props} />;
export const PowerIcon = (props: IconProps) => <BaseIcon src={powerSvg} {...props} />;
export const EllipsisIcon = (props: IconProps) => <BaseIcon src={ellipsisSvg} {...props} />;
