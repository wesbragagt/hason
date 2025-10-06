export const testCases = {
    simple: {
        input: '{"name":"John","age":30}',
        filters: {
            identity: { filter: '.', expected: '{\n  "name": "John",\n  "age": 30\n}' },
            property: { filter: '.name', expected: '"John"' },
            number: { filter: '.age', expected: '30' }
        }
    },
    arrays: {
        input: '{"items":[1,2,3,4,5]}',
        filters: {
            length: { filter: '.items | length', expected: '5' },
            first: { filter: '.items[0]', expected: '1' },
            slice: { filter: '.items[1:3]', expected: '[2, 3]' }
        }
    },
    nested: {
        input: '{"user":{"profile":{"email":"test@example.com","settings":{"theme":"dark"}}}}',
        filters: {
            email: { filter: '.user.profile.email', expected: '"test@example.com"' },
            theme: { filter: '.user.profile.settings.theme', expected: '"dark"' }
        }
    },
    workflowExample: {
        input: '{"users":[{"name":"Alice","role":"admin"},{"name":"Bob","role":"user"}]}',
        filters: {
            adminUsers: { filter: '.users[] | select(.role == "admin")', expected: '{\n  "name": "Alice",\n  "role": "admin"\n}' },
            userNames: { filter: '.users[].name', expected: '"Alice"\n"Bob"' }
        }
    },
    invalid: {
        malformed: '{"name": invalid}',
        incomplete: '{"name":',
        empty: ''
    }
};
export const commonSelectors = {
    jsonInput: '[data-testid="json-input-textarea"], [data-testid="json-input-textarea-split"]',
    jqFilterInput: '[data-testid="jq-filter-input"]',
    applyFilterButton: '[data-testid="apply-filter-button"]',
    jsonInputTab: '[data-testid="json-input-tab"]',
    outputTab: '[data-testid="output-tab"]',
    jsonOutput: '[data-testid="json-output"], [data-testid="json-output-split"]',
    errorMessage: '[data-testid="error-message"], [data-testid="error-message-split"]',
    copyButton: '[data-testid="copy-output-button"], [data-testid="copy-output-button-split"]',
    helpButton: 'button:has(span:text("Show help"))',
    themeToggle: 'button:has(span:text("Toggle theme"))',
    helpDrawer: 'text="Help & Reference"'
};
