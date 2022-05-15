import { EncryptionMode } from "./EncryptionMode";

export type UpdateChannelPayload = {
	encryptionMode?: EncryptionMode;
	encryptedValue?: string;
	encryptedValueIv?: string;
	encryptedValueSalt?: string;
}
