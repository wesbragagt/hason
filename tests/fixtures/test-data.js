import simpleData from './simple.json';
import nestedData from './nested.json';
import complexData from './complex.json';
export const fixtures = {
    simple: simpleData,
    nested: nestedData,
    complex: complexData
};
export const testCases = {
    basic: [
        { input: fixtures.simple, filter: '.', expected: fixtures.simple },
        { input: fixtures.simple, filter: '.name', expected: 'John Doe' },
        { input: fixtures.simple, filter: '.age', expected: 30 },
        { input: fixtures.simple, filter: '.active', expected: true },
        { input: fixtures.simple, filter: '.profile.email', expected: 'john@example.com' }
    ],
    arrays: [
        { input: fixtures.simple, filter: '.tags', expected: ['developer', 'javascript', 'react'] },
        { input: fixtures.simple, filter: '.tags[0]', expected: 'developer' },
        { input: fixtures.simple, filter: '.tags[1]', expected: 'javascript' },
        { input: fixtures.simple, filter: '.tags[2]', expected: 'react' },
        { input: fixtures.nested, filter: '.users[0].name', expected: 'Alice Johnson' },
        { input: fixtures.nested, filter: '.users[1].profile.contact.email', expected: 'bob@company.com' }
    ],
    objects: [
        { input: fixtures.simple, filter: '.profile', expected: { email: 'john@example.com', phone: '555-0123' } },
        { input: fixtures.nested, filter: '.users[0].profile.preferences', expected: { theme: 'dark', notifications: true, language: 'en' } },
        { input: fixtures.complex, filter: '.api.version', expected: '2.1.0' }
    ],
    complex: [
        { input: fixtures.nested, filter: '.users[] | .name', expected: ['Alice Johnson', 'Bob Smith'] },
        { input: fixtures.nested, filter: '.users | length', expected: 2 },
        { input: fixtures.nested, filter: '.users[0].roles', expected: ['admin', 'user'] },
        { input: fixtures.complex, filter: '.api.endpoints[0].methods', expected: ['GET', 'POST'] }
    ],
    errors: [
        { input: fixtures.simple, filter: '.nonexistent', shouldError: true },
        { input: fixtures.simple, filter: '.tags[10]', shouldError: true },
        { input: fixtures.simple, filter: '.profile.nonexistent', shouldError: true },
        { input: '{"invalid": json}', filter: '.', shouldError: true }
    ]
};
