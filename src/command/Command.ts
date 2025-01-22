"use strict";

export interface Command {
	execute(): Promise<any>;
}