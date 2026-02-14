export class AtlassianError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AtlassianError';
  }
}

export class JiraError extends AtlassianError {
  constructor(message: string) {
    super(message);
    this.name = 'JiraError';
  }
}

export class ConfluenceError extends AtlassianError {
  constructor(message: string) {
    super(message);
    this.name = 'ConfluenceError';
  }
}

export class AuthenticationError extends AtlassianError {
  constructor(service: string = 'Atlassian') {
    super(
      `Authentication failed for ${service}. Check your email and API token. ` +
      `Generate an API token at: https://id.atlassian.com/manage-profile/security/api-tokens`
    );
    this.name = 'AuthenticationError';
  }
}

export class ConfigurationError extends AtlassianError {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}
