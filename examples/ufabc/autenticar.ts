import { assert } from "console";
import { UFABCSigaaSession } from "@/src/index";

const session = new UFABCSigaaSession({
	username: "...",
	password: "...",
});

// Antes de autenticar, os valores devem ser nulos
assert(session.getJessionId() === null);
assert(session.getJsessionLastUpdate() === null);

// Autentica a sessão
await session.login();
// Depois de autenticar, os valores devem ser preenchidos
assert(session.getJessionId() !== null);
assert(session.getJsessionLastUpdate() !== null);

console.log("Sessão autenticada com sucesso!");

// Encerra a sessão
await session.logout();
// Após encerrar a sessão, os valores devem ser nulos
assert(session.getJessionId() === null);
assert(session.getJsessionLastUpdate() === null);
console.log("Sessão encerrada com sucesso!");
