import { SigSession } from "../sig/session";

export abstract class SigaaSession extends SigSession {
	public async logout() {
		if (!this.jsessionid) return;

		const res = await this.ky_instance.get(
			new URL("/sigaa/logar.do?dispatch=logOff", this.baseUrl),
		);

		if (res.status !== 200 || res.redirected) {
			throw new Error("Failed to load logout page");
		}

		this.setJSession(null);
	}
}
