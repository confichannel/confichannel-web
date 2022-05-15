import React, { useContext } from 'react';
import { NavigationContext } from './ConfiApp';

function AppLink(props: React.DetailedHTMLProps<
	React.AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement
>) {
	const { href, children, onClick, ...otherProps } = props;
	const history = useContext(NavigationContext);
	if (onClick) {
		throw new Error('Custom onClick not yet supported');
	}
	if (typeof props.href !== 'string') {
		throw new Error('Non-string hrefs not yet supported');
	}
	return <a
		href={props.href}
		{...otherProps}
		onClick={(event) => {
			event.preventDefault();
			history.push(props.href || '');
			window.scrollTo(0, 0);
			const activeElement = document.activeElement as any;
			if (activeElement?.blur) {
				activeElement.blur();
			}
			// Reset focus to top of document, similar to if a new page was really
			// loaded.
			const logo = document.querySelector('.LogoLink') as any;
			logo.focus();
			logo.blur();
		}}
	>{children}</a>
}

export default AppLink;
