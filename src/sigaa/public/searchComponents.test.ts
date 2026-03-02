import { describe, expect, it, vi } from "vitest";
import type { SigaaSession } from "../session";
import { buscarComponentesBody, Componente } from "./searchComponents";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeOkResponse(body: string, status = 200): Response {
	return new Response(body, {
		status,
		headers: { "content-type": "text/html; charset=UTF-8" },
	});
}

function makeSession(
	getResponse: Response,
	postResponse: Response,
): SigaaSession {
	return {
		baseUrl: new URL("https://example.com"),
		kyInstance: {
			get: vi.fn().mockResolvedValue(getResponse),
			post: vi.fn().mockResolvedValue(postResponse),
		},
	} as unknown as SigaaSession;
}

// ---------------------------------------------------------------------------
// buscarComponentesBody
// ---------------------------------------------------------------------------
describe("buscarComponentesBody", () => {
	it("makes a GET then a POST request to the components page", async () => {
		const getRes = makeOkResponse("<html></html>");
		const postRes = makeOkResponse("<html><table></table></html>");
		const session = makeSession(getRes, postRes);

		const result = await buscarComponentesBody(
			{ nivel: "G", codComponente: "MCTA001" },
			session,
		);

		expect(
			(session.kyInstance.get as ReturnType<typeof vi.fn>).mock.calls.length,
		).toBe(1);
		expect(
			(session.kyInstance.post as ReturnType<typeof vi.fn>).mock.calls.length,
		).toBe(1);
		expect(typeof result).toBe("string");
	});

	it("throws when the initial GET request fails", async () => {
		const session = makeSession(
			makeOkResponse("err", 500),
			makeOkResponse("ok"),
		);
		await expect(
			buscarComponentesBody({ nivel: "G" }, session),
		).rejects.toThrow("Failed to search components");
	});

	it("throws when the POST request fails", async () => {
		const session = makeSession(
			makeOkResponse("ok"),
			makeOkResponse("err", 500),
		);
		await expect(
			buscarComponentesBody({ nivel: "G" }, session),
		).rejects.toThrow("Failed to search components");
	});

	it("includes optional tipo in the POST body when provided", async () => {
		const getRes = makeOkResponse("<html></html>");
		const postRes = makeOkResponse("<html></html>");
		const session = makeSession(getRes, postRes);

		await buscarComponentesBody({ nivel: "G", tipo: 2 }, session);

		const postCallArgs = (session.kyInstance.post as ReturnType<typeof vi.fn>)
			.mock.calls[0];
		const body: URLSearchParams = postCallArgs[1].body;
		expect(body.get("form:checkTipo")).toBe("on");
		expect(body.get("form:tipo")).toBe("2");
	});

	it("includes optional nomeComponente in the POST body when provided", async () => {
		const session = makeSession(
			makeOkResponse("<html></html>"),
			makeOkResponse("<html></html>"),
		);

		await buscarComponentesBody(
			{ nivel: "G", nomeComponente: "Cálculo" },
			session,
		);

		const postCallArgs = (session.kyInstance.post as ReturnType<typeof vi.fn>)
			.mock.calls[0];
		const body: URLSearchParams = postCallArgs[1].body;
		expect(body.get("form:checkNome")).toBe("on");
		expect(body.get("form:j_id_jsp_190531263_13")).toBe("Cálculo");
	});
});

// ---------------------------------------------------------------------------
// Componente class
// ---------------------------------------------------------------------------
describe("Componente", () => {
	it("stores the constructor arguments as public properties", () => {
		const session = makeSession(makeOkResponse(""), makeOkResponse(""));
		const formObj = { key: "value" };
		const componente = new Componente(
			session,
			(body) => ({ raw: body }),
			"MCTA001-15",
			"Cálculo",
			"Disciplina",
			"36",
			formObj,
		);

		expect(componente.codigo).toBe("MCTA001-15");
		expect(componente.nome).toBe("Cálculo");
		expect(componente.tipo).toBe("Disciplina");
		expect(componente.cargaHoraria).toBe("36");
		expect(componente.formObj).toBe(formObj);
		expect(componente.session).toBe(session);
	});

	it("fetch() calls POST and returns the parsed result", async () => {
		const htmlBody = "<html><body>Component Details</body></html>";
		const postRes = makeOkResponse(htmlBody);
		const session = makeSession(makeOkResponse(""), postRes);

		const parseFn = vi.fn().mockReturnValue({ parsed: true });
		const componente = new Componente(
			session,
			parseFn,
			"MCTA001-15",
			"Cálculo",
			"Disciplina",
			"36",
			{ "formListagemComponentes:btnDetalhes": "Detalhes" },
		);

		const result = await componente.fetch();

		expect(
			(session.kyInstance.post as ReturnType<typeof vi.fn>).mock.calls.length,
		).toBe(1);
		expect(parseFn).toHaveBeenCalledOnce();
		expect(result).toEqual({ parsed: true });
	});

	it("fetch() throws when the server response is not 200", async () => {
		const session = makeSession(makeOkResponse(""), makeOkResponse("err", 503));

		const componente = new Componente(
			session,
			(b) => ({ raw: b }),
			"MCTA001-15",
			"Cálculo",
			"Disciplina",
			"36",
			{},
		);

		await expect(componente.fetch()).rejects.toThrow(
			"Failed to search components",
		);
	});
});
