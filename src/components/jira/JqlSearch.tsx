import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { JiraClient, JiraIssue } from '../../api/jira-client.js';
import { PersistentCache } from '../../storage/cache.js';
import { IssueList } from './IssueList.js';
import { te } from '../../theme/te.js';

const jqlCache = new PersistentCache<JiraIssue[]>('jira:jql', 300);

export interface JqlSearchProps {
  client: JiraClient;
  onSelectIssue: (issueKey: string) => void;
  onCancel: () => void;
}

export function JqlSearch({ client, onSelectIssue, onCancel }: JqlSearchProps) {
  const [jql, setJql] = useState('');
  const [issues, setIssues] = useState<JiraIssue[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useInput((_input, key) => {
    if (key.escape && issues === null) {
      onCancel();
    } else if (key.escape && issues !== null) {
      setIssues(null);
    }
  });

  const runSearch = async () => {
    if (!jql.trim()) return;
    setLoading(true);
    setError(null);

    const cacheKey = jql.trim();
    const cached = jqlCache.get(cacheKey);
    if (cached) {
      setIssues(cached);
      setLoading(false);
      return;
    }

    try {
      const res = await client.searchIssues(jql, 50);
      setIssues(res.issues);
      jqlCache.set(cacheKey, res.issues);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  if (issues !== null) {
    return (
      <IssueList
        title={`Results for JQL: ${jql}`}
        issues={issues}
        onSelect={onSelectIssue}
        onCancel={() => setIssues(null)}
      />
    );
  }

  return (
    <Box
      flexDirection="column"
      width="100%"
      borderStyle="single"
      borderColor={te.info}
      paddingX={1}
    >
      <Text bold color={te.accentAlt}>JQL SEARCH</Text>
      <Box marginY={1}>
        <Text color={te.muted}>Enter a JQL query and press Enter.</Text>
      </Box>
      <Box borderStyle="single" borderColor={te.muted} paddingX={1}>
        <TextInput
          value={jql}
          onChange={setJql}
          onSubmit={runSearch}
          placeholder='e.g. assignee = currentUser() AND statusCategory != Done'
        />
      </Box>
      {loading && <Text color={te.muted}>Searching...</Text>}
      {error && <Text color={te.danger}>{error}</Text>}
      <Box marginTop={1}>
        <Text color={te.muted}>Enter: Search | Escape: Back</Text>
      </Box>
    </Box>
  );
}
