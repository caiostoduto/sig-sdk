import type { SigSession } from "./session.js";

export abstract class SigClient {
	protected readonly session?: SigSession;

	constructor(session?: SigSession) {
		this.session = session;
	}
}
