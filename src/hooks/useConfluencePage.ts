import { useState, useEffect } from 'react';
import { ConfluenceClient, ConfluencePage } from '../api/confluence-client.js';
import { PersistentCache } from '../storage/cache.js';
import { addRecent } from '../storage/recents.js';
import { resolveUrl } from '../utils/links.js';

const pageCache = new PersistentCache<ConfluencePage>('confluence:page', 300); // 5 minute cache

export interface UseConfluencePageState {
  page: ConfluencePage | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useConfluencePage(
  client: ConfluenceClient,
  pageId: string
): UseConfluencePageState {
  const [page, setPage] = useState<ConfluencePage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchPage = async () => {
    setLoading(true);
    setError(null);

    try {
      // Check cache first
      const cached = pageCache.get(pageId);
      if (cached) {
        setPage(cached);
        setLoading(false);
        return;
      }

      // Fetch from API
      const data = await client.getPage(pageId);
      pageCache.set(pageId, data);
      setPage(data);

      const baseUrl = client.getBaseUrl?.();
      if (baseUrl) {
        addRecent(
          'confluence',
          pageId,
          data.title,
          resolveUrl(baseUrl, data._links?.webui || ''),
          { type: data.type }
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const refetch = async () => {
    pageCache.delete(pageId);
    await fetchPage();
  };

  useEffect(() => {
    if (pageId) {
      fetchPage();
    }
  }, [pageId]);

  return {
    page,
    loading,
    error,
    refetch,
  };
}
