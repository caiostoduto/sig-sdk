import { SigaaSession } from "../session";

export const SIGAA_BASE_URL = new URL("https://sig.ufabc.edu.br/sigaa");
export const EXPIRE_SESSION_AFTER_MINUTES = 25;

export class UFABCSigaaSession extends SigaaSession {
	constructor() {
		super(SIGAA_BASE_URL, EXPIRE_SESSION_AFTER_MINUTES);
	}

	public async login() {
		// Check if username and password are provided in the options before attempting to log in
		if (
			this.options.password === undefined ||
			this.options.username === undefined
		) {
			throw new Error("Username and password must be provided");
		}

		// Start the login process by loading the login page to establish a session and retrieve any necessary cookies
		let res = await this.ky_instance.get(
			new URL("/verTelaLogin.do", this.baseUrl),
		);

		// If the login page fails to load, throw an error
		if (res.status !== 200) {
			throw new Error("Failed to load login page");
		}

		// After successfully loading the login page, submit the login form with the provided credentials to authenticate the user
		res = await this.ky_instance.post(
			new URL("/logar.do?dispatch=logOn", this.baseUrl),
			{
				body: new URLSearchParams({
					width: "1710",
					height: "1112",
					urlRedirect: "",
					subsistemaRedirect: "",
					acao: "",
					acessibilidade: "",
					"user.login": this.options.username,
					"user.senha": this.options.password,
				}),
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
			},
		);

		// If the login form submission does not result in a redirect (status code 302), it indicates that the login attempt was unsuccessful, and an error is thrown
		if (res.status !== 302) {
			throw new Error("Failed to load login page");
		}
	}
}
