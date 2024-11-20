"use strict";

import { SecurityContext } from '../SecurityContext';

export interface Command {
	execute(): Promise<any>;
}