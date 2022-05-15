import React, { useCallback, useContext, useEffect, useState } from 'react';
import { deviceIdStorageKey } from '../config';
import { decryptSharedKey } from '../helpers/e2eEncryption';
import { useStoreActions, useStoreState } from '../core/confiAppStore';
import { AppMessage, AppMessageType } from '../types/AppMessage';
import { Channel } from '../types/Channel';
import { InviteInfo } from '../types/InviteInfo';
import { NavigationContext } from '../components/ConfiApp';
import { apiRequest } from '../core/apiRequest';
import { ChannelType } from './NewChannelPage';
import InfoText from '../components/InfoText';
import TouAgreementModal from '../components/TouAgreementModal';

function AcceptInvitationPage() {
	const {
		deviceToken,
		inviteInfo,
		touAgreement,
	} = useStoreState(state => state);
	const {
		setDeviceToken,
		saveChannelLocally,
		setInviteInfo,
	} = useStoreActions((actions) => actions);
	const history = useContext(NavigationContext);
	const [inviteAcceptResult, setInviteAcceptResult] = useState<AppMessage>();
	const [isAcceptingInvite, setIsAcceptingInvite] = useState(false);
	const [newInviteChannelName, setNewInviteChannelName] = useState('');
	const [isReadyForName, setIsReadyForName] = useState(false);
	const [validatedInviteId, setValidatedInviteId] = useState('');
	const [hideTouAgreement, setHideTouAgreement] = useState(false);

	const checkForNewToken = useCallback((res: Response) => {
		const newToken = res.headers.get('x-confi-token');
		if (newToken) {
			window.localStorage.setItem(deviceIdStorageKey, newToken);
			setDeviceToken(newToken);
		}
	}, [setDeviceToken]);

	useEffect(() => {
		let loadedInviteInfo: InviteInfo;
		function rememberInviteToken() {
			if (!window.location.search) {
				return;
			}
			const queryParams = new URLSearchParams(window.location.search);
			const inviteId = queryParams.get('i');
			const invitePasscode = queryParams.get('p');
			// Invite key comes from the fragment. Unlike URL params, major browsers
			// do not send the fragment to the server. When the server can't see
			// the invite key it is nigh on impossible it will be able to determine
			// the channel key which is also generated device-side and kept off the
			// server but the channel key is sent encrypted by the invite key to the
			// server as part of invites.
			const keyToDecryptChannelKey = decodeURIComponent(
				new URL(window.location.toString()).hash.substring(1)
			);
			if (inviteId && invitePasscode && keyToDecryptChannelKey) {
				loadedInviteInfo = {
					id: inviteId,
					passcode: invitePasscode,
					status: {
						type: AppMessageType.Info,
						message: 'Validating...',
					},
					keyToDecryptChannelKey: keyToDecryptChannelKey,
				}
				setInviteInfo(loadedInviteInfo);
				history.replace('/', null);
			}
		}
		rememberInviteToken();
	}, [history, setInviteInfo, touAgreement]);

	useEffect(() => {
		async function doValidateInvite() {
			try {
				if (!touAgreement) {
					return;
				}
				if (!inviteInfo || !inviteInfo.id) {
					return;
				}
				if (validatedInviteId === inviteInfo.id) {
					return;
				}
				if (!deviceToken) {
					return;
				}
				setValidatedInviteId(inviteInfo.id)
				const {
					channelType
				} = await apiRequest(`/channels/invites/${inviteInfo.id}`, {
					deviceToken,
					checkForNewToken,
				}) as {
					channelType: ChannelType
				}
				setInviteInfo(Object.assign({}, inviteInfo, {
					channelType,
					status: {
						type: AppMessageType.Success,
						message: 'Valid channel invite'
					}
				}))
				setIsReadyForName(true);
			} catch (err: any) {
				console.error(err);
				setInviteInfo(Object.assign({}, inviteInfo, {
					status: {
						type: AppMessageType.Error,
						message: err.message
					}
				}));
			}
		}
		doValidateInvite();
	}, [checkForNewToken, deviceToken, inviteInfo, setInviteInfo, validatedInviteId, touAgreement]);

	const handleGoToChannel = useCallback((newChannelId: string) => {
		function goToChannel() {
			history.push(`/channels/${newChannelId}`, {
				autoGetMessage: inviteInfo?.channelType === 'bidirectional',
				justAcceptedInvite: true,
			});
			window.scrollTo(0, 0);
		}
		goToChannel();
	}, [history, inviteInfo?.channelType]);

	const acceptInvite = useCallback(() => {
		async function doAcceptInvite() {
			try {
				setIsReadyForName(false);
				setIsAcceptingInvite(true);
				setInviteAcceptResult(undefined);
				if (!inviteInfo || !inviteInfo.keyToDecryptChannelKey) {
					throw new Error('Tried to accept invalid invitation')
				}
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
				const exportedPublicKey = await window.crypto.subtle.exportKey('jwk', channelKeyPair.publicKey);
				const {
					channelPasscode: passcodeBase64,
					channelName: name,
					channelType,
					encryptedEncryptKey,
					creationTimestamp,
					updateTimestamp,
					channelId,
					originPublicKey,
				} = (await apiRequest(`/channels/invites/${inviteInfo.id}`, {
					method: 'POST',
					passcode: inviteInfo.passcode,
					deviceToken,
					checkForNewToken,
					body: inviteInfo.channelType === 'unidirectional' ? {} : {
						receiverPublicKey: exportedPublicKey
					},
				})) as {
					channelId: string;
					channelName: string;
					channelPasscode: string;
					channelType: ChannelType;
					encryptedEncryptKey: string;
					creationTimestamp: number;
					updateTimestamp: number;
					originPublicKey: JsonWebKey;
				};
				if (!channelId) {
					throw new Error(`Error accepting invite: no channel id`)
				}
				const newChannelBase = {
					id: channelId,
					channelType,
					passcodeBase64,
					name,
					valueBase64: null,
					friendlyName: newInviteChannelName,
				}
				const [iv, salt, encryptedValue] = encryptedEncryptKey.split('.');
				const realChannelEncryptionKeyBase64 = await decryptSharedKey(
					encryptedValue,
					inviteInfo.keyToDecryptChannelKey,
					iv,
					salt
				);
				setIsAcceptingInvite(false);
				const newChannel: Channel = Object.assign({}, newChannelBase, {
					encryptKeyBase64: realChannelEncryptionKeyBase64,
					storageKey: `channel_${newChannelBase.id}`,
					creationTimestamp: creationTimestamp || (Date.now() / 1000),
					updateTimestamp: updateTimestamp || (Date.now() / 1000),
					sortOrder: Date.now(),
					privateKey: exportedPrivateKey,
					recipientPublicKey: originPublicKey,
					createdByThisDevice: false,
				} as Partial<Channel> & { storageKey: string }) as Channel;
				saveChannelLocally(newChannel);
				setInviteInfo(null);
				handleGoToChannel(newChannel.id);
			} catch (err: any) {
				console.error(err)
				setIsAcceptingInvite(false);
				setInviteAcceptResult({
					type: AppMessageType.Error,
					message: err.message
				})
			}
		}
		doAcceptInvite();
	}, [inviteInfo, deviceToken, checkForNewToken, newInviteChannelName, saveChannelLocally, setInviteInfo, handleGoToChannel]);

	return <>
		{!touAgreement && !hideTouAgreement && <TouAgreementModal 
			title='Your permission required to start using ConfiChannel'
			onDisagree={() => {
				setInviteInfo(Object.assign({}, inviteInfo, {
					status: {
						type: AppMessageType.Error,
						message: 'Cannot not accept invite without Terms of Use agreement'
					} as AppMessage
				}))
				setHideTouAgreement(true);
			}}
		/>}
		{!inviteInfo && <div className='InviteWrapper'>Invitation not found</div>}
		{!!inviteInfo && <div className='InviteWrapper'>
			<div className='Invite'>
				<h2>Accept Invite to Channel</h2>
				<div className='mb-0_5'>
					<div className='mb-0_5'><label htmlFor='newChannelName'>
						<strong>Channel name</strong>{' '}
						<InfoText>
							<small>Optional. The name should be used to remind you who shared
								the channel with you; for example, "Adrian". This name is not
								sent to the server, it is only stored on your device.</small>
						</InfoText>
					</label></div>
					<div><input
						id='newInviteChannelName'
						className='TextInput'
						disabled={!isReadyForName}
						placeholder="e.g. The name of the person who sent you the invite"
						value={newInviteChannelName}
						onChange={(event) => {
							setNewInviteChannelName(event.target.value)
						}}
					/></div>
				</div>
				{inviteInfo.status.type !== AppMessageType.Success && <div className={`AppMessage ${AppMessageType[inviteInfo.status.type]}`}>
					{inviteInfo.status.message}
				</div>}
				{inviteAcceptResult && <div className={`AppMessage ${AppMessageType[inviteAcceptResult.type]}`}>
					{inviteAcceptResult.message}
				</div>}
				{inviteInfo.status.type === AppMessageType.Success && inviteAcceptResult?.type !== AppMessageType.Success && <div>
					<button
						className='button'
						disabled={isAcceptingInvite}
						onClick={acceptInvite}>Accept Invite{
							inviteInfo.channelType === 'bidirectional' ?
								' and Get Message' :
								''}</button>
				</div>}
				{inviteInfo.status.type === AppMessageType.Success && inviteAcceptResult?.type === AppMessageType.Success && <div className='mt-0_5'>
					<button
						className='button'
						onClick={
						(event) => {
							event.preventDefault()
							setInviteInfo(null)
							history.push('/', {})
							window.scrollTo(0, 0)
						}
					}>Close &amp; go to channels</button>
				</div>}
				{!touAgreement && hideTouAgreement && <div className='mt-1'>
					<button
						className='button'
						onClick={() => {
							setHideTouAgreement(false)
							setInviteInfo(Object.assign({}, inviteInfo, {
								status: {
									type: AppMessageType.Info,
									message: 'Validating...',
								} as AppMessage
							}))
						}}
					>Try Again</button>
				</div>}
				<div className='mt-1_5 ChannelInviteMeta'>
					<div>Invite id: {inviteInfo.id}</div>
					{inviteInfo.channelType && <div className='mt-0_5'>
						Channel type: {inviteInfo.channelType && (
							inviteInfo.channelType === 'unidirectional' ?
								'Unidirectional' :
								'Bidirectional'
						)}{' '}
						{inviteInfo.channelType === 'unidirectional' && <InfoText>
							<small>
								You can send messages with this channel, but not receive messages.
							</small>
						</InfoText>}
						{inviteInfo.channelType === 'bidirectional' && <InfoText>
							<small>
								You can send and receive messages with this channel.
							</small>
						</InfoText>}
					</div>}
				</div>
			</div>
		</div>}
	</>
}

export default AcceptInvitationPage;
