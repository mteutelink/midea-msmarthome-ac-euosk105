"use strict";

export class CloudSecurityContext {
	private _account: string;
	private _password: string;
	private _loginId: string = '';
	private _accessToken: string = '';
	private _accessCreateDate: Date | null = null;
	private _accessExpiredDate: Date | null = null;

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

	// ACCESSTOKEN
	get accessToken(): string {
		return this._accessToken;
	}

	set accessToken(accessToken: string) {
		this._accessToken = accessToken;
	}

	// ACCESSCREATEDDATE
	public get accessCreateDate(): Date | null{
		return this._accessCreateDate;
	}
	public set accessCreateDate(value: Date) {
		this._accessCreateDate = value;
	}

	// ACCESSEXPIREDDATE
	public get accessExpiredDate(): Date | null {
		return this._accessExpiredDate;
	}
	public set accessExpiredDate(value: Date) {
		this._accessExpiredDate = value;
	}
}