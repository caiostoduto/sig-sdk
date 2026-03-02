/** biome-ignore-all lint/complexity/useLiteralKeys: Create an uniform pattern without unnecessary warnings */
import { describe, expect, it, vi } from "vitest";
import {
	UFABCSigaaClient,
	UFABCSigaaSearchComponentsNivel,
	UFABCSigaaSearchComponentsTipo,
} from "./client";
import type { UFABCSigaaSession } from "./session";

// ---------------------------------------------------------------------------
// Minimal fake HTML for the components table
// ---------------------------------------------------------------------------
const COMPONENT_LIST_HTML = `
<html><body>
<table class="listagem">
  <tbody>
    <tr>
      <td>MCTA001-15</td>
      <td>Cálculo</td>
      <td>Disciplina</td>
      <td>36</td>
      <td><a onclick="jsfcljs(form),{'btnKey':'btnVal'},url">Detalhar</a></td>
    </tr>
    <tr>
      <td>ESTO001-13</td>
      <td>Bases Computacionais</td>
      <td>Disciplina</td>
      <td>36</td>
      <td><a onclick="jsfcljs(form),{'btn2Key':'btn2Val'},url2">Detalhar</a></td>
    </tr>
  </tbody>
</table>
</body></html>
`;

const EMPTY_LIST_HTML = `<html><body><table class="listagem"><tbody></tbody></table></body></html>`;

// ---------------------------------------------------------------------------
// Build a minimal mock UFABCSigaaSession
// ---------------------------------------------------------------------------
function makeSession(
	getBody = "<html></html>",
	postBody = COMPONENT_LIST_HTML,
): UFABCSigaaSession {
	const makeResp = (body: string) =>
		new Response(body, {
			status: 200,
			headers: { "content-type": "text/html; charset=UTF-8" },
		});

	return {
		baseUrl: new URL("https://sig.ufabc.edu.br/sigaa"),
		login: vi.fn().mockResolvedValue(undefined),
		kyInstance: {
			get: vi.fn().mockResolvedValue(makeResp(getBody)),
			post: vi.fn().mockResolvedValue(makeResp(postBody)),
		},
	} as unknown as UFABCSigaaSession;
}

// ---------------------------------------------------------------------------
// UFABCSigaaSearchComponentsNivel / UFABCSigaaSearchComponentsTipo enums
// ---------------------------------------------------------------------------
describe("UFABCSigaaSearchComponentsNivel enum", () => {
	it("has the expected values", () => {
		expect(UFABCSigaaSearchComponentsNivel.GRADUACAO).toBe("G");
		expect(UFABCSigaaSearchComponentsNivel.TECNICO).toBe("T");
		expect(UFABCSigaaSearchComponentsNivel.STRICTO_SENSU).toBe("S");
		expect(UFABCSigaaSearchComponentsNivel.FUNDAMENTAL).toBe("U");
		expect(UFABCSigaaSearchComponentsNivel.MEDIO).toBe("M");
	});
});

describe("UFABCSigaaSearchComponentsTipo enum", () => {
	it("has the expected numeric values", () => {
		expect(UFABCSigaaSearchComponentsTipo.DISCIPLINA).toBe(2);
		expect(UFABCSigaaSearchComponentsTipo.ATIVIDADE).toBe(1);
		expect(UFABCSigaaSearchComponentsTipo.BLOCO).toBe(4);
		expect(UFABCSigaaSearchComponentsTipo.MODULO).toBe(3);
	});
});

