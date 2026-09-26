/**
 * Makes Playwright assertion failures show as "failed" (not "broken") in Allure.
 *
 * Playwright's expect() throws an ExpectError. Cucumber only passes the error's
 * class name, message and stack on to Allure, and Allure only treats errors
 * whose name contains "assert" as test failures. Everything else is reported
 * as "broken" (a problem with the test itself). This wrapper re-throws
 * Playwright assertion errors as AssertionError, keeping message and stack.
 */
export class AssertionError extends Error {
    readonly matcherResult: unknown;

    constructor(original: Error & { matcherResult?: unknown }) {
        super(original.message);
        this.name = 'AssertionError';
        this.stack = original.stack;
        this.matcherResult = original.matcherResult;
    }
}

/**
 * Wraps a step or hook function. The result is always async (Cucumber awaits it),
 * keeps the original parameters and `this`, and re-throws Playwright assertion
 * errors as AssertionError.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- matches any step or hook signature
export function wrapStepFunction<F extends (...args: any[]) => unknown>(
    fn: F,
): (this: ThisParameterType<F>, ...args: Parameters<F>) => Promise<Awaited<ReturnType<F>>> {
    const wrapped = async function (
        this: ThisParameterType<F>,
        ...args: Parameters<F>
    ): Promise<Awaited<ReturnType<F>>> {
        try {
            return (await fn.apply(this, args)) as Awaited<ReturnType<F>>;
        } catch (error) {
            if (error instanceof Error && 'matcherResult' in error) {
                throw new AssertionError(error);
            }
            throw error;
        }
    };
    // Cucumber uses the function's arity to validate step parameters
    Object.defineProperty(wrapped, 'length', { value: fn.length });
    return wrapped;
}
