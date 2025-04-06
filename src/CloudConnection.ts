"use strict";

import { CloudSecurityContext } from './CloudSecurityContext';
import { Device } from './Device';

export class TokenAndKey {
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

export abstract class CloudConnection {
	protected readonly _device: Device;

	constructor(device: Device) {
		this._device= device;
	}

	public async _getTokenAndKey(sessionId: string, udpId: string): Promise<TokenAndKey> {
		throw new Error('Not implemented');
	}
	
	public isAuthenticated(cloudSecurityContext: CloudSecurityContext): boolean {
		return false;
	}

	public async authenticate(cloudSecurityContext: CloudSecurityContext): Promise<CloudSecurityContext> {
		throw new Error('Not implemented');
	}

	public close(): void {
		// purposely empty
	}

	public async executeCommand(cloudSecurityContext: CloudSecurityContext, endpoint: string, body: any): Promise<any> {
		throw new Error('Not implemented');
	}
}