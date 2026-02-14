import ky from 'ky';
import { readFileSync } from 'fs';
import { basename } from 'path';

export interface ConfluencePage {
  id: string;
  type: string;
  title: string;
  version: {
    number: number;
  };
  body: {
    storage: {
      value: string;
      representation: string;
    };
  };
  _links: {
    webui: string;
  };
}

export interface ConfluenceSearchResult {
  results: Array<{
    content?: {
      id: string;
      title: string;
      type: string;
    };
    resultGlobalContainer?: {
      title: string;
    };
    // Direct properties (fallback for different API versions)
    id?: string;
    title?: string;
    type?: string;
    space?: {
      name: string;
    };
  }>;
  size: number;
  start?: number;
  limit?: number;
  _links?: {
    next?: string;
    prev?: string;
    self?: string;
  };
}

export interface ConfluenceComment {
  id: string;
  title: string;
  type: string;
  version?: { number: number };
  body?: {
    storage?: { value: string; representation: string };
  };
  _links?: { webui?: string };
}

export interface ConfluenceCommentsResult {
  results: ConfluenceComment[];
  size: number;
}

export interface ConfluenceLabel {
  prefix: string;
  name: string;
}

export interface ConfluenceLabelsResult {
  results: ConfluenceLabel[];
  size: number;
}

export interface ConfluenceAttachment {
  id: string;
  title: string;
  type: string;
  version?: { number: number };
  _links: { download?: string; webui?: string };
  metadata?: { mediaType?: string; size?: number };
}

export interface ConfluenceAttachmentsResult {
  results: ConfluenceAttachment[];
  size: number;
}

export interface ConfluenceSpace {
  id: string;
  key: string;
  name: string;
  type: string;
  _links?: {
    webui: string;
  };
}

export interface ConfluenceSpacesResult {
  results: ConfluenceSpace[];
  size: number;
}

export class ConfluenceClient {
  private client: ReturnType<typeof ky.create>;
  private baseUrl: string;
  private email: string;
  private apiToken: string;
  private authHeader: string;

