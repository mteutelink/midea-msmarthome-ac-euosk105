"use strict";

import { SecurityContext } from '../SecurityContext';

export interface Command {
	execute(securityContext: SecurityContext): Promise<any>;
}