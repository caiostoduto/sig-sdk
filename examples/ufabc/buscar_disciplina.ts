import { UFABCSigaaClient, UFABCSigaaSearchComponentsNivel } from "@/src/index";

// Cria instância de UFABCSigaaClient com sessão padrão (não autenticada)
const client = new UFABCSigaaClient();

// Busca componentes com código "MCCC004" no nível de graduação
const components = await client.buscarComponentes({
	nivel: UFABCSigaaSearchComponentsNivel.GRADUACAO,
	codComponente: "MCCC004",
});
console.log(components[0]);

// Busca detalhes do primeiro componente encontrado
const component = await components[0].fetch();
console.log(component);
