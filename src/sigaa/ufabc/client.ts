/** biome-ignore-all lint/complexity/useLiteralKeys: Create an uniform pattern without unnecessary warnings */
import * as cheerio from "cheerio";
import { getFieldValue } from "../../utils/helper";
import { emitirHistoricoPDF } from "../authenticated/emitirHistorico";
import { SigaaClient, type SigaaTypes } from "../client";
import {
	type BuscarComponentesBodyOptions,
	buscarComponentesBody,
	Componente,
	type ComponenteResponse,
	type CurriculoComponente,
} from "../public/searchComponents";
import { UFABCSigaaSession } from "./session";

export class UFABCSigaaClient extends SigaaClient<UFABCSigaaTypes> {
	constructor(ufabcSigaaSession?: UFABCSigaaSession) {
		// Create a new session for the UFABC Sigaa client if one is not provided
		ufabcSigaaSession = ufabcSigaaSession ?? new UFABCSigaaSession();

		super(ufabcSigaaSession);
	}

	public async emitirHistorico() {
		const session = this.session as UFABCSigaaSession;
		const arrayBuffer = await emitirHistoricoPDF(session);
	}

	public async buscarComponentes(
		options: BuscarComponentesBodyOptions<UFABCSigaaTypes>,
	): Promise<Componente<UFABCComponenteResponse>[]> {
		// Get the current session
		const session = this.session as UFABCSigaaSession;

		// Fetch the components body using the provided search parameters
		const componentesBody = await buscarComponentesBody(options, session);

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
		.replace(/^"|"$/g, "")
		.split("\n")
		.map((ref) => ref.trim())
		.filter(
			(ref) => ref !== "" && ref.toUpperCase() !== "BIBLIOGRAFIA COMPLEMENTAR",
		);

	componente["Carga Horária de Estudo Individual"] = getFieldValue(
		$,
		"td",
		"Carga Horária de Estudo Individual",
	);

	componente["Carga Horária de Aula Teórica - Presencial"] = getFieldValue(
		$,
		"td",
		"Carga Horária de Aula Teórica - Presencial",
	);

	componente["Carga Horária de Aula Prática - Presencial"] = getFieldValue(
		$,
		"td",
		"Carga Horária de Aula Prática - Presencial",
	);

	componente["Carga Horária de Aula Extensionista - Presencial"] =
		getFieldValue($, "td", "Carga Horária de Aula Extensionista - Presencial");

	componente["Carga Horária de Aula Teórica - a Distância"] = getFieldValue(
		$,
		"td",
		"Carga Horária de Aula Teórica - a Distância",
	);

	componente["Carga Horária de Aula Prática - a Distância"] = getFieldValue(
		$,
		"td",
		"Carga Horária de Aula Prática - a Distância",
	);

	componente["Carga Horária de Aula Extensionista - a Distância"] =
		getFieldValue($, "td", "Carga Horária de Aula Extensionista - a Distância");

	componente["Currículos"] = $("table#listaCurriculosComponente > tbody > tr")
		.toArray()
		.map((tr) => {
			const tds = $(tr).find("td");

			const curriculo = {} as CurriculoComponente;
			curriculo["Código"] = tds.eq(0).text().trim();
			curriculo["Ano.Período de Implementação"] = tds.eq(1).text().trim();
			curriculo["Matriz Curricular"] = tds.eq(2).text().trim();
			curriculo["Obrigatória"] = tds.eq(3).text().trim() as "Sim" | "Não";
			curriculo["Período"] = parseInt(tds.eq(4).text().trim(), 10);
			curriculo["Ativo"] = tds.eq(5).text().trim() as "Sim" | "Não";

			return curriculo;
		});

	return componente;
}

interface UFABCSigaaTypes extends SigaaTypes {
	searchComponentNivel: UFABCSigaaSearchComponentsNivel;
	searchComponentTipo: UFABCSigaaSearchComponentsTipo;
}

export enum UFABCSigaaSearchComponentsNivel {
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

export enum UFABCSigaaSearchComponentsTipo {
	DISCIPLINA = 2,
	ATIVIDADE = 1,
	BLOCO = 4,
	MODULO = 3,
}

interface UFABCComponenteResponse extends ComponenteResponse {
	// Dados Gerais do Componente Curricular
	Referências: string[];
	"Carga Horária de Estudo Individual": string;
	"Carga Horária de Aula Teórica - Presencial": string;
	"Carga Horária de Aula Prática - Presencial": string;
	"Carga Horária de Aula Extensionista - Presencial": string;
	"Carga Horária de Aula Teórica - a Distância": string;
	"Carga Horária de Aula Prática - a Distância": string;
	"Carga Horária de Aula Extensionista - a Distância": string;
}
