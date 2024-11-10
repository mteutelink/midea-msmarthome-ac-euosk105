"use strict";

import { MSMARTHOME_APP_ID, MSMARTHOME_FORMAT, MSMARTHOME_CLIENT_TYPE, MSMARTHOME_LANGUAGE, MSMARTHOME_SRC, MSMARTHOME_API_URL, MIDEA_MESSAGE_TYPE } from './Constants';
import { Security } from './Security';
import { DeviceContext } from './DeviceContext';
import { SecurityContext } from './SecurityContext';
import { _LOGGER } from './Logger';
import crypto from 'crypto';
import dateFormat from 'dateformat';

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

export class CloudConnection {
	private _deviceContext: DeviceContext;

	constructor(deviceContext: DeviceContext) {
		this._deviceContext = deviceContext;
	}

	private _createRequest(data: {}): {} {
		_LOGGER.info("CloudConnection::_createRequest()");
		const body = {
			appId: MSMARTHOME_APP_ID,
			format: MSMARTHOME_FORMAT,
			clientType: MSMARTHOME_CLIENT_TYPE,
			language: MSMARTHOME_LANGUAGE,
			src: MSMARTHOME_SRC,
			stamp: dateFormat(new Date(), "yyyymmddHHMMss"),
			deviceId: this._deviceContext.id.toString(),
			reqId: crypto.randomBytes(8).toString('hex')
		};
		Object.assign(body, data);
		_LOGGER.debug("CloudConnection::_createRequest() = " + JSON.stringify(body));
		return body;
	}

	private async _executeRequest(endpoint: string, accessToken: string, body: any): Promise<any> {
		_LOGGER.info("CloudConnection::_executeRequest()");

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
		_LOGGER.info("CloudConnection::_getLoginId()");

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

	private async _login(account: string, password: string, loginId: string): Promise<string> {
		_LOGGER.info("CloudConnection::_login()");

		try {
			const response = await this._executeRequest("/mj/user/login", /*accessToken*/"", {
				data: {
					platform: MSMARTHOME_FORMAT,
					deviceId: this._deviceContext.id
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
			_LOGGER.debug("CloudConnection::_login() = " + response.data.mdata.accessToken);
			return response.data.mdata.accessToken;
		} catch (error) {
			_LOGGER.error("Error in CloudConnection::_login()", error);
			throw error;
		}
	}

	private async _getTokenAndKey(accessToken: string, udpId: string): Promise<TokenAndKey> {
		_LOGGER.info("CloudConnection::_getTokenAndKey()");

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

	public async authenticate(account: string, password: string): Promise<SecurityContext> {
		_LOGGER.info("CloudConnection::authenticate()");

		let securityContext = new SecurityContext(account, password);

		try {
			securityContext.loginId = await this._getLoginId(securityContext.account);

			securityContext.cloudAccessToken = await this._login(
				securityContext.account,
				securityContext.password,
				securityContext.loginId
			);

			const tokenAndKey = await this._getTokenAndKey(
				securityContext.cloudAccessToken,
				this._deviceContext.udpId
			);
			securityContext.token = tokenAndKey.token;
			securityContext.key = tokenAndKey.key;

			_LOGGER.debug("CloudConnection::_authenticate() = " + JSON.stringify(securityContext));
			return securityContext;
		} catch (error) {
			_LOGGER.error("Authentication failed:", error);
			throw error;
		}
	}

	public async executeCommand(securityContext: SecurityContext, endpoint: string, body: any) {
		_LOGGER.info("CloudConnection::executeCommand()");
		return this._executeRequest(endpoint, securityContext.cloudAccessToken, this._createRequest(body));
	}
}