import { SigClient } from "../sig/client";
import type {
	BuscarComponentesBodyOptions,
	Componente,
} from "./public/searchComponents";

export abstract class SigaaClient<
	T extends SigaaTypes = SigaaTypes,
> extends SigClient {
	public abstract emitirHistorico(): Promise<void>;

	public abstract buscarComponentes(
		options: BuscarComponentesBodyOptions<T>,
		// biome-ignore lint/suspicious/noExplicitAny: Unkown structure of the component details response, so we use a generic Record<string, any> type for flexibility
	): Promise<Componente<Record<string, any>>[]>;
}

export interface SigaaTypes {
	searchComponentNivel: string;
	searchComponentTipo: number;
}
