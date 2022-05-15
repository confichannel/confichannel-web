import React from 'react';
import ChannelInfoItem from './ChannelInfoItem';
import { Channel } from '../types/Channel';

function ChannelList(props: {
	channels: Channel[]
}) {
	const { channels } = props;
	return <>
		{channels.map(channel => <ChannelInfoItem
			key={channel.id}
			channel={channel} />)}
	</>
}

export default ChannelList;
