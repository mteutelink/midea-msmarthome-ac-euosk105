"use strict";
import { MSMARTHOME_API_URL, MSMARTHOME_APP_ID, MSMARTHOME_APP_KEY, MSMARTHOME_CLIENT_TYPE, MSMARTHOME_FORMAT, MSMARTHOME_HMAC_KEY, MSMARTHOME_IOT_KEY, MSMARTHOME_LANGUAGE, MSMARTHOME_SRC } from './MSmartHomeConstants';
import { _LOGGER } from './Logger';
import { CloudConnection, TokenAndKey } from './CloudConnection';
import { CloudSecurityContext } from './CloudSecurityContext';
import crypto from 'crypto';
import dateFormat from 'dateformat';
import fetch from 'cross-fetch';

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

export class MSmartHomeCloudConnection extends CloudConnection {
	private _encryptPassword(loginId: string, password: string): string {
		_LOGGER.debug("MSmartHomeCloudConnection::encryptPassword(****, ****)");
		const hashedPassword: string = crypto.createHash('sha256').update(password, 'utf-8').digest('hex');
		const encrypted = crypto.createHash('sha256').update(`${loginId}${hashedPassword}${MSMARTHOME_APP_KEY}`, 'utf-8').digest('hex');
		_LOGGER.debug("MSmartHomeCloudConnection::encryptPassword() = " + encrypted);
		return encrypted;
	}
	
	private _encryptIAMPassword(loginId: string, password: string): string {
		_LOGGER.debug("MSmartHomeCloudConnection::encryptIAMPassword(****, ****)");
		const mdPassword: string = crypto.createHash('md5').update(password, 'utf-8').digest('hex');
		const mdMdPassword: string = crypto.createHash('md5').update(mdPassword, 'utf-8').digest('hex');
		const encrypted = crypto.createHash('sha256').update(`${loginId}${mdMdPassword}${MSMARTHOME_APP_KEY}`, 'utf-8').digest('hex');
		_LOGGER.debug("MSmartHomeCloudConnection::encryptIAMPassword() = " + encrypted);
		return encrypted;
	}

    private _sign(data:string, random: string): string {
		_LOGGER.debug("MSmartHomeCloudConnection::sign(" + data + ", " + random + ")");
		const msg: string = MSMARTHOME_IOT_KEY + data + random;
		const sign = crypto.createHmac('SHA256', MSMARTHOME_HMAC_KEY).update(msg).digest('hex');
		_LOGGER.debug("MSmartHomeCloudConnection::sign() = " + sign);
		return sign;
	}

	private _createRequest(data: {}): {} {
		_LOGGER.debug("MSmartHomeCloudConnection::_createRequest()");
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
		_LOGGER.debug("MSmartHomeCloudConnection::_createRequest() = " + JSON.stringify(body));
		return body;
	}

	private async _executeRequest(endpoint: string, accessToken: string, body: any): Promise<any> {
		_LOGGER.debug("MSmartHomeCloudConnection::_executeRequest()");

		try {
			const random = crypto.randomBytes(16).toString('hex');
			const response = await fetch(MSMARTHOME_API_URL + endpoint, {
				method: "POST",
				body: JSON.stringify(body),
				headers: {
					"Content-Type": "application/json",
					secretVersion: "1",
					sign: this._sign(JSON.stringify(body), random),
					random: random,
					accessToken: accessToken
				}
			});
			return await response.json();
		} catch (error) {
			_LOGGER.error("Error in MSmartHomeCloudConnection::_executeRequest()", error);
			throw error;
		}
	}

	private async _getLoginId(account: string): Promise<string> {
		_LOGGER.debug("MSmartHomeCloudConnection::_getLoginId()");

		try {
			const response = await this._executeRequest("/v1/user/login/id/get", /*accessToken*/"", this._createRequest({
				"loginAccount": account
			}));
			_LOGGER.http("MSmartHomeCloudConnection::_getLoginId()::response = " + JSON.stringify(response));
			_LOGGER.debug("MSmartHomeCloudConnection::_getLoginId() = " + response.data.loginId);
			return response.data.loginId;
		} catch (error) {
			_LOGGER.error("Error in MSmartHomeCloudConnection::_getLoginId()", error);
			throw error;
		}
    }

