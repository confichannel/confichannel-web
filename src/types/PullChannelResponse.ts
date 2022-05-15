import { EncryptionMode } from "./EncryptionMode";

export type PullChannelResponse = {
	encryptionMode: EncryptionMode;
	updateTimestamp: number;
	e2eEncryptedValue?: string;
	e2eEncryptedValueIv?: string;
	e2eEncryptedValueSalt?: string;
	senderPublicKey?: JsonWebKey;
}
