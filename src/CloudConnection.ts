"use strict";

import { MSMARTHOME_APP_ID, MSMARTHOME_FORMAT, MSMARTHOME_CLIENT_TYPE, MSMARTHOME_LANGUAGE, MSMARTHOME_SRC, MSMARTHOME_API_URL } from './Constants';
import { Security } from './Security';
import { SecurityContext } from './SecurityContext';
import { _LOGGER } from './Logger';
import crypto from 'crypto';
import dateFormat from 'dateformat';
import { Device } from 'Device';
import { Connection } from 'Connection';

class TokenAndKey {
	private _token: string;
	private _key: string;

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
}

class CloudAccessToken {
	private _token: string;
	private _createDate: Date;
	private _expiredDate: Date;
	
	constructor(token: string, createDate: Date, expiredDate: Date) {
		this._token = token;
		this._createDate = createDate;
		this._expiredDate = expiredDate;
	}

	// TOKEN
	public get token(): string {
		return this._token;
	}
	public set token(value: string) {
		this._token = value;
	}

	// CREATEDATE
	public get createDate(): Date {
		return this._createDate;
	}
	public set createDate(value: Date) {
		this._createDate = value;
	}

	// EXPIREDDATE
	public get expiredDate(): Date {
		return this._expiredDate;
	}
	public set expiredDate(value: Date) {
		this._expiredDate = value;
	}
}

export class CloudConnection implements Connection {
	private _device: Device;

	constructor(device: Device) {
		this._device= device;
	}

	private _createRequest(data: {}): {} {
		_LOGGER.debug("CloudConnection::_createRequest()");
		const body = {
			appId: MSMARTHOME_APP_ID,
			format: MSMARTHOME_FORMAT,
			clientType: MSMARTHOME_CLIENT_TYPE,
			language: MSMARTHOME_LANGUAGE,
			src: MSMARTHOME_SRC,
			stamp: dateFormat(new Date(), "yyyymmddHHMMss"),
			deviceId: this._device.deviceContext.id.toString(),
			reqId: crypto.randomBytes(8).toString('hex')
		};
		Object.assign(body, data);
		_LOGGER.debug("CloudConnection::_createRequest() = " + JSON.stringify(body));
		return body;
	}

	private async _executeRequest(endpoint: string, accessToken: string, body: any): Promise<any> {
		_LOGGER.debug("CloudConnection::_executeRequest()");

		try {
			const random = crypto.randomBytes(16).toString('hex');
			const response = await fetch(MSMARTHOME_API_URL + endpoint, {
				method: "POST",
				body: JSON.stringify(body),
				headers: {
					"Content-Type": "application/json",
					secretVersion: "1",
					sign: Security.sign(JSON.stringify(body), random),
					random: random,
					accessToken: accessToken
				}
			});
			return await response.json();
		} catch (error) {
			_LOGGER.error("Error in CloudConnection::_executeRequest()", error);
			throw error;
		}
	}

	private async _getLoginId(account: string): Promise<string> {
		_LOGGER.debug("CloudConnection::_getLoginId()");

		try {
			const response = await this._executeRequest("/v1/user/login/id/get", /*accessToken*/"", this._createRequest({
				"loginAccount": account
			}));
			_LOGGER.http("CloudConnection::_getLoginId()::response = " + JSON.stringify(response));
			_LOGGER.debug("CloudConnection::_getLoginId() = " + response.data.loginId);
			return response.data.loginId;
		} catch (error) {
			_LOGGER.error("Error in CloudConnection::_getLoginId()", error);
			throw error;
		}
	}

	private async _login(account: string, password: string, loginId: string): Promise<CloudAccessToken> {
		_LOGGER.debug("CloudConnection::_login()");

		try {
			const response = await this._executeRequest("/mj/user/login", /*accessToken*/"", {
				data: {
					platform: MSMARTHOME_FORMAT,
					deviceId: this._device.deviceContext.id
				},
				iotData: {
					appId: MSMARTHOME_APP_ID,
					clientType: MSMARTHOME_CLIENT_TYPE,
					iampwd: Security.encryptIAMPassword(loginId, password),
					loginAccount: account,
					password: Security.encryptPassword(loginId, password),
					pushToken: crypto.randomBytes(120).toString('hex'),
					reqId: crypto.randomBytes(8).toString('hex'),
					src: MSMARTHOME_SRC,
					stamp: dateFormat(new Date(), "yyyymmddHHMMss")
				}
			});
			_LOGGER.http("CloudConnection::_login()::response = " + JSON.stringify(response));
			
			const tokenInfo = new CloudAccessToken(response.data.mdata.accessToken, new Date(response.data.mdata.tokenPwdInfo.createDate), new Date(response.data.mdata.tokenPwdInfo.expiredDate)); 
			_LOGGER.debug("CloudConnection::_login() = " + JSON.stringify(tokenInfo));
			return tokenInfo;
		} catch (error) {
			_LOGGER.error("Error in CloudConnection::_login()", error);
			throw error;
		}
	}

	private async _getTokenAndKey(accessToken: string, udpId: string): Promise<TokenAndKey> {
		_LOGGER.debug("CloudConnection::_getTokenAndKey()");

		try {
			const response = await this._executeRequest("/v1/iot/secure/getToken", accessToken, this._createRequest({
				udpid: udpId
			}));

			_LOGGER.http("CloudConnection::_getTokenAndKey()::response = " + JSON.stringify(response));

			const tokenPair = response.data.tokenlist.find((pair: { udpId: string; token: string; key: string; }) => pair.udpId === udpId);
			if (!tokenPair) {
				_LOGGER.error(`Token and key for udpId ${udpId} not found.`);
				throw new Error(`Token and key for udpId ${udpId} not found.`);
			}
			return new TokenAndKey(tokenPair.token, tokenPair.key);
		} catch (error) {
			_LOGGER.error("Error in CloudConnection::_getTokenAndKey()", error);
			throw error;
		}
	}

	public async authenticate(securityContext: SecurityContext): Promise<SecurityContext> {
		_LOGGER.debug("CloudConnection::authenticate()");

		try {
			if (!securityContext.cloudAccessToken || 
				!securityContext.cloudAccessExpiredDate ||
				(securityContext.cloudAccessExpiredDate.getTime() < Date.now())) {

				securityContext.loginId = await this._getLoginId(securityContext.account);

				const cloudAccessToken: CloudAccessToken = await this._login(
					securityContext.account,
					securityContext.password,
					securityContext.loginId
				);
				securityContext.cloudAccessToken = cloudAccessToken.token;
				securityContext.cloudAccessCreateDate = cloudAccessToken.createDate;
				securityContext.cloudAccessExpiredDate = cloudAccessToken.expiredDate;
	
				const tokenAndKey = await this._getTokenAndKey(
					securityContext.cloudAccessToken,
					this._device.deviceContext.udpId
				);
				securityContext.token = tokenAndKey.token;
				securityContext.key = tokenAndKey.key;
	
				_LOGGER.debug("CloudConnection::_authenticate() = " + JSON.stringify(securityContext));
			}
			this._device.securityContext = securityContext;
			return securityContext;
		} catch (error) {
			_LOGGER.error("Authentication failed:", error);
			throw error;
		}
	}

	public close(): void {
	}

	public async executeCommand(endpoint: string, body: any): Promise<any> {
		_LOGGER.debug("CloudConnection::executeCommand()");
		if (!this._device.securityContext) {
			throw new ReferenceError("Not authenticated exception");
		}

		return this._executeRequest(endpoint, this._device.securityContext.cloudAccessToken, this._createRequest(body));
	}
}