  constructor(config: { baseUrl: string; email: string; apiToken: string }) {
    this.baseUrl = config.baseUrl;
    this.email = config.email;
    this.apiToken = config.apiToken;

    const auth = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64');
    this.authHeader = `Basic ${auth}`;

    this.client = ky.create({
      prefixUrl: config.baseUrl,
      headers: {
        Authorization: this.authHeader,
      },
      timeout: 30000,
      retry: {
        limit: 2,
        methods: ['get', 'head', 'put', 'delete'],
        statusCodes: [408, 429, 500, 502, 503, 504],
      },
    });
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  async getPage(id: string): Promise<ConfluencePage> {
    try {
      const expand = 'body.storage,version';
      const response = await this.client.get(
        `rest/api/content/${id}?expand=${expand}`
      );
      return response.json<ConfluencePage>();
    } catch (error) {
      return await this.handleError(error);
    }
  }

  async updatePage(
    id: string,
    title: string,
    content: string,
    version: number
  ): Promise<ConfluencePage> {
    try {
      const response = await this.client.put(
        `rest/api/content/${id}`,
        {
          json: {
            id,
            type: 'page',
            version: {
              number: version + 1,
            },
            title,
            body: {
              storage: {
                value: content,
                representation: 'storage',
              },
            },
          },
        }
      );
      return response.json<ConfluencePage>();
    } catch (error) {
      return await this.handleError(error);
    }
  }

  async searchPages(cql: string, limit: number = 25, start: number = 0): Promise<ConfluenceSearchResult> {
    try {
      const response = await this.client.get(
        `rest/api/search?cql=${encodeURIComponent(cql)}&limit=${limit}&start=${start}`
      );
      return response.json<ConfluenceSearchResult>();
    } catch (error) {
      return await this.handleError(error);
    }
  }

  async getComments(pageId: string, limit: number = 50): Promise<ConfluenceCommentsResult> {
    try {
      const response = await this.client.get(
        `rest/api/content/${pageId}/child/comment?expand=body.storage,version&limit=${limit}`
      );
      return response.json<ConfluenceCommentsResult>();
    } catch (error) {
      return await this.handleError(error);
    }
  }

  async addComment(pageId: string, storageContent: string): Promise<ConfluenceComment> {
    try {
      const response = await this.client.post('rest/api/content', {
        json: {
          type: 'comment',
          container: { id: pageId, type: 'page' },
          body: {
            storage: {
              value: storageContent,
              representation: 'storage',
            },
          },
        },
      });
      return response.json<ConfluenceComment>();
    } catch (error) {
      return await this.handleError(error);
    }
  }

  async getLabels(pageId: string): Promise<ConfluenceLabelsResult> {
    try {
      const response = await this.client.get(`rest/api/content/${pageId}/label`);
      return response.json<ConfluenceLabelsResult>();
    } catch (error) {
      return await this.handleError(error);
    }
  }

  async addLabel(pageId: string, label: string): Promise<void> {
    try {
      await this.client.post(`rest/api/content/${pageId}/label`, {
        json: [{ prefix: 'global', name: label }],
      });
    } catch (error) {
      return await this.handleError(error);
    }
  }

  async removeLabel(pageId: string, label: string): Promise<void> {
    try {
      await this.client.delete(
        `rest/api/content/${pageId}/label?name=${encodeURIComponent(label)}`
      );
    } catch (error) {
      return await this.handleError(error);
    }
  }

  async getAttachments(pageId: string, limit: number = 50): Promise<ConfluenceAttachmentsResult> {
    try {
      const response = await this.client.get(
        `rest/api/content/${pageId}/child/attachment?limit=${limit}`
      );
      return response.json<ConfluenceAttachmentsResult>();
    } catch (error) {
      return await this.handleError(error);
    }
  }

  async uploadAttachment(pageId: string, filePath: string): Promise<void> {
    const form = new FormData();
    const fileBuffer = readFileSync(filePath);
    const blob = new Blob([fileBuffer]);
    form.append('file', blob, basename(filePath));
    try {
      await this.client.post(`rest/api/content/${pageId}/child/attachment`, {
        body: form,
        headers: {
          'X-Atlassian-Token': 'no-check',
        },
      });
    } catch (error) {
      return await this.handleError(error);
    }
  }

  async downloadAttachment(downloadPathOrUrl: string): Promise<Buffer> {
    try {
      const resolved =
        /^https?:\/\//i.test(downloadPathOrUrl)
          ? downloadPathOrUrl
          : this.baseUrl.replace(/\/+$/, '') +
            (downloadPathOrUrl.startsWith('/') ? downloadPathOrUrl : `/${downloadPathOrUrl}`);

      const cleaned = resolved.replace(/\/wiki\/wiki\//, '/wiki/');

      const response = await ky.get(cleaned, {
        headers: {
          Authorization: this.authHeader,
        },
      });
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      return await this.handleError(error);
    }
  }

  async getSpaces(limit: number = 50): Promise<ConfluenceSpacesResult> {
    try {
      const response = await this.client.get(
        `rest/api/space?limit=${limit}&type=global`
      );
      return response.json<ConfluenceSpacesResult>();
    } catch (error) {
      return await this.handleError(error);
    }
  }

  async getPagesInSpace(spaceKey: string, limit: number = 25, start: number = 0): Promise<ConfluenceSearchResult> {
    try {
      const cql = `space="${spaceKey}" and type=page order by lastmodified desc`;
      const response = await this.client.get(
        `rest/api/search?cql=${encodeURIComponent(cql)}&limit=${limit}&start=${start}`
      );
      return response.json<ConfluenceSearchResult>();
    } catch (error) {
      return await this.handleError(error);
    }
  }

  private async handleError(error: any): Promise<never> {
    if (error.response && error.response.status) {
      const status = error.response.status;
      let errorBody = '';

      try {
        errorBody = await error.response.text();
      } catch {
        // ignore
      }

      if (status === 401) {
        throw new Error('Authentication failed. Check your email and API token.');
      }
      if (status === 403) {
        throw new Error('Access denied. You may not have Confluence access or license.');
      }
      if (status === 404) {
        throw new Error('Resource not found.');
      }
      if (status >= 500) {
        throw new Error(`Server error: ${status}. Please try again later.`);
      }
      if (status === 429) {
        throw new Error('Rate limited. Please wait before trying again.');
      }
      if (status === 400 && errorBody) {
        const msg = errorBody.length > 200 ? errorBody.slice(0, 200) : errorBody;
        throw new Error(`HTTP ${status}: ${msg}`);
      }

      throw new Error(`HTTP ${status}: ${error.response.statusText}`);
    }

    throw error;
  }
}
