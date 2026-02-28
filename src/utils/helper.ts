import type { CheerioAPI } from "cheerio";
import type { KyResponse } from "ky";

/**
 * Helper function to extract and trim text from a table field
 * @param $ - Cheerio instance
 * @param selector - CSS selector for the element to search (e.g., "th", "b")
 * @param searchText - Text to search for within the element
 * @returns Trimmed text from the corresponding td element
 */
export function getFieldValue(
	$: CheerioAPI,
	selector: string,
	searchText: string,
): string {
	return $(selector)
		.filter((_, el) => $(el).text().includes(searchText))
		.first()
		.closest("tr")
		.find("td")
		.text()
		.trim();
}

/**
 * Extracts the text content from the response, decoding it using the charset specified in the Content-Type header (defaulting to ISO-8859-1 if not specified).
 * @param res The KyResponse object from which to extract the text content.
 * @returns A promise that resolves to the decoded text content of the response.
 */
export async function getTextResponse(res: KyResponse): Promise<string> {
	const charset = parseCharset(res.headers.get("content-type"));
	return new TextDecoder(charset).decode(await res.arrayBuffer());
}

/**
 * Parses the charset from the Content-Type header. Defaults to ISO-8859-1 if not specified.
 * @param contentType The Content-Type header value from which to extract the charset.
 * @returns The charset string (e.g., "UTF-8", "ISO-8859-1").
 */
function parseCharset(contentType: string | null): string {
	const charsetMatch = contentType?.match(/charset=([^;]+)/i);
	return charsetMatch ? charsetMatch[1] : "ISO-8859-1";
}
