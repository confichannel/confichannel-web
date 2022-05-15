import React from 'react';
import AppLink from '../components/AppLink';

function AboutPage() {
	return <>
		<p className='SectionWrapper'>
			Never leave sensitive data hanging around in emails or messages again!
		</p>
		<div className='SectionWrapper'>
			<h2>How ConfiChannel works</h2>
			<p>
				ConfiChannel makes it super easy to send encrypted messages. You don't
				need to set up an account to send a message; and the person you're
				sending a message to, doesn't need to set up an account to receive it
				either!
			</p>
			<p>
				As long as you can share a link with someone, or even just show them a
				QR code, you can start sending and receiving encrypted messages.
			</p>
			<p>
				Find out more about <AppLink href='/security'>security</AppLink>.
			</p>
			<h3 className='mt-1'>See the code</h3>
			<p className='mt-0_5'>
				Web frontend: <a
					href="https://gitlab.com/confichannel/confichannel-web"
					rel="noopener noreferrer"
				>https://gitlab.com/confichannel/confichannel-web</a><br />
				Server: <a
					href="https://gitlab.com/confichannel/confichannel-server"
					rel="noopener noreferrer"
				>https://gitlab.com/confichannel/confichannel-server</a><br />
				(mirror) Web frontend: <a
					href="https://github.com/confichannel/confichannel-web"
					rel="noopener noreferrer"
				>https://github.com/confichannel/confichannel-web</a><br />
				(mirror) Server: <a
					href="https://github.com/confichannel/confichannel-server"
					rel="noopener noreferrer"
				>https://github.com/confichannel/confichannel-server</a>
			</p>
		</div>
		<div className='SectionWrapper'>
			<h2>Run ConfiChannel on your own servers</h2>
			<p>
				If you want to run ConfiChannel on your own servers or request
				custom features for your organisation, please get in touch!
			</p>
			<p><a
				href="mailto:questions@confichannel.com?subject=Run%20ConfiChannel%20On%20A%20Server"
			>questions@confichannel.com</a></p>
		</div>
		<div className='SectionWrapper'>
			<h2>Integrate ConfiChannel with your product</h2>
			<p>
				If you have a system where you want a convenient way to send sensitive
				data that can only viewed once, please get in touch about integrating
				it with ConfiChannel!
			</p>
			<p><a
				href="mailto:integrations@confichannel.com?subject=ConfiChannel%20Integration"
			>integrations@confichannel.com</a></p>
		</div>
		<div className='SectionWrapper'>
			<h2>Roadmap of upcoming features</h2>
			<p>
				Here are features being considered for future versions of
				ConfiChannel:
			</p>
			<ul>
				<li>
					Accessibility improvements.
				</li>
				<li>
					Notifications are sent when a message is pushed to a channel.
				</li>
				<li>
					Files can be sent through a channel.
				</li>
				<li>
					When possible, send a message via an end-to-end encrypted peer-to-peer connection.
				</li>
				<li>
					Add additional payment methods.
				</li>
				<li>
					Create unlimited plan.
				</li>
				<li>
					Make all the code open-source.
				</li>
			</ul>
			<p>Do you have other ideas? Please let us know!</p>
			<p><a
				href="mailto:features@confichannel.com?subject=Feature%20Request"
			>features@confichannel.com</a></p>
		</div>
		<div className='SectionWrapper'>
			<h2>Bug reporting</h2>
			<p>
				Is something not working? Found an security issue? Please let us know!
				We are happy to pay for help finding and fixing issues.
            </p>
			<p><a
				href="mailto:bugs@confichannel.com?subject=Bug"
			>bugs@confichannel.com</a></p>
		</div>
	</>
}

export default AboutPage;
