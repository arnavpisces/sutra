import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import SelectInput from 'ink-select-input';
import { JiraClient, JiraIssue } from '../../api/jira-client.js';
import { PersistentCache } from '../../storage/cache.js';
import { JiraIssueHeader, JiraIssueRow } from './JiraIssueRow.js';
import { te } from '../../theme/te.js';

// Cache for ticket list (5 minute TTL)
const ticketListCache = new PersistentCache<{ issues: JiraIssue[]; total: number }>('jira:ticket-list', 300);
const PAGE_SIZE = 35;

export interface TicketListProps {
  client: JiraClient;
  onSelectTicket: (key: string) => void;
  onCancel: () => void;
}

export function TicketList({ client, onSelectTicket, onCancel }: TicketListProps) {
  const { stdout } = useStdout();
  const [tickets, setTickets] = useState<JiraIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchTickets = async () => {
      const startAt = pageIndex * PAGE_SIZE;

      // Check cache first
      const cacheKey = `ticket-list:${startAt}:${PAGE_SIZE}`;
      const cached = ticketListCache.get(cacheKey);
      if (cached) {
        setTickets(cached.issues);
        setTotal(cached.total);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // JQL query must be bounded for /search/jql endpoint
        // Use assignee = currentUser() OR recently updated issues in projects user can see
        const jql = 'assignee = currentUser() OR reporter = currentUser() ORDER BY updated DESC';
        const result = await client.searchIssues(jql, PAGE_SIZE, startAt);
        setTickets(result.issues);
        setTotal(typeof result.total === 'number' ? result.total : startAt + result.issues.length);
        // Cache the results
        ticketListCache.set(cacheKey, {
          issues: result.issues,
          total: typeof result.total === 'number' ? result.total : startAt + result.issues.length,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch tickets');
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, [client, pageIndex]);

  const hasPrevPage = pageIndex > 0;
  const hasNextPage = (pageIndex + 1) * PAGE_SIZE < total;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // Keep list height within app viewport so the header never gets pushed off-screen.
  const listLimit = Math.max(6, Math.min(15, (stdout?.rows || 24) - 12));

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }
    if ((input === 'n' || input === ']') && hasNextPage && !loading) {
      setPageIndex(prev => prev + 1);
      return;
    }
    if ((input === 'p' || input === '[') && hasPrevPage && !loading) {
      setPageIndex(prev => Math.max(0, prev - 1));
    }
  });

  if (loading) {
    return (
      <Box flexDirection="column">
        <Text>Loading tickets...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box flexDirection="column">
        <Text color="red">Error: {error}</Text>
        <Text dimColor>Press Escape to go back</Text>
      </Box>
    );
  }

  const items = tickets.map((ticket) => ({
    key: ticket.key,
    label: ticket.key,
    value: ticket.key,
    issue: ticket,
  }));

  if (items.length === 0) {
    return (
      <Box flexDirection="column">
        <Text color="yellow">No tickets found in your Jira instance.</Text>
        <Box marginTop={1}>
          <Text dimColor>Create a ticket in Jira first, then come back here.</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Press Escape to go back</Text>
        </Box>
      </Box>
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
      <Box marginBottom={1}>
        <Text bold color={te.accentAlt}>RECENT TICKETS</Text>
        <Text color={te.fg}>{`  Page ${pageIndex + 1}/${totalPages} | ${total} total`}</Text>
      </Box>
      <Box marginBottom={1}>
        <JiraIssueHeader />
      </Box>

      <SelectInput
        items={items}
        onSelect={(item: any) => onSelectTicket(item.value)}
        limit={listLimit}
        itemComponent={JiraIssueRow as any}
      />

      <Box marginTop={1}>
        <Text color={te.muted}>
          Enter: Select | n or ]: Next Page | p or [: Prev Page | Escape: Back
        </Text>
      </Box>
    </Box>
  );
}
