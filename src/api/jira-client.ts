import { ApiClient, ApiClientConfig } from './client.js';
import { readFileSync } from 'fs';
import { basename } from 'path';

export interface JiraIssue {
  key: string;
  id: string;
  fields: {
    summary: string;
    description: any;
    status: {
      name: string;
      id: string;
    };
    comment?: {
      comments: Array<{
        id: string;
        author: {
          displayName: string;
          accountId?: string;
        };
        created: string;
        body: any;
      }>;
      total?: number;
    };
    attachment?: JiraAttachment[];
    [key: string]: any;
  };
}

export interface JiraTransition {
  id: string;
  name: string;
  to: {
    name: string;
  };
}

export interface JiraSearchResult {
  issues: JiraIssue[];
  total: number;
}

export interface JiraComment {
  body: any;
}

export interface JiraAttachment {
  id: string;
  filename: string;
  size: number;
  mimeType?: string;
  content?: string;
  thumbnail?: string;
  created?: string;
  author?: {
    displayName: string;
    accountId?: string;
  };
}

export class JiraClient {
  private apiClient: ApiClient;

  constructor(config: ApiClientConfig) {
    this.apiClient = new ApiClient(config);
  }

  async getIssue(key: string): Promise<JiraIssue> {
    const expand = 'changelog,changelog.histories';
    const fields = 'summary,description,status,comment,attachment,issuetype,priority,labels,assignee,reporter,created,updated,duedate';
    return this.apiClient.get<JiraIssue>(
      `/rest/api/3/issue/${key}?expand=${expand}&fields=${fields}`
    );
  }

  async updateIssue(
    key: string,
    fields: { summary?: string; description?: any }
  ): Promise<void> {
    await this.apiClient.put(`/rest/api/3/issue/${key}`, { fields });
  }

  async getTransitions(key: string): Promise<JiraTransition[]> {
    const response = await this.apiClient.get<{ transitions: JiraTransition[] }>(
      `/rest/api/3/issue/${key}/transitions`
    );
    return response.transitions;
  }

  async transitionIssue(key: string, transitionId: string): Promise<void> {
    await this.apiClient.post(`/rest/api/3/issue/${key}/transitions`, {
      transition: { id: transitionId },
    });
  }

  async addComment(key: string, body: any): Promise<void> {
    await this.apiClient.post(`/rest/api/3/issue/${key}/comment`, { body });
  }

  async updateComment(issueKey: string, commentId: string, body: any): Promise<void> {
    await this.apiClient.put(`/rest/api/3/issue/${issueKey}/comment/${commentId}`, { body });
  }

  async getComments(issueKey: string, startAt: number = 0, maxResults: number = 100): Promise<{ comments: JiraComment[]; total: number }> {
    const res = await this.apiClient.get<any>(
      `/rest/api/3/issue/${issueKey}/comment?startAt=${startAt}&maxResults=${maxResults}`
    );
    return { comments: res.comments || [], total: res.total || 0 };
  }

  async getMyself(): Promise<{ accountId: string; displayName: string }> {
    return this.apiClient.get('/rest/api/3/myself');
  }

  async searchIssues(jql: string, maxResults: number = 50, startAt: number = 0): Promise<JiraSearchResult> {
    const fields = encodeURIComponent('summary,status,description,created,issuetype,priority');
    const encodedJql = encodeURIComponent(jql);

    // Prefer enhanced JQL search API with cursor-backed pagination metadata.
    // Use startAt for TUI paging and infer total when API does not provide it.
    try {
      const enhanced = await this.apiClient.get<any>(
        `/rest/api/3/search/jql?jql=${encodedJql}&startAt=${startAt}&maxResults=${maxResults}&fields=${fields}`
      );

      const issues = Array.isArray(enhanced?.issues) ? enhanced.issues : [];
      const hasNext = enhanced?.isLast === false || Boolean(enhanced?.nextPageToken);
      const total = typeof enhanced?.total === 'number'
        ? enhanced.total
        : (hasNext ? startAt + issues.length + 1 : startAt + issues.length);

      return { issues, total };
    } catch {
      // Fallback for older Jira tenants.
      const fallback = await this.apiClient.post<any>(
        '/rest/api/3/search/jql',
        {
          jql,
          startAt,
          maxResults,
          fields: ['summary', 'status', 'description', 'created', 'issuetype', 'priority'],
          expand: 'names'
        }
      );

      const issues = Array.isArray(fallback?.issues) ? fallback.issues : [];
      const total = typeof fallback?.total === 'number'
        ? fallback.total
        : startAt + issues.length;

      return { issues, total };
    }
  }

  async getProjects(): Promise<{ id: string, key: string, name: string }[]> {
    const res = await this.apiClient.get<{ values: any[] }>('/rest/api/3/project/search?maxResults=1000');
    return res.values.map(p => ({
      id: p.id,
      key: p.key,
      name: p.name
    }));
  }

  async searchProjects(query: string): Promise<{ id: string, key: string, name: string }[]> {
    const res = await this.apiClient.get<{ values: any[] }>(`/rest/api/3/project/search?query=${encodeURIComponent(query)}`);
    return res.values.map(p => ({
      id: p.id,
      key: p.key,
      name: p.name
    }));
  }

  async getCreateMeta(projectKey: string): Promise<{ id: string, name: string }[]> {
    // Prefer the dedicated v3 endpoint for project issue types.
    // Fallback to legacy createmeta response shape for compatibility.
    try {
      const modern = await this.apiClient.get<any>(
        `/rest/api/3/issue/createmeta/${encodeURIComponent(projectKey)}/issuetypes`
      );

      const issueTypes =
        modern?.issueTypes ||
        modern?.values ||
        modern?.results ||
        modern?.issuetypes ||
        [];

      if (Array.isArray(issueTypes)) {
        return issueTypes
          .map((t: any) => ({ id: String(t.id || ''), name: String(t.name || '') }))
          .filter((t: { id: string; name: string }) => t.id && t.name);
      }
    } catch {
      // Continue to legacy endpoint.
    }

    const legacy = await this.apiClient.get<any>(
      `/rest/api/3/issue/createmeta?projectKeys=${encodeURIComponent(projectKey)}&expand=projects.issuetypes.fields`
    );

    if (legacy?.projects?.length > 0 && Array.isArray(legacy.projects[0].issuetypes)) {
      return legacy.projects[0].issuetypes
        .map((t: any) => ({ id: String(t.id || ''), name: String(t.name || '') }))
        .filter((t: { id: string; name: string }) => t.id && t.name);
    }

    return [];
  }

  async createIssue(projectKey: string, issueTypeId: string, summary: string, description: string): Promise<JiraIssue> {
    const body = {
      fields: {
        project: { key: projectKey },
        issuetype: { id: issueTypeId },
        summary: summary,
        description: {
          type: "doc",
          version: 1,
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: description
                }
              ]
            }
          ]
        }
      }
    };
    return this.apiClient.post<JiraIssue>('/rest/api/3/issue', body);
  }

  async downloadAttachment(attachmentId: string): Promise<Buffer> {
    return this.apiClient.getBuffer(`/rest/api/3/attachment/content/${attachmentId}`);
  }

  async uploadAttachment(issueKey: string, filePath: string): Promise<void> {
    const form = new FormData();
    const fileBuffer = readFileSync(filePath);
    const blob = new Blob([fileBuffer]);
    form.append('file', blob, basename(filePath));

    await this.apiClient.postFormData(`/rest/api/3/issue/${issueKey}/attachments`, form, {
      headers: {
        'X-Atlassian-Token': 'no-check',
      },
    });
  }
}
