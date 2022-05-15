import {
	Action,
	action,
	computed,
	Computed,
	createStore,
	createTypedHooks,
	thunk,
	Thunk,
} from 'easy-peasy';
import { activeSubscriptionIdStorageKey } from '../config';
import { Channel } from '../types/Channel';
import { InviteInfo } from '../types/InviteInfo';
import { Subscription } from '../types/Subscription';

interface StoreModel {
	channels: Computed<StoreModel, Channel[]>,
	channelsMap: {
		[key: string]: Channel;
	};
	addChannel: Action<StoreModel, Channel>;
	updateChannel: Action<StoreModel, Channel>;
	removeChannel: Action<StoreModel, Channel>;
	saveChannelLocally: Thunk<StoreModel, Channel>;
	removeChannelLocally: Thunk<StoreModel, Channel>;
	subscriptions: Computed<StoreModel, Subscription[]>,
	subscriptionsMap: {
		[key: string]: Subscription;
	};
	addSubscription: Action<StoreModel, Subscription>;
	updateSubscription: Action<StoreModel, Subscription>;
	removeSubscription: Action<StoreModel, Subscription>;
	saveSubscriptionLocally: Thunk<StoreModel, Subscription>;
	removeSubscriptionLocally: Thunk<StoreModel, Subscription>;
	updateChannelLocally: Thunk<StoreModel, Channel>;
	activeSubscriptionId: string;
	touAgreement: undefined | boolean;
	setTouAgreement: Action<StoreModel, boolean | undefined>;
	setActiveSubscriptionId: Action<StoreModel, string>;
	saveActiveSubscriptionIdLocally: Thunk<StoreModel, string>;
	deviceToken: string;
	setDeviceToken: Action<StoreModel, string>;
	removeDeviceToken: Action<StoreModel>;
	showSubscriptionThankyou: boolean;
	setShowSubscriptionThankyou: Action<StoreModel, boolean>;
	inviteInfo: null | InviteInfo;
	setInviteInfo: Action<StoreModel, null | InviteInfo>;
}

export const otvAppStore = createStore<StoreModel>({
	touAgreement: false,
	setTouAgreement: action((state, touAgreement) => {
		state.touAgreement = touAgreement;
	}),
	channels: computed((state) => {
		const channels = Object.entries(state.channelsMap).map((a) => a[1]);
		channels.sort((a, b) => {
			return (b.sortOrder || 0) - (a.sortOrder || 0);
		});
		return channels;
	}),
	channelsMap: {},
	removeChannel: action((state, channel) => {
		delete state.channelsMap[channel.id];
	}),
	addChannel: action((state, channel) => {
		state.channelsMap[channel.id] = channel;
	}),
	updateChannel: action((state, channel) => {
		state.channelsMap[channel.id] = channel;
	}),
	saveChannelLocally: thunk(async (actions, channel) => {
		const channelStorageKey = `channel_${channel.id}`;
		localStorage.setItem(channelStorageKey, JSON.stringify(channel));
		actions.addChannel(channel);
	}),
	removeChannelLocally: thunk(async (actions, channel) => {
		if (channel.storageKey) {
			localStorage.removeItem(channel.storageKey)
		}
		actions.removeChannel(channel)
	}),
	updateChannelLocally: thunk(async (actions, channel) => {
		let storedRecipientPublicKey: JsonWebKey | undefined;
		if (channel.storageKey) {
			// Workaround to ensure recipient public keys do not get lost. In place
			// until bug causing public keys to go missing is found.
			try {
				const existingItemData = localStorage.getItem(channel.storageKey);
				if (existingItemData) {
					const existingItem = JSON.parse(existingItemData) as Channel;
					if (existingItem.recipientPublicKey) {
						storedRecipientPublicKey = existingItem.recipientPublicKey;
					}
				}
			} catch (err) {
				console.error(err);
			}
			if (!channel.recipientPublicKey) {
				channel.recipientPublicKey = storedRecipientPublicKey;
			}
			localStorage.setItem(channel.storageKey, JSON.stringify(channel));
		}
		actions.updateChannel(channel);
	}),
	deviceToken: '',
	setDeviceToken: action((state, deviceToken) => {
		state.deviceToken = deviceToken;
	}),
	removeDeviceToken: action((state) => {
		state.deviceToken = '';
	}),
	subscriptions: computed((state) => {
		const subscriptions = Object.entries(state.subscriptionsMap).map((s) => s[1]);
		return subscriptions;
	}),
	subscriptionsMap: {},
	removeSubscription: action((state, subscription) => {
		delete state.subscriptionsMap[subscription.id];
	}),
	addSubscription: action((state, subscription) => {
		state.subscriptionsMap[subscription.id] = subscription;
	}),
	updateSubscription: action((state, subscription) => {
		state.subscriptionsMap[subscription.id] = subscription;
	}),
	saveSubscriptionLocally: thunk(async (actions, subscription) => {
		const subscriptionStorageKey = `subscription_paypal_${subscription.id}`;
		localStorage.setItem(subscriptionStorageKey, JSON.stringify(subscription));
		actions.addSubscription(subscription);
	}),
	removeSubscriptionLocally: thunk(async (actions, subscription) => {
		if (subscription.storageKey) {
			localStorage.removeItem(subscription.storageKey);
		}
		actions.removeSubscription(subscription);
	}),
	activeSubscriptionId: '',
	setActiveSubscriptionId: action((state, activeSubscriptionId) => {
		state.activeSubscriptionId = activeSubscriptionId;
	}),
	saveActiveSubscriptionIdLocally: thunk(async (actions, activeSubscriptionId) => {
		localStorage.setItem(activeSubscriptionIdStorageKey, activeSubscriptionId);
		actions.setActiveSubscriptionId(activeSubscriptionId)
	}),
	showSubscriptionThankyou: false,
	setShowSubscriptionThankyou: action((state, showSubscriptionThankyou) => {
		state.showSubscriptionThankyou = showSubscriptionThankyou;
	}),
	inviteInfo: null,
	setInviteInfo: action((state, inviteInfo) => {
		state.inviteInfo = inviteInfo;
	}),
});

const typedHooks = createTypedHooks<StoreModel>();

export const useStoreActions = typedHooks.useStoreActions;
export const useStoreDispatch = typedHooks.useStoreActions;
export const useStoreState = typedHooks.useStoreState;
