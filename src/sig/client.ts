import type { SigSessionOptions } from "./session.js";

export abstract class SigClient {
	protected readonly baseUrl: URL;
	protected readonly options?: SigClientOptions;

	constructor(baseUrl: URL, options: SigClientOptions = {}) {
		this.baseUrl = baseUrl;
		this.options = options;
	}
}

export type SigClientOptions = {} & SigSessionOptions;
