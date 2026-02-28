import ky, {
	type AfterResponseState,
	type KyRequest,
	type KyResponse,
	type NormalizedOptions,
} from "ky";

export abstract class SigSession {
	public readonly baseUrl: URL;
	protected readonly expireSessionAfterMinutes: number;
	protected readonly options: SigSessionOptions;

	// Session management
	protected jsessionid: string | null = null;
	protected lastUpdate: number | null = null;

	public readonly ky_instance = ky.create({
		headers: {
			"Cache-Control": "max-age=0",
			Connection: "keep-alive",
			"Sec-Fetch-Dest": "document",
			"Sec-Fetch-Mode": "navigate",
			"Sec-Fetch-Site": "same-origin",
			"Sec-Fetch-User": "?1",
			"Upgrade-Insecure-Requests": "1",
		},
		hooks: {
			beforeRequest: [this.beforeRequestHook.bind(this)],
			afterResponse: [this.afterResponseHook.bind(this)],
		},
	});

	constructor(
		baseUrl: URL,
		expireSessionAfterMinutes: number,
		options: SigSessionOptions = {},
	) {
		this.baseUrl = baseUrl;
		this.expireSessionAfterMinutes = expireSessionAfterMinutes;
		this.options = options;

		// Initialize session if provided in options
		this.setJsessionId(options.session ?? null);
	}

	private async beforeRequestHook(request: Request): Promise<void> {
		if (this.jsessionid) {
			if (
				this.lastUpdate &&
				this.lastUpdate <
					Date.now() - (this.expireSessionAfterMinutes - 1) * 6e4
			) {
				if (request.method !== "GET")
					throw new Error("Session expired. Please create a new session.");

				return this.setJsessionId(null);
			}

			request.headers.set("Cookie", `JSESSIONID=${this.jsessionid}`);
		}
	}

	private async afterResponseHook(
		_request: KyRequest,
		_options: NormalizedOptions,
		response: KyResponse,
		_state: AfterResponseState,
	) {
		if (response.headers.get("set-cookie")?.includes("JSESSIONID=")) {
			const setCookie = response.headers
				.get("set-cookie")
				?.split(";")
				.find((cookie) => cookie.trim().startsWith("JSESSIONID="));

			if (setCookie) {
				return this.setJsessionId({
					jsessionid: setCookie.trim().substring("JSESSIONID=".length),
					lastUpdate: Date.now(),
				});
			}
		}

		this.updateLastUpdate();
	}

	/**
	 * Updates the last update timestamp if the session is active.
	 * This method should be called after each successful request to ensure the session's last update time is accurate.
	 */
	private updateLastUpdate() {
		if (this.jsessionid) {
			this.lastUpdate = Date.now();
		}
	}

	/**
	 * Sets the JSESSIONID and last update timestamp for the session. If a session object is provided, it uses the values from the object; otherwise, it clears the session information.
	 * @param session - An optional SessionInfo object containing the JSESSIONID and last update timestamp. If null, the session information will be cleared.
	 * @returns void
	 */
	protected setJsessionId(session: SessionInfo | null = null): void {
		this.jsessionid = session?.jsessionid ?? null;
		this.lastUpdate = session?.lastUpdate ?? null;
	}

	public abstract login(): Promise<void>;

	public abstract logout(): Promise<void>;
}

export type SigSessionOptions =
	| {
			session?: never;
			username?: never;
			password?: never;
	  }
	| {
			session: SessionInfo;
			username?: never;
			password?: never;
	  }
	| {
			session?: never;
			username: string;
			password: string;
	  }
	| {
			session: SessionInfo;
			username: string;
			password: string;
	  };

export type SessionInfo = {
	jsessionid: string;
	lastUpdate: number;
};
