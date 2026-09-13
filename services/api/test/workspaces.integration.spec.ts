import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { WorkspacesModule } from '../src/modules/workspaces/workspaces.module.js';
import { WorkspaceRepository, type ScopedWorkspaceRepository } from '../src/modules/workspaces/workspace.repository.js';

// Invoked ONLY by the runner that starts a fresh local PostgreSQL cluster.
const url = process.env.WP102_DATABASE_URL;
if (!url || process.env.WP102_EPHEMERAL !== '1') throw new Error('Run npm run test:integration; no external database is accepted');

describe('WP-102 real PostgreSQL isolation', () => {
  const a = randomUUID(), b = randomUUID(), userA = randomUUID(), userB = randomUUID(), shared = randomUUID();
  let db: PrismaClient;
  let module: TestingModule;
  let repository: WorkspaceRepository;
  let scopeA: ScopedWorkspaceRepository, scopeB: ScopedWorkspaceRepository;

  beforeAll(async () => {
    db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }), log: [] });
    module = await Test.createTestingModule({ imports: [WorkspacesModule.register(url)] }).compile();
    await module.init();
    repository = module.get(WorkspaceRepository);
    scopeA = repository.forWorkspace(a); scopeB = repository.forWorkspace(b);
    await db.workspace.createMany({ data: [
      { workspaceId: a, name: 'Family A', profile: 'FAMILY' },
      { workspaceId: b, name: 'Family B', profile: 'FAMILY' },
    ] });
    await db.user.createMany({ data: [
      { userId: userA, name: 'A', email: 'a@example.invalid' },
      { userId: userB, name: 'B', email: 'b@example.invalid' },
      { userId: shared, name: 'Shared', email: 'shared@example.invalid' },
    ] });
    await db.membership.createMany({ data: [
      { workspaceId: a, userId: userA, role: 'OWNER' }, { workspaceId: b, userId: userB, role: 'OWNER' },
      { workspaceId: a, userId: shared, role: 'VIEWER' }, { workspaceId: b, userId: shared, role: 'VIEWER' },
    ] });
  });
  afterAll(async () => { await module?.close(); await db?.$disconnect(); });

  it('migration is applied to PostgreSQL, not a mock', async () => {
    const rows = await db.$queryRaw<Array<{ migration_name: string }>>`SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`;
    expect(rows.map(row => row.migration_name)).toEqual(['20260912000100_workspace_base', '20260913000100_enrollment_core', '20260913000200_events_commands', '20260913000300_policy', '20260913000400_policy_weights']);
    const version = await db.$queryRaw<Array<{ version: string }>>`SELECT version()`;
    expect(version[0].version).toContain('PostgreSQL');
  });
  it('uses a non-superuser database role', async () => {
    const roles = await db.$queryRaw<Array<{ rolsuper: boolean }>>`SELECT rolsuper FROM pg_roles WHERE rolname = current_user`;
    expect(roles[0].rolsuper).toBe(false);
  });
  it('requires an explicit valid workspace scope', () => {
    expect(() => repository.forWorkspace('')).toThrow();
    expect(() => repository.forWorkspace(undefined as unknown as string)).toThrow();
  });
  it('lists only members from its own workspace in both directions', async () => {
    const membersA = await scopeA.listMemberships(), membersB = await scopeB.listMemberships();
    expect(membersA).toHaveLength(2); expect(membersB).toHaveLength(2);
    expect(membersA.every(m => m.workspaceId === a)).toBe(true);
    expect(membersB.every(m => m.workspaceId === b)).toBe(true);
    expect(membersA.map(m => m.userId)).not.toContain(userB);
    expect(membersB.map(m => m.userId)).not.toContain(userA);
  });
  it('does not read memberships belonging only to the other workspace', async () => {
    expect(await scopeA.findMembership(userB)).toBeNull();
    expect(await scopeB.findMembership(userA)).toBeNull();
  });
  it('cannot change a role or revoke a member belonging only to B from A', async () => {
    expect(await scopeA.changeMemberRole(userB, 'ADMIN')).toBe(0);
    expect(await scopeA.revokeMembership(userB)).toBe(0);
    expect(await scopeB.findMembership(userB)).toMatchObject({ role: 'OWNER', status: 'ACTIVE' });
  });
  it('cannot mutate a member belonging only to A from B', async () => {
    expect(await scopeB.changeMemberRole(userA, 'VIEWER')).toBe(0);
    expect(await scopeB.revokeMembership(userA)).toBe(0);
    expect(await scopeA.findMembership(userA)).toMatchObject({ role: 'OWNER', status: 'ACTIVE' });
  });
  it('scopes mutations even for a global User shared between workspaces', async () => {
    expect(await scopeA.changeMemberRole(shared, 'OPERATOR')).toBe(1);
    expect(await scopeA.revokeMembership(shared)).toBe(1);
    expect(await scopeA.findMembership(shared)).toMatchObject({ role: 'OPERATOR', status: 'REVOKED' });
    expect(await scopeB.findMembership(shared)).toMatchObject({ role: 'VIEWER', status: 'ACTIVE' });
  });
  it('renames only the scoped workspace and preserves its profile', async () => {
    expect(await scopeA.renameWorkspace('Updated A')).toBe(1);
    expect(await scopeA.getWorkspace()).toMatchObject({ name: 'Updated A', profile: 'FAMILY' });
    expect(await scopeB.getWorkspace()).toMatchObject({ name: 'Family B', profile: 'FAMILY' });
  });
  it('unknown workspace reads nothing and updates nothing', async () => {
    const missing = repository.forWorkspace(randomUUID());
    expect(await missing.getWorkspace()).toBeNull();
    expect(await missing.listMemberships()).toEqual([]);
    expect(await missing.renameWorkspace('Missing')).toBe(0);
  });
  it('enforces global unique email', async () => {
    await expect(db.user.create({ data: { name: 'Duplicate', email: 'a@example.invalid' } })).rejects.toMatchObject({ code: 'P2002' });
  });
  it('enforces composite membership identity and foreign keys', async () => {
    await expect(db.membership.create({ data: { workspaceId: a, userId: userA, role: 'VIEWER' } })).rejects.toMatchObject({ code: 'P2002' });
    await expect(db.membership.create({ data: { workspaceId: a, userId: randomUUID(), role: 'VIEWER' } })).rejects.toMatchObject({ code: 'P2003' });
  });
});
