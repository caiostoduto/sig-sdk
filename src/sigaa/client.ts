import { SigClient } from "../sig/client";
import type { Componente } from "./public/searchComponents";

export abstract class SigaaClient<
	T extends SigaaTypes = SigaaTypes,
> extends SigClient {
	public abstract buscarComponentes(
		nivel: T["searchComponentNivel"],
		tipo: T["searchComponentTipo"] | undefined,
		codComponente: string,
		nomeComponente: string,
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	): Promise<Componente<Record<string, any>>[]>;
}

export interface SigaaTypes {
	searchComponentNivel: unknown;
	searchComponentTipo: unknown;
}
