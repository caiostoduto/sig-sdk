/** biome-ignore-all lint/complexity/useLiteralKeys: Create an uniform pattern without unnecessary warnings */
import { PDFParse, type TableResult } from "pdf-parse";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import type { TextContent, TextItem } from "pdfjs-dist/types/src/display/api";

import { UFABCSigaaClient, UFABCSigaaSession } from "@/src/index";

// Cria uma sessão do UFABC Sigaa com as credenciais do usuário
const session = new UFABCSigaaSession({
	username: "...",
	password: "...",
});

// Emite o histórico do aluno usando o UFABCSigaaClient
const client = new UFABCSigaaClient(session);
const historico = await client.emitirHistorico();

// Carrega o PDF do histórico usando o pdfjs-dist e extrai o conteúdo da primeira página
// para obter os dados textuais do histórico (i.e: Nome, Matrícula, Curso, CR, etc)
// Nota: O pdfjs transfere/desanexa o ArrayBuffer internamente, portanto, clonamos o objeto antes de cada uso.
const pdf = await pdfjsLib.getDocument({
	data: historico.slice(0),
	verbosity: 0,
}).promise;
const firstPageTextContent = await (await pdf.getPage(1)).getTextContent();
const firstPageTextContentItems = getItemsFromTextContent(firstPageTextContent);
await pdf.destroy();

const dadosHistorico = parseDadosHistorico(firstPageTextContentItems);
console.log(dadosHistorico);

// Carrega o PDF do histórico usando o PDFParse para extrair as tabelas do histórico
// que contêm os componentes curriculares cursados pelo aluno
const parser = new PDFParse({ data: historico.slice(0) });
const tables = await parser.getTable();
await parser.destroy();

const componentesCurriculares = parseComponentesCurriculares(tables);
console.log(componentesCurriculares);

/**
 * Função para parsear os componentes curriculares a partir do resultado do PDFParse.
 * @param tableResult O resultado do PDFParse contendo as tabelas extraídas do PDF.
 * @returns Um array de objetos representando os componentes curriculares cursados pelo aluno.
 */
function parseComponentesCurriculares(tableResult: TableResult) {
	// Itera sobre as páginas e tabelas extraídas pelo PDFParse para encontrar as tabelas
	// que contêm os componentes curriculares cursados pelo aluno.
	const tables: ComponenteCurricular[] = tableResult.pages.flatMap((page) => {
		return page.tables.flatMap((table) => {
			if (table.length === 0 || table[0].length !== 9) return [];

			return table.slice(1).map((row) => {
				return {
					"Ano/Período Letivo": row[0],
					Categoria: row[1],
					"Código Componente": row[2].split("\n").join(""),
					"Nome Componente": row[3].split("\n").join(" "),
					Créditos: parseInt(row[4], 10),
					"Carga Horária": parseInt(row[5], 10),
					"Carga Horária Extensionista": parseInt(row[6], 10),
					Turma: row[7].split("\n").join(""),
					Conceito: row[8],
					Situação: row[9],
					"Docente(s)": row[10].split("\n").join(" ").split(" e "),
				};
			});
		});
	});

	// Junta as linhas das tabelas que foram quebradas em mais de uma página no
	// histórico pelo Sigaa
	for (let i = 0; i < tables.length; i++) {
		if (tables[i]["Ano/Período Letivo"] === "") {
			tables[i - 1]["Código Componente"] += tables[i]["Código Componente"];
			tables[i - 1]["Turma"] += tables[i]["Turma"];
			tables[i - 1]["Docente(s)"] = [
				...tables[i - 1]["Docente(s)"].slice(0, -1),
				tables[i - 1]["Docente(s)"][
					tables[i - 1]["Docente(s)"].length - 1
				].trimEnd() +
					" " +
					tables[i]["Docente(s)"][0],
				...tables[i]["Docente(s)"].slice(1),
			];

			tables.splice(i, 1);
			i--;
		}
	}

	return tables;
}

/**
 * Função para parsear os dados do histórico a partir dos itens de texto extraídos da primeira página do PDF.
 * @param items Os itens de texto extraídos da primeira página do PDF, ordenados por posição vertical e horizontal.
 * @returns Um objeto contendo os dados do histórico, como Nome, Matrícula, Curso, CR, etc.
 */
