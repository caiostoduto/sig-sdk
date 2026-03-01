import type { CheerioAPI } from "cheerio";
import type { KyResponse } from "ky";

/**
 * Helper function to extract and trim text from a table field.
 * Works for both `<th>label</th><td>value</td>` and `<td>label</td><td>value</td>` patterns.
 * @param $ - Cheerio instance
 * @param selector - CSS selector for the label element to search (e.g., "th", "td", "b")
 * @param searchText - Text to search for within the label element
 * @returns Trimmed text from the next sibling td element
 */
export function getFieldValue(
	$: CheerioAPI,
	selector: string,
	searchText: string,
): string {
	const labelEl = $(selector)
		.filter((_, el) => {
			const $el = $(el);
			// Exclude ancestor elements that contain the search text only via descendants
			return $el.find(selector).length === 0 && $el.text().includes(searchText);
		})
		.first();

	// Navigate to the owning cell (the td/th that contains the label element),
	// then find the value td in the same row, excluding the label's cell.
	const labelCell = labelEl.closest("td, th");
	return labelEl
		.closest("tr")
		.children("td")
		.not(labelCell)
		.first()
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
