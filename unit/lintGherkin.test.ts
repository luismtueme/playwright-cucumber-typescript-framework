import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lintSource } from '../utils/lintGherkin';

/** Rules reported for a feature source */
const rules = (source: string) => lintSource('test.feature', source).map((p) => p.rule);

test('a well-formed feature has no problems', () => {
    const source = `
@ui @Smoke
Feature: Search
  Scenario Outline: Searching for <term>
    Given I am on the search page
    When I search for "<term>"
    Then I see results for "<term>"

    Examples:
      | term  |
      | pipes |
`;
    assert.deepEqual(rules(source), []);
});

test('parse-error: invalid Gherkin', () => {
    // Two Feature keywords in one file
    const problems = lintSource('test.feature', 'Feature: A\n  Scenario: S\n    Then ok\nFeature: B\n');
    assert.deepEqual(
        problems.map((p) => [p.rule, p.line]),
        [['parse-error', 4]],
    );
});

test('unknown-tag: tags outside the allowlist', () => {
    const source = '@ui @Smok\nFeature: F\n  @wip\n  Scenario: S\n    Then ok\n';
    const problems = lintSource('test.feature', source);
    assert.deepEqual(
        problems.map((p) => [p.rule, p.line]),
        [
            ['unknown-tag', 1],
            ['unknown-tag', 3],
        ],
    );
});

test('quarantine-ticket: @quarantine needs a @jira tag', () => {
    assert.deepEqual(rules('Feature: F\n  @quarantine\n  Scenario: S\n    Then ok\n'), ['quarantine-ticket']);
    assert.deepEqual(rules('Feature: F\n  @quarantine @jira:QA-12\n  Scenario: S\n    Then ok\n'), []);
});

test('no-scenarios: an empty feature', () => {
    assert.deepEqual(rules('Feature: Empty\n'), ['no-scenarios']);
});

test('duplicate-name: two scenarios with the same name', () => {
    assert.deepEqual(rules('Feature: F\n  Scenario: Same\n    Then a\n  Scenario: Same\n    Then b\n'), [
        'duplicate-name',
    ]);
});

test('missing-then: a scenario that checks nothing', () => {
    assert.deepEqual(rules('Feature: F\n  Scenario: S\n    Given a\n    When b\n'), ['missing-then']);
    // "And" after "Then" is fine; the Then counts
    assert.deepEqual(rules('Feature: F\n  Scenario: S\n    When b\n    Then c\n    And d\n'), []);
});

test('outline-examples: placeholders without columns, or no rows', () => {
    const missingColumn = `
Feature: F
  Scenario Outline: Log in as <role>
    When I log in as "<user>"
    Then I see "<page>"

    Examples:
      | user | page |
      | ann  | home |
`;
    const problems = lintSource('test.feature', missingColumn);
    assert.deepEqual(
        problems.map((p) => p.rule),
        ['outline-examples'],
    );
    assert.match(problems[0]?.message ?? '', /"role" column/);

    const noRows = 'Feature: F\n  Scenario Outline: S\n    Then "<x>"\n\n    Examples:\n      | x |\n';
    assert.deepEqual(rules(noRows), ['outline-examples']);
});
