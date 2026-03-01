import { UFABCSigaaSession } from "@/src/index";

// Cria uma sessão do UFABC Sigaa com as credenciais do usuário
const session = new UFABCSigaaSession({
	username: "...",
	password: "...",
});

// Autentica a sessão
await session.login();
console.log("Sessão autenticada com sucesso!");

// Realiza as operações desejadas com a sessão autenticada ...

// Encerra a sessão
await session.logout();
console.log("Sessão encerrada com sucesso!");