function parseDadosHistorico(items: Array<TextItem>) {
	const dados = {} as DadosHistorico;

	// Histórico Escolar
	dados["Nome"] =
		items[items.findIndex((item) => item.str === "Nome:") + 1].str;
	dados["Matricula"] =
		items[items.findIndex((item) => item.str === "Matrícula:") + 1].str;

	// Dados do Vínculo do Discente
	dados["Curso"] =
		items[items.findIndex((item) => item.str === "Curso:") + 1].str;
	dados["Status Discente"] =
		items[items.findIndex((item) => item.str === "Discente:") - 1].str;
	dados["Currículo"] =
		items[items.findIndex((item) => item.str === "Currículo:") + 1].str;
	dados["Modalidade"] =
		items[items.findIndex((item) => item.str === "Modalidade:") + 1].str;
	dados["Campus"] =
		items[items.findIndex((item) => item.str === "Campus:") + 1].str;
	dados["Turno"] = items[items.findIndex((item) => item.str === "Turno:") + 1]
		.str as "M" | "N";
	dados["Ano / Período Letivo Inicial"] =
		items[
			items.findIndex((item) => item.str === "Ano / Período Letivo Inicial:") +
				1
		].str;

	// Coeficientes de Desempenho
	dados["Coeficiente de Rendimento (CR)"] = parseFloat(
		items[items.findIndex((item) => item.str.endsWith("(CR)")) + 1].str,
	);
	dados["Coeficiente de Aproveitamento (CA)"] = parseFloat(
		items[items.findIndex((item) => item.str.endsWith("(CA)")) + 1].str,
	);
	dados["Coeficiente de Progressão (CP)"] = parseFloat(
		items[items.findIndex((item) => item.str.endsWith("(CP)")) + 1].str,
	);
	dados["Coeficiente de Afinidade (IK)"] = parseFloat(
		items[items.findIndex((item) => item.str.endsWith("(IK)")) + 1].str,
	);
	dados["Coeficiente de Rendimento ECE/QS (CRECE)"] = parseFloat(
		items[items.findIndex((item) => item.str.endsWith("(CRECE)")) + 1].str,
	);
	dados["Coeficiente de Aproveitamento ECE/QS (CAECE)"] = parseFloat(
		items[items.findIndex((item) => item.str.endsWith("(CAECE)")) + 1].str,
	);
	dados["Coeficiente de Progressão ECE/QS (CPECE)"] = parseFloat(
		items[items.findIndex((item) => item.str.endsWith("(CPECE)")) + 1].str,
	);
	dados["Coeficiente de Afinidade ECE/QS (IKECE)"] = parseFloat(
		items[items.findIndex((item) => item.str.endsWith("(IKECE)")) + 1].str,
	);
	dados["Coeficiente de Aproveitamento de Integralização (CAIK)"] = parseFloat(
		items[items.findIndex((item) => item.str.endsWith("(CAIK)")) + 1].str,
	);

	return dados;
}

/**
 * Função para filtrar e ordenar os itens de texto extraídos da primeira página do PDF.
 * @param textContent O conteúdo de texto extraído da primeira página do PDF, contendo os itens de texto com suas posições e transformações.
 * @returns Um array de itens de texto filtrados para remover os vazios e ordenados por posição vertical (de cima para baixo) e depois por posição horizontal (da esquerda para a direita).
 */
function getItemsFromTextContent(textContent: TextContent) {
	// Filtra os itens para remover os vazios e ordena por posição vertical (de cima para baixo)
	// e depois por posição horizontal (da esquerda para a direita)
	const items = (textContent.items as Array<TextItem>)
		.filter((v) => v.str.trim() !== "")
		.sort(
			(a, b) =>
				b.transform[5] - a.transform[5] || a.transform[4] - b.transform[4],
		);

	return items;
}

interface DadosHistorico {
	Nome: string;
	Matricula: string;
	Curso: string;
	"Status Discente": string;
	Currículo: string;
	Modalidade: string;
	Campus: string;
	Turno: "M" | "N";
	"Ano / Período Letivo Inicial": string;
	"Coeficiente de Rendimento (CR)": number;
	"Coeficiente de Aproveitamento (CA)": number;
	"Coeficiente de Progressão (CP)": number;
	"Coeficiente de Afinidade (IK)": number;
	"Coeficiente de Rendimento ECE/QS (CRECE)": number;
	"Coeficiente de Aproveitamento ECE/QS (CAECE)": number;
	"Coeficiente de Progressão ECE/QS (CPECE)": number;
	"Coeficiente de Afinidade ECE/QS (IKECE)": number;
	"Coeficiente de Aproveitamento de Integralização (CAIK)": number;
}

interface ComponenteCurricular {
	"Ano/Período Letivo": string;
	Categoria: string;
	"Código Componente": string;
	"Nome Componente": string;
	Créditos: number;
	"Carga Horária": number;
	"Carga Horária Extensionista": number;
	Turma: string;
	Conceito: string;
	Situação: string;
	"Docente(s)": Array<string>;
}
