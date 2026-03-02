import { afterEach, describe, expect, it, vi } from "vitest";
import { UFABCSigaaSession } from "./session";

// ---------------------------------------------------------------------------
// Factory for mock Response objects returned by the global fetch mock
// ---------------------------------------------------------------------------
function mockFetchResponse(overrides: Record<string, unknown> = {}): Response {
	return {
		status: 200,
		statusText: "OK",
		ok: true,
		redirected: false,
		url: "",
		headers: new Headers(),
		arrayBuffer: async () => new ArrayBuffer(0),
		text: async () => "",
		json: async () => ({}),
		blob: async () => new Blob([]),
		formData: async () => new FormData(),
		clone() {
			return { ...this } as unknown as Response;
		},
		body: null,
		bodyUsed: false,
		type: "basic" as ResponseType,
		...overrides,
	} as unknown as Response;
}

afterEach(() => {
	vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Constructor
// ---------------------------------------------------------------------------
describe("UFABCSigaaSession - constructor", () => {
	it("starts without an active session", () => {
		const session = new UFABCSigaaSession();
		expect(session.getJessionId()).toBeNull();
	});

	it("targets sig.ufabc.edu.br", () => {
		const session = new UFABCSigaaSession();
		expect(session.baseUrl.hostname).toBe("sig.ufabc.edu.br");
	});

	it("accepts an existing SessionInfo and exposes it", () => {
		const session = new UFABCSigaaSession({
			session: { jsessionid: "EXISTING", lastUpdate: Date.now() },
		});
		expect(session.getJessionId()).toBe("EXISTING");
	});
});

// ---------------------------------------------------------------------------
// login() - guard conditions
// ---------------------------------------------------------------------------
describe("UFABCSigaaSession - login() guard conditions", () => {
	it("throws when no credentials are provided", async () => {
		const session = new UFABCSigaaSession();
		await expect(session.login()).rejects.toThrow(
			"Username and password must be provided",
		);
	});

	it("does not make any network request when the session is still fresh", async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);

		const session = new UFABCSigaaSession({
			session: { jsessionid: "FRESH", lastUpdate: Date.now() },
			username: "user",
			password: "pass",
		});

		await session.login();

		// No fetch call should have been made
		expect(fetchMock).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// login() - network flow
// ---------------------------------------------------------------------------
describe("UFABCSigaaSession - login() network flow", () => {
	it("completes successfully on the happy path", async () => {
		const MENU_URL = "https://sig.ufabc.edu.br/sigaa/verMenuPrincipal.do";

		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				// 1st call: GET verTelaLogin.do
				.mockResolvedValueOnce(
					mockFetchResponse({
						url: "https://sig.ufabc.edu.br/sigaa/verTelaLogin.do",
					}),
				)
				// 2nd call: POST logar.do - successful redirect to menu
				.mockResolvedValueOnce(
					mockFetchResponse({
						redirected: true,
						url: MENU_URL,
					}),
				),
		);

		const session = new UFABCSigaaSession({
			username: "testuser",
			password: "testpass",
		});

		await expect(session.login()).resolves.toBeUndefined();
	});

	it("throws when the POST does not redirect to the main menu", async () => {
		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				.mockResolvedValueOnce(
					mockFetchResponse({
						url: "https://sig.ufabc.edu.br/sigaa/verTelaLogin.do",
					}),
				)
				.mockResolvedValueOnce(
					// Redirect to a different URL → login failed
					mockFetchResponse({
						redirected: true,
						url: "https://sig.ufabc.edu.br/sigaa/verTelaLogin.do",
					}),
				),
		);

		const session = new UFABCSigaaSession({
			username: "wrong",
			password: "wrong",
		});

		await expect(session.login()).rejects.toThrow("Failed to login");
	});

	it("throws when the POST is not redirected at all", async () => {
		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				.mockResolvedValueOnce(mockFetchResponse())
				.mockResolvedValueOnce(
					// Not redirected → wrong login
					mockFetchResponse({ redirected: false }),
				),
		);

		const session = new UFABCSigaaSession({
			username: "user",
			password: "pass",
		});

		await expect(session.login()).rejects.toThrow("Failed to login");
	});
});

// ---------------------------------------------------------------------------
// logout() - inherited from SigaaSession
// ---------------------------------------------------------------------------
describe("UFABCSigaaSession - logout()", () => {
	it("does nothing when there is no active session", async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);

		const session = new UFABCSigaaSession();
		await session.logout();

		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("clears the session after a successful logout", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(mockFetchResponse({ redirected: false })),
		);

		const session = new UFABCSigaaSession({
			session: { jsessionid: "ACTIVE", lastUpdate: Date.now() },
		});

		expect(session.getJessionId()).toBe("ACTIVE");
		await session.logout();
		expect(session.getJessionId()).toBeNull();
	});

	it("throws when the logout request is redirected", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(mockFetchResponse({ redirected: true })),
		);

		const session = new UFABCSigaaSession({
			session: { jsessionid: "ACTIVE", lastUpdate: Date.now() },
		});

		await expect(session.logout()).rejects.toThrow(
			"Failed to load logout page",
		);
	});
});
