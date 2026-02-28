import * as cheerio from "cheerio";
import { getFieldValue } from "../../utils/helper";
import { SigaaClient, type SigaaTypes } from "../client";
import {
	buscarComponentesBody,
	Componente,
	type ComponenteResponse,
} from "../public/searchComponents";
import { UFABCSigaaSession } from "./session";

export const SIGAA_BASE_URL = new URL("https://sig.ufabc.edu.br/sigaa");
export const EXPIRE_SESSION_AFTER_MINUTES = 25;

export class UFABCSigaaClient extends SigaaClient<UFABCSigaaTypes> {
	constructor() {
		super(SIGAA_BASE_URL);
	}

	public async buscarComponentes(
		nivel: SigaaSearchComponentsNivel,
		tipo: SigaaSearchComponentsTipo | undefined = undefined,
		codComponente: string = "",
		nomeComponente: string = "",
	): Promise<Componente<UFABCComponenteResponse>[]> {
		// Create a new session for the UFABC Sigaa client
		const session = new UFABCSigaaSession(
			SIGAA_BASE_URL,
			EXPIRE_SESSION_AFTER_MINUTES,
		);

		// Fetch the components body using the provided search parameters
		const componentesBody = await buscarComponentesBody(
			session,
			nivel,
			tipo,
			codComponente,
			nomeComponente,
		);

		// Parse the components body and return the found components
		return this.parseComponentesBody(session, componentesBody);
	}

	private parseComponentesBody(session: UFABCSigaaSession, body: string) {
		// Load the HTML response into Cheerio for parsing
		const $ = cheerio.load(body);

		// Initialize an array to hold the found components
		const components = [];

		// Select all rows in the components table and extract relevant information
		const trs = $("table.listagem > tbody > tr");
		for (const tr of trs) {
			const tds = $(tr).find("td");

			// Extract component details from the table cells
			const codigo = tds.eq(0).text();
			const nome = tds.eq(1).text();
			const tipo = tds.eq(2).text();
			const cargaHoraria = tds.eq(3).text();

			// Extract the form element data from the onclick attribute
			const onclick = $(tr).find("a").eq(0).attr("onclick");
			const formObjStr = onclick?.match(/jsfcljs\(.+\),({.+}),/)?.[1] ?? "{}";
			const formObj: Record<string, string> = JSON.parse(
				formObjStr.replace(/'/g, '"'),
			);

			// Create a new ComponentsFound instance and add it to the components array
			components.push(
				new Componente<UFABCComponenteResponse>(
					session,
					parseComponente,
					codigo,
					nome,
					tipo,
					cargaHoraria,
					formObj,
				),
			);
		}

		// Return the array of found components
		return components;
	}
}

function parseComponente(componenteBody: string): UFABCComponenteResponse {
	const componente = {} as UFABCComponenteResponse;
	const $ = cheerio.load(componenteBody);

	componente["Tipo do Componente Curricular"] = getFieldValue(
		$,
		"th",
		"Tipo do Componente Curricular:",
	);

	componente["Modalidade de Educação"] = getFieldValue(
		$,
		"b",
		"Modalidade de Educação:",
	);

	componente["Código"] = getFieldValue($, "th", "Código:");

	componente["Nome"] = getFieldValue($, "th", "Nome:");

	componente["Pré-Requisitos"] =
		getFieldValue($, "th", "Pré-Requisitos:").match(/([A-Z]{4}\d{3}-\d{2})/g) ??
		[];

	componente["Co-Requisitos"] =
		getFieldValue($, "th", "Co-Requisitos:").match(/([A-Z]{4}\d{3}-\d{2})/g) ??
		[];

	componente["Equivalências"] =
		getFieldValue($, "th", "Equivalências:").match(/([A-Z]{4}\d{3}-\d{2})/g) ??
		[];

	componente["Ementa/Descrição"] = getFieldValue($, "th", "Ementa/Descrição:");

	componente["Referências"] = getFieldValue($, "th", "Referências:")
		.split("\n")
		.map((ref) => ref.trim())
		.filter(
			(ref) => ref !== "" && ref.toUpperCase() !== "BIBLIOGRAFIA COMPLEMENTAR",
		);

	return componente;
}

interface UFABCSigaaTypes extends SigaaTypes {
	searchComponentNivel: SigaaSearchComponentsNivel;
	searchComponentTipo: SigaaSearchComponentsTipo;
}

export enum SigaaSearchComponentsNivel {
	INFANTIL = "I",
	FUNDAMENTAL = "U",
	MEDIO = "M",
	TECNICO = "T",
	INTEGRADO = "N",
	FORMACAO_COMPLEMENTAR = "F",
	GRADUACAO = "G",
	LATO_SENSU_ESPECIALIZACAO = "L",
	LATO_SENSU_RESIDENCIA = "R",
	STRICTO_SENSU = "S",
}

export enum SigaaSearchComponentsTipo {
	DISCIPLINA = 2,
	ATIVIDADE = 1,
	BLOCO = 4,
	MODULO = 3,
}

interface UFABCComponenteResponse extends ComponenteResponse {
	// Dados Gerais do Componente Curricular
	Referências: string[];
}
