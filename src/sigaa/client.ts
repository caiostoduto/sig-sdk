import { SigClient } from "../sig/client";
import type {
	BuscarComponentesBodyOptions,
	Componente,
} from "./public/searchComponents";

export abstract class SigaaClient<
	T extends SigaaTypes = SigaaTypes,
> extends SigClient {
	public abstract buscarComponentes(
		options: BuscarComponentesBodyOptions<T>,
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	): Promise<Componente<Record<string, any>>[]>;
}

export interface SigaaTypes {
	searchComponentNivel: string;
	searchComponentTipo: number;
}
