import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { JiraClient, JiraTransition } from '../../api/jira-client.js';
import { useJiraIssue } from '../../hooks/useJiraIssue.js';
import { TicketDetail } from './TicketDetail.js';
import { TicketList } from './TicketList.js';
import { FuzzySelect } from '../common/FuzzySelect.js';
import { CreateTicket } from './CreateTicket.js';
import { QuickFilters } from './QuickFilters.js';
import { JqlSearch } from './JqlSearch.js';
import { SavedList } from '../common/SavedList.js';
import { MenuList } from '../common/MenuList.js';
import { listBookmarks, removeBookmark } from '../../storage/bookmarks.js';
import { listRecents } from '../../storage/recents.js';
import { PersistentCache } from '../../storage/cache.js';
import { te } from '../../theme/te.js';

type ViewMode =
  | 'menu'
  | 'list'
  | 'fuzzy-search'
  | 'quick-filters'
  | 'jql-search'
  | 'create'
  | 'bookmarks'
  | 'recents'
  | 'detail';

export interface JiraViewProps {
  client: JiraClient;
  baseUrl: string;
}

const jiraSearchCache = new PersistentCache<any[]>('jira:search', 300);

class ErrorBoundary extends React.Component<
  { children: React.ReactNode; onReset: () => void },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box flexDirection="column">
          <Text color="red">Error: {this.state.error?.message || 'Unknown error'}</Text>
          <Box marginTop={1}>
            <Text dimColor>Press Escape to go back</Text>
          </Box>
        </Box>
      );
    }

    return this.props.children;
  }
}

