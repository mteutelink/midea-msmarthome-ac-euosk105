"use strict";

import { CloudSecurityContext } from "../CloudSecurityContext";

export interface Command {
	execute(cloudSecurityContext: CloudSecurityContext): Promise<any>;
}