	private async _login(account: string, password: string, loginId: string): Promise<CloudAccessToken> {
		_LOGGER.debug("MSmartHomeCloudConnection::_login()");

		try {
			const response = await this._executeRequest("/mj/user/login", /*accessToken*/"", {
				data: {
					platform: MSMARTHOME_FORMAT,
					deviceId: this._device.deviceContext.id
				},
				iotData: {
					appId: MSMARTHOME_APP_ID,
					clientType: MSMARTHOME_CLIENT_TYPE,
					iampwd: this._encryptIAMPassword(loginId, password),
					loginAccount: account,
					password: this._encryptPassword(loginId, password),
					pushToken: crypto.randomBytes(120).toString('hex'),
					reqId: crypto.randomBytes(8).toString('hex'),
					src: MSMARTHOME_SRC,
					stamp: dateFormat(new Date(), "yyyymmddHHMMss")
				}
			});
			_LOGGER.http("MSmartHomeCloudConnection::_login()::response = " + JSON.stringify(response));
			
            if (response.code > 0) {
                _LOGGER.error("Error in MSmartHomeCloudConnection::_login() - " + response.code + ": " + response.message);
                throw new Error("Error in MSmartHomeCloudConnection::_login() - " + response.code + ": " + response.message);
            }

			const tokenInfo = new CloudAccessToken(response.data.mdata.accessToken, new Date(response.data.mdata.tokenPwdInfo.createDate), new Date(response.data.mdata.tokenPwdInfo.expiredDate)); 
			_LOGGER.debug("MSmartHomeCloudConnection::_login() = " + JSON.stringify(tokenInfo));
			return tokenInfo;
		} catch (error) {
			_LOGGER.error("Error in MSmartHomeCloudConnection::_login()", error);
			throw error;
		}
	}

	public async _getTokenAndKey(accessToken: string, udpId: string): Promise<TokenAndKey> {
		_LOGGER.debug("CloudConnection::_getTokenAndKey()");

		try {
			const response = await this._executeRequest("/v1/iot/secure/getToken", accessToken, this._createRequest({
				udpid: udpId
			}));

			_LOGGER.http("CloudConnection::_getTokenAndKey()::response = " + JSON.stringify(response));

            if (response.code > 0) {
                _LOGGER.error("Error in MSmartHomeCloudConnection::_getTokenAndKey() - " + response.code + ": " + response.message);
                throw new Error("Error in MSmartHomeCloudConnection::_getTokenAndKey() - " + response.code + ": " + response.message);
            }

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

    public isAuthenticated(cloudSecurityContext: CloudSecurityContext): boolean {
        const _authenticated = (cloudSecurityContext.accessToken &&
            cloudSecurityContext.accessExpiredDate &&
            (cloudSecurityContext.accessExpiredDate.getTime() > new Date().getTime()));
        _LOGGER.debug("MSmartHomeCloudConnection::isauthenticate() = " + _authenticated);
        return _authenticated;
    }

    public async authenticate(cloudSecurityContext: CloudSecurityContext): Promise<CloudSecurityContext> {
		_LOGGER.debug("MSmartHomeCloudConnection::authenticate()");

		try {
            if (!this.isAuthenticated(cloudSecurityContext)) {

                cloudSecurityContext.loginId = await this._getLoginId(cloudSecurityContext.account);

				const accessToken: CloudAccessToken = await this._login(
					cloudSecurityContext.account,
					cloudSecurityContext.password,
					cloudSecurityContext.loginId
				);
				cloudSecurityContext.accessToken = accessToken.token;
				cloudSecurityContext.accessCreateDate = accessToken.createDate;
				cloudSecurityContext.accessExpiredDate = accessToken.expiredDate;
	
				_LOGGER.debug("MSmartHomeCloudConnection::_authenticate() = " + JSON.stringify(cloudSecurityContext));
			}
			return cloudSecurityContext;
		} catch (error) {
			_LOGGER.error("Authentication failed:", error);
			throw error;
		}
    }

    public async executeCommand(cloudSecurityContext: CloudSecurityContext, endpoint: string, body: any): Promise<any> {
        _LOGGER.debug("MSmartHomeCloudConnection::executeCommand()");
        await this.authenticate(cloudSecurityContext);
        return this._executeRequest(endpoint, cloudSecurityContext.accessToken, this._createRequest(body));
    }
}