/**
 * Cucumber's Given/When/Then with `this` typed as our CustomWorld, so step
 * definitions get autocomplete and type checking for this.page, this.formPage,
 * this.api(), ... without annotating every function.
 *
 *   import { Given, When, Then } from '../utils/steps';
 */
import { Given as given, When as when, Then as then } from '@cucumber/cucumber';
import type { CustomWorld } from './world';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Cucumber passes parsed parameters of any type
type StepFn = (this: CustomWorld, ...args: any[]) => unknown;

interface DefineStep {
    (pattern: string | RegExp, code: StepFn): void;
    (pattern: string | RegExp, options: { timeout?: number }, code: StepFn): void;
}

export const Given = given as DefineStep;
export const When = when as DefineStep;
export const Then = then as DefineStep;
