import React, {
	CSSProperties,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState
} from 'react';
import { extractChannelIdFromPath } from '../helpers/extractChannelIdFromPath';
import { NavigationContext } from '../components/ConfiApp';
import QRCode from 'qrcode.react';
import copyToClipboard from 'copy-to-clipboard';
import { deviceIdStorageKey, webAppBase } from '../config';
import { AppMessage, AppMessageType } from '../types/AppMessage';
import { Channel } from '../types/Channel'
import { EncryptionMode } from '../types/EncryptionMode';
import {
	decryptPublicPrivateKey,
	decryptSharedKey,
	encryptWithPassword,
	encryptWithPrivatePublicKey,
	getEchdPublicKeyFromPrivateKey,
	validateEchdPublicKey
} from '../helpers/e2eEncryption';
import { PullChannelResponse } from '../types/PullChannelResponse';
import { ChannelMessageUpdatePayload } from '../types/ChannelMessageUpdatePayload';
import { useStoreActions, useStoreState } from '../core/confiAppStore';
import AppLink from '../components/AppLink';
import { apiRequest } from '../core/apiRequest';
import { Buffer } from 'buffer';
import { ChannelInviteListItem } from '../types/ChannelInviteListItem';
import { SecurityTip } from '../components/SecurityTip';
import { emptyAppMessage } from '../core/emptyAppMessage';

