import React from 'react';

function SecurityInformation() {
	return <>
		<div className='SectionWrapper'>
			<h2>ConfiChannel Security</h2>
			<p>
				At a high level, ConfiChannel messages are secured by <b>encrypting
				and decrypting messages directly in the browser</b>, using encryption
				keys which are not known to the server. Additionally, once messages are
				retrieved from the server, the encrypted message data is deleted from
				the server, so there can be <b>only one recipient to any given
				message</b>.
			</p>
			<p>There are two types of channels on ConfiChannel:</p>
			<ul>
				<li>
					Bidirectional: encrypted messages can be sent in both directions
					between 2 devices. This is the default channel type.
				</li>
				<li>
					Unidirectional: one or more devices can encrypt and send messages in a
					channel but only the channel creator is able to retrieve and decrypt
					messages in the channel. This channel type is available via 'Advanced
					Options' while creating a new channel.
				</li>
			</ul>
			<h3>Security of Bidirectional Channels</h3>
			<p>There are three ways bidirectional channel secures messages:</p>
			<ul>
				<li>
					A shared secret, to encrypt and decrypt any message sent prior to an
					invitation being accepted.
				</li>
				<li>
					Using public/private key cryptography where two people are able to
					generate a shared secret to encrypt and decrypt messages in a
					channel after an invitation has been accepted.
				</li>
				<li>
					A manually-set password is used to encrypt and then decrypt messages.
					This method can be used regardless of whether an invitiation has been
					accepted or not.
				</li>
			</ul>
			<h4>Shared Secret</h4>
			<p>
				This deserves a bit of a longer explanation to explain how ConfiChannel
				protects initial messages (i.e. before two parties have had a chance
				to share public keys) in a channel using Shared Secret encryption.
			</p>
			<ol>
				<li>
					When a channel is created, it gets a randomly generated key, called
					the Channel Shared Secret Key 🔑, which can be used to
					encrypt and decrypt messages. If the channel has an initial message,
					the Channel Shared Secret Key will be used to encrypt the message.
				</li>
				<li>
					When the channel is shared, it generates another random key, the
					Invite Key 🔑. The Invite Key is used to encrypt the
					Channel Shared Secret Key 🔑 on the device before it is sent
					to the server.
				</li>
				<li>
					A request for an invitation (which includes the Channel Shared Secret
					Key only in its encrypted form 🔒) to the channel is sent to the
					server, the server returns the invitation and a passcode to authorise
					access to consume the invitation. The Invite Key 🔑 is not sent to
					the server.<br />
					At this point - the server cannot read channel messages; because it
					does not know the Invite Key and has no way of decrypting the Channel
					Shared Secret Key 🔑 and therefore cannot use it to decrypt channel
					messages. This is good 👍
				</li>
				<li>
					On the sender's device, the invitation id and the invitation passcode
					from the server response and the locally generated Invite Key are
					combined to form a complete invitation URL. Importantly, the
					Invite Key 🔑 is included in the "fragment" component of the url (after
					the <code>#</code> sign). Major browsers do not send fragment data
					as part of their requests to a server. This means even when the
					invitation URL is opened by the recipient, the server still does not
					have access to the Invite Key 🔑 (because it is not sent as part of
					the requested URL), and still cannot decrypt the Channel Shared Secret
					Key, and therefore the server still cannot read the channel message.
					So this is also good 👍
				</li>
				<li>
					The recipient of the invitation URL has invitation id, the
					invitation passcode, and unlike the server, also the Invite Key 🔑.
					The recipient then uses the invitation id and passcode to fetch the
					the encrypted version of the Channel Shared Secret Key 🔐 from the
					server and, voilà 🎉, can use the Invite Key to decrypt it and now
					they have the same Channel Shared Secret Key 🔑 that the creator of
					the channel has. This means both the creator of the channel and the
					person who accepted an invite to the channel can encrypt and decrypt
					each others' messages. Finally, the recipient can decrypt any message
					which was initally encrypted in the channel, even though the server
					still cannot decrypt messages. Message data is still well protected
					here 👍<br />
					Additionally, once the server has sent the encrypted version of the
					Channel Shared Secret Key 🔐 to the invitation recipient, it deletes
					it from the server. In other words, it's not possible for someone else
					to come along later and open the same invitation link and then be
					able to read channel messages.
				</li>
			</ol>
			<h5>Pros</h5>
			<p>
				Convenience: you don't need need any information from the receiver of
				a message in order to encrypt it for them. Generally, only the channel
				creator and the first invitation recipient to open a valid invitation
				link are able to encrypt and decrypt messages in the channel. The server
				is unable to view the encrypted message data. Noone else who might later
				find the invitation link is able to use it to access the channel nor get
				the key to encrypt and decrypt messages.
			</p>
			<h5>Cons</h5>
			<p>
				Technically speaking, the Channel Shared Secret Key leaves the device it
				was generated on and finds its way to another device. It does this in
				two pieces, the Invite Key in the fragment part of the invitation URL
				and the encrypted Channel Shared Secret Key. Nevertheless, if someone 😈
				in between the invitation creator and invitation recipient were somehow
				to intercept both the invitation URL (complete with fragment information
				as well - as it contains the Invite Key 🔑) as well as the encrypted
				Channel Shared Secret Key, they would have the pieces of data needed to
				encrypt and decrypt the initial message sent through the channel (if
				they were able to intercept the message data too).<br />
				This is overcome as soon as the invitation is accepted though, and the
				channel switches to use public/private key cryptography which is
				explained in the next section.
			</p>
			<h4>Public/private Key</h4>
			<ol>
				<li>
					Once an invitation has been accepted, the server facilitates the
					exchange of the public keys of the two parties using a bidirectional
					channel.
				</li>
				<li>
					After both parties know each others public keys, all messages will
					use the sender's private key in combination with the receiver's
					public key to generate a shared secret key. Unlike the Shared Secret
					method of encrypting and decrypting messages, no shared key is
					transmitted between the two parties - only their public keys generated
					for the channel on their respective devices. In fact, the private keys
					do not leave the device they were generated on! So, in theory, this
					is a security advantage over the Shared Secret cryptography used to
					encrypt and decrypt messages in the channel prior to the invitation
					being accepted.
				</li>
			</ol>
			<h4>Password</h4>
			<p>
				For any given message, a password may be used to encrypt it instead of
				using shared key or public/private key encryption. Of course, in order
				to decrypt the message, the person receiving the message must know what
				the password is.
			</p>
			<h3>Security of Unidirectional Channels</h3>
			<p>
				Unlike bidirectional channels which can switch between three ways of
				securing message data with encryption, unidirectional channels have
				just two ways of securing data: public/private key and password-based
				encryption. While password encryption works the same as for
				bidirectional channels, setting up public/private key encryption is
				slightly different:
			</p>
			<ul>
				<li>
					A person creates a unidirectional channel and creates an open
					invitation to it. Their public key is attached to the invitation.
				</li>
				<li>
					The invitation recipient accepts the channel invite and generates a
					private/public key pair for it locally.
				</li>
				<li>
					The invitation recipient uses their private key and the channel
					creator's public key to encrypt message data and sends the encrypted
					message data with their public key. The channel creator then uses
					their private key and the invitation recipient's public key to
					generate a key which in turn can be used to decrypt the message data.
				</li>
			</ul>
			<p>
				Note that although the public keys have been sent between the two
				parties, ConfiChannel leaves the private keys only on the device
				they were created on. Just like when using public/private key encryption
				for bidirectional channels, this makes it theoretically impossible for
				any party in between the sender and receiver of messages in
				unidirectional channels (including ConfiChannel servers) to read the
				content of the messages.
			</p>
		</div>
	</>
}

export default SecurityInformation;