export function JiraView({ client, baseUrl }: JiraViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('menu');
  const [selectedKey, setSelectedKey] = useState('');
  const [detailReturnView, setDetailReturnView] = useState<ViewMode>('menu');
  const { issue, loading, error, refetch } = useJiraIssue(client, selectedKey, baseUrl);
  const [errorBoundaryKey, setErrorBoundaryKey] = useState(0);
  const [transitions, setTransitions] = useState<JiraTransition[]>([]);
  const [currentAccountId, setCurrentAccountId] = useState<string | undefined>();
  const [searchReturnView, setSearchReturnView] = useState<ViewMode>('menu');
  const [bookmarksVersion, setBookmarksVersion] = useState(0);

  const menuItems = [
    { label: 'Browse All Tickets', value: 'list' },
    { label: 'Search Tickets', value: 'fuzzy-search' },
    { label: 'Quick Filters', value: 'quick-filters' },
    { label: 'JQL Search', value: 'jql-search' },
    { label: 'Create Ticket', value: 'create' },
    { label: 'Bookmarks', value: 'bookmarks' },
    { label: 'Recent', value: 'recents' },
  ];

  // Fetch current user's account ID on mount
  useEffect(() => {
    const fetchMyself = async () => {
      try {
        const myself = await client.getMyself();
        setCurrentAccountId(myself.accountId);
      } catch {
        // Ignore - edit comment will just not show
      }
    };
    fetchMyself();
  }, [client]);

  // Fetch transitions when viewing a ticket
  useEffect(() => {
    if (viewMode === 'detail' && selectedKey) {
      const fetchTransitions = async () => {
        try {
          const t = await client.getTransitions(selectedKey);
          setTransitions(t);
        } catch {
          setTransitions([]);
        }
      };
      fetchTransitions();
    }
  }, [viewMode, selectedKey, client]);

  const handleMenuSelect = (item: any) => {
    if (item.value === 'list') {
      setViewMode('list');
    } else if (item.value === 'fuzzy-search') {
      setSearchReturnView('menu');
      setViewMode('fuzzy-search');
    } else if (item.value === 'quick-filters') {
      setViewMode('quick-filters');
    } else if (item.value === 'jql-search') {
      setViewMode('jql-search');
    } else if (item.value === 'create') {
      setViewMode('create');
    } else if (item.value === 'bookmarks') {
      setViewMode('bookmarks');
    } else if (item.value === 'recents') {
      setViewMode('recents');
    }
  };

  const handleTicketSearch = async (query: string) => {
    // Server-side search for tickets
    // If query is empty, maybe return recent? But FuzzySelect won't call this if empty usually (debounce).
    // If we want recent tickets on empty, we can handle it.
    const normalized = query.trim();
    if (!normalized) return [];
    const cacheKey = normalized.toLowerCase();
    const cached = jiraSearchCache.get(cacheKey);
    if (cached) {
      return cached;
    }
    const jql = `summary ~ "${normalized}*" OR key = "${normalized}" ORDER BY created DESC`;
    const res = await client.searchIssues(jql, 20);
    const results = res.issues.map(i => ({
      label: `${i.key}: ${i.fields.summary} (${i.fields.status.name})`,
      value: i.key,
      key: i.key
    }));
    jiraSearchCache.set(cacheKey, results);
    return results;
  };

  const openIssue = (key: string, from: ViewMode = viewMode) => {
    setDetailReturnView(from);
    setSelectedKey(key);
    setViewMode('detail');
  };

  const handleCreated = (key: string) => {
    openIssue(key, 'create');
  };

  const handleTicketSelect = (key: string) => {
    openIssue(key);
  };

  const goBack = () => {
    if (viewMode === 'detail') {
      setSelectedKey('');
      setTransitions([]);
      setViewMode(detailReturnView === 'detail' ? 'menu' : detailReturnView);
    } else {
      setSelectedKey('');
      setTransitions([]);
      setViewMode('menu');
    }
    setErrorBoundaryKey(prev => prev + 1);
  };

  // Handle save title
  const handleSaveTitle = async (title: string) => {
    if (!selectedKey) return;
    await client.updateIssue(selectedKey, { summary: title });
  };

  // Handle save description
  const handleSaveDescription = async (description: string) => {
    if (!selectedKey) return;
    const adfDescription = {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: description }],
        },
      ],
    };
    await client.updateIssue(selectedKey, { description: adfDescription });
  };

  // Handle add comment
  const handleAddComment = async (comment: string) => {
    if (!selectedKey) return;
    const adfComment = {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: comment }],
        },
      ],
    };
    await client.addComment(selectedKey, adfComment);
  };

  // Handle update comment
  const handleUpdateComment = async (commentId: string, comment: string) => {
    if (!selectedKey) return;
    const adfComment = {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: comment }],
        },
      ],
    };
    await client.updateComment(selectedKey, commentId, adfComment);
  };

  // Handle status transition
  const handleTransition = async (transitionId: string) => {
    if (!selectedKey) return;
    await client.transitionIssue(selectedKey, transitionId);
  };

  // Handle keyboard shortcuts (only for non-detail views - detail handles its own escape)
  // Use isActive to disable when menu is shown (SelectInput handles arrow keys in menu mode)
  useInput((input, key) => {
    // Escape to go back (only for list/search/create modes - detail mode handles its own)
    if (key.escape && viewMode !== 'menu' && viewMode !== 'detail') {
      goBack();
    }
    // Slash to search from list view
    else if (input === '/' && viewMode === 'list') {
      setSearchReturnView('list');
      setViewMode('fuzzy-search');
    }
    // Ctrl+R to refresh
    else if (key.ctrl && input === 'r' && viewMode === 'detail' && selectedKey) {
      refetch();
    }
  }, { isActive: viewMode !== 'menu' });

  // Menu view
  if (viewMode === 'menu') {
    return (
      <Box
        flexDirection="column"
        width="100%"
        borderStyle="single"
        borderColor={te.accent}
        paddingX={1}
      >
        <Box>
          <Text bold color={te.accentAlt}>JIRA CONTROL PANEL</Text>
        </Box>
        <MenuList
          items={menuItems}
          onSelect={handleMenuSelect}
          isActive={viewMode === 'menu'}
        />
        <Box>
          <Text color={te.muted}>Enter: Select | Ctrl+Q: Quit</Text>
        </Box>
      </Box>
    );
  }

  // List view (all tickets)
  if (viewMode === 'list') {
    return (
      <ErrorBoundary key={errorBoundaryKey} onReset={goBack}>
        <TicketList
          client={client}
          onSelectTicket={handleTicketSelect}
          onCancel={goBack}
        />
      </ErrorBoundary>
    );
  }

  // Fuzzy search view
  if (viewMode === 'fuzzy-search') {
    return (
      <ErrorBoundary key={errorBoundaryKey} onReset={goBack}>
        <FuzzySelect
          label="Search Jira Tickets"
          onSearch={handleTicketSearch}
          onSelect={handleTicketSelect}
          onBack={() => setViewMode(searchReturnView)}
          placeholder="Type summary or key..."
          minQueryLength={2}
        />
      </ErrorBoundary>
    );
  }

  if (viewMode === 'quick-filters') {
    return (
      <ErrorBoundary key={errorBoundaryKey} onReset={goBack}>
        <QuickFilters
          client={client}
          onSelectIssue={handleTicketSelect}
          onCancel={goBack}
        />
      </ErrorBoundary>
    );
  }

  if (viewMode === 'jql-search') {
    return (
      <ErrorBoundary key={errorBoundaryKey} onReset={goBack}>
        <JqlSearch
          client={client}
          onSelectIssue={handleTicketSelect}
          onCancel={goBack}
        />
      </ErrorBoundary>
    );
  }

  if (viewMode === 'bookmarks') {
    const bookmarks = listBookmarks('jira');
    return (
      <SavedList
        key={bookmarksVersion}
        title="Jira Bookmarks"
        items={bookmarks.map(b => ({
          id: b.id,
          title: b.title,
          subtitle: b.key,
          value: b.key,
        }))}
        onSelect={(key) => {
          openIssue(key, 'bookmarks');
        }}
        onRemove={(key) => {
          removeBookmark('jira', key);
          setBookmarksVersion(v => v + 1);
        }}
        onBack={goBack}
        emptyMessage="No Jira bookmarks yet."
      />
    );
  }

  if (viewMode === 'recents') {
    const recents = listRecents('jira');
    return (
      <SavedList
        title="Recent Jira Issues"
        items={recents.map(r => ({
          id: r.id,
          title: r.title,
          subtitle: r.key,
          value: r.key,
        }))}
        onSelect={(key) => {
          openIssue(key, 'recents');
        }}
        onBack={goBack}
        emptyMessage="No recent Jira issues yet."
      />
    );
  }

  // Create Ticket View
  if (viewMode === 'create') {
    return (
      <ErrorBoundary key={errorBoundaryKey} onReset={goBack}>
        <CreateTicket
          client={client}
          onCreated={handleCreated}
          onCancel={goBack}
        />
      </ErrorBoundary>
    );
  }

  // Detail view with interactive selection
  return (
    <ErrorBoundary key={errorBoundaryKey} onReset={goBack}>
      <Box flexDirection="column" width="100%">
        {loading && <Text>Loading issue {selectedKey}...</Text>}

        {error && (
          <Box flexDirection="column">
            <Text color="red">Error: {error.message}</Text>
            <Text dimColor>Press Ctrl+B to go back</Text>
          </Box>
        )}

      {issue && (
        <TicketDetail
          issue={issue}
          baseUrl={baseUrl}
          currentAccountId={currentAccountId}
          transitions={transitions}
          onSaveTitle={handleSaveTitle}
          onSaveDescription={handleSaveDescription}
          onAddComment={handleAddComment}
          onUpdateComment={handleUpdateComment}
          onTransition={handleTransition}
          onFetchComments={() => client.getComments(issue.key).then(r => r.comments as any)}
          onDownloadAttachment={async (attachmentId, filename) => {
            const data = await client.downloadAttachment(attachmentId);
            return { data, filename };
          }}
          onUploadAttachment={(filePath) => client.uploadAttachment(issue.key, filePath)}
          onBookmarkChanged={() => setBookmarksVersion(v => v + 1)}
          onRefresh={refetch}
          onBack={goBack}
        />
      )}
      </Box>
    </ErrorBoundary>
  );
}
