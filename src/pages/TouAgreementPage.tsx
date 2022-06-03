import React, { useState } from 'react';
import AppLink from '../components/AppLink';
import { useStoreState } from '../core/confiAppStore';
import TouAgreementModal from '../components/TouAgreementModal';

function TouAgreementPage() {
	const { touAgreement } = useStoreState(state => state);
	const [hideAgreementModal, setHideAgreementModal] = useState(false);
	const showModal = typeof touAgreement === 'undefined' && !hideAgreementModal;

	return <div className='SectionWrapper'>
		{showModal && <TouAgreementModal onDisagree={() => {
			setHideAgreementModal(true)
		}} />}
		{typeof touAgreement === 'boolean' && !touAgreement && <div>
			Error 🙃
		</div>}
		{typeof touAgreement === 'boolean' && touAgreement && <div>
			<AppLink href='/new-channel'></AppLink>
		</div>}
		<h2 className='NewChannelHeading'>Create a channel, share encrypted
			messages which can be viewed just once
		</h2>
		<div className='mt-2 text-align-center'>
			<button
				className='button'
				onClick={() => setHideAgreementModal(false)}
			>Start Sending Encrypted Messages</button>
		</div>
		<div className='mt-2'>
			🤖 Technical note: initial messages are encrypted using <a
				href="https://en.wikipedia.org/wiki/Symmetric-key_algorithm">
				symmetric-keys</a> (aka shared-key). Once an invite to the channel
			is accepted, then messages are encrypted using <a
				href="https://en.wikipedia.org/wiki/Public-key_cryptography">
				public-key</a> cryptography, which addresses some known downsides
			of symmetric-key encryption. More info on the <AppLink
				href='/security'>security</AppLink> page.
		</div>
		<div className='mt-2'>
			💡 ConfiChannel aims to be reasonably secure by design but there are
			things it is dependent on for good security, including: your device,
			operating system, browser, browser extensions, and where you share
			invites. To help keep your ConfiChannel messages secure, consider using
			trusted antivirus software, browsers and extensions, and keep everything
			up-to-date. Stay safe 🙂
		</div>
	</div>
}

export default TouAgreementPage;
