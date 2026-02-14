import { useState, useEffect } from 'react';
import { JiraClient, JiraIssue } from '../api/jira-client.js';
import { PersistentCache } from '../storage/cache.js';
import { addRecent } from '../storage/recents.js';
import { buildJiraIssueUrl } from '../utils/links.js';

const issueCache = new PersistentCache<JiraIssue>('jira:issue', 300); // 5 minute cache

export interface UseJiraIssueState {
  issue: JiraIssue | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useJiraIssue(
  client: JiraClient,
  issueKey: string,
  baseUrl?: string
): UseJiraIssueState {
  const [issue, setIssue] = useState<JiraIssue | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchIssue = async () => {
    setLoading(true);
    setError(null);

    try {
      // Check cache first
      const cached = issueCache.get(issueKey);
      if (cached) {
        setIssue(cached);
        setLoading(false);
        return;
      }

      // Fetch from API
      const data = await client.getIssue(issueKey);
      issueCache.set(issueKey, data);
      setIssue(data);

      if (baseUrl) {
        addRecent(
          'jira',
          issueKey,
          `${data.key}: ${data.fields.summary}`,
          buildJiraIssueUrl(baseUrl, data.key),
          { status: data.fields.status?.name }
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const refetch = async () => {
    issueCache.delete(issueKey);
    await fetchIssue();
  };

  useEffect(() => {
    if (issueKey) {
      fetchIssue();
    }
  }, [issueKey]);

  return {
    issue,
    loading,
    error,
    refetch,
  };
}
