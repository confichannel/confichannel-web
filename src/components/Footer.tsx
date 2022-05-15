import React from 'react';
import AppLink from './AppLink';
import { useStoreState } from '../core/confiAppStore';

function Footer() {
	const { activeSubscriptionId, deviceToken } = useStoreState(state => state);
	
	return <div className='Footer'>
		{!!activeSubscriptionId && <div className="mb-0_5">{<AppLink
			href="/purchase-subscription"
			>Your ConfiChannel Plus Subscription</AppLink>}</div>}
		<div>
			Send feedback to:{' '}
			<a
				href="mailto:feedback@confichannel.com?subject=Feedback"
			>feedback@confichannel.com</a>.
		</div>
		<div className='mt-1_5 LegalLinks'>
			<AppLink href='/'>Home</AppLink>{' '}
			<AppLink href='/about'>About</AppLink>{' '}
			<AppLink href='/impressum'>Imprint</AppLink>{' '}
			<AppLink href='/privacy-policy'>Privacy Policy</AppLink>{' '}
			<AppLink href='/terms-of-use'>Terms of Use</AppLink>{' '}
			<AppLink href='/security'>Security</AppLink><>
				{!!deviceToken && ' '}
				{!!deviceToken && <AppLink href='/account'>Account</AppLink>}
			</>
		</div>
		<div className='WebAppVersion'>
			Version: 0.5.1{' '}
			<AppLink href='/changelog'>Changelog</AppLink>{' '}
			🐦
		</div>
	</div>
}

export default Footer;
