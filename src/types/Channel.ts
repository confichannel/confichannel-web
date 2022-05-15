import { ChannelType } from "../pages/NewChannelPage";

export type Channel = {
	id: string;
	storageKey: string;
	name?: string;
	channelType: ChannelType;
	friendlyName?: string;
	valueBase64?: null | string;
	sortOrder?: number;
	encryptedValueBase64?: null | string;
	encryptKeyBase64: string;
	passcodeBase64: string;
	creationTimestamp: number;
	updateTimestamp: number;
	privateKey: JsonWebKey;
	recipientPublicKey?: JsonWebKey;
	createdByThisDevice?: boolean;
};
