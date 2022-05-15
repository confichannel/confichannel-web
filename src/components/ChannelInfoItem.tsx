import React from 'react';
import { Channel } from '../types/Channel';
import AppLink from './AppLink';

function ChannelInfoItem(props: { channel: Channel }) {
	const { channel } = props;
	const channelPath = `/channels/${channel.id}`;
	return <div className='ChannelInfoItemWrapper'>
		<AppLink href={channelPath}
			className='ChannelInfoItemLink'
		>
			<div>
				<div className='ChannelInfoItemName'>
					<b>{channel.friendlyName || channel.name}</b>
						{!!channel.friendlyName && <>
							{' '}
							<small>({channel.name})</small>
						</>}
				</div>
				<div className='ChannelInfoIdWrapper'>
					<small>Channel Id: {channel.id}</small>
				</div>
				<div className='ChannelInfoMetaWrapper'>
					<small>
						Updated: {new Date(channel.updateTimestamp * 1000).toLocaleString()}<br />
					</small>
				</div>
			</div>
			<div>
				<div className='ChannelInfoItemLinkIcon'>➔</div>
			</div>
		</AppLink>
	</div>
}

export default ChannelInfoItem;
