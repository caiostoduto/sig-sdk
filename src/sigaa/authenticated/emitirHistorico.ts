import type { SigaaSession } from "../session";

export async function emitirHistoricoPDF(
	session: SigaaSession,
): Promise<ArrayBuffer> {
	// Ensure the user is logged in before attempting to emit the historical record
	await session.login();

	// Use the session's Ky instance to make requests
	const kyInstance = session.ky_instance;

	// Initial GET request to maintain the session and capture the JSESSIONID from the response headers
	let res = await kyInstance.get(
		new URL("sigaa/portais/discente/discente.jsf", session.baseUrl),
	);

	// Check if the initial request was successful
	if (res.status !== 200 || res.redirected) {
		throw new Error(
			`Failed to access student portal: ${res.status} ${res.statusText}`,
		);
	}

	// Extract the form ID from the response body using a regular expression
	const matches = (await res.text()).match(
		/<input type="hidden" name="id" value="(\d+)"\/>/,
	);

	// If the form ID could not be extracted, throw an error
	if (!matches) {
		throw new Error("Failed to extract form ID from the response.");
	}

	const formId: number = parseInt(matches[1], 10);

	res = await kyInstance.post(
		new URL("/sigaa/portais/discente/discente.jsf", session.baseUrl),
		{
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				Referer: new URL(
					"/sigaa/portais/discente/discente.jsf",
					session.baseUrl,
				).toString(),
			},
			body: new URLSearchParams({
				"menu:form_menu_discente": "menu:form_menu_discente",
				id: formId.toString(),
				jscook_action:
					"menu_form_menu_discente_discente_menu:A]#{ portalDiscente.historico }",
				"javax.faces.ViewState": "j_id1",
			}),
		},
	);

	if (res.status !== 200 || res.redirected) {
		throw new Error(
			`Failed to emit historical record: ${res.status} ${res.statusText}`,
		);
	}

	// The response should be a PDF file, so we can return the bytes directly
	return res.arrayBuffer();
}