// ---------------------------------------------------------------------------
// UFABCSigaaClient - buscarComponentes
// ---------------------------------------------------------------------------
describe("UFABCSigaaClient - buscarComponentes", () => {
	it("returns an array of Componente instances parsed from the HTML table", async () => {
		const session = makeSession();
		const client = new UFABCSigaaClient(session);

		const components = await client.buscarComponentes({
			nivel: UFABCSigaaSearchComponentsNivel.GRADUACAO,
		});

		expect(components).toHaveLength(2);
		expect(components[0].codigo).toBe("MCTA001-15");
		expect(components[0].nome).toBe("Cálculo");
		expect(components[0].tipo).toBe("Disciplina");
		expect(components[0].cargaHoraria).toBe("36");

		expect(components[1].codigo).toBe("ESTO001-13");
		expect(components[1].nome).toBe("Bases Computacionais");
	});

	it("returns an empty array when the table has no rows", async () => {
		const session = makeSession("<html></html>", EMPTY_LIST_HTML);
		const client = new UFABCSigaaClient(session);

		const components = await client.buscarComponentes({
			nivel: UFABCSigaaSearchComponentsNivel.GRADUACAO,
		});

		expect(components).toHaveLength(0);
	});

	it("parses the formObj from the onclick attribute of each row", async () => {
		const session = makeSession();
		const client = new UFABCSigaaClient(session);

		const components = await client.buscarComponentes({
			nivel: UFABCSigaaSearchComponentsNivel.GRADUACAO,
		});

		expect(components[0].formObj).toEqual({ btnKey: "btnVal" });
		expect(components[1].formObj).toEqual({ btn2Key: "btn2Val" });
	});

	it("uses an empty formObj when the onclick attribute is missing", async () => {
		const html = `
      <html><body>
      <table class="listagem"><tbody>
        <tr>
          <td>CODE-01</td><td>Nome</td><td>Tipo</td><td>36</td>
          <td><a>No onclick</a></td>
        </tr>
      </tbody></table>
      </body></html>
    `;
		const session = makeSession("<html></html>", html);
		const client = new UFABCSigaaClient(session);

		const components = await client.buscarComponentes({
			nivel: UFABCSigaaSearchComponentsNivel.GRADUACAO,
		});

		expect(components[0].formObj).toEqual({});
	});
});

// ---------------------------------------------------------------------------
// parseComponente - tested via Componente.fetch()
// ---------------------------------------------------------------------------
const COMPONENTE_DETAIL_HTML = `
<html><body>
<table>
  <tr><th>Tipo do Componente Curricular:</th><td>Disciplina</td></tr>
  <tr><td><b>Modalidade de Educação:</b></td><td>Presencial</td></tr>
  <tr><th>Código:</th><td>MCTA001-15</td></tr>
  <tr><th>Nome:</th><td>Cálculo</td></tr>
  <tr><th>Pré-Requisitos:</th><td>MCTA002-13 MCTA003-13</td></tr>
  <tr><th>Co-Requisitos:</th><td></td></tr>
  <tr><th>Equivalências:</th><td></td></tr>
  <tr><th>Ementa/Descrição:</th><td>Ementa da disciplina.</td></tr>
  <tr><th>Referências:</th><td>"Livro A\nBIBLIOGRAFIA COMPLEMENTAR\nLivro B"</td></tr>
  <tr><td>Carga Horária de Estudo Individual</td><td>2</td></tr>
  <tr><td>Carga Horária de Aula Teórica - Presencial</td><td>4</td></tr>
  <tr><td>Carga Horária de Aula Prática - Presencial</td><td>0</td></tr>
  <tr><td>Carga Horária de Aula Extensionista - Presencial</td><td>0</td></tr>
  <tr><td>Carga Horária de Aula Teórica - a Distância</td><td>0</td></tr>
  <tr><td>Carga Horária de Aula Prática - a Distância</td><td>0</td></tr>
  <tr><td>Carga Horária de Aula Extensionista - a Distância</td><td>0</td></tr>
</table>
<table id="listaCurriculosComponente">
  <tbody>
    <tr>
      <td>BC0005-15</td>
      <td>2015.1</td>
      <td>Bacharelado em Ciência e Tecnologia</td>
      <td>Sim</td>
      <td>1</td>
      <td>Sim</td>
    </tr>
  </tbody>
</table>
</body></html>
`;

