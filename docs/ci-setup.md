# CI Environment Setup for Integration Tests

## GitHub Secrets Configuration

Configure the following GitHub Secrets to run integration tests in CI:

| Secret | Required | Description |
|--------|----------|-------------|
| `AZURE_DEVOPS_ORG_URL` | Yes | Collection URL, e.g. `https://your-server/tfs/Collection` |
| `AZURE_DEVOPS_PAT` | Yes | Personal Access Token with appropriate permissions |

> **Note:** `AZURE_DEVOPS_DEFAULT_PROJECT` has been removed. Integration tests pass `projectId` explicitly.

### Setting up GitHub Secrets

1. Go to your repository → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret** and add each secret above.

## Personal Access Token (PAT) Requirements

| Scope | Permission |
|-------|------------|
| Code | Read & Write |
| Work Items | Read & Write |
| Build | Read & Execute |
| Project and Team | Read |
| Graph | Read |
| Release | Read & Execute |

## Security Considerations

- Use a dedicated project for testing
- Create a PAT with minimum required permissions
- Set an expiration date and rotate regularly

## Troubleshooting

If integration tests fail in CI:

1. Check GitHub Actions logs for the error message
2. Verify the PAT has not expired
3. Confirm the PAT has the required scopes
4. Confirm `AZURE_DEVOPS_ORG_URL` is the collection URL (not a project URL)
