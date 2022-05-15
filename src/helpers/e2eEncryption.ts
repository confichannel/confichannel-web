import { Buffer } from 'buffer';

export function decodeBase64AsArrayBuffer(base64String: string) {
	return Uint8Array.from(Buffer.from(base64String, 'base64'))
}

const pbkdf2Iterations = 10000;

/**
 * https://github.com/mdn/dom-examples/blob/master/web-crypto/derive-key/pbkdf2.js
 * @param inValueBase64 string in base64
 * @param inPasswordBase64 string in base64
 */
export async function encryptWithPassword(inValueBase64: string, inPasswordBase64: string) {
	const value = Buffer.from(inValueBase64, 'base64');
	const password = Buffer.from(inPasswordBase64, 'base64');
	const userKeyInput = await window.crypto.subtle.importKey(
		'raw',
		password,
		{ name: 'PBKDF2' },
		false,
		['deriveBits', 'deriveKey']
	);
	const salt = window.crypto.getRandomValues(new Uint8Array(16));
	const key = await window.crypto.subtle.deriveKey(
		{
			name: 'PBKDF2',
			salt,
			iterations: pbkdf2Iterations,
			hash: 'SHA-256',
		},
		userKeyInput,
		{
			name: 'AES-GCM',
			length: 256,
		},
		true,
		['encrypt', 'decrypt'],
	);
	const iv = window.crypto.getRandomValues(new Uint8Array(12));
	const cipherText = await window.crypto.subtle.encrypt(
		{
			name: 'AES-GCM',
			iv,
		},
		key,
		value
	);
	return {
		salt: Buffer.from(salt).toString('base64'),
		iv: Buffer.from(iv).toString('base64'),
		encryptedValue: Buffer.from(cipherText).toString('base64'),
	}
}

export async function encryptWithPrivatePublicKey(inValueBase64: string, privateKey: JsonWebKey, publicKey: JsonWebKey) {
	const ourPrivateKey = await window.crypto.subtle.importKey('jwk', privateKey, {
		name: 'ECDH',
		namedCurve: 'P-384'
	}, false, ['deriveKey']);
	const theirPublicKey = await window.crypto.subtle.importKey('jwk', publicKey, {
		name: 'ECDH',
		namedCurve: 'P-384',
	}, false, []);
	const sharedSecretKey = await window.crypto.subtle.deriveKey(
		{
			name: 'ECDH',
			public: theirPublicKey,
		},
		ourPrivateKey,
		{
			name: 'AES-GCM',
			length: 256,
		},
		false,
		['encrypt']
	);
	const iv = window.crypto.getRandomValues(new Uint8Array(12));
	const value = Buffer.from(inValueBase64, 'base64');
	const cipherText = await window.crypto.subtle.encrypt(
		{
			name: 'AES-GCM',
			iv
		},
		sharedSecretKey,
		value,
	);
	return {
		salt: undefined,
		iv: Buffer.from(iv).toString('base64'),
		encryptedValue: Buffer.from(cipherText).toString('base64'),
	}
}

export async function decryptPublicPrivateKey(
	inEncryptedValueBase64: string,
	inIvBase64: string,
	privateKey: JsonWebKey,
	publicKey: JsonWebKey,
) {
	const ourPrivateKey = await window.crypto.subtle.importKey('jwk', privateKey, {
		name: 'ECDH',
		namedCurve: 'P-384'
	}, false, ['deriveKey']);
	const theirPublicKey = await window.crypto.subtle.importKey('jwk', publicKey, {
		name: 'ECDH',
		namedCurve: 'P-384',
	}, false, []);
	const sharedSecretKey = await window.crypto.subtle.deriveKey(
		{
			name: 'ECDH',
			public: theirPublicKey,
		},
		ourPrivateKey,
		{
			name: 'AES-GCM',
			length: 256,
		},
		false,
		['decrypt']
	);
	const encryptedValue = decodeBase64AsArrayBuffer(inEncryptedValueBase64);
	const iv = decodeBase64AsArrayBuffer(inIvBase64);
	const decrypted: ArrayBuffer = await window.crypto.subtle.decrypt(
		{
			name: 'AES-GCM',
			iv,
		},
		sharedSecretKey,
		encryptedValue
	);
	return Buffer.from(decrypted).toString('base64');
}

// https://github.com/mdn/dom-examples/blob/master/web-crypto/derive-key/pbkdf2.js
/**
 * @param inEncryptedValueBase64 base64 encoded string
 * @param inPasswordBase64 base64 encoded string
 * @param inIvBase64 base64 encoded string
 * @param inSaltBase64 base64 encoded string
 * @returns 
 */
export async function decryptSharedKey(
	inEncryptedValueBase64: string,
	inPasswordBase64: string,
	inIvBase64: string,
	inSaltBase64: string
) {
	const encryptedValue = decodeBase64AsArrayBuffer(inEncryptedValueBase64);
	const iv = decodeBase64AsArrayBuffer(inIvBase64);
	const salt = decodeBase64AsArrayBuffer(inSaltBase64);
	const password = Buffer.from(inPasswordBase64, 'base64');
	const userKeyInput = await window.crypto.subtle.importKey(
		'raw',
		password,
		{ name: 'PBKDF2' },
		false,
		['deriveBits', 'deriveKey']
	);
	const key = await window.crypto.subtle.deriveKey(
		{
			name: 'PBKDF2',
			salt,
			iterations: pbkdf2Iterations,
			hash: 'SHA-256',
		},
		userKeyInput,
		{
			name: 'AES-GCM',
			length: 256,
		},
		true,
		['decrypt'],
	);
	const decrypted: ArrayBuffer = await window.crypto.subtle.decrypt(
		{
			name: 'AES-GCM',
			iv,
		},
		key,
		encryptedValue
	);
	return Buffer.from(decrypted).toString('base64');
}

export function getEchdPublicKeyFromPrivateKey(privateKey: JsonWebKey): JsonWebKey {
	if (!privateKey.crv) {
		throw new Error(`Expected crv on private key`);
	}
	if (!privateKey.d) {
		throw new Error(`Expected d on private key`);
	}
	if (typeof privateKey.ext !== 'boolean') {
		throw new Error(`Expected ext on private key`);
	}
	if (!privateKey.kty) {
		throw new Error(`Expected kty on private key`);
	}
	if (!privateKey.x) {
		throw new Error(`Expected x on private key`);
	}
	if (!privateKey.y) {
		throw new Error(`Expected y on private key`);
	}
	const publicKey = {
		crv: privateKey.crv,
		ext: true, // Make public key always extractable
		key_ops: [],
		kty: privateKey.kty,
		x: privateKey.x,
		y: privateKey.y
	} as JsonWebKey;
	// Note: importantly, the public key does not have the 'd' property from the
	// private key
	return publicKey;
}

export function validateEchdPublicKey(publicKey: JsonWebKey) {
	if (typeof publicKey.crv !== 'string') {
		throw new Error('Expected crv property on public key');
	}
	if (typeof publicKey.ext !== 'boolean') {
		throw new Error('Expected ext property on public key');
	}
	if (!Array.isArray(publicKey.key_ops)) {
		throw new Error('Expected key_ops property on public key');
	}
	if (typeof publicKey.kty !== 'string') {
		throw new Error('Expected kty property on public key');
	}
	if (typeof publicKey.x !== 'string') {
		throw new Error('Expected x property on public key');
	}
	if (typeof publicKey.y !== 'string') {
		throw new Error('Expected y property on public key');
	}
}
