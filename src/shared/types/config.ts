import { AuthenticationMethod } from '../auth/auth-factory';

/**
 * Azure DevOps configuration type definition
 */
export interface AzureDevOpsConfig {
  /**
   * The Azure DevOps organization URL (e.g., https://dev.azure.com/organization)
   */
  organizationUrl: string;

  /**
   * Authentication method to use (pat, azure-identity, azure-cli)
   * @default 'azure-identity'
   */
  authMethod?: AuthenticationMethod;

  /**
   * Personal Access Token for authentication (required for PAT authentication)
   */
  personalAccessToken?: string;

  /**
   * Optional API version to use (defaults to latest)
   */
  apiVersion?: string;

  /**
   * When true, only read-only tools are exposed and all write operations are
   * blocked. Set via MCP_READ_ONLY=true.
   * @default false
   */
  readOnly?: boolean;
}
