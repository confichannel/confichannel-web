export enum AppMessageType {
	Error,
	Info,
	Success,
};

export type AppMessage = {
	type: AppMessageType,
	message: string,
};
