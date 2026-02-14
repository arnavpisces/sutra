import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import { JiraClient, JiraIssue } from '../../api/jira-client.js';
import { PersistentCache } from '../../storage/cache.js';
import { IssueList } from './IssueList.js';
import { te } from '../../theme/te.js';

const quickCache = new PersistentCache<JiraIssue[]>('jira:quick', 300);

const filters = [
  { label: 'Assigned to me', jql: 'assignee = currentUser() ORDER BY updated DESC' },
  { label: 'Reported by me', jql: 'reporter = currentUser() ORDER BY updated DESC' },
  { label: 'My open issues', jql: 'assignee = currentUser() AND statusCategory != Done ORDER BY updated DESC' },
  { label: 'Recently updated', jql: 'updated >= -7d ORDER BY updated DESC' },
  { label: 'Recently created', jql: 'created >= -7d ORDER BY created DESC' },
];

export interface QuickFiltersProps {
  client: JiraClient;
  onSelectIssue: (issueKey: string) => void;
  onCancel: () => void;
}

export function QuickFilters({ client, onSelectIssue, onCancel }: QuickFiltersProps) {
  const [selectedFilter, setSelectedFilter] = useState<typeof filters[0] | null>(null);
  const [issues, setIssues] = useState<JiraIssue[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useInput((_input, key) => {
    if (key.escape && !selectedFilter) {
      onCancel();
    } else if (key.escape && selectedFilter) {
      setSelectedFilter(null);
      setIssues(null);
    }
  });

  const runFilter = async (filter: typeof filters[0]) => {
    setSelectedFilter(filter);
    setLoading(true);
    setError(null);

    const cacheKey = filter.jql;
    const cached = quickCache.get(cacheKey);
    if (cached) {
      setIssues(cached);
      setLoading(false);
      return;
    }

    try {
      const res = await client.searchIssues(filter.jql, 50);
      setIssues(res.issues);
      quickCache.set(cacheKey, res.issues);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch issues');
    } finally {
      setLoading(false);
    }
  };

  if (selectedFilter && issues) {
    return (
      <IssueList
        title={`Quick Filter: ${selectedFilter.label}`}
        issues={issues}
        onSelect={onSelectIssue}
        onCancel={() => {
          setSelectedFilter(null);
          setIssues(null);
        }}
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
      <Text bold color={te.accentAlt}>QUICK FILTERS</Text>
      <Box marginTop={1}>
        <SelectInput
          items={filters.map((f) => ({ label: f.label, value: f }))}
          onSelect={(item: any) => runFilter(item.value)}
        />
      </Box>
      {loading && <Text color={te.muted}>Loading...</Text>}
      {error && <Text color={te.danger}>{error}</Text>}
      <Box marginTop={1}>
        <Text color={te.muted}>Enter: Select | Escape: Back</Text>
      </Box>
    </Box>
  );
}
