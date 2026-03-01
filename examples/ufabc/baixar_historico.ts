import { UFABCSigaaClient, UFABCSigaaSession } from "@/src/index";

// Cria uma sessão do UFABC Sigaa com as credenciais do usuário
const session = new UFABCSigaaSession({
	username: "...",
	password: "...",
});

// Emite o histórico do aluno usando o UFABCSigaaClient
const client = new UFABCSigaaClient(session);
const historico = await client.emitirHistorico();

// (node) Salva o histórico em um arquivo PDF
import { writeFileSync } from "node:fs";

writeFileSync("historico.pdf", new Uint8Array(historico));
console.log("Histórico salvo como historico.pdf");
