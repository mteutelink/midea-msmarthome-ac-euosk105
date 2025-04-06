"use strict";

import { NETHOMEPLUS_API_URL, NETHOMEPLUS_APP_ID, NETHOMEPLUS_APP_KEY, NETHOMEPLUS_CLIENT_TYPE, NETHOMEPLUS_FORMAT, NETHOMEPLUS_LANGUAGE, NETHOMEPLUS_SRC } from "./NetHomePlusConstants";
import { CloudConnection, TokenAndKey } from  "./CloudConnection";
import { CloudSecurityContext } from "./CloudSecurityContext";
import { _LOGGER } from './Logger';
import crypto from 'crypto';
import dateFormat from "dateformat";

export class NetHomePlusCloudConnection extends CloudConnection {
    private _sign(body: any, endpoint: string): string {
        _LOGGER.debug("NetHomePlusCloudConnection::_sign(" + body + ", " + endpoint + ")");
        const query = Object.entries(body).sort().map(([key, value]) => { return key + '=' + (String(value)); }).join('&');
        const msg: string = endpoint + query + NETHOMEPLUS_APP_KEY;
        const sign = crypto.createHash("sha256").update(msg, "utf8").digest("hex");
        _LOGGER.debug("NetHomePlusCloudConnection::_sign(" + body + ", " + endpoint + ") = " + sign);
        return sign;
    }

    private _encryptPassword(loginId: string, password: string): string {
		_LOGGER.debug("NetHomePlusCloudConnection::_encryptPassword(****, ****)");
		const hashedPassword: string = crypto.createHash('sha256').update(password, 'utf-8').digest('hex');
		const encrypted = crypto.createHash('sha256').update(`${loginId}${hashedPassword}${NETHOMEPLUS_APP_KEY}`, 'utf-8').digest('hex');
		_LOGGER.debug("NetHomePlusCloudConnection::_encryptPassword() = " + encrypted);
		return encrypted;
	}

    private _createRequest(data: {}) {
        _LOGGER.debug("NetHomePlusCloudConnection::_createRequest()");
        const body = {
            appId: NETHOMEPLUS_APP_ID,
            src: NETHOMEPLUS_SRC,
            format: NETHOMEPLUS_FORMAT,
            clientType: NETHOMEPLUS_CLIENT_TYPE,
            language: NETHOMEPLUS_LANGUAGE,
            deviceId: this._device.deviceContext.id.toString(),
			stamp: dateFormat(new Date(), "yyyymmddHHMMss"),
        };
        Object.assign(body, data);
        _LOGGER.debug("NetHomePlusCloudConnection::_createRequest() = " + JSON.stringify(body));
        return body;
    }

    private async _executeRequest(endpoint: string, sessionId: string, body: any) {
        _LOGGER.debug("NetHomePlusCloudConnection::_executeRequest()");
        try {
            body.sessionId = sessionId;
            body.sign = this._sign(body, endpoint);

            const formData = new FormData();
            for (const key in body) {
                if (body.hasOwnProperty(key)) {
                    formData.append(key, body[key]);
                }
            }

            const response = await fetch(NETHOMEPLUS_API_URL + endpoint, {
                method: "POST",
                body: formData
            });
            return await response.json();
        }
        catch (error) {
            _LOGGER.error("Error in NetHomePlusCloudConnection::_executeRequest()", error);
            throw error;
        }
    }

    private async _getLoginId(account: string):  Promise<string>  {
        _LOGGER.debug("NetHomePlusCloudConnection::_getLoginId()");
        try {
            const response = await this._executeRequest("/v1/user/login/id/get", /*sessionId*/ "", this._createRequest({
                "loginAccount": account
            }));
            _LOGGER.http("NetHomePlusCloudConnection::_getLoginId()::response = " + JSON.stringify(response));

            if (response.code > 0) {
                _LOGGER.error("Error in NetHomePlusCloudConnection::_getLoginId() - " + response.code + ": " + response.message);
                throw new Error("Error in NetHomePlusCloudConnection::_getLoginId() - " + response.code + ": " + response.message);
            }

            _LOGGER.debug("NetHomePlusCloudConnection::_getLoginId() = " + response.result.loginId);
            return response.result.loginId;
        }
        catch (error) {
            _LOGGER.error("Error in NetHomePlusCloudConnection::_getLoginId()", error);
            throw error;
        }
    }

