# Testing Setup Guide

## Environment Variables

Tests that interact with Azure DevOps APIs (integration and e2e tests) require environment variables. These are automatically loaded from your `.env` file during test execution.

Required variables:
```
AZURE_DEVOPS_ORG_URL=https://your-server/tfs/YourCollection
AZURE_DEVOPS_PAT=your-personal-access-token
```

Each integration test that targets a project passes `projectId` explicitly in the call arguments. There is no server-side default project.

## Test Structure

Tests are co-located with the code they test:

```
src/
  features/
    feature-name/
      feature.ts
      feature.spec.unit.ts   # Unit tests
      feature.spec.int.ts    # Integration tests
```

E2E tests live at the server level:

```
src/
  server.ts
  server.spec.e2e.ts
```

## Import Pattern

Use the `@/` path alias instead of deep relative imports:

```typescript
import { someFunction } from '@/shared/utils';
import { getTestConnection, shouldSkipIntegrationTest } from '@/shared/test/test-helpers';
```

## Running Tests

```bash
npm run test:unit   # unit tests only
npm run test:int    # integration tests (requires .env with real credentials)
npm run test:e2e    # e2e tests
npm test            # all suites
```

## VSCode Integration

`.vscode/settings.json` configures test icons, file nesting, and TypeScript path aliases.
