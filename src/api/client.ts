import ky, { KyResponse } from 'ky';

export interface ApiClientConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
}

export class ApiClient {
  private baseUrl: string;
  private auth: string;
  private client: ReturnType<typeof ky.create>;
  private rawClient: ReturnType<typeof ky.create>;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl;
    this.auth = this.encodeBasicAuth(config.email, config.apiToken);

    this.client = ky.create({
      prefixUrl: this.baseUrl,
      headers: {
        Authorization: `Basic ${this.auth}`,
      },
      timeout: 30000,
      retry: {
        limit: 2,
        methods: ['get', 'head', 'put', 'delete'],
        statusCodes: [408, 429, 500, 502, 503, 504],
      },
    });

    // Raw client without prefixUrl for absolute URLs
    this.rawClient = ky.create({
      headers: {
        Authorization: `Basic ${this.auth}`,
      },
      timeout: 30000,
      retry: {
        limit: 2,
        methods: ['get', 'head', 'put', 'delete'],
        statusCodes: [408, 429, 500, 502, 503, 504],
      },
    });
  }

  private encodeBasicAuth(email: string, token: string): string {
    return Buffer.from(`${email}:${token}`).toString('base64');
  }

  private normalizeUrl(url: string): string {
    // Remove leading slash since prefixUrl doesn't allow it
    return url.startsWith('/') ? url.slice(1) : url;
  }

  private isAbsoluteUrl(url: string): boolean {
    return /^https?:\/\//i.test(url);
  }

  private getClient(url: string) {
    return this.isAbsoluteUrl(url) ? this.rawClient : this.client;
  }

  async get<T = any>(url: string, options?: any): Promise<T> {
    try {
      const client = this.getClient(url);
      const target = this.isAbsoluteUrl(url) ? url : this.normalizeUrl(url);
      const response = await client.get(target, options);
      return response.json<T>();
    } catch (error) {
      return await this.handleError(error);
    }
  }

  async post<T = any>(url: string, data?: any, options?: any): Promise<T> {
    try {
      const client = this.getClient(url);
      const target = this.isAbsoluteUrl(url) ? url : this.normalizeUrl(url);
      const response = await client.post(target, {
        json: data,
        ...options,
      });
      // Handle 204 No Content (common for some Jira POST operations like transitions)
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        return {} as T;
      }
      return response.json<T>();
    } catch (error) {
      return await this.handleError(error);
    }
  }

  async put<T = any>(url: string, data?: any, options?: any): Promise<T> {
    try {
      const client = this.getClient(url);
      const target = this.isAbsoluteUrl(url) ? url : this.normalizeUrl(url);
      const response = await client.put(target, {
        json: data,
        ...options,
      });
      // Handle 204 No Content (common for Jira PUT responses)
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        return {} as T;
      }
      return response.json<T>();
    } catch (error) {
      return await this.handleError(error);
    }
  }

  async delete<T = any>(url: string, options?: any): Promise<T> {
    try {
      const client = this.getClient(url);
      const target = this.isAbsoluteUrl(url) ? url : this.normalizeUrl(url);
      const response = await client.delete(target, options);
      if (response.status === 204) {
        return {} as T;
      }
      return response.json<T>();
    } catch (error) {
      return await this.handleError(error);
    }
  }

  async getBuffer(url: string, options?: any): Promise<Buffer> {
    try {
      const client = this.getClient(url);
      const target = this.isAbsoluteUrl(url) ? url : this.normalizeUrl(url);
      const response = await client.get(target, options);
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      return await this.handleError(error);
    }
  }

  async postFormData<T = any>(url: string, formData: FormData, options?: any): Promise<T> {
    try {
      const client = this.getClient(url);
      const target = this.isAbsoluteUrl(url) ? url : this.normalizeUrl(url);
      const response = await client.post(target, {
        body: formData,
        ...options,
      });
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        return {} as T;
      }
      return response.json<T>();
    } catch (error) {
      return await this.handleError(error);
    }
  }

  private async handleError(error: any): Promise<never> {
    // Check if it's an HTTP error from ky
    if (error.response && error.response.status) {
      const status = error.response.status;
      let errorBody = '';

      // Try to get the error body for more context
      try {
        errorBody = await error.response.text();
      } catch (e) {
        // Ignore if we can't read the body
      }

      if (status === 401) {
        throw new Error('Authentication failed. Check your email and API token.');
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
        // For 400 errors, include the API response for debugging
        const msg = errorBody.length > 200 ? errorBody.substring(0, 200) : errorBody;
        throw new Error(`HTTP ${status}: ${msg}`);
      }

      throw new Error(`HTTP ${status}: ${error.response.statusText}`);
    }

    throw error;
  }
}