    private async _login(account: string, password: string, loginId: string): Promise<string> {
        _LOGGER.debug("NetHomePlusCloudConnection::_login()");
        try {
            const response = await this._executeRequest("/v1/user/login", /*sessionId*/ "", this._createRequest({
                loginAccount: account,
                password: this._encryptPassword(loginId, password)
            }));
            _LOGGER.http("NetHomePlusCloudConnection::_login()::response = " + JSON.stringify(response));

            if (response.code > 0) {
                _LOGGER.error("Error in NetHomePlusCloudConnection::_login() - " + response.code + ": " + response.message);
                throw new Error("Error in NetHomePlusCloudConnection::_login() - " + response.code + ": " + response.message);
            }

            const sessionId = response.result.sessionId;
            _LOGGER.debug("NetHomePlusCloudConnection::_login() = " + sessionId);
            return sessionId;
        }
        catch (error) {
            _LOGGER.error("Error in NetHomePlusCloudConnection::_login()", error);
            throw error;
        }
    }

    public async _getTokenAndKey(sessionId: string, udpId: string): Promise<TokenAndKey> {
        _LOGGER.debug("NetHomePlusCloudConnection::_getTokenAndKey()");
        try {
            const response = await this._executeRequest("/v1/iot/secure/getToken", sessionId, this._createRequest({
                udpid: udpId
            }));
            _LOGGER.http("NetHomePlusCloudConnection::_getTokenAndKey()::response = " + JSON.stringify(response));

            if (response.code > 0) {
                _LOGGER.error("Error in NetHomePlusCloudConnection::_getTokenAndKey() - " + response.code + ": " + response.message);
                throw new Error("Error in NetHomePlusCloudConnection::_getTokenAndKey() - " + response.code + ": " + response.message);
            }

            const tokenPair = response.result.tokenlist.find((pair: { udpId: string; token: string; key: string; }) => pair.udpId === udpId);
            if (!tokenPair) {
                _LOGGER.error(`Token and key for udpId ${udpId} not found.`);
                throw new Error(`Token and key for udpId ${udpId} not found.`);
            }
            return new TokenAndKey(tokenPair.token, tokenPair.key);
        }
        catch (error) {
            _LOGGER.error("Error in NetHomePlusCloudConnection::_getTokenAndKey()", error);
            throw error;
        }
    }

    public isAuthenticated(cloudSecurityContext: CloudSecurityContext): boolean {
        const _authenticated = (cloudSecurityContext.sessionId != null);
        _LOGGER.debug("NetHomePlusCloudConnection::isauthenticate() = " + _authenticated);
        return _authenticated;
    }

    public async authenticate(cloudSecurityContext: CloudSecurityContext): Promise<CloudSecurityContext> {
        _LOGGER.debug("NetHomePlusCloudConnection::authenticate()");
        try {
            cloudSecurityContext.loginId = await this._getLoginId(cloudSecurityContext.account);
            cloudSecurityContext.sessionId = await this._login(cloudSecurityContext.account, cloudSecurityContext.password, cloudSecurityContext.loginId);
            _LOGGER.debug("NetHomePlusCloudConnection::_authenticate() = " + JSON.stringify(cloudSecurityContext));

            return cloudSecurityContext;
        }
        catch (error) {
            _LOGGER.error("Authentication failed:", error);
            throw error;
        }
    }

    public async executeCommand(cloudSecurityContext: CloudSecurityContext, endpoint: string, body: any): Promise<any> {
        _LOGGER.debug("NetHomePlusCloudConnection::executeCommand()");
        await this.authenticate(cloudSecurityContext);
        return this._executeRequest(endpoint, cloudSecurityContext.sessionId, this._createRequest(body));
    }
}