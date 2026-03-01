import { getTextResponse } from "../../utils/helper";
import type { SigaaTypes } from "../client";
import type { SigaaSession } from "../session";

export async function buscarComponentesBody<T extends SigaaTypes>(
	options: BuscarComponentesBodyOptions<T>,
	session: SigaaSession,
): Promise<string> {
	// Use the session's Ky instance to make requests
	const kyInstance = session.ky_instance;

	// Initial GET request to maintain the session and capture the JSESSIONID from the response headers
	let res = await kyInstance.get(
		new URL("sigaa/public/componentes/busca_componentes.jsf", session.baseUrl),
	);

	// Check if the response is successful
	if (res.status !== 200) {
		throw new Error(
			`Failed to search components: ${res.status} ${res.statusText}`,
		);
	}

	// Prepare body parameters for the POST request
	const bodyParams = buildBodyParams(
		options.nivel,
		options.tipo,
		options.codComponente,
		options.nomeComponente,
	);

	// Make the POST request to search for components
	res = await kyInstance.post(
		new URL("sigaa/public/componentes/busca_componentes.jsf", session.baseUrl),
		{
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
				Referer: new URL(
					"sigaa/public/componentes/busca_componentes.jsf",
					session.baseUrl,
				).toString(),
			},
			body: bodyParams,
		},
	);

	// Check if the response is successful
	if (res.status !== 200) {
		throw new Error(
			`Failed to search components: ${res.status} ${res.statusText}`,
		);
	}

	return await getTextResponse(res);
}

function buildBodyParams(
	nivel: string,
	tipo: number | undefined = undefined,
	codComponente: string = "",
	nomeComponente: string = "",
) {
	const bodyParams = new URLSearchParams({
		form: "form",
		"form:nivel": nivel,
		// "form:checkTipo": tipo ? "on" : undefined,
		"form:tipo": tipo ? tipo.toString() : "0",
		// "form:checkCodigo": codComponente ? "on" : undefined,
		"form:j_id_jsp_190531263_11": codComponente,
		// "form:checkNome": nomeComponente ? "on" : undefined,
		"form:j_id_jsp_190531263_13": nomeComponente,
		// "form:checkUnidade"
		"form:unidades": "0",
		"form:btnBuscarComponentes": "Buscar Componentes",
		"javax.faces.ViewState": "j_id1",
	});

	// Set checkboxes based on provided parameters
	if (tipo) bodyParams.set("form:checkTipo", "on");
	if (codComponente) bodyParams.set("form:checkCodigo", "on");
	if (nomeComponente) bodyParams.set("form:checkNome", "on");

	return bodyParams;
}

// biome-ignore lint/suspicious/noExplicitAny: Unkown structure of the component details response, so we use a generic Record<string, any> type for flexibility
export class Componente<T extends Record<string, any>> {
	// Component details extracted from the search results
	public codigo: string;
	public nome: string;
	public tipo: string;
	public cargaHoraria: string;
	public formObj: Record<string, string>;

	public session: SigaaSession;

	private parseComponenteFn: (componenteBody: string) => T;

	constructor(
		session: SigaaSession,
		parseComponenteFn: (componenteBody: string) => T,
		codigo: string,
		nome: string,
		tipo: string,
		cargaHoraria: string,
		formObj: Record<string, string>,
	) {
		this.session = session;

		this.codigo = codigo;
		this.nome = nome;
		this.tipo = tipo;
		this.cargaHoraria = cargaHoraria;
		this.formObj = formObj;
		this.parseComponenteFn = parseComponenteFn;
	}

	public async fetch(): Promise<T> {
		// Use the session's Ky instance to make requests
		const kyInstance = this.session.ky_instance;

		// Prepare body parameters for the POST request to fetch component details
		const bodyParams = new URLSearchParams(this.formObj);

		// Set additional required/constant parameters for the request
		bodyParams.set("formListagemComponentes", "formListagemComponentes");
		bodyParams.set("javax.faces.ViewState", "j_id2");

		// Make the POST request to fetch component details
		const res = await kyInstance.post(
			new URL(
				"sigaa/public/componentes/busca_componentes.jsf",
				this.session.baseUrl,
			),
			{
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: bodyParams,
			},
		);

		// Check if the response is successful
		if (res.status !== 200) {
			throw new Error(
				`Failed to search components: ${res.status} ${res.statusText}`,
			);
		}

		const txt = await getTextResponse(res);
		return this.parseComponenteFn(txt);
	}
}

export interface BuscarComponentesBodyOptions<T extends SigaaTypes> {
	nivel: T["searchComponentNivel"];
	tipo?: T["searchComponentTipo"] | undefined;
	codComponente?: string;
	nomeComponente?: string;
}

export interface CurriculoComponente {
	Código: string;
	"Ano.Período de Implementação": string;
	"Matriz Curricular": string;
	Obrigatória: "Sim" | "Não";
	Período: number;
	Ativo: "Sim" | "Não";
}

export interface ComponenteResponse {
	// Dados Gerais do Componente Curricular
	"Tipo do Componente Curricular": string;
	"Modalidade de Educação": string;
	Código: string;
	Nome: string;
	"Pré-Requisitos": string[];
	"Co-Requisitos": string[];
	Equivalências: string[];
	"Ementa/Descrição": string;

	// Cargas Horárias - Aula
	/// Carga Horária de Aula - Presencial
	"Carga Horária de Aula Teórica - Presencial": string;
	"Carga Horária de Aula Prática - Presencial": string;
	"Carga Horária de Aula Extensionista - Presencial": string;
	/// Carga Horária de Aula - a Distância
	"Carga Horária de Aula Teórica - a Distância": string;
	"Carga Horária de Aula Prática - a Distância": string;
	"Carga Horária de Aula Extensionista - a Distância": string;

	// Currículos
	Currículos: CurriculoComponente[];
}
