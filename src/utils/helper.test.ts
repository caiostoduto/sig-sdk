import * as cheerio from "cheerio";
import type { KyResponse } from "ky";
import { describe, expect, it } from "vitest";
import { getFieldValue, getTextResponse } from "./helper";

// ---------------------------------------------------------------------------
// getFieldValue
// ---------------------------------------------------------------------------
describe("getFieldValue", () => {
	it("extracts value from a th/td row", () => {
		const $ = cheerio.load(
			"<table><tr><th>Nome:</th><td>Cálculo</td></tr></table>",
		);
		expect(getFieldValue($, "th", "Nome:")).toBe("Cálculo");
	});

	it("extracts value from a b element inside a td", () => {
		const $ = cheerio.load(
			"<table><tr><td><b>Modalidade de Educação:</b></td><td>Presencial</td></tr></table>",
		);
		expect(getFieldValue($, "b", "Modalidade de Educação:")).toBe("Presencial");
	});

	it("returns an empty string when the label is not found", () => {
		const $ = cheerio.load(
			"<table><tr><th>Código:</th><td>123</td></tr></table>",
		);
		expect(getFieldValue($, "th", "Inexistente:")).toBe("");
	});

	it("trims whitespace from the extracted value", () => {
		const $ = cheerio.load(
			"<table><tr><th>Código:</th><td>  MCTA001-15  </td></tr></table>",
		);
		expect(getFieldValue($, "th", "Código:")).toBe("MCTA001-15");
	});

	it("does not match a label that only appears inside a nested element", () => {
		// The outer <th> contains a nested <th> with the matching text. The
		// filter in getFieldValue excludes ancestors that have matching descendants.
		const $ = cheerio.load(
			"<table><tr><th><th>Nome:</th></th><td>Algébra</td></tr></table>",
		);
		// The inner <th> should match, not the outer one; value should still be found
		expect(getFieldValue($, "th", "Nome:")).toBe("Algébra");
	});

	it("returns only the first matching label's value", () => {
		const $ = cheerio.load(`
      <table>
        <tr><th>Nome:</th><td>Primeiro</td></tr>
        <tr><th>Nome:</th><td>Segundo</td></tr>
      </table>
    `);
		expect(getFieldValue($, "th", "Nome:")).toBe("Primeiro");
	});
});

// ---------------------------------------------------------------------------
// getTextResponse
// ---------------------------------------------------------------------------

function makeKyResponse(
	body: ArrayBuffer,
	contentType: string | null,
): KyResponse {
	return {
		headers: { get: (_: string) => contentType },
		arrayBuffer: async () => body,
	} as unknown as KyResponse;
}

describe("getTextResponse", () => {
	it("decodes body as ISO-8859-1 when no charset is specified", async () => {
		// ISO-8859-1 byte for 'é' is 0xe9
		const buf = new Uint8Array([72, 101, 108, 108, 111]).buffer; // "Hello"
		const res = makeKyResponse(buf, "text/html");
		expect(await getTextResponse(res)).toBe("Hello");
	});

	it("decodes body as UTF-8 when charset=UTF-8 is specified", async () => {
		const text = "Héllo";
		const buf = new TextEncoder().encode(text).buffer;
		const res = makeKyResponse(buf, "text/html; charset=UTF-8");
		expect(await getTextResponse(res)).toBe(text);
	});

	it("handles charset in uppercase", async () => {
		const text = "test";
		const buf = new TextEncoder().encode(text).buffer;
		const res = makeKyResponse(buf, "text/html; CHARSET=UTF-8");
		expect(await getTextResponse(res)).toBe(text);
	});

	it("defaults to ISO-8859-1 when content-type header is null", async () => {
		const buf = new Uint8Array([72, 105]).buffer; // "Hi"
		const res = makeKyResponse(buf, null);
		expect(await getTextResponse(res)).toBe("Hi");
	});
});
