import { ChannelType } from "../pages/NewChannelPage";

export type ChannelInviteListItem = {
	id: string;
	channelId: string;
	channelType: ChannelType;
	creationTimestamp: number;
	inviteAcceptsCount: number;
	expires: number;
};
