import { ChannelType } from "../pages/NewChannelPage";
import { AppMessage } from "./AppMessage";

export type InviteInfo = {
	id: string;
	passcode: string;
	status: AppMessage;
	channelType?: ChannelType;
	channelId?: string;
	keyToDecryptChannelKey?: string;
}
