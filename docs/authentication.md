# Authentication Guide for Azure DevOps MCP Server

This guide provides detailed information about the authentication methods supported by the Azure DevOps MCP Server, including setup instructions, configuration examples, and troubleshooting tips.

## Supported Authentication Methods

The Azure DevOps MCP Server supports three authentication methods:

1. **Personal Access Token (PAT)** - Simple token-based authentication
2. **Azure Identity (DefaultAzureCredential)** - Flexible authentication using the Azure Identity SDK
3. **Azure CLI** - Authentication using your Azure CLI login

Azure DevOps Server (on-prem) supports PAT authentication only. Azure Identity and Azure CLI are supported for Azure DevOps Services.

## Method 1: Personal Access Token (PAT) Authentication

PAT authentication is the simplest method and works well for personal use or testing.

### Setup Instructions

1. **Generate a PAT in Azure DevOps**:

   - Go to https://dev.azure.com/{your-organization}/_usersSettings/tokens
   - Or click on your profile picture > Personal access tokens
   - Select "+ New Token"
   - Name your token (e.g., "MCP Server Access")
   - Set an expiration date
   - Select the following scopes:
     - **Code**: Read & Write
     - **Work Items**: Read & Write
     - **Build**: Read & Execute
     - **Project and Team**: Read
     - **Graph**: Read
     - **Release**: Read & Execute
   - Click "Create" and copy the generated token

2. **Configure your `.env` file**:
   ```
   AZURE_DEVOPS_AUTH_METHOD=pat
   AZURE_DEVOPS_ORG_URL=https://your-server/tfs/YourCollection
   AZURE_DEVOPS_PAT=your-personal-access-token
   ```

### Security Considerations

- PATs have an expiration date and will need to be renewed
- Store your PAT securely and never commit it to source control
- Consider using environment variables or a secrets manager in production
- Scope your PAT to only the permissions needed for your use case

## Method 2: Azure Identity Authentication (DefaultAzureCredential)

Azure Identity authentication uses the `DefaultAzureCredential` class from the `@azure/identity` package, which provides a simplified authentication experience by trying multiple credential types in sequence.

> Note: Azure Identity authentication is supported for Azure DevOps Services only.

### How DefaultAzureCredential Works

`DefaultAzureCredential` tries the following credential types in order:

1. Environment variables (EnvironmentCredential)
2. Managed Identity (ManagedIdentityCredential)
3. Azure CLI (AzureCliCredential)
4. Visual Studio Code (VisualStudioCodeCredential)
5. Azure PowerShell (AzurePowerShellCredential)
6. Interactive Browser (InteractiveBrowserCredential) - optional, disabled by default

This makes it ideal for applications that need to work in different environments (local development, Azure-hosted) without code changes.

### Setup Instructions

1. **Install the Azure Identity SDK**:
   The SDK is already included as a dependency in the Azure DevOps MCP Server.

2. **Configure your `.env` file**:

   ```
   AZURE_DEVOPS_AUTH_METHOD=azure-identity
   AZURE_DEVOPS_ORG_URL=https://dev.azure.com/your-organization
   ```

3. **Set up credentials based on your environment**:

   a. **For service principals (client credentials)**:

   ```
   AZURE_TENANT_ID=your-tenant-id
   AZURE_CLIENT_ID=your-client-id
   AZURE_CLIENT_SECRET=your-client-secret
   ```

   b. **For managed identities in Azure**:
   No additional configuration needed if running in Azure with a managed identity.

   c. **For local development**:

   - Log in with Azure CLI: `az login`
   - Or use Visual Studio Code Azure Account extension

### Security Considerations

- Use managed identities in Azure for improved security
- For service principals, rotate client secrets regularly
- Store credentials securely using Azure Key Vault or environment variables
- Apply the principle of least privilege when assigning roles

## Method 3: Azure CLI Authentication

Azure CLI authentication uses the `AzureCliCredential` class from the `@azure/identity` package, which authenticates using the Azure CLI's logged-in account.

> Note: Azure CLI authentication is supported for Azure DevOps Services only.

### Setup Instructions

1. **Install the Azure CLI**:

   - Follow the instructions at https://docs.microsoft.com/cli/azure/install-azure-cli

2. **Log in to Azure**:

   ```bash
   az login
   ```

3. **Configure your `.env` file**:
   ```
   AZURE_DEVOPS_AUTH_METHOD=azure-cli
   AZURE_DEVOPS_ORG_URL=https://dev.azure.com/your-organization
   ```

### Security Considerations

- Azure CLI authentication is best for local development
- Ensure your Azure CLI session is kept secure
- Log out when not in use: `az logout`

