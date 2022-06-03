import React from 'react';

function ChangelogPage() {
	return <>
		<div className='SectionWrapper'>
			<h2>Version 0.5.2</h2>
			<ul>
				<li>Bug fix when retrieving unidirectional channel messages</li>
			</ul>
			<h2>Version 0.5.1</h2>
			<ul>
				<li className='AnimatedChangeLogItem'>Animated channel message actions</li>
			</ul>
			<h2>Version 0.5.0</h2>
			<ul>
				<li>Bug fixes and refactored API usage</li>
				<li>Privacy policy update</li>
			</ul>
			<h2>Version 0.4.0</h2>
			<ul>
				<li>Terms of Use opt-in update</li>
			</ul>
			<h2>Version 0.3.5</h2>
			<ul>
				<li>Terms of Use opt-in</li>
				<li>Password moved to advanced options</li>
			</ul>
			<h2>Version 0.3.4</h2>
			<ul>
				<li>Automatically clear data on devices that have invalid token</li>
			</ul>
			<h2>Version 0.3.3</h2>
			<ul>
				<li>Add information page about security</li>
			</ul>
			<h2>Version 0.3.2</h2>
			<ul>
				<li>Bug fix: hide invitation table on receiver channels</li>
			</ul>
			<h2>Version 0.3.1</h2>
			<ul>
				<li>Add channel invite mangement</li>
			</ul>
			<h2>Version 0.3.0</h2>
			<ul>
				<li>Enable private-public key encrypted, unidirection channels</li>
			</ul>
			<h2>Version 0.2.0</h2>
			<ul>
				<li>Add private/public key mode of encryption</li>
			</ul>
			<h2>Version 0.1.0</h2>
			<ul>
				<li>2 modes of shared key AES-GCM 256 encryption
					<ul>
						<li>Use password to generate key with PBKDF2</li>
						<li>Use a shared secret to generate the key with PBKDF2</li>
					</ul>
				</li>
			</ul>
		</div>
	</>
}

export default ChangelogPage;
