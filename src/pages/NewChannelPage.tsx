import React, { CSSProperties, useCallback, useContext, useRef, useState } from 'react';
import AppLink from '../components/AppLink';
import { deviceIdStorageKey } from '../config';
import { encryptWithPassword } from '../helpers/e2eEncryption';
import { useStoreActions, useStoreState } from '../core/confiAppStore';
import { AppMessage, AppMessageType } from '../types/AppMessage';
import { Channel } from '../types/Channel';
import { ChannelCreatePayload } from '../types/CreateChannelPayload';
import { NavigationContext } from '../components/ConfiApp';
import { apiRequest } from '../core/apiRequest';
import { Buffer } from 'buffer';
import InfoText from '../components/InfoText';
import { SecurityTip } from '../components/SecurityTip';

export type ChannelType = 'bidirectional' | 'unidirectional';

function NewChannelPage() {
	const {
		deviceToken,
		activeSubscriptionId,
	} = useStoreState(state => state);
	const {
		setDeviceToken,
		saveChannelLocally,
	} = useStoreActions((actions) => actions);
	const [keyPassword, setNewChannelE2ePasscode] = useState('');
	const [newChannelValue, setNewChannelValue] = useState('');
	const [newChannelName, setNewChannelName] = useState('');
	const [isRequestingNewChannel, setIsRequestingNewChannel] = useState(false);
	const [newChannelResultMessage, setNewChannelResultMessage] = useState<AppMessage>();
	const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
	const [channelType, setChannelType] = useState<ChannelType>('bidirectional');
	const history = useContext(NavigationContext);
	const textareaContainerRef = useRef<HTMLDivElement>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const [animationCanvasStyle, setAnimationCanvasStyle] = useState<CSSProperties>({
		display: 'none',
	});
	const [animationBackgroundStyle, setAnimationBackgroundStyle] = useState<CSSProperties>({});
	const [deliverySliderStyle, setDeliverySliderStyle] = useState<CSSProperties>({});
	const [encryptionSliderStyle, setEncryptionSliderStyle] = useState<CSSProperties>({});
	const [deliverySliderText, setDeliverySliderText] = useState('');
	const [encryptionSliderText, setEncryptionSliderText] = useState('');

	const characterLimit = !!activeSubscriptionId ? 1000000 : 10000;
	const newChannelUsesPasswordButItIsInsufficient =
		!!keyPassword && keyPassword.length < 10;

	const checkForNewToken = useCallback((res: Response) => {
		const newToken = res.headers.get('x-confi-token');
		if (newToken) {
			window.localStorage.setItem(deviceIdStorageKey, newToken);
			setDeviceToken(newToken);
		}
	}, [setDeviceToken]);

	const handleGoToChannel = useCallback((newChannelId: string) => {
		function goToChannel() {
			history.push(`/channels/${newChannelId}`, {
				isNewChannel: true,
			});
			window.scrollTo(0, 0);
		}
		goToChannel();
	}, [history])

	const handleAddChannel = useCallback(() => {
		let animationId1: any, animationId2: any,
			animationId3: any, animationId4: any;
		let textAreaHeight: number;

		function cleanup() {
			if (animationId1) {
				clearTimeout(animationId1);
				animationId1 = null;
			}
			if (animationId2) {
				clearTimeout(animationId2);
				animationId2 = null;
			}
			if (animationId3) {
				clearTimeout(animationId3);
				animationId3 = null;
			}
			if (animationId4) {
				clearTimeout(animationId4);
				animationId4 = null;
			}
		}

		async function doAddChannel() {
			try {
				setIsRequestingNewChannel(true);
				setNewChannelResultMessage(undefined);
				const encryptionMode = keyPassword ? 'end-to-end-password' : 'end-to-end-shared';
				const keyPasswordBase64 = keyPassword && Buffer.from(keyPassword, 'utf8').toString('base64');
				// FAQ: only as good as browser security: up-to-date, only as good as device/browse
				// environment, be wary of extensions
				const encryptKey = window.crypto.getRandomValues(new Uint8Array(24));
				const encryptKeyBase64 = Buffer.from(encryptKey).toString('base64');
				const channelKeyPair = await window.crypto.subtle.generateKey(
					{
						name: "ECDH",
						namedCurve: "P-384",
					},
					true,
					['deriveKey']
				);
				if (!channelKeyPair.privateKey || !channelKeyPair.publicKey) {
					throw new Error(`Unable to generate device key pair`);
				}
				const exportedPrivateKey = await window.crypto.subtle.exportKey('jwk', channelKeyPair.privateKey);
				const encryptResult = (newChannelValue && (await encryptWithPassword(
					Buffer.from(newChannelValue, 'utf8').toString('base64'),
					encryptionMode === 'end-to-end-password' ? keyPasswordBase64 : encryptKeyBase64,
				))) || undefined;
				const requestBody: ChannelCreatePayload = {
					encryptionMode: encryptResult
						? encryptionMode
						: 'none',
					channelType,
					message: channelType === 'bidirectional' ?
						encryptResult ?
							{
								cipher: encryptResult.encryptedValue,
								iv: encryptResult.iv,
								salt: encryptResult.salt
							} :
							undefined
						: undefined
				};
				if (newChannelValue && encryptResult) {
					setDeliverySliderText('📤 Message sent');
					setEncryptionSliderText('🔒 Message encrypted');
					textAreaHeight = textareaContainerRef.current!.getBoundingClientRect().height + 5;
					setAnimationBackgroundStyle({
						transform: `translate(0, ${textAreaHeight}px)`,
						transition: 'transform .7s',
					});
					setDeliverySliderStyle({
						transform: `translate(0, ${textAreaHeight}px)`,
						transition: 'transform .7s',
					})
					setEncryptionSliderStyle({
						transform: `translate(0, 0)`,
						transition: 'transform .7s',
					})
					animationId1 = setTimeout(() => {
						setAnimationBackgroundStyle({
							transform: `translate(0, 0)`,
							transition: 'transform .7s',
						})
					}, 1);
					setAnimationCanvasStyle({ display: 'flex' });
					animationId1 = setTimeout(() => {
						setAnimationBackgroundStyle({
							transform: `translate(0, 0)`,
							transition: 'transform .7s',
						})
					}, 1);
				}
				const newChannel = (await apiRequest('/channels', {
					method: 'POST',
					body: requestBody,
					deviceToken,
					checkForNewToken,
				})) as Channel;
				newChannel.encryptKeyBase64 = encryptKeyBase64;
				newChannel.storageKey = `channel_${newChannel.id}`;
				newChannel.sortOrder = Date.now();
				newChannel.privateKey = exportedPrivateKey;
				newChannel.createdByThisDevice = true;
				if (newChannelName) {
					newChannel.friendlyName = newChannelName;
				}
				setIsRequestingNewChannel(false);
				saveChannelLocally(newChannel);
				if (newChannelValue && encryptResult) {
					animationId2 = setTimeout(() => {
						setDeliverySliderStyle({
							transform: 'translate(0, 0)',
							transition: 'transform .7s',
						});
						setEncryptionSliderStyle({
							transform: `translate(0,-${textAreaHeight}px)`,
							transition: 'transform .7s',
						})
						animationId3 = setTimeout(() => {
							setAnimationCanvasStyle({ display: 'none' });
							cleanup()
							handleGoToChannel(newChannel.id);
						}, 1000);
					}, 800);
				} else {
					handleGoToChannel(newChannel.id);
				}
			} catch (err: any) {
				console.error(err)
				cleanup();
				setIsRequestingNewChannel(false);
				setNewChannelResultMessage({
					type: AppMessageType.Error,
					message: err.message
				});
			}
		}

		doAddChannel();

		return cleanup();
	}, [keyPassword, newChannelValue, channelType, deviceToken, checkForNewToken, newChannelName, saveChannelLocally, handleGoToChannel]);

	return <>
		<div className="NewChannelWrapper">
			<h2 className='NewChannelHeading'>Create a channel, share encrypted
				messages which can be viewed just once
			</h2>
			<form onSubmit={
				(event) => event.preventDefault()
			}>
				<div className='mt-0_5'>
					<div className='mt-1_5'>
						<div className='mb-0_5'>
							<label htmlFor='newInviteChannelName'>
								<strong>Channel name</strong>{' '}
								<small>Optional.{' '}</small>
								<InfoText>
									<small>The name should be used to remind you who
										you've shared the channel with; for example, "Adrian". This
										name is not sent to the server, it is only stored on your
										device.
									</small>
								</InfoText>
							</label>
						</div>
						<div><input
							id='newChannelName'
							className='TextInput'
							placeholder="e.g. The name of the person you will send messages to"
							value={newChannelName}
							onChange={(event) => {
								setNewChannelName(event.target.value)
							}}
						/></div>
					</div>
					{channelType === 'bidirectional' && <>
						<div className='mt-1 mb-0_5'>
							<label htmlFor='newChannelValue'>
								<strong>Initial message</strong>{' '}
								<small>Optional.{' '}</small>
								<InfoText>
									<small>Messages in channels can be read only once. Once a
										message is pulled from a channel, the channel will be empty until
										another message is pushed.</small>
								</InfoText>
							</label>
						</div>
						<div ref={textareaContainerRef} className='ChannelValueContainer'>
							<textarea
								ref={textareaRef}
								id='newChannelValue'
								placeholder='E.g. the password is dolphins'
								className='Textarea Opacity-1 Transition-Opacity'
								rows={2}
								value={newChannelValue}
								maxLength={characterLimit}
								onChange={(event) => {
									setNewChannelValue(event.target.value)
								}} />
							<div
								className='ChannelValueAnimationCanvas'
								style={animationCanvasStyle}
							>
								<div
									className='ChannelValueAnimationBackground'
									style={animationBackgroundStyle}
								>
									<div className='ChannelValueAnimation'>
										<div
											className='ChannelValueAnimationSlider Transition-Opacity-Transform'
											style={encryptionSliderStyle}
										>
											<div>{encryptionSliderText}</div>
										</div>
										<div
											className='ChannelValueAnimationSlider Transition-Opacity-Transform'
											style={deliverySliderStyle}
										>
											<div>{deliverySliderText}</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</>}
				</div>
				{channelType === 'bidirectional' && <div className='text-align-right'>
					<small>
						{`${newChannelValue.length.toLocaleString()}/${characterLimit.toLocaleString()} characters`}
						{!activeSubscriptionId && ' • '}
						{!activeSubscriptionId && <AppLink href='/purchase-subscription'>
							Send more with ConfiChannel Plus
						</AppLink>}
					</small>
				</div>}
				{channelType === 'bidirectional' && !!newChannelValue.length && !keyPassword && <div className='text-align-right'>
					<small>💡 It may be more secure to wait for the channel invitation to be accepted before sharing messages. <AppLink href='/security'>More info</AppLink></small>
				</div>}
				<div className='mt-0_5'>
					<div className='text-align-right'>
						<button className='linkbutton'
							onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
						>{showAdvancedOptions ? 'Hide' : 'Show'} advanced options</button>
					</div>
				</div>
				{showAdvancedOptions && <>
					<div className='mt-1_5'>
						<div className='mb-0_5 ChannelTypeSelection'>
							<div
								className={`ChannelTypeSelectionOption${channelType === 'bidirectional' ? ' selected' : ''}`}
								onClick={(event) => {
									event.stopPropagation();
									setChannelType('bidirectional');
								}}
							>
								<input
									type='radio'
									name='channelType'
									id='channelTypeBidirectional'
									checked={channelType === 'bidirectional'}
									onChange={(event) => {
										setChannelType(event.target.checked ? 'bidirectional' : 'unidirectional')
									}} />
								<label htmlFor='channelTypeBidirectional'>
									<strong>Bidirectional</strong><br />
									Send encrypted messages back and forth with one other person
								</label>
							</div>
							<div
								className={`ChannelTypeSelectionOption${channelType === 'unidirectional' ? ' selected' : ''}`}
								onClick={(event) => {
									event.stopPropagation();
									setChannelType('unidirectional');
								}}
							>
								<input
									type='radio'
									name='channelType'
									id='channelTypeUnidirectional'
									checked={channelType === 'unidirectional'}
									onChange={(event) => {
										setChannelType(event.target.checked ? 'unidirectional' : 'bidirectional')
									}} />
								<label htmlFor='channelTypeUnidirectional'>
									<strong>Unidirectional</strong><br />
									Receive one-way encrypted messages from one or more people sent to you
								</label>
							</div>
						</div>
					</div>
					{channelType === 'bidirectional' && <>
						<div className='mt-1_5'>
							<div className='mb-0_5'>
								<label htmlFor='newChannelPassword'>
									<strong>Password</strong>{' '}
									<small>Optional. Recipient will need to know it to view the message.{' '}</small>
									<InfoText>
										<small>If provided, this password is required to decrypt
											and view the channel message, otherwise end-to-end encryption is
											used without requiring an extra password. A password can be set
											each time a message is sent in the channel.</small>
									</InfoText>
								</label>
							</div>
							<div>
								<input
									type='password'
									id='newChannelPassword'
									className='TextInput'
									placeholder='random characters go here'
									value={keyPassword}
									minLength={10}
									autoComplete={'off'}
									onChange={(event) => {
										setNewChannelE2ePasscode(event.target.value)
									}}
								/>
							</div>
						</div>
						<div className='mt-0_5'>
							{newChannelUsesPasswordButItIsInsufficient && <div className={`AppMessage ${AppMessageType[AppMessageType.Info]} mb-0_5`}>
								Please ensure the password it is at least 10 characters long.
							</div>}
						</div>
					</>}
				</>}
				{newChannelResultMessage && <div className='mt-0_5'>
					<div className={`AppMessage ${AppMessageType[newChannelResultMessage.type]} mb-0_5`}>{newChannelResultMessage.message}</div>
				</div>}
				<div className='mt-1_5'>
					<button
						className='button'
						disabled={isRequestingNewChannel || newChannelUsesPasswordButItIsInsufficient}
						onClick={handleAddChannel}>Create Channel</button>
				</div>
				<div className='mt-2'>
					<small>
						🤖 Technical note: initial messages are encrypted using <a
							href="https://en.wikipedia.org/wiki/Symmetric-key_algorithm">
						symmetric-keys</a> (aka shared-key). Once an invite to the channel
						is accepted, then messages are encrypted using <a
							href="https://en.wikipedia.org/wiki/Public-key_cryptography">
						public-key</a> cryptography, which addresses some known downsides
						of symmetric-key encryption. More info on the <AppLink
							href='/security'>security</AppLink> page.
					</small>
				</div>
				<SecurityTip />
			</form>
		</div>
	</>
}

export default NewChannelPage;
