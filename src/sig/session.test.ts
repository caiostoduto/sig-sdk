import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	type SessionInfo,
	SigSession,
	type SigSessionOptions,
} from "./session";

// ---------------------------------------------------------------------------
// Concrete stub so we can instantiate the abstract class
// ---------------------------------------------------------------------------
class TestSigSession extends SigSession {
	constructor(options: SigSessionOptions = {}) {
		super(new URL("https://example.com"), 25, options);
	}
	async login(): Promise<void> {}
	async logout(): Promise<void> {}
}

// ---------------------------------------------------------------------------
// Constructor / initial state
// ---------------------------------------------------------------------------
describe("SigSession - constructor", () => {
	it("starts with a null session when no options are given", () => {
		const session = new TestSigSession();
		expect(session.getJessionId()).toBeNull();
		expect(session.getJsessionLastUpdate()).toBeNull();
	});

	it("initialises from a provided session option", () => {
		const sessionInfo: SessionInfo = {
			jsessionid: "ABC123",
			lastUpdate: 1_700_000_000_000,
		};
		const session = new TestSigSession({ session: sessionInfo });
		expect(session.getJessionId()).toBe("ABC123");
		expect(session.getJsessionLastUpdate()).toBe(1_700_000_000_000);
	});

	it("exposes the correct baseUrl", () => {
		const session = new TestSigSession();
		expect(session.baseUrl.href).toBe("https://example.com/");
	});
});

// ---------------------------------------------------------------------------
// Hook behaviour tested through real kyInstance calls (fetch mocked globally)
// ---------------------------------------------------------------------------
describe("SigSession - beforeRequest hook (Cookie injection)", () => {
	let capturedRequest: Request | undefined;

	beforeEach(() => {
		capturedRequest = undefined;
		vi.stubGlobal(
			"fetch",
			vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
				capturedRequest = new Request(input, init);
				return new Response("ok", { status: 200 });
			}),
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("adds JSESSIONID Cookie header when a valid session exists", async () => {
		const session = new TestSigSession({
			session: { jsessionid: "MYJSESSIONID", lastUpdate: Date.now() },
		});

		await session.kyInstance.get("https://example.com/test", {
			retry: 0,
		});

		expect(capturedRequest?.headers.get("cookie")).toContain(
			"JSESSIONID=MYJSESSIONID",
		);
	});

	it("does not set a Cookie header when no session exists", async () => {
		const session = new TestSigSession();

		await session.kyInstance.get("https://example.com/test", {
			retry: 0,
		});

		expect(capturedRequest?.headers.get("cookie")).toBeFalsy();
	});
});

describe("SigSession - afterResponse hook (JSESSIONID extraction)", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("stores the JSESSIONID received in set-cookie", async () => {
		const session = new TestSigSession();
		expect(session.getJessionId()).toBeNull();

		vi.stubGlobal(
			"fetch",
			vi.fn(
				async () =>
					new Response("ok", {
						status: 200,
						headers: { "set-cookie": "JSESSIONID=NEWID; Path=/" },
					}),
			),
		);

		await session.kyInstance.get("https://example.com/test", { retry: 0 });

		expect(session.getJessionId()).toBe("NEWID");
		expect(session.getJsessionLastUpdate()).not.toBeNull();
	});
});

// ---------------------------------------------------------------------------
// Session expiry
// ---------------------------------------------------------------------------
describe("SigSession - session expiry", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("clears the session on expiry for a GET request", async () => {
		const MINUTES = 25;
		const expiredLastUpdate = Date.now() - (MINUTES + 1) * 60 * 1_000;

		const session = new TestSigSession({
			session: { jsessionid: "EXPIRED", lastUpdate: expiredLastUpdate },
		});
		expect(session.getJessionId()).toBe("EXPIRED");

		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response("ok", { status: 200 })),
		);

		// The GET should succeed (session is cleared, then proceeds without cookie)
		await session.kyInstance.get("https://example.com/test", { retry: 0 });

		expect(session.getJessionId()).toBeNull();
	});

	it("throws when the session has expired and the request is non-GET", async () => {
		const MINUTES = 25;
		const expiredLastUpdate = Date.now() - (MINUTES + 1) * 60 * 1_000;

		const session = new TestSigSession({
			session: { jsessionid: "EXPIRED", lastUpdate: expiredLastUpdate },
		});

		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response("ok", { status: 200 })),
		);

		await expect(
			session.kyInstance.post("https://example.com/action", { retry: 0 }),
		).rejects.toThrow("Session expired. Please create a new session.");
	});
});
