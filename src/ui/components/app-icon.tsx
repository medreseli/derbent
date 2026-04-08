import { AppId } from '../../config/apps';

import ssoSvg from '../../assets/app-icons/sso.svg';
import hodanSvg from '../../assets/app-icons/hodan.svg';
import namedarSvg from '../../assets/app-icons/namedar.svg';

const ICON_MAP: Record<string, string> = {
	sso: ssoSvg,
	hodan: hodanSvg,
	namedar: namedarSvg,
};

interface AppIconProps {
	appId: AppId | string;
	className?: string;
}

export const AppIcon = ({ appId, className = '' }: AppIconProps) => {
	const rawSvg = ICON_MAP[appId];

	if (!rawSvg) return null;

	const processedSvg = rawSvg.replace('<svg', `<svg class="${className}"`);

	return <span className="contents" dangerouslySetInnerHTML={{ __html: processedSvg }} />;
};
