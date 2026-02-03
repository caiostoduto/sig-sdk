/**
 * Main entry point for the SIGAA SDK
 * @packageDocumentation
 */

export const version = "1.0.0";

/**
 * A simple example function to demonstrate the SDK structure
 * @param name - The name to greet
 * @returns A greeting message
 * @example
 * ```typescript
 * const message = greet('World');
 * console.log(message); // "Hello, World!"
 * ```
 */
export function greet(name: string): string {
	return `Hello, ${name}!`;
}
