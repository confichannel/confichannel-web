import React, { useState } from 'react';
import AppLink from '../components/AppLink';
import ChannelList from '../components/ChannelList';
import { useStoreState } from '../core/confiAppStore';

const MAX_CHANNELS_NO_SUBSCRIPTION = 20;
const MAX_CHANNELS_WITH_SUBSCRIPTION = 1000;

function ChannelsPage() {
	const {
		channels,
		activeSubscriptionId,
	} = useStoreState(state => state);
	const [keyword, setKeyword] = useState('');

	const lowercaseKeyword = keyword.toLocaleLowerCase();
	const displayedChannels = !!keyword ? channels
		.filter(c => {
			if (!c) {
				return false
			}
			const nameIndex = c.name?.toLocaleLowerCase().indexOf(lowercaseKeyword);
			if (typeof nameIndex === 'number' && nameIndex >= 0) {
				return true;
			}
			const idIndex = c.id.toLocaleLowerCase().indexOf(lowercaseKeyword);
			if (idIndex >= 0) {
				return true;
			}
			const fNameIndex = c.friendlyName?.toLocaleLowerCase().indexOf(lowercaseKeyword);
			if (typeof fNameIndex === 'number' && fNameIndex >= 0) {
				return true;
			}
			return false;
		}) : channels;

	const channelLimit = !!activeSubscriptionId ? MAX_CHANNELS_WITH_SUBSCRIPTION : MAX_CHANNELS_NO_SUBSCRIPTION;
	const atChannelLimit = channels.length >= channelLimit;

	return <div className='ChannelListWrapper'>
		<div className='ChannelsHeader'>
			<div className='text-align-right'>
				{!atChannelLimit && <AppLink
					href="/new-channel">New Channel <b>+</b>
				</AppLink>}
				{atChannelLimit && <AppLink
					href="/purchase-subscription"
				>Upgrade To Create More Channels</AppLink>}
			</div>
			<h2>Channels</h2>
			{!!channels.length && channels.length >= 2 && <div>
				Search:{' '}
				<input
					value={keyword}
					onChange={event => setKeyword(event.target.value)}
				/>
			</div>}
		</div>
		{!channels.length && <div><em>No channels yet. Create a channel.</em></div>}
		{!!channels.length && !displayedChannels.length && <div><em>No channels found.</em></div>}
		{!!channels.length && !!displayedChannels.length && <ChannelList
			channels={displayedChannels}
		/>}
		{!activeSubscriptionId && !!channels.length && <div className='mt-1_5'><small>
			{channels.length.toLocaleString()}/{channelLimit} channels
            {' • '}
			<AppLink href='/purchase-subscription'>Create more channels with ConfiChannel Plus</AppLink>
		</small></div>}
		{!!activeSubscriptionId && !!channels.length && <div className='mt-1_5'><small>
			{channels.length.toLocaleString()}/{channelLimit} channels
          </small></div>}
		{!!channels.length && <div className='mt-1_5'>
			Note: channels are automatically deleted 1 year after their last activity.
          </div>}
	</div>
}

export default ChannelsPage;