describe("parseComponente (via Componente.fetch)", () => {
	it("parses all standard fields from the detail HTML", async () => {
		const makeResp = (body: string) =>
			new Response(body, {
				status: 200,
				headers: { "content-type": "text/html; charset=UTF-8" },
			});

		const session = makeSession();
		const client = new UFABCSigaaClient(session);

		// 1st POST: return the components list HTML so buscarComponentes returns rows
		(session.kyInstance.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			makeResp(COMPONENT_LIST_HTML),
		);

		const components = await client.buscarComponentes({
			nivel: UFABCSigaaSearchComponentsNivel.GRADUACAO,
		});

		// 2nd POST: return the component detail HTML for fetch()
		(session.kyInstance.post as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
			makeResp(COMPONENTE_DETAIL_HTML),
		);

		const detail = await components[0].fetch();

		expect(detail["Tipo do Componente Curricular"]).toBe("Disciplina");
		expect(detail["Modalidade de Educação"]).toBe("Presencial");
		expect(detail["Código"]).toBe("MCTA001-15");
		expect(detail["Nome"]).toBe("Cálculo");
		expect(detail["Ementa/Descrição"]).toBe("Ementa da disciplina.");
	});

	it("parses Pré-Requisitos as an array of component codes", async () => {
		const makeResp = (body: string) =>
			new Response(body, {
				status: 200,
				headers: { "content-type": "text/html; charset=UTF-8" },
			});

		const session = makeSession();
		const client = new UFABCSigaaClient(session);

		// 1st call: buscarComponentes (GET + POST for list)
		(session.kyInstance.get as ReturnType<typeof vi.fn>).mockResolvedValue(
			makeResp("<html></html>"),
		);
		(session.kyInstance.post as ReturnType<typeof vi.fn>).mockResolvedValue(
			makeResp(COMPONENT_LIST_HTML),
		);
		const components = await client.buscarComponentes({
			nivel: UFABCSigaaSearchComponentsNivel.GRADUACAO,
		});

		// 2nd call: fetch detail
		(session.kyInstance.post as ReturnType<typeof vi.fn>).mockResolvedValue(
			makeResp(COMPONENTE_DETAIL_HTML),
		);
		const detail = await components[0].fetch();

		expect(Array.isArray(detail["Pré-Requisitos"])).toBe(true);
		// The HTML has "MCTA002-13 MCTA003-13" which matches the code-pattern regex
		expect(detail["Pré-Requisitos"]).toEqual(["MCTA002-13", "MCTA003-13"]);
		expect(detail["Co-Requisitos"]).toEqual([]);
	});

	it("parses Currículos table rows", async () => {
		const makeResp = (body: string) =>
			new Response(body, {
				status: 200,
				headers: { "content-type": "text/html; charset=UTF-8" },
			});

		const session = makeSession();
		const client = new UFABCSigaaClient(session);

		(session.kyInstance.get as ReturnType<typeof vi.fn>).mockResolvedValue(
			makeResp("<html></html>"),
		);
		(session.kyInstance.post as ReturnType<typeof vi.fn>).mockResolvedValue(
			makeResp(COMPONENT_LIST_HTML),
		);
		const components = await client.buscarComponentes({
			nivel: UFABCSigaaSearchComponentsNivel.GRADUACAO,
		});

		(session.kyInstance.post as ReturnType<typeof vi.fn>).mockResolvedValue(
			makeResp(COMPONENTE_DETAIL_HTML),
		);
		const detail = await components[0].fetch();

		expect(detail["Currículos"]).toHaveLength(1);
		expect(detail["Currículos"][0]["Código"]).toBe("BC0005-15");
		expect(detail["Currículos"][0]["Obrigatória"]).toBe("Sim");
		expect(detail["Currículos"][0]["Período"]).toBe(1);
	});
});
