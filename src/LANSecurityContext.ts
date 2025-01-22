"use strict";

export class LANSecurityContext {
	private _token: string = '';
	private _key: string = '';
	private _accessToken: string = '';

	constructor(token: string, key: string) {
		this._token = token;
		this._key = key;
	}

	// TOKEN
	get token(): string {
		return this._token;
	}

	set token(token: string) {
		this._token = token;
	}

	// KEY
	get key(): string {
		return this._key;
	}

	set key(key: string) {
		this._key = key;
	}

	// ACCESSTOKEN
	get accessToken(): string {
		return this._accessToken;
	}

	set accessToken(accessToken: string) {
		this._accessToken = accessToken;
	}
}