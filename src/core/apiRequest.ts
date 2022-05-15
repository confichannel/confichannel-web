import { ApiError } from "./ApiError";
import { apiBase } from "../config";

const validRequestModes = ["cors", "navigate", "no-cors", "same-origin"];
const requestMode: RequestMode = (
	process.env.REACT_APP_API_CORS_MODE &&
	process.env.REACT_APP_API_CORS_MODE as RequestMode
) || 'cors';

if (!validRequestModes.includes(requestMode)) {
	throw new Error('Configured to use invalid request mode');
}

export async function apiRequest(pathQueryFragment: string, opts: {
	passcode?: string,
	deviceToken?: string,
	checkForNewToken?: (res: any) => any,
	method?: 'GET' | 'POST' | 'DELETE',
	body?: any,
	noErrorOnStatuses?: number[]
} = {}) {
	const {
		passcode,
		deviceToken,
		checkForNewToken,
		method,
		body,
		noErrorOnStatuses,
	} = opts
	const requestInit: RequestInit = {
		referrerPolicy: "origin",
		mode: requestMode,
	}
	const headers: any = {
		'Accept': 'application/json',
	}
	if (passcode) {
		headers['X-Confi-Passcode'] = passcode;
	}
	if (deviceToken) {
		headers['X-Confi-Token'] = deviceToken;
	}
	if (method) {
		requestInit.method = method;
	}
	if (method === 'POST') {
		headers['Content-Type'] = 'application/json';
	}
	if (body) {
		requestInit.body = JSON.stringify(body)
	}
	requestInit.headers = headers;
	const res = await fetch(`${apiBase}${pathQueryFragment}`, requestInit);
	if (res.status < 500 && checkForNewToken) {
		checkForNewToken(res);
	}
	if (!res.ok) {
		if (Array.isArray(noErrorOnStatuses) && noErrorOnStatuses.includes(res.status)) {
			return;
		}
		let errorText = '';
		try {
			const json = await res.json();
			if (json.message) {
				errorText = json.message;
			}
		} catch { }
		if (!errorText) {
			try {
				const text = await res.text();
				if (text) {
					errorText = text;
				}
			} catch { }
		}
		if (!errorText) {
			errorText = `${res.status} ${res.statusText}`.trim();
		}
		if (!errorText) {
			errorText = 'Unknown error';
		}
		throw new ApiError(errorText, {status: res.status})
	}
	const contentLength = res.headers.get('content-length');
	if (!contentLength || contentLength === '0') {
		// Valid response was returned but there's no content, so no need to attempt
		// json conversion.
		return;
	}
	const responseBody = await res.json();
	return responseBody;
}
