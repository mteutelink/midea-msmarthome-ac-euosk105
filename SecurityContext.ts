"use strict";

export class SecurityContext {
	private _account: string;
	private _password: string;
	private _loginId: string = '';
	private _token: string = '';
	private _key: string = '';
	private _cloudAccessToken: string = '';
	private _lanAccessToken: string = '';

	constructor(account: string, password: string) {
		this._account = account;
		this._password = password;
	}

	// ACCOUNT
	get account(): string {
		return this._account;
	}

	set account(account: string) {
		this._account = account;
	}

	// PASSWORD
	get password(): string {
		return this._password;
	}

	set password(password: string) {
		this._password = password;
	}


	// LOGINID
	get loginId(): string {
		return this._loginId;
	}

	set loginId(loginId: string) {
		this._loginId = loginId;
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

	// CLOUDACCESSTOKEN
	get cloudAccessToken(): string {
		return this._cloudAccessToken;
	}

	set cloudAccessToken(cloudAccessToken: string) {
		this._cloudAccessToken = cloudAccessToken;
	}

	// LANACCESSTOKEN
	get lanAccessToken(): string {
		return this._lanAccessToken;
	}

	set lanAccessToken(lanAccessToken: string) {
		this._lanAccessToken = lanAccessToken;
	}
}