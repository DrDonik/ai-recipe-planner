# Testing Guide

This document covers testing practices and guidelines for the AI Recipe Planner project.

## Table of Contents

- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Test Structure](#test-structure)
- [Coverage](#coverage)
- [Integration Tests](#integration-tests)
- [CI/CD](#cicd)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)
- [Resources](#resources)

## Running Tests

### All Tests

```bash
npm test
```

This runs all unit tests in watch mode (useful during development).

### Single Run (CI Mode)

```bash
npm test -- --run
```

Runs tests once and exits (used in CI).

### With Coverage

```bash
npm run test:coverage
```

Generates a coverage report in the `coverage/` directory.

### Interactive UI

```bash
npm run test:ui
```

Opens Vitest UI in browser for interactive test running and debugging.

### Watch Specific Files

```bash
npm test -- src/__tests__/utils/sharing.test.ts
```

### Integration Tests (Optional)

```bash
GEMINI_API_KEY=your-key npm run test:integration
```

Integration tests hit the real Gemini API and are skipped by default.

## Writing Tests

### Test Location

Tests live in `src/__tests__/` mirroring the source structure:

```
src/
  services/
    llm.ts
  __tests__/
    services/
      llm.test.ts
```

### Test File Naming

- Unit tests: `*.test.ts` or `*.test.tsx`
- Integration tests: `*.integration.test.ts`

### Basic Test Structure

```typescript
import { describe, it, expect } from 'vitest';
import { functionToTest } from '@/path/to/module';

describe('Feature Name', () => {
  it('should do something specific', () => {
    // Arrange
    const input = 'test';

    // Act
    const result = functionToTest(input);

    // Assert
    expect(result).toBe('expected');
  });
});
```

### Component Testing

```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import MyComponent from '@/components/MyComponent';

describe('MyComponent', () => {
  it('should render with correct text', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### Mocking API Calls

The project uses MSW (Mock Service Worker) for API mocking. See `src/__tests__/mocks/handlers.ts` for examples.

```typescript
import { beforeAll, afterEach, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers } from '@/__tests__/mocks/handlers';
import { http, HttpResponse } from 'msw';

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

it('should handle API errors', async () => {
  server.use(
    http.post('https://api.example.com/*', () => {
      return new HttpResponse(null, { status: 500 });
    })
  );

  // Your test code
});
```

## Test Structure

### Test Organization

```
src/__tests__/
  ├── setup.ts              # Global test configuration
  ├── mocks/
  │   ├── handlers.ts       # MSW API handlers
  │   └── localStorage.ts   # localStorage mock
  ├── utils/
  │   ├── idGenerator.test.ts
  │   └── sharing.test.ts
  └── services/
      ├── llm.test.ts
      └── llm.integration.test.ts
```

### Setup Files

- `setup.ts`: Runs before each test, provides localStorage mock
- `mocks/handlers.ts`: MSW request handlers for API mocking
- `mocks/localStorage.ts`: Mock implementation of browser localStorage

## Coverage

### Viewing Coverage

After running `npm run test:coverage`, open `coverage/index.html` in a browser:

```bash
open coverage/index.html
```

### Coverage Goals

- **Critical modules** (llm.ts, sharing.ts): 90%+
- **Utilities** (idGenerator.ts): 90%+
- **Overall project**: 25-30% (growing over time)

### Coverage Reports

Coverage is tracked in CI and can be uploaded to Codecov when the `CODECOV_TOKEN` secret is configured in repository settings. A coverage badge can be added to the README (see Task 12).

## Integration Tests

Integration tests hit real APIs and are **skipped by default**. They:

- Require real API keys (via environment variables)
- Cost money (API usage)
- Are slow (network requests)
- Can be flaky (network issues)

### Running Integration Tests

```bash
GEMINI_API_KEY=your-actual-key npm run test:integration
```

### When to Run

- Before major releases
- After LLM service changes
- When debugging API integration issues

**Do not run in CI** - they're expensive and slow.

## CI/CD

### GitHub Actions

Tests run automatically on:
- Every push to `main`
- Every pull request to `main`

The workflow:
1. Runs linter
2. Runs all unit tests with coverage
3. Uploads coverage to Codecov

See `.github/workflows/test.yml` for details.

### Pre-commit Hooks

Consider adding pre-commit hooks to run tests locally before pushing:

```bash
# .husky/pre-commit
npm test -- --run
```

## Troubleshooting

### Tests Hang in CI

Ensure you're using the `--run` flag to disable watch mode:

```bash
npm test -- --run
```

### localStorage Errors

The test setup provides a localStorage mock. If you see localStorage errors:

1. Check that `@/__tests__/setup.ts` is being loaded
2. Verify `setupFiles` in `vitest.config.ts` includes the setup file

### MSW Not Intercepting Requests

Ensure the MSW server is running:

```typescript
import { beforeAll, afterEach, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { handlers } from '@/__tests__/mocks/handlers';

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Coverage Not Generating

Check that v8 provider is installed:

```bash
npm install --save-dev @vitest/coverage-v8
```

## Best Practices

1. **Test behavior, not implementation** - Focus on what functions do, not how they do it
2. **Keep tests focused** - One assertion per test when possible
3. **Use descriptive test names** - `should generate recipe with valid ingredients` not `test1`
4. **Avoid testing mocks** - Test real logic, mock external dependencies only
5. **Clean up after tests** - The setup file handles this, but be aware
6. **Don't test third-party libraries** - Trust that React, Vitest, etc. work correctly

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [MSW Documentation](https://mswjs.io/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
