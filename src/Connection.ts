"use strict";

import { SecurityContext } from './SecurityContext';

export interface Connection {
	authenticate(securityContext: SecurityContext): Promise<SecurityContext>;
	close(): void;
}