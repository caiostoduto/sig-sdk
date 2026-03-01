import { UFABCSigaaClient, UFABCSigaaSearchComponentsNivel } from "@/src/index";

// Create a new instance of the UFABCSigaaClient with the default session (unauthenticated)
const client = new UFABCSigaaClient();

// Search for components with the specified parameters (e.g.: undergraduate level and component code "MCCC004")
const components = await client.buscarComponentes({
	nivel: UFABCSigaaSearchComponentsNivel.GRADUACAO,
	codComponente: "MCCC004",
});
console.log(components[0]);

// Fetch the details of the first found component and log it
const component = await components[0].fetch();
console.log(component);
