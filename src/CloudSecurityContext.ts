"use strict";

import { CloudConnection } from "./CloudConnection";
import { NetHomePlusCloudConnection } from "./NetHomePlusCloudConnection";
import { MSmartHomeCloudConnection } from "./MSmartHomeCloudConnection";
import { Device } from "./Device";

export const enum CONNECTION_TYPE {
	MSMARTHOME,
	NETHOMEPLUS
};

export class CloudSecurityContext {
	private _connectionType: CONNECTION_TYPE = CONNECTION_TYPE.NETHOMEPLUS;
	private _account: string;
	private _password: string;
	private _loginId: string = '';
	private _sessionId: string = '';
	private _accessToken: string = '';
	private _accessCreateDate: Date | null = null;
	private _accessExpiredDate: Date | null = null;


	constructor(account: string, password: string, connectionType: CONNECTION_TYPE = CONNECTION_TYPE.NETHOMEPLUS) { 
		this._account = account;
		this._password = password;
		this._connectionType = connectionType;
	}

	public getCloudConnection(device: Device): CloudConnection {
		switch (this._connectionType) {
			case CONNECTION_TYPE.MSMARTHOME:
				return new MSmartHomeCloudConnection(device);
			case CONNECTION_TYPE.NETHOMEPLUS:
				return new NetHomePlusCloudConnection(device);
			default:
				return new NetHomePlusCloudConnection(device);
		}
	}

	// CONNECTIONTYPE
	get connectionType(): CONNECTION_TYPE {
		return this._connectionType;
	}

	set connectionType(value: CONNECTION_TYPE) {
		this._connectionType = value;
	}

	// ACCOUNT
	get account(): string {
		return this._account;
	}

	set account(value: string) {
		this._account = value;
	}

	// PASSWORD
	get password(): string {
		return this._password;
	}

	set password(value: string) {
		this._password = value;
	}

	// LOGINID
	get loginId(): string {
		return this._loginId;
	}

	set loginId(value: string) {
		this._loginId = value;
	}

	// SESSIONID
	get sessionId(): string {
		return this._sessionId;
	}

	set sessionId(value: string) {
		this._sessionId = value;
	}

	// ACCESSTOKEN
	get accessToken(): string {
		return this._accessToken;
	}

	set accessToken(value: string) {
		this._accessToken = value;
	}

	// ACCESSCREATEDDATE
	get accessCreateDate(): Date | null {
		return this._accessCreateDate;
 	}

	set accessCreateDate(value: Date) {
		this._accessCreateDate = value;
 	}
 
	// ACCESSEXPIREDDATE
	get accessExpiredDate(): Date | null{
		return this._accessExpiredDate;
 	}

	set accessExpiredDate(value: Date) {
		this._accessExpiredDate = value;
 	}
}