## Configuration Reference

| Variable                       | Description                                                                        | Required                     | Default          |
| ------------------------------ | ---------------------------------------------------------------------------------- | ---------------------------- | ---------------- |
| `AZURE_DEVOPS_AUTH_METHOD`     | Authentication method (`pat`, `azure-identity`, or `azure-cli`) - case-insensitive | No                           | `azure-identity` |
| `AZURE_DEVOPS_ORG_URL`         | Collection URL e.g. `https://host/tfs/Collection` — do **not** include the project | Yes                          | —                |
| `AZURE_DEVOPS_PAT`             | Personal Access Token (required when auth=pat)                                     | Only with PAT auth           | —                |
| `AZURE_DEVOPS_API_VERSION`     | REST api-version override (see [REST API version](#rest-api-version))              | No                           | `7.1`            |
| `MCP_AUTH_TOKEN`               | Bearer token clients must supply in `Authorization: Bearer <token>`. Requests without it receive HTTP 401. `/healthz` is always open. HTTP transport only. | No | — |
| `MCP_READ_ONLY`                | Set to `true` to expose only read tools and block all write operations.            | No                           | `false`          |
| `AZURE_TENANT_ID`              | Azure AD tenant ID (service principals)                                            | Only with service principals | —                |
| `AZURE_CLIENT_ID`              | Azure AD application ID (service principals)                                       | Only with service principals | —                |
| `AZURE_CLIENT_SECRET`          | Azure AD client secret (service principals)                                        | Only with service principals | —                |
| `LOG_LEVEL`                    | Logging level (`debug`, `info`, `warn`, `error`)                                   | No                           | `info`           |

> **`AZURE_DEVOPS_DEFAULT_PROJECT` has been removed.** Every tool that targets a project requires `projectId` explicitly in the call arguments.

### REST API version

Most tools go through `azure-devops-node-api`, which negotiates the REST
api-version with the server on its own. The pipeline, search and wiki tools call
the REST API directly and use `AZURE_DEVOPS_API_VERSION` instead.

The default `7.1` is what Azure DevOps Services expects. On-premises releases cap
out earlier, and a version above the cap is rejected with
`The requested REST API version of <x> is out of range for this server`:

| Product                     | Highest api-version |
| --------------------------- | ------------------- |
| Azure DevOps Services       | `7.1`               |
| Azure DevOps Server 2022    | `7.0`               |
| Azure DevOps Server 2020    | `6.0`               |
| Azure DevOps Server 2019    | `5.0`               |
| Team Foundation Server 2018 | `4.0`               |

See [REST API versioning](https://learn.microsoft.com/en-us/azure/devops/integrate/concepts/rest-api-versioning)
for the full matrix.

Known limitation: this is one value for every direct call. On `6.0` and older,
some areas (pipelines, search) only ship as `-preview.N` revisions while others
are stable at the same major version, so a single setting cannot satisfy both and
part of the tools may still be rejected on those releases.

## Troubleshooting Authentication Issues

### PAT Authentication Issues

1. **Invalid PAT**: Ensure your PAT hasn't expired and has the required scopes

   - Error: `TF400813: The user 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' is not authorized to access this resource.`
   - Solution: Generate a new PAT with the correct scopes

2. **Scope issues**: If receiving 403 errors, check if your PAT has the necessary permissions

   - Error: `TF401027: You need the Git 'Read' permission to perform this action.`
   - Solution: Update your PAT with the required scopes

3. **Organization access**: Verify your PAT has access to the organization specified in the URL
   - Error: `TF400813: Resource not found for anonymous request.`
   - Solution: Ensure your PAT has access to the specified organization

### Azure Identity Authentication Issues

1. **Missing credentials**: Ensure you have the necessary credentials configured

   - Error: `CredentialUnavailableError: DefaultAzureCredential failed to retrieve a token`
   - Solution: Check that you're logged in with Azure CLI or have environment variables set

2. **Permission issues**: Verify your identity has the necessary permissions

   - Error: `AuthorizationFailed: The client does not have authorization to perform action`
   - Solution: Assign the appropriate roles to your identity

3. **Token acquisition errors**: Check network connectivity and Azure AD endpoint availability
   - Error: `ClientAuthError: Interaction required`
   - Solution: Check network connectivity or use a different credential type

### Azure CLI Authentication Issues

1. **CLI not installed**: Ensure Azure CLI is installed and in your PATH

   - Error: `AzureCliCredential authentication failed: Azure CLI not found`
   - Solution: Install Azure CLI

2. **Not logged in**: Verify you're logged in to Azure CLI

   - Error: `AzureCliCredential authentication failed: Please run 'az login'`
   - Solution: Run `az login`

3. **Permission issues**: Check if your Azure CLI account has access to Azure DevOps
   - Error: `TF400813: The user is not authorized to access this resource`
   - Solution: Log in with an account that has access to Azure DevOps

## Best Practices

1. **Choose the right authentication method for your environment**:

   - For local development: Azure CLI or PAT
   - For CI/CD pipelines: PAT or service principal
   - For Azure-hosted applications: Managed Identity

2. **Follow the principle of least privilege**:

   - Only grant the permissions needed for your use case
   - Regularly review and rotate credentials

3. **Secure your credentials**:

   - Use environment variables or a secrets manager
   - Never commit credentials to source control
   - Set appropriate expiration dates for PATs

4. **Monitor and audit authentication**:
   - Review Azure DevOps access logs
   - Set up alerts for suspicious activity

## Examples

### Example 1: Local Development with PAT (on-prem)

```bash
AZURE_DEVOPS_AUTH_METHOD=pat
AZURE_DEVOPS_ORG_URL=https://your-server/tfs/YourCollection
AZURE_DEVOPS_PAT=your-personal-access-token
AZURE_DEVOPS_API_VERSION=6.0
```

### Example 2: Azure-hosted Application with Managed Identity

```bash
AZURE_DEVOPS_AUTH_METHOD=azure-identity
AZURE_DEVOPS_ORG_URL=https://dev.azure.com/mycompany
```

### Example 3: CI/CD Pipeline with Service Principal

```bash
AZURE_DEVOPS_AUTH_METHOD=azure-identity
AZURE_DEVOPS_ORG_URL=https://dev.azure.com/mycompany
AZURE_TENANT_ID=00000000-0000-0000-0000-000000000000
AZURE_CLIENT_ID=11111111-1111-1111-1111-111111111111
AZURE_CLIENT_SECRET=your-client-secret
```

### Example 4: Local Development with Azure CLI

```bash
AZURE_DEVOPS_AUTH_METHOD=azure-cli
AZURE_DEVOPS_ORG_URL=https://dev.azure.com/mycompany
```

## MCP Server Security Options

These options control access to the MCP server itself and are independent of how the server authenticates to Azure DevOps.

### MCP Access Token (`MCP_AUTH_TOKEN`) — HTTP transport only

Protects the HTTP MCP endpoint with a bearer token. When set, every `POST` to the MCP endpoint must include:

```
Authorization: Bearer <your-token>
```

Requests without a valid token receive `HTTP 401 Unauthorized` and a `WWW-Authenticate: Bearer realm="mcp"` response header.

The `/healthz` endpoint is intentionally exempt so load-balancer and container orchestrator probes keep working without credentials.

The stdio transport is not affected — it is already protected by OS process isolation and is typically used only for local AI-assistant integrations.

```bash
# stdio (local)
MCP_AUTH_TOKEN is ignored — not applicable

# HTTP / Docker
MCP_AUTH_TOKEN=your-secret-token npm run start:http

docker run ... -e MCP_AUTH_TOKEN="your-secret-token" aqajooon/mcp-server-azure-devops:latest
```

**Choose a strong, random token.** At least 32 characters of random data is recommended:

```bash
# Generate a suitable token
openssl rand -hex 32
```

### Read-Only Mode (`MCP_READ_ONLY`)

When `MCP_READ_ONLY=true`, the server exposes only tools that read data from Azure DevOps. All write tools are removed from the tool list returned by `tools/list` and are blocked at call time, so no mutation can reach Azure DevOps regardless of how a client constructs its request.

Blocked tools:

| Category | Tools |
|---|---|
| Repositories | `create_branch`, `create_commit` |
| Pull Requests | `create_pull_request`, `add_pull_request_comment`, `update_pull_request`, `update_pull_request_thread_status` |
| Wikis | `create_wiki`, `create_wiki_page`, `update_wiki_page` |
| Work Items | `create_work_item`, `update_work_item`, `manage_work_item_link`, `create_work_item_attachment`, `delete_work_item_attachment` |
| Pipelines | `trigger_pipeline` |

Any attempt to call a blocked tool returns:

```
Tool '<name>' is not available: the server is running in read-only mode.
```

```bash
# stdio
MCP_READ_ONLY=true npm start

# HTTP / Docker
MCP_READ_ONLY=true npm run start:http

docker run ... -e MCP_READ_ONLY="true" aqajooon/mcp-server-azure-devops:latest
```

Both options can be combined for maximum safety:

```bash
MCP_AUTH_TOKEN=my-token MCP_READ_ONLY=true npm run start:http
```
