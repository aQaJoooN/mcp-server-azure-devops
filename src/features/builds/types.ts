export interface BuildSummary {
  id: number;
  buildNumber?: string;
  status?: string;
  result?: string;
  sourceBranch?: string;
  sourceVersion?: string;
  startTime?: string;
  finishTime?: string;
  queueTime?: string;
  definition?: { id: number; name: string; path?: string };
  requestedBy?: { displayName?: string; uniqueName?: string };
  requestedFor?: { displayName?: string; uniqueName?: string };
  repository?: { id?: string; name?: string; type?: string };
  url?: string;
  buildNumberRevision?: number;
}

export interface BuildLog {
  id: number;
  type?: string;
  url?: string;
  lineCount?: number;
  createdOn?: string;
  lastChangedOn?: string;
}

export interface BuildTimelineRecord {
  id?: string;
  parentId?: string;
  type?: string;
  name?: string;
  startTime?: string;
  finishTime?: string;
  state?: string | number;
  result?: string | number;
  order?: number;
  log?: { id?: number; type?: string; url?: string };
  errorCount?: number;
  warningCount?: number;
  workerName?: string;
}

export interface BuildChange {
  id?: string;
  message?: string;
  messageTruncated?: boolean;
  author?: { displayName?: string; uniqueName?: string; imageUrl?: string };
  timestamp?: string;
  location?: string;
  type?: string;
}
