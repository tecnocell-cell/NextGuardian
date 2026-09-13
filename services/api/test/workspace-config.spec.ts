import { parseEnvironment } from '../src/shared/config/environment.js';
import { WorkspaceDatabase } from '../src/modules/workspaces/workspace.database.js';

describe('workspace database configuration', () => {
  it('uses the existing env schema for a PostgreSQL URL', () => {
    const url = 'postgresql://localhost/example';
    expect(parseEnvironment({ DATABASE_URL: url }).DATABASE_URL).toBe(url);
  });
  it('rejects invalid URLs and other databases without disclosing the input', () => {
    for (const value of ['private-not-a-url', 'https://private.invalid']) {
      expect(() => parseEnvironment({ DATABASE_URL: value })).toThrow('Invalid environment: DATABASE_URL');
    }
  });
  it('fails closed for persistence without DATABASE_URL, while health remains independent', () => {
    expect(() => new WorkspaceDatabase().client).toThrow('DATABASE_URL is required');
  });
});
