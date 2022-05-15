import { ChannelType } from "../pages/NewChannelPage";
import { ChannelEncryptedMessage } from "./ChannelEncryptedMessage";
import { EncryptionMode } from "./EncryptionMode";

export type ChannelCreatePayload = {
	channelType: ChannelType;
	encryptionMode?: EncryptionMode;
	message?: ChannelEncryptedMessage;
};