function ChannelPage() {
	const history = useContext(NavigationContext);
	const channelId = extractChannelIdFromPath(history.location.pathname);
	const historyState = (history.location?.state as any);
	const isNewChannel = !!(historyState && historyState.isNewChannel);
	const autoGetMessage = !!(historyState && historyState.autoGetMessage);
	const justAcceptedInvite = !!(historyState && historyState.justAcceptedInvite);
	const {
		deviceToken,
		activeSubscriptionId,
		channelsMap
	} = useStoreState(state => state);
	const {
		setDeviceToken,
		removeChannelLocally,
		updateChannelLocally,
	} = useStoreActions(actions => actions);
	const channel = channelsMap[channelId!]!;
	const [isRequestingValue, setIsRequestingValue] = useState(false);
	const [resultMessage, setResultMessage] = useState<AppMessage>(emptyAppMessage);
	const [value, setValue] = useState('');
	const [inviteRequestType, setInviteRequestType] = useState<false | 'link' | 'qrcode'>(false);
	const [password, setPassword] = useState('');
	const [isEncrypted, setIsEncrypted] = useState(false);
	const [encryptedValue, setEncryptedValue] = useState<string>();
	const [encryptedValueIv, setEncryptedValueIv] = useState<string>();
	const [encryptedValueSalt, setEncryptedValueSalt] = useState<string>();
	const [isDeleting, setIsDeleting] = useState(false);
	const [valuePlaceholder, setValuePlaceholder] = useState('');
	const [justCopiedValue, setJustCopiedValue] = useState(false);
	const [isSettingFriendlyName, setIsSettingFriendlyName] = useState(false);
	const [newFriendlyName, setNewFriendlyName] = useState(channel.friendlyName || '');
	const [qrCodeLink, setQrCodeLink] = useState('');
	const [skipCheckForPublicKey, setSkipCheckForPublicKey] = useState(false);
	const [hasOutstandingInvite, setHasOutstandingInvite] = useState(false);
	const [invites, setInvites] = useState<ChannelInviteListItem[]>();
	const [recipientJustAcceptedInvite, setRecipientJustAcceptedInvite] = useState(false);
	const [hideNewChannelMessage, setHideNewChannelMessage] = useState(false);
	const [inviteResultMessage, setInviteResultMessage] = useState<AppMessage>(emptyAppMessage);
	const didAutoGetMessage = useRef(false);
	const didGetInvites = useRef(false);
	const didCheckForOutstandingInvites = useRef(false);
	const textareaContainerRef = useRef<HTMLDivElement>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
	const [animationCanvasStyle, setAnimationCanvasStyle] = useState<CSSProperties>({
		display: 'none',
	});
	const [animationBackgroundStyle, setAnimationBackgroundStyle] = useState<CSSProperties>({});
	const [deliverySliderStyle, setDeliverySliderStyle] = useState<CSSProperties>({});
	const [encryptionSliderStyle, setEncryptionSliderStyle] = useState<CSSProperties>({});
	const [deliverySliderText, setDeliverySliderText] = useState('');
	const [encryptionSliderText, setEncryptionSliderText] = useState('');
	const isUnidirectionReceiver = channel.channelType === 'unidirectional' && !channel.recipientPublicKey;
	const isUnidirectionSender = channel.channelType === 'unidirectional' && !!channel.recipientPublicKey;

	const newChannelUsesPasswordButItIsInsufficient =
		!!password && password.length < 10;

	const characterLimit = !!activeSubscriptionId ? 1000000 : 10000;

	const checkForNewToken = useCallback((res: Response) => {
		const newToken = res.headers.get('x-confi-token');
		if (newToken) {
			window.localStorage.setItem(deviceIdStorageKey, newToken);
			setDeviceToken(newToken);
		}
	}, [setDeviceToken]);

	const fetchInvites = useCallback(() => {
		const getInvites = async () => {
			try {
				setInviteResultMessage(emptyAppMessage);
				const invites = await apiRequest(`/channels/${channel.id}/invites`, {
					passcode: channel.passcodeBase64,
					deviceToken,
					checkForNewToken
				}) as ChannelInviteListItem[];
				if (!Array.isArray(invites)) {
					throw new Error(`Invalid invites list returned`)
				}
				invites.sort(
					(a, b) => new Date(b.creationTimestamp).valueOf() -
						new Date(a.creationTimestamp).valueOf()
				)
				setInvites(invites);
			} catch (err) {
				console.error(err);
				setInviteResultMessage({
					type: AppMessageType.Error,
					message: 'Error encountered while fetching channel invites',
				})
			}
		}
		getInvites();
	}, [channel.id, channel.passcodeBase64, checkForNewToken, deviceToken]);

	const deleteInvite = useCallback((inviteId: string) => {
		const doDeleteInvites = async () => {
			try {
				setInviteResultMessage(emptyAppMessage);
				await apiRequest(`/channels/${channel.id}/invites/${inviteId}`, {
					passcode: channel.passcodeBase64,
					deviceToken,
					checkForNewToken,
					method: 'DELETE',
				});
				setInvites(invites?.slice().filter(invite => invite.id !== inviteId))
			} catch (err) {
				console.error(err);
				setInviteResultMessage({
					type: AppMessageType.Error,
					message: 'Error encountered while deleting invite',
				})
			}
		}
		doDeleteInvites();
	}, [channel.id, channel.passcodeBase64, checkForNewToken, deviceToken, invites])

	useEffect(() => {
		if (deviceToken && channel.createdByThisDevice && !didGetInvites.current) {
			didGetInvites.current = true;
			fetchInvites()
		}
	}, [channel.createdByThisDevice, deviceToken, fetchInvites]);

	const maybeClearInviteResultMessage = useCallback(() => {
		if (
			resultMessage.message.startsWith('A link to share this channel has been copied to your clipboard') ||
			resultMessage.message.startsWith('Point a camera at the QR code below')
		) {
			setResultMessage(emptyAppMessage);
		}
	}, [resultMessage.message]);

	const fetchTempRecipientKeys = useCallback(() => {
		// TODO: replace polling with web sockets
		const doCheckForPublicKeys = async () => {
			try {
				const tempPublicKeysResponse = await apiRequest(`/channels/${channel.id}/tempPublicKeys`, {
					method: 'POST',
					passcode: channel.passcodeBase64,
					deviceToken,
					checkForNewToken,
				}) as {
					publicKeys: JsonWebKey[]
				};
				const tempPublicKeys = tempPublicKeysResponse && tempPublicKeysResponse.publicKeys;
				if (!Array.isArray(tempPublicKeys) || !tempPublicKeys.length) {
					return;
				}
				if (tempPublicKeys.length !== 1) {
					throw new Error(`Only expected 1 public key but got ${tempPublicKeys.length}`);
				}
				const recipientPublicKey = tempPublicKeys[0];
				validateEchdPublicKey(recipientPublicKey);
				updateChannelLocally(Object.assign({}, channel, {
					recipientPublicKey
				} as Partial<Channel>));
				setHideNewChannelMessage(true);
				setRecipientJustAcceptedInvite(true);
				maybeClearInviteResultMessage()
			} catch (err: any) {
				console.error(err);
				setSkipCheckForPublicKey(true);
				setResultMessage({
					type: AppMessageType.Error,
					message: 'Error encountered while checking for recipient public key',
				})
			}
		};
		doCheckForPublicKeys();
	}, [channel, checkForNewToken, deviceToken, maybeClearInviteResultMessage, updateChannelLocally]);

	useEffect(() => {
		if (channel.channelType === 'bidirectional' && !channel.recipientPublicKey && hasOutstandingInvite && !skipCheckForPublicKey) {
			let checkForPublicKeyIntervalId: any = setInterval(() => {
				if (channel.recipientPublicKey) {
					clearInterval(checkForPublicKeyIntervalId);
					checkForPublicKeyIntervalId = null;
					return;
				}
				fetchTempRecipientKeys();
			}, 6600);
			return () => {
				if (checkForPublicKeyIntervalId) {
					clearInterval(checkForPublicKeyIntervalId);
					checkForPublicKeyIntervalId = null;
				}
			}
		}
	}, [channel.channelType, channel.recipientPublicKey, fetchTempRecipientKeys, hasOutstandingInvite, skipCheckForPublicKey]);

	useEffect(() => {
		if (didCheckForOutstandingInvites.current) {
			return;
		}
		didCheckForOutstandingInvites.current = true;
		async function doCheckForOutstandingInvite() {
			if (channel.channelType === 'bidirectional' && !channel.recipientPublicKey) {
				try {
					const outstandingInviteFlagResponse = await apiRequest(`/channels/${channel.id
						}/outstandingInviteFlag`, {
						passcode: channel.passcodeBase64,
						deviceToken,
						checkForNewToken
					}) as {
						hasOutstandingInvite: boolean
					};
					if (outstandingInviteFlagResponse.hasOutstandingInvite) {
						setHasOutstandingInvite(true);
					}
				} catch (err) {
					console.error(err);
					setResultMessage({
						type: AppMessageType.Error,
						message: 'Error encountered while checking for outstanding invites'
					})
				}
			}
		}
		doCheckForOutstandingInvite();
	}, [channel.channelType, channel.id, channel.passcodeBase64, channel.recipientPublicKey, checkForNewToken, deviceToken])

	const pullValue = useCallback(() => {
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

		async function doPullValue() {
			try {
				setIsEncrypted(false);
				setIsRequestingValue(true);
				setResultMessage(emptyAppMessage);
				const resChannel = await apiRequest(`/channels/${channel.id}`, {
					passcode: channel.passcodeBase64,
					deviceToken,
					checkForNewToken,
				}) as PullChannelResponse;
				textAreaHeight = textareaContainerRef.current!.getBoundingClientRect().height + 5;
				setDeliverySliderText('📥 Message retrieved');
				setAnimationBackgroundStyle({
					transform: `translate(0, -${textAreaHeight}px)`,
					transition: 'transform .7s',
				});
				setDeliverySliderStyle({
					transform: `translate(0, 0)`,
					transition: 'transform .7s',
				})
				setEncryptionSliderStyle({
					transform: `translate(0, -${textAreaHeight}px)`,
					transition: 'transform .7s',
				})
				setEncryptionSliderText('🔓 Message decrypted');
				setAnimationCanvasStyle({ display: 'flex' });
				animationId1 = setTimeout(() => {
					setAnimationBackgroundStyle({
						transform: `translate(0, 0)`,
						transition: 'transform .7s',
					})
				}, 1);
				if (resChannel.updateTimestamp !== channel.updateTimestamp) {
					updateChannelLocally(Object.assign({}, channel, {
						updateTimestamp: resChannel.updateTimestamp
					}));
				}
				let resultMessage: AppMessage | undefined;
				let noMessageFound = false;
				let newValue = '';
				if (
					resChannel.encryptionMode === 'end-to-end-shared' &&
					resChannel.e2eEncryptedValue
				) {
					if (!resChannel.e2eEncryptedValueIv || !resChannel.e2eEncryptedValueSalt) {
						throw new Error(`Invalid values for decryption`);
					}
					const valueBase64 = await decryptSharedKey(
						resChannel.e2eEncryptedValue,
						channel.encryptKeyBase64,
						resChannel.e2eEncryptedValueIv,
						resChannel.e2eEncryptedValueSalt
					);
					const value = Buffer.from(valueBase64, 'base64').toString('utf8');
					newValue = value;
					resultMessage = {
						type: AppMessageType.Success,
						message: 'Message retrieved and decrypted'
					};
				} else if (
					resChannel.encryptionMode === 'end-to-end-password' &&
					resChannel.e2eEncryptedValue
				) {
					newValue = '';
					setValuePlaceholder('This value is encrypted with password');
					setIsEncrypted(true);
					setEncryptedValue(resChannel.e2eEncryptedValue);
					setEncryptedValueIv(resChannel.e2eEncryptedValueIv);
					setEncryptedValueSalt(resChannel.e2eEncryptedValueSalt);
					resultMessage = {
						type: AppMessageType.Info,
						message: 'Please enter a password to decrypt the message',
					};
				} else if (
					resChannel.encryptionMode === 'end-to-end-private-public' &&
					channel.channelType === 'bidirectional' &&
					resChannel.e2eEncryptedValue
				) {
					if (!channel.recipientPublicKey && hasOutstandingInvite) {
						const tempPublicKeysResponse = await apiRequest(`/channels/${channel.id}/tempPublicKeys`, {
							method: 'POST',
							passcode: channel.passcodeBase64,
							deviceToken,
							checkForNewToken,
						}) as {
							publicKeys: JsonWebKey[]
						};
						const tempPublicKeys = tempPublicKeysResponse && tempPublicKeysResponse.publicKeys;
						if (!Array.isArray(tempPublicKeys) || !tempPublicKeys.length) {
							return;
						}
						if (tempPublicKeys.length !== 1) {
							throw new Error(`Only expected 1 public key but got ${tempPublicKeys.length}`);
						}
						const recipientPublicKey = tempPublicKeys[0];
						validateEchdPublicKey(recipientPublicKey);
						updateChannelLocally(Object.assign({}, channel, {
							recipientPublicKey
						} as Partial<Channel>));
						const jitRecipientPublicKey = recipientPublicKey;
						if (!resChannel.e2eEncryptedValueIv) {
							throw new Error('Invalid values for encryption');
						}
						const valueBase64 = await decryptPublicPrivateKey(
							resChannel.e2eEncryptedValue,
							resChannel.e2eEncryptedValueIv,
							channel.privateKey,
							jitRecipientPublicKey
						);
						const value = Buffer.from(valueBase64, 'base64').toString('utf8');
						newValue = value;
						resultMessage = {
							type: AppMessageType.Success,
							message: 'Message retrieved and decrypted',
						};
					} else if (channel.recipientPublicKey) {
						if (!resChannel.e2eEncryptedValueIv) {
							throw new Error('Invalid values for decryption');
						}
						const valueBase64 = await decryptPublicPrivateKey(
							resChannel.e2eEncryptedValue,
							resChannel.e2eEncryptedValueIv,
							channel.privateKey,
							channel.recipientPublicKey
						);
						const value = Buffer.from(valueBase64, 'base64').toString('utf8');
						newValue = value;
						resultMessage = {
							type: AppMessageType.Success,
							message: 'Message retrieved and decrypted',
						};
					} else {
						resultMessage = {
							type: AppMessageType.Error,
							message: 'Do not know sender\'s public key',
						}
					}
				} else if (
					resChannel.encryptionMode === 'end-to-end-private-public' &&
					channel.channelType === 'unidirectional' &&
					resChannel.e2eEncryptedValue
				) {
					if (resChannel.senderPublicKey) {
						if (!resChannel.e2eEncryptedValueIv) {
							throw new Error('Invalid values for decryption')
						}
						const valueBase64 = await decryptPublicPrivateKey(
							resChannel.e2eEncryptedValue,
							resChannel.e2eEncryptedValueIv,
							channel.privateKey,
							resChannel.senderPublicKey
						);
						const value = Buffer.from(valueBase64, 'base64').toString('utf8');
						newValue = value;
						setResultMessage({
							type: AppMessageType.Success,
							message: 'Message retrieved and decrypted',
						});
					} else {
						resultMessage = {
							type: AppMessageType.Error,
							message: 'Do not know sender\'s public key',
						}
					}
				} else {
					resultMessage = {
						type: AppMessageType.Info,
						message: 'The channel has no message at the moment',
					}
					noMessageFound = true;
					setDeliverySliderText('📪 No message in channel');
				}
				if (
					resultMessage && (
						resultMessage.type === AppMessageType.Success ||
						resultMessage.type === AppMessageType.Info
					)
				) {
					animationId2 = setTimeout(() => {
						setValue(newValue);
						if (noMessageFound) {
							setEncryptionSliderStyle({
								'display': 'none'
							})
							setAnimationBackgroundStyle({
								transform: `translate(0, ${textAreaHeight}px`,
								transition: 'transform .7s',
							});
							setIsRequestingValue(false);
							animationId4 = setTimeout(() => {
								if (resultMessage) {
									setResultMessage(resultMessage);
								}
								setDeliverySliderStyle({});
								setEncryptionSliderStyle({});
								setAnimationBackgroundStyle({});
								setAnimationCanvasStyle({ display: 'none' });
								cleanup();
							}, 800);
						} else {
							setDeliverySliderStyle({
								transform: `translate(0,${textAreaHeight}px`,
								transition: 'transform .7s',
							});
							setEncryptionSliderStyle({
								transform: 'translate(0, 0)',
								transition: 'transform .7s',
							});
							animationId3 = setTimeout(() => {
								setAnimationBackgroundStyle({
									transform: `translate(0, ${textAreaHeight}px`,
									transition: 'transform .7s',
								});
								setIsRequestingValue(false);
								animationId4 = setTimeout(() => {
									if (resultMessage) {
										setResultMessage(resultMessage);
									}
									setDeliverySliderStyle({});
									setEncryptionSliderStyle({});
									setAnimationBackgroundStyle({});
									setAnimationCanvasStyle({ display: 'none' });
									cleanup();
								}, 800);
							}, 800);
						}
					}, 800);
				} else {
					setValue(newValue);
					setIsRequestingValue(false);
					cleanup();
					if (resultMessage) {
						setResultMessage(resultMessage);
					} else {
						setResultMessage({
							type: AppMessageType.Error,
							message: 'Something went wrong getting the message',
						});
					}
				}
			} catch (err: any) {
				console.error(err);
				setIsRequestingValue(false);
				cleanup();
				setResultMessage({
					type: AppMessageType.Error,
					message: err.message,
				})
			}
		}
		doPullValue();

		return cleanup();
	}, [channel, deviceToken, checkForNewToken, updateChannelLocally, hasOutstandingInvite]);

	const pushValue = useCallback(() => {
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

		async function doPushValue() {
			try {
				setIsRequestingValue(true);
				setResultMessage(emptyAppMessage);
				let jitRecipientPublicKey: JsonWebKey | undefined = undefined;
				if (channel.channelType === 'bidirectional' && !channel.recipientPublicKey && hasOutstandingInvite) {
					const tempPublicKeysResponse = await apiRequest(`/channels/${channel.id}/tempPublicKeys`, {
						method: 'POST',
						passcode: channel.passcodeBase64,
						deviceToken,
						checkForNewToken,
					}) as {
						publicKeys: JsonWebKey[]
					};
					const tempPublicKeys = tempPublicKeysResponse && tempPublicKeysResponse.publicKeys;
					if (Array.isArray(tempPublicKeys) && tempPublicKeys.length) {
						if (tempPublicKeys.length !== 1) {
							throw new Error(`Only expected 1 public key but got ${tempPublicKeys.length}`);
						}
						const recipientPublicKey = tempPublicKeys[0];
						validateEchdPublicKey(recipientPublicKey);
						jitRecipientPublicKey = recipientPublicKey;
					}
				}
				const encryptionMode: EncryptionMode =
					value
						? password
							? 'end-to-end-password'
							: (channel.recipientPublicKey || jitRecipientPublicKey)
								? 'end-to-end-private-public'
								: 'end-to-end-shared'
						: 'none';
				const requestBody: ChannelMessageUpdatePayload = { encryptionMode }
				if (value) {
					let encryptResult: undefined | {
						salt: string | undefined;
						encryptedValue: string;
						iv: string;
					};
					switch (encryptionMode) {
						case 'end-to-end-password':
							encryptResult = await encryptWithPassword(
								Buffer.from(value, 'utf8').toString('base64'),
								Buffer.from(password, 'utf8').toString('base64')
							);
							break;
						case 'end-to-end-shared':
							encryptResult = await encryptWithPassword(
								Buffer.from(value, 'utf8').toString('base64'),
								channel.encryptKeyBase64
							);
							break;
						case 'end-to-end-private-public':
							if (!channel.recipientPublicKey) {
								throw new Error(`Attempted to use public/private key encryption without a public key`);
							}
							encryptResult = await encryptWithPrivatePublicKey(
								Buffer.from(value, 'utf8').toString('base64'),
								channel.privateKey,
								channel.recipientPublicKey || jitRecipientPublicKey
							)
							break;
						case 'none':
							encryptResult = undefined;
							break;
						default:
							throw new Error(`Invalid encryption type: ${encryptionMode}`);
					}
					requestBody.message = encryptResult
						? {
							cipher: encryptResult.encryptedValue,
							iv: encryptResult.iv,
							salt: encryptResult.salt,
						}
						: undefined;
					if (channel.channelType === 'unidirectional') {
						requestBody.senderPublicKey = getEchdPublicKeyFromPrivateKey(
							channel.privateKey
						);
					}
				}
				setDeliverySliderText(value ? '📤 Message sent' : '📪 Empty message sent');
				setEncryptionSliderText('🔒 Message encrypted');
				textAreaHeight = textareaContainerRef.current!.getBoundingClientRect().height + 5;
				setAnimationBackgroundStyle({
					transform: `translate(0, ${textAreaHeight}px)`,
					transition: 'transform .7s',
				});
				setDeliverySliderStyle({
					transform: value ? `translate(0, ${textAreaHeight}px)` : 'translate(0, 0)',
					transition: 'transform .7s',
				})
				setEncryptionSliderStyle({
					display: value ? undefined : 'none',
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
				const resChannel = (await apiRequest(`/channels/${channel.id}`, {
					passcode: channel.passcodeBase64,
					deviceToken,
					checkForNewToken,
					method: 'POST',
					body: requestBody,
				})) as { updateTimestamp: number };
				const updatePackage = {
					updateTimestamp: resChannel.updateTimestamp,
				} as Partial<Channel>;
				if (jitRecipientPublicKey) {
					updatePackage.recipientPublicKey = jitRecipientPublicKey;
				}
				updateChannelLocally(Object.assign({}, channel, updatePackage));
				animationId2 = setTimeout(() => {
					if (!value) {
						setAnimationBackgroundStyle({
							'transform': `translate(0, -${textAreaHeight}px`,
							transition: 'transform .7s',
						});
						setEncryptionSliderStyle({ display: 'none' });
						setIsRequestingValue(false);
						animationId4 = setTimeout(() => {
							setAnimationCanvasStyle({ display: 'none' });
							setResultMessage({
								type: AppMessageType.Success,
								message: encryptionMode !== 'none'
									? 'Message encrypted and sent'
									: 'Empty channel message sent',
							});
							cleanup()
						}, 800);
					} else {
						setDeliverySliderStyle({
							transform: 'translate(0, 0)',
							transition: 'transform .7s',
						});
						setEncryptionSliderStyle({
							transform: `translate(0,-${textAreaHeight}px)`,
							transition: 'transform .7s',
						})
						setValue('');
						animationId3 = setTimeout(() => {
							setAnimationBackgroundStyle({
								'transform': `translate(0, -${textAreaHeight}px`,
								transition: 'transform .7s',
							});
							setEncryptionSliderStyle({ display: 'none' });
							setIsRequestingValue(false);
							animationId4 = setTimeout(() => {
								setAnimationCanvasStyle({ display: 'none' });
								setResultMessage({
									type: AppMessageType.Success,
									message: encryptionMode !== 'none'
										? 'Message encrypted and sent'
										: 'Empty channel message sent',
								});
								cleanup()
							}, 800);
						}, 800);
					}
				}, 800);
			} catch (err: any) {
				console.error(err);
				setIsRequestingValue(false);
				cleanup();
				setResultMessage({
					type: AppMessageType.Error,
					message: err.message,
				});
			}
		}
		doPushValue();

		return cleanup();
	}, [channel, hasOutstandingInvite, password, value, deviceToken, checkForNewToken, updateChannelLocally]);

	const copyValue = useCallback(() => {
		let timeoutId: any;
		setResultMessage(emptyAppMessage)
		if (copyToClipboard(value)) {
			setJustCopiedValue(true);
			timeoutId = setTimeout(() => {
				setJustCopiedValue(false)
			}, 3000);
			return () => {
				clearTimeout(timeoutId);
			}
		}
	}, [value, setJustCopiedValue, setResultMessage]);

	const createInvite = useCallback((inviteType: 'link' | 'qrcode') => {
		async function doCreateInvite() {
			try {
				setInviteRequestType(inviteType);
				setResultMessage(emptyAppMessage);
				const keyOfEncryptedEncryptKeyBufferBase64 = Buffer.from(window.crypto.getRandomValues(
					new Uint8Array(32)
				)).toString('base64');
				const encryptedEncryptKey = await encryptWithPassword(
					channel.encryptKeyBase64,
					keyOfEncryptedEncryptKeyBufferBase64
				);
				const body = await apiRequest(`/channels/${channel.id}/invites`, {
					method: 'POST',
					passcode: channel.passcodeBase64,
					deviceToken,
					checkForNewToken,
					body: {
						encryptedEncryptKey: `${encryptedEncryptKey.iv
							}.${encryptedEncryptKey.salt
							}.${encryptedEncryptKey.encryptedValue
							}`,
						originPublicKey: getEchdPublicKeyFromPrivateKey(channel.privateKey)
					}
				});
				const link = `${webAppBase}/i/?i=${
					// The invite id
					encodeURIComponent(body.id)
					}&p=${
					// The invite passcode
					encodeURIComponent(body.passcode)
					}#${
					// An encrypted key used for end-to-end encryption of channel content
					encodeURIComponent(keyOfEncryptedEncryptKeyBufferBase64)
					}`;
				if (inviteType === 'link') {
					copyToClipboard(link);
					setResultMessage({
						type: AppMessageType.Success,
						message: `A link to share this channel has been copied to your clipboard. It works just once and expires in 48 hours.`,
					});
				} else if (inviteType === 'qrcode') {
					setResultMessage({
						type: AppMessageType.Success,
						message: `Point a camera at the QR code below to share invite to this channel. It works just once and expires in 48 hours.`,
					});
					setQrCodeLink(link);
				}
				setHasOutstandingInvite(true);
				fetchInvites();
			} catch (err: any) {
				console.error(err);
				setResultMessage({
					type: AppMessageType.Error,
					message: err.message,
				});
			} finally {
				setInviteRequestType(false);
			}
		}
		doCreateInvite();
	}, [
		channel.encryptKeyBase64,
		channel.id,
		channel.passcodeBase64,
		channel.privateKey,
		checkForNewToken,
		fetchInvites,
		deviceToken
	]);

	const decryptValue = useCallback(() => {
		async function doDecryptValue() {
			try {
				if (!password) {
					throw new Error(`Enter a password to decrypt the value`)
				}
				if (!(encryptedValue && encryptedValueIv && encryptedValueSalt)) {
					throw new Error('Not all required data is available to decrypt value')
				}
				const value = await decryptSharedKey(
					encryptedValue,
					Buffer.from(password, 'utf8').toString('base64'),
					encryptedValueIv,
					encryptedValueSalt
				)
				setValue(Buffer.from(value, 'base64').toString('utf8'));
				setIsEncrypted(false);
				setResultMessage({
					type: AppMessageType.Success,
					message: 'Value decrypted',
				});
			} catch (err: any) {
				console.error(err);
				setResultMessage({
					type: AppMessageType.Error,
					message: ((
						err.message.startsWith('Not all required data') ||
						err.message.startsWith('Enter a password to')
					) && err.message) || 'Invalid password'
				})
			}
		}
		doDecryptValue();
	}, [encryptedValue, encryptedValueIv, encryptedValueSalt, password]);

	const handlePushClick = useCallback(() => {
		pushValue();
	}, [pushValue]);

	const handlePullClick = useCallback(() => {
		pullValue();
	}, [pullValue]);

	useEffect(() => {
		if (autoGetMessage && typeof pullValue === 'function' && !didAutoGetMessage.current) {
			didAutoGetMessage.current = true;
			pullValue();
		}
	}, [autoGetMessage, pullValue])

	const handleDeleteClick = useCallback(() => {
		if (!window.confirm('Are you sure you want to delete the channel?')) {
			return;
		}
		async function doDeleteChannel() {
			try {
				setIsDeleting(true);
				setResultMessage(emptyAppMessage);
				await apiRequest(`/channels/${channel.id}`, {
					method: 'DELETE',
					passcode: channel.passcodeBase64,
					deviceToken,
					checkForNewToken,
					noErrorOnStatuses: [404, 403]
				})
				removeChannelLocally(channel);
				history.push('/', {
					isChannelDeleted: true,
				});
			} catch (err: any) {
				console.error(err);
				setResultMessage({
					type: AppMessageType.Error,
					message: err.message
				});
				setIsDeleting(false);
			}
		}
		doDeleteChannel();
	}, [channel, checkForNewToken, deviceToken, history, removeChannelLocally])

	return <div className='ChannelItemWrapper'>
		{isNewChannel && !hideNewChannelMessage && <div className={
			`AppMessage ${AppMessageType[AppMessageType.Success]
			} mt-0_5 mb-0_5`}>
			This is the new channel. Name it, share it, and use it to {
				channel.channelType === 'bidirectional' ? 'send and receive' : (
					isUnidirectionReceiver ? 'receive' : 'send'
				)
			} confidential messages.
		</div>}
		{justAcceptedInvite && <div className={
			`AppMessage ${AppMessageType[AppMessageType.Success]
			} mt-0_5 mb-0_5`}>
			Invitation to channel accepted. You can now send and receive encrypted
			messages.
		</div>}
		{recipientJustAcceptedInvite && <div className={
			`AppMessage ${AppMessageType[AppMessageType.Success]
			} mt-0_5 mb-0_5`}>
			Invitation to this channel has been accepted.
		</div>}
		<form
			className='ChannelItem'
			key={channel.id}
			onSubmit={(event) => event.preventDefault()}
		>
			<div>
				<div className='positionRelative'>
					<label className='ChannelValueLabel' htmlFor='channel-value'>
						<strong>Channel message{
							isUnidirectionReceiver ? ' (read only)' : (isUnidirectionSender ? ' (send only)' : '')
						}</strong>
					</label>
					<span className='bottomRight'><small><button
						className='linkbutton'
						onClick={() => {
							setValue('');
						}}
					>Clear message input</button></small></span>
				</div>
				<div ref={textareaContainerRef} className='ChannelValueContainer'>
					<textarea
						ref={textareaRef}
						id='channel-value'
						maxLength={characterLimit}
						className='Textarea Opacity-1 Transition-Opacity'
						value={value}
						rows={5}
						placeholder={valuePlaceholder}
						disabled={isUnidirectionReceiver}
						onChange={(event) => {
							const newText = event.target.value;
							setValue(newText)
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
				<div className='text-align-right'>
					{!isUnidirectionReceiver && <small>
						{`${value.length.toLocaleString()}/${characterLimit.toLocaleString()} characters`}
						{!activeSubscriptionId && ' • '}
						{!activeSubscriptionId && <AppLink href='/purchase-subscription'>
							Send more with ConfiChannel Plus
						</AppLink>}
					</small>}
				</div>
			</div>
			<div>
				<div className='text-align-right'>
					<small>
						<button className='linkbutton'
							onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
						>{showAdvancedOptions ? 'Hide' : 'Show'} advanced options</button>
					</small>
				</div>
			</div>
			{isEncrypted && <div className='mt-0_5'>
				<div className='mb-0_5'>
					<label
						className='ValuePasswordLabel'
						htmlFor={`${channel.id}-password`}
					>
						<strong>
							Enter the password for this value:
						</strong>{' '}
						{ // Suggest password? And guidance on good passwords.
						}
						<small>This value uses end-to-end encryption</small>
					</label>
				</div>
				<div>
					<input
						id={`${channel.id}-password`}
						type='password'
						className='TextInput'
						value={password}
						autoComplete={'off'}
						onChange={(event) => {
							setPassword(event.target.value)
						}}
					/>
				</div>
				<div className='mt-0_5'>
					<button
						className='button'
						onClick={decryptValue}>Decrypt Value</button>
				</div>
			</div>}
			{showAdvancedOptions && <>
				<div className='mt-0_5'>
					<div className='mb-0_5'>
						<label
							className='ValuePasswordLabel'
							htmlFor={`${channel.id}-password`}
						>
							<strong>Password</strong>{' '}
							<small>Optional. If provided, the message recipient will need to
								provide this password to decrypt and view the channel message. A
								password can be set each time a message is sent in the channel.
								If it a password is not set, default encryption will be used.
							</small>
						</label>
					</div>
					<div>
						<input
							id={`${channel.id}-password`}
							type='password'
							className='TextInput'
							value={password}
							minLength={10}
							autoComplete={'off'}
							onChange={(event) => {
								setPassword(event.target.value)
							}}
						/>
					</div>
				</div>
				<div className='mt-0_5'>
					{newChannelUsesPasswordButItIsInsufficient && <div className={`AppMessage ${AppMessageType[AppMessageType.Info]}`}>
						Please ensure the password it is at least 10 characters long.
					</div>}
				</div>
			</>}
			<div className={`AppMessage ${AppMessageType[resultMessage.type]} mt-0_5 mb-0_5`}>
				{resultMessage.message}
			</div>
			{qrCodeLink && !channel.recipientPublicKey && <div className='QrCodeSectionWrapper'>
				<div className='QrCodeWrapper'><QRCode value={qrCodeLink} size={200} /></div>
				<div><button
					className='button'
					onClick={() => {
						setQrCodeLink('')
						setResultMessage(emptyAppMessage)
					}}>Close QR Code</button></div>
			</div>}
			<div className='ChannelControlButtons'>
				{!isUnidirectionSender && <button
					className={`button${isUnidirectionReceiver ? ' TwoColumnButton' : ''}`}
					disabled={isDeleting || isRequestingValue}
					onClick={handlePullClick}>⇩ Get Message</button>}
				{!isUnidirectionReceiver && <button
					className={`button${isUnidirectionSender ? ' TwoColumnButton' : ''}`}
					disabled={isDeleting || isRequestingValue}
					onClick={handlePushClick}>⇧ Send Message</button>}
				{!channel.recipientPublicKey && <button
					className='button'
					disabled={isDeleting || !!inviteRequestType}
					onClick={() => createInvite('link')}>Copy Invite to Channel</button>}
				{!channel.recipientPublicKey && <button
					className='button'
					disabled={isDeleting || !!inviteRequestType}
					onClick={() => createInvite('qrcode')}>Create QR Code for Channel</button>}
				<button
					className='button'
					disabled={isDeleting || isRequestingValue || !!inviteRequestType}
					onClick={handleDeleteClick}>Delete Channel</button>
				<button
					className='button'
					onClick={copyValue}>{justCopiedValue ? 'Copied ✔' : 'Copy Message'}</button>
			</div>
			<div className='ChannelItemHeader mt-1_5'>
				<div className='ChannelNameWrapper'>
					<h3 className='ChannelName'>
						{channel.friendlyName || channel.name}
						{!!channel.friendlyName && <>
							{' '}
							<small>({channel.name})</small>
						</>}<br />
						{!isSettingFriendlyName && <>
							<button
								className="linkbutton ChangeChannelNameButton"
								onClick={() => setIsSettingFriendlyName(true)}
							>{!!channel.friendlyName ? 'Change name' : 'Set channel name'}</button>
						</>}
						{isSettingFriendlyName && <>
							<input
								value={newFriendlyName}
								onChange={(event) => setNewFriendlyName(event.target.value)} />{' '}
							<button
								className='linkbutton'
								onClick={() => {
									setIsSettingFriendlyName(false);
									updateChannelLocally(Object.assign({}, channel, {
										friendlyName: newFriendlyName
									}))
								}}
							>Update</button>
						</>}
					</h3>
				</div>
				<div className='ChannelItemMeta'>
					<small>
						Channel Id: {channel.id}<br />
						Default encryption type: {
							channel.channelType === 'unidirectional' ?
								'Public/private key' : (
									channel.recipientPublicKey ?
										'Public/private key' :
										'Shared secret'
								)}<br />
						Channel type: {channel.channelType === 'bidirectional' ? 'Bidirectional' : 'Unidirectional'}<br />
						Updated: {new Date(channel.updateTimestamp * 1000).toLocaleString()}<br />
						Created: {new Date(channel.creationTimestamp * 1000).toLocaleString()}
					</small>
				</div>
			</div>
			{channel.createdByThisDevice && <>
				<div className='positionRelative mt-1_5'>
					<h3>Invites to this channel</h3>
					{!channel.recipientPublicKey && <div className='bottomRight'>
						<button
							className='linkbutton'
							onClick={() => fetchInvites()}
						>Refresh</button>
					</div>}
				</div>
				{!!inviteResultMessage.message.trim() && <div className={`AppMessage ${AppMessageType[inviteResultMessage.type]} mt-0_5 mb-0_5`}>
					{inviteResultMessage.message}
				</div>}
				{!channel.recipientPublicKey && (!invites || !invites.length) && <div className='mt-0_5'>
					No open invites to this channel.
				</div>}
				{!!channel.recipientPublicKey && <div className='mt-0_5'>
					An invitation to this channel has been accepted. (Other open invites
					have been deleted).
				</div>}
				{!channel.recipientPublicKey && invites && !!invites.length && <div className='InvitesTableContainer mt-0_5'>
					<table className='mt-0_5'>
						<thead>
							<tr>
								<th>Invite id</th>
								<th>Created</th>
								<th>Expires</th>
								<th>Type</th>
								{channel.channelType === 'unidirectional' ? <th>Accepted Count</th> : undefined}
								<th>Action</th>
							</tr>
						</thead>
						<tbody>
							{invites.map(i => <tr key={i.id}>
								<td>{i.id}</td>
								<td>{new Date(i.creationTimestamp * 1000).toLocaleString()}</td>
								<td>{new Date(i.expires * 1000).toLocaleString()}</td>
								<td>{i.channelType === 'unidirectional' ? 'Multi-use' : 'Single-use'}</td>
								{channel.channelType === 'unidirectional' ? <td>{i.inviteAcceptsCount}</td> : undefined}
								<td><button
									className='linkbutton'
									onClick={() => deleteInvite(i.id)}
								>Delete</button></td>
							</tr>)}
						</tbody>
					</table>
				</div>}
			</>}
			<SecurityTip />
		</form>
	</div>
}

export default ChannelPage;
