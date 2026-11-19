export interface AgentInfo {
  id: number;
  name?: string;
  version?: string;
  osDescription?: string;
  status?: string;
  enabled?: boolean;
  provisioningState?: string;
  systemCapabilities?: Record<string, string>;
  userCapabilities?: Record<string, string>;
}

export interface AgentPoolInfo {
  id: number;
  name?: string;
  size?: number;
  isHosted?: boolean;
  poolType?: string;
}

export interface AgentJobRequest {
  requestId?: number;
  queueTime?: string;
  assignTime?: string;
  receiveTime?: string;
  finishTime?: string;
  result?: string;
  serviceOwner?: string;
  hostId?: string;
  scopeId?: string;
  planType?: string;
  planId?: string;
  jobId?: string;
  definition?: { _links?: unknown; id?: number; name?: string };
  owner?: { _links?: unknown; id?: string; name?: string };
}
