/**
 * Gherkin linter for this framework's conventions, built on the official
 * @cucumber/gherkin parser. Part of `npm run lint`.
 *
 * Rules:
 *   parse-error          the file must be valid Gherkin
 *   unknown-tag          tags must be in ALLOWED_TAGS (or @jira:ABC-123)
 *   quarantine-ticket    @quarantine needs a @jira:ABC-123 tag explaining why
 *   no-scenarios         a feature must contain at least one scenario
 *   duplicate-name       scenario names must be unique within a feature
 *   missing-then         every scenario needs a Then step (it must check something)
 *   outline-examples     outlines need Examples rows, and every <placeholder> needs a column
 *
 * Usage: npm run lint:gherkin [-- files...]   (default: all of features/)
 */
import fs from 'fs';
import path from 'path';
import { AstBuilder, GherkinClassicTokenMatcher, Parser } from '@cucumber/gherkin';
import { IdGenerator, StepKeywordType, type GherkinDocument, type Scenario, type Tag } from '@cucumber/messages';

/** Add new tags here so they're documented in one place */
export const ALLOWED_TAGS = new Set([
    '@Smoke',
    '@Regression',
    '@ui',
    '@api',
    '@db',
    '@authenticated',
    '@a11y',
    '@quarantine',
]);
const JIRA_TAG = /^@jira:[A-Z][A-Z0-9]*-\d+$/;

export type Rule =
    | 'parse-error'
    | 'unknown-tag'
    | 'quarantine-ticket'
    | 'no-scenarios'
    | 'duplicate-name'
    | 'missing-then'
    | 'outline-examples';

export interface Problem {
    file: string;
    line: number;
    rule: Rule;
    message: string;
}

/**
 * @param file Path shown in messages
 * @param source Feature file contents
 */
export function lintSource(file: string, source: string): Problem[] {
    const problems: Problem[] = [];
    const report = (line: number, rule: Rule, message: string) => problems.push({ file, line, rule, message });

    let document: GherkinDocument;
    try {
        const parser = new Parser(new AstBuilder(IdGenerator.uuid()), new GherkinClassicTokenMatcher());
        document = parser.parse(source);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const line = Number(message.match(/\((\d+):\d+\)/)?.[1] ?? 1);
        report(line, 'parse-error', message.split('\n')[0] ?? message);
        return problems;
    }

    const feature = document.feature;
    if (!feature) return problems;

    const checkTags = (tags: readonly Tag[]) => {
        for (const tag of tags) {
            if (!ALLOWED_TAGS.has(tag.name) && !JIRA_TAG.test(tag.name)) {
                report(
                    tag.location.line,
                    'unknown-tag',
                    `Unknown tag ${tag.name}. Allowed: ${[...ALLOWED_TAGS].join(', ')}, @jira:ABC-123 (see utils/lintGherkin.ts)`,
                );
            }
        }
    };
    checkTags(feature.tags);

    const scenarios: Scenario[] = feature.children.flatMap((child) => {
        if (child.scenario) return [child.scenario];
        if (child.rule)
            return child.rule.children.flatMap((ruleChild) => (ruleChild.scenario ? [ruleChild.scenario] : []));
        return [];
    });
    if (scenarios.length === 0)
        report(feature.location.line, 'no-scenarios', `Feature "${feature.name}" has no scenarios`);

    const seen = new Map<string, number>();
    for (const scenario of scenarios) {
        const line = scenario.location.line;
        checkTags(scenario.tags);
        scenario.examples.forEach((examples) => checkTags(examples.tags));

        const firstUse = seen.get(scenario.name);
        if (firstUse !== undefined) {
            report(line, 'duplicate-name', `Scenario name "${scenario.name}" is also used on line ${firstUse}`);
        } else {
            seen.set(scenario.name, line);
        }

        if (!scenario.steps.some((step) => step.keywordType === StepKeywordType.OUTCOME)) {
            report(line, 'missing-then', `Scenario "${scenario.name}" has no Then step, so it doesn't check anything`);
        }

        const allTags = [...feature.tags, ...scenario.tags, ...scenario.examples.flatMap((e) => e.tags)].map(
            (t) => t.name,
        );
        if (allTags.includes('@quarantine') && !allTags.some((name) => JIRA_TAG.test(name))) {
            report(line, 'quarantine-ticket', `Quarantined scenario "${scenario.name}" needs a @jira:ABC-123 tag`);
        }

        const placeholders = [scenario.name, ...scenario.steps.map((s) => s.text + (s.docString?.content ?? ''))]
            .join('\n')
            .match(/<[^<>\s]+>/g);
        if (scenario.examples.length > 0 || placeholders) {
            const rows = scenario.examples.reduce((count, examples) => count + examples.tableBody.length, 0);
            if (rows === 0)
                report(line, 'outline-examples', `Scenario Outline "${scenario.name}" has no Examples rows`);
            for (const examples of scenario.examples) {
                const columns = new Set(examples.tableHeader?.cells.map((cell) => cell.value) ?? []);
                for (const placeholder of new Set(placeholders ?? [])) {
                    const column = placeholder.slice(1, -1);
                    if (!columns.has(column)) {
                        report(
                            examples.location.line,
                            'outline-examples',
                            `Examples table has no "${column}" column for ${placeholder}`,
                        );
                    }
                }
            }
        }
    }
    return problems;
}

function featureFiles(dir: string): string[] {
    return fs
        .readdirSync(dir, { recursive: true, encoding: 'utf8' })
        .filter((file) => file.endsWith('.feature'))
        .map((file) => path.join(dir, file));
}

function main(): void {
    const files =
        process.argv.length > 2 ? process.argv.slice(2) : featureFiles(path.join(__dirname, '..', 'features'));
    const problems = files.flatMap((file) =>
        lintSource(path.relative(process.cwd(), file), fs.readFileSync(file, 'utf8')),
    );
    for (const { file, line, rule, message } of problems) console.error(`${file}:${line}  ${message}  [${rule}]`);
    if (problems.length > 0) {
        console.error(`\nGherkin lint: ${problems.length} problem(s) in ${files.length} feature file(s)`);
        process.exitCode = 1;
    } else {
        console.log(`Gherkin lint: ${files.length} feature file(s) OK`);
    }
}

if (require.main === module) main();
