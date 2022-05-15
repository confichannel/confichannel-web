export class ApiError extends Error {
	public status?: number;

	constructor(message?: any, opts?: {
		status?: number;
	}) {
		super(message);
		this.status = opts?.status;
	}
}
