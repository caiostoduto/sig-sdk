import { describe, expect, it } from "vitest";
import { greet } from "./index";

describe("greet", () => {
	it("should return a greeting message", () => {
		expect(greet("World")).toBe("Hello, World!");
	});

	it("should work with different names", () => {
		expect(greet("SIGAA")).toBe("Hello, SIGAA!");
	});
});
