import { ConvexError } from 'convex/values';
import type { SessionId } from 'convex-helpers/server/sessions';
import { describe, expect, test } from 'vitest';

import { api } from './_generated/api';
import schema from './schema';
import { convexTest } from '../src/util/test';

const createTestSession = async (ctx: ReturnType<typeof convexTest>): Promise<SessionId> => {
  const sessionId = crypto.randomUUID() as SessionId;
  await ctx.mutation(api.auth.loginAnon, { sessionId });
  return sessionId;
};

const expectConvexError = async (promise: Promise<unknown>, code: string): Promise<void> => {
  try {
    await promise;
    expect.fail('Expected ConvexError');
  } catch (error) {
    expect(error).toBeInstanceOf(ConvexError);
    expect((error as ConvexError<{ code: string }>).data.code).toBe(code);
  }
};

describe('contact', () => {
  test('createContact trims fields and stores timestamps', async () => {
    const ctx = convexTest(schema);
    const sessionId = await createTestSession(ctx);
    const before = Date.now();

    const contactId = await ctx.mutation(api.contact.createContact, {
      sessionId,
      name: '  Alice Smith  ',
      email: '  alice@example.com  ',
      organization: '  Acme Corp  ',
      notes: '  Met at conference  ',
    });

    const after = Date.now();
    const contact = await ctx.run(async (dbCtx) => dbCtx.db.get('contacts', contactId));

    expect(contact?.name).toBe('Alice Smith');
    expect(contact?.email).toBe('alice@example.com');
    expect(contact?.organization).toBe('Acme Corp');
    expect(contact?.notes).toBe('Met at conference');
    expect(contact?.createdAt).toBeGreaterThanOrEqual(before);
    expect(contact?.createdAt).toBeLessThanOrEqual(after);
    expect(contact?.updatedAt).toBe(contact?.createdAt);
  });

  test('createContact rejects blank name', async () => {
    const ctx = convexTest(schema);
    const sessionId = await createTestSession(ctx);

    await expectConvexError(
      ctx.mutation(api.contact.createContact, {
        sessionId,
        name: '   ',
      }),
      'INVALID_ARGUMENT'
    );
  });

  test('updateContact updates name and clears optional fields with null/blank', async () => {
    const ctx = convexTest(schema);
    const sessionId = await createTestSession(ctx);

    const contactId = await ctx.mutation(api.contact.createContact, {
      sessionId,
      name: 'Bob',
      email: 'bob@example.com',
      organization: 'Beta Inc',
      notes: 'Old notes',
    });

    await ctx.mutation(api.contact.updateContact, {
      sessionId,
      contactId,
      name: '  Robert  ',
      email: null,
      organization: '  ',
      notes: null,
    });

    const contact = await ctx.run(async (dbCtx) => dbCtx.db.get('contacts', contactId));
    expect(contact?.name).toBe('Robert');
    expect(contact?.email).toBeUndefined();
    expect(contact?.organization).toBeUndefined();
    expect(contact?.notes).toBeUndefined();
    if (!contact) throw new Error('Expected contact to exist');
    expect(contact.updatedAt).toBeGreaterThanOrEqual(contact.createdAt);
  });

  test('getContacts sorts by name and searches name/email/organization case-insensitively', async () => {
    const ctx = convexTest(schema);
    const sessionId = await createTestSession(ctx);

    await ctx.mutation(api.contact.createContact, {
      sessionId,
      name: 'Zara',
      email: 'zara@example.com',
    });
    await ctx.mutation(api.contact.createContact, {
      sessionId,
      name: 'Alice',
      organization: 'Zenith Labs',
    });
    await ctx.mutation(api.contact.createContact, {
      sessionId,
      name: 'Mike',
      email: 'MIKE@COMPANY.ORG',
    });

    const allContacts = await ctx.query(api.contact.getContacts, { sessionId });
    expect(allContacts.map((c) => c.name)).toEqual(['Alice', 'Mike', 'Zara']);

    const byName = await ctx.query(api.contact.getContacts, { sessionId, search: 'ali' });
    expect(byName.map((c) => c.name)).toEqual(['Alice']);

    const byEmail = await ctx.query(api.contact.getContacts, { sessionId, search: 'company.org' });
    expect(byEmail.map((c) => c.name)).toEqual(['Mike']);

    const byOrg = await ctx.query(api.contact.getContacts, { sessionId, search: 'zenith' });
    expect(byOrg.map((c) => c.name)).toEqual(['Alice']);
  });

  test("users cannot read or mutate another user's contact", async () => {
    const ctx = convexTest(schema);
    const sessionId = await createTestSession(ctx);
    const otherSessionId = await createTestSession(ctx);

    const contactId = await ctx.mutation(api.contact.createContact, {
      sessionId,
      name: 'Private Contact',
      email: 'private@example.com',
    });

    const foreignRead = await ctx.query(api.contact.getContact, {
      sessionId: otherSessionId,
      contactId,
    });
    expect(foreignRead).toBeNull();

    await expectConvexError(
      ctx.mutation(api.contact.updateContact, {
        sessionId: otherSessionId,
        contactId,
        name: 'Hacked',
      }),
      'UNAUTHORIZED'
    );

    await expectConvexError(
      ctx.mutation(api.contact.deleteContact, {
        sessionId: otherSessionId,
        contactId,
      }),
      'UNAUTHORIZED'
    );

    const ownerContact = await ctx.run(async (dbCtx) => dbCtx.db.get('contacts', contactId));
    expect(ownerContact?.name).toBe('Private Contact');
  });

  test('setGoalContacts creates deduplicated links and replacement removes stale links', async () => {
    const ctx = convexTest(schema);
    const sessionId = await createTestSession(ctx);

    const goalId = await ctx.mutation(api.dashboard.createQuarterlyGoal, {
      sessionId,
      title: 'Quarterly Goal',
      year: 2024,
      quarter: 1,
      weekNumber: 1,
    });

    const contactA = await ctx.mutation(api.contact.createContact, {
      sessionId,
      name: 'Contact A',
    });
    const contactB = await ctx.mutation(api.contact.createContact, {
      sessionId,
      name: 'Contact B',
    });
    const contactC = await ctx.mutation(api.contact.createContact, {
      sessionId,
      name: 'Contact C',
    });

    await ctx.mutation(api.contact.setGoalContacts, {
      sessionId,
      goalId,
      contactIds: [contactA, contactB, contactA],
    });

    let links = await ctx.run(async (dbCtx) => {
      const goal = await dbCtx.db.get('goals', goalId);
      if (!goal) throw new Error('Expected goal to exist');
      return dbCtx.db
        .query('goalContacts')
        .withIndex('by_user_and_goal', (q) => q.eq('userId', goal.userId).eq('goalId', goalId))
        .collect();
    });
    expect(links).toHaveLength(2);
    expect(new Set(links.map((l) => l.contactId))).toEqual(new Set([contactA, contactB]));

    await ctx.mutation(api.contact.setGoalContacts, {
      sessionId,
      goalId,
      contactIds: [contactB, contactC],
    });

    links = await ctx.run(async (dbCtx) => {
      const goal = await dbCtx.db.get('goals', goalId);
      if (!goal) throw new Error('Expected goal to exist');
      return dbCtx.db
        .query('goalContacts')
        .withIndex('by_user_and_goal', (q) => q.eq('userId', goal.userId).eq('goalId', goalId))
        .collect();
    });
    expect(links).toHaveLength(2);
    expect(new Set(links.map((l) => l.contactId))).toEqual(new Set([contactB, contactC]));
  });

  test('setGoalContacts rejects foreign contacts without partial writes', async () => {
    const ctx = convexTest(schema);
    const sessionId = await createTestSession(ctx);
    const otherSessionId = await createTestSession(ctx);

    const goalId = await ctx.mutation(api.dashboard.createQuarterlyGoal, {
      sessionId,
      title: 'My Goal',
      year: 2024,
      quarter: 1,
      weekNumber: 1,
    });

    const ownContact = await ctx.mutation(api.contact.createContact, {
      sessionId,
      name: 'Own Contact',
    });
    const foreignContact = await ctx.mutation(api.contact.createContact, {
      sessionId: otherSessionId,
      name: 'Foreign Contact',
    });

    await ctx.mutation(api.contact.setGoalContacts, {
      sessionId,
      goalId,
      contactIds: [ownContact],
    });

    await expectConvexError(
      ctx.mutation(api.contact.setGoalContacts, {
        sessionId,
        goalId,
        contactIds: [ownContact, foreignContact],
      }),
      'UNAUTHORIZED'
    );

    const links = await ctx.run(async (dbCtx) => {
      const goal = await dbCtx.db.get('goals', goalId);
      if (!goal) throw new Error('Expected goal to exist');
      return dbCtx.db
        .query('goalContacts')
        .withIndex('by_user_and_goal', (q) => q.eq('userId', goal.userId).eq('goalId', goalId))
        .collect();
    });
    expect(links).toHaveLength(1);
    expect(links[0]?.contactId).toBe(ownContact);
  });

  test('setGoalLogContacts creates/replaces links with the same guarantees', async () => {
    const ctx = convexTest(schema);
    const sessionId = await createTestSession(ctx);

    const goalId = await ctx.mutation(api.dashboard.createQuarterlyGoal, {
      sessionId,
      title: 'Log Goal',
      year: 2024,
      quarter: 1,
      weekNumber: 1,
    });

    const logId = await ctx.mutation(api.goalLogs.createGoalLog, {
      sessionId,
      goalId,
      logDate: Date.now(),
      content: '<p>Progress update</p>',
    });

    const contactA = await ctx.mutation(api.contact.createContact, {
      sessionId,
      name: 'Log Contact A',
    });
    const contactB = await ctx.mutation(api.contact.createContact, {
      sessionId,
      name: 'Log Contact B',
    });

    await ctx.mutation(api.contact.setGoalLogContacts, {
      sessionId,
      goalLogId: logId,
      contactIds: [contactA, contactA, contactB],
    });

    let links = await ctx.run(async (dbCtx) => {
      const log = await dbCtx.db.get('goalLogs', logId);
      if (!log) throw new Error('Expected goal log to exist');
      return dbCtx.db
        .query('goalLogContacts')
        .withIndex('by_user_and_goal_log', (q) => q.eq('userId', log.userId).eq('goalLogId', logId))
        .collect();
    });
    expect(links).toHaveLength(2);

    await ctx.mutation(api.contact.setGoalLogContacts, {
      sessionId,
      goalLogId: logId,
      contactIds: [contactB],
    });

    links = await ctx.run(async (dbCtx) => {
      const log = await dbCtx.db.get('goalLogs', logId);
      if (!log) throw new Error('Expected goal log to exist');
      return dbCtx.db
        .query('goalLogContacts')
        .withIndex('by_user_and_goal_log', (q) => q.eq('userId', log.userId).eq('goalLogId', logId))
        .collect();
    });
    expect(links).toHaveLength(1);
    expect(links[0]?.contactId).toBe(contactB);

    const otherSessionId = await createTestSession(ctx);
    const foreignContact = await ctx.mutation(api.contact.createContact, {
      sessionId: otherSessionId,
      name: 'Foreign Log Contact',
    });

    await expectConvexError(
      ctx.mutation(api.contact.setGoalLogContacts, {
        sessionId,
        goalLogId: logId,
        contactIds: [contactB, foreignContact],
      }),
      'UNAUTHORIZED'
    );

    links = await ctx.run(async (dbCtx) => {
      const log = await dbCtx.db.get('goalLogs', logId);
      if (!log) throw new Error('Expected goal log to exist');
      return dbCtx.db
        .query('goalLogContacts')
        .withIndex('by_user_and_goal_log', (q) => q.eq('userId', log.userId).eq('goalLogId', logId))
        .collect();
    });
    expect(links).toHaveLength(1);
    expect(links[0]?.contactId).toBe(contactB);
  });

  test('getGoalContacts/getGoalLogContacts return sorted linked contacts', async () => {
    const ctx = convexTest(schema);
    const sessionId = await createTestSession(ctx);

    const goalId = await ctx.mutation(api.dashboard.createQuarterlyGoal, {
      sessionId,
      title: 'Sorted Goal',
      year: 2024,
      quarter: 1,
      weekNumber: 1,
    });

    const logId = await ctx.mutation(api.goalLogs.createGoalLog, {
      sessionId,
      goalId,
      logDate: Date.now(),
      content: '<p>Log entry</p>',
    });

    const contactZ = await ctx.mutation(api.contact.createContact, {
      sessionId,
      name: 'Zoe',
    });
    const contactA = await ctx.mutation(api.contact.createContact, {
      sessionId,
      name: 'Anna',
    });

    await ctx.mutation(api.contact.setGoalContacts, {
      sessionId,
      goalId,
      contactIds: [contactZ, contactA],
    });
    await ctx.mutation(api.contact.setGoalLogContacts, {
      sessionId,
      goalLogId: logId,
      contactIds: [contactZ, contactA],
    });

    const goalContacts = await ctx.query(api.contact.getGoalContacts, { sessionId, goalId });
    const logContacts = await ctx.query(api.contact.getGoalLogContacts, {
      sessionId,
      goalLogId: logId,
    });

    expect(goalContacts.map((c) => c.name)).toEqual(['Anna', 'Zoe']);
    expect(logContacts.map((c) => c.name)).toEqual(['Anna', 'Zoe']);
  });

  test('deleteContact succeeds when unused and is RESOURCE_IN_USE when linked to either entity type', async () => {
    const ctx = convexTest(schema);
    const sessionId = await createTestSession(ctx);

    const unusedContact = await ctx.mutation(api.contact.createContact, {
      sessionId,
      name: 'Unused',
    });
    const goalLinkedContact = await ctx.mutation(api.contact.createContact, {
      sessionId,
      name: 'Goal Linked',
    });
    const logLinkedContact = await ctx.mutation(api.contact.createContact, {
      sessionId,
      name: 'Log Linked',
    });

    const goalId = await ctx.mutation(api.dashboard.createQuarterlyGoal, {
      sessionId,
      title: 'Delete Test Goal',
      year: 2024,
      quarter: 1,
      weekNumber: 1,
    });
    const logId = await ctx.mutation(api.goalLogs.createGoalLog, {
      sessionId,
      goalId,
      logDate: Date.now(),
      content: '<p>Delete test log</p>',
    });

    await ctx.mutation(api.contact.setGoalContacts, {
      sessionId,
      goalId,
      contactIds: [goalLinkedContact],
    });
    await ctx.mutation(api.contact.setGoalLogContacts, {
      sessionId,
      goalLogId: logId,
      contactIds: [logLinkedContact],
    });

    await ctx.mutation(api.contact.deleteContact, { sessionId, contactId: unusedContact });
    const deleted = await ctx.run(async (dbCtx) => dbCtx.db.get('contacts', unusedContact));
    expect(deleted).toBeNull();

    await expectConvexError(
      ctx.mutation(api.contact.deleteContact, { sessionId, contactId: goalLinkedContact }),
      'RESOURCE_IN_USE'
    );
    await expectConvexError(
      ctx.mutation(api.contact.deleteContact, { sessionId, contactId: logLinkedContact }),
      'RESOURCE_IN_USE'
    );
  });

  test('getContactWork returns only the linked owned goals/logs and null for a foreign contact', async () => {
    const ctx = convexTest(schema);
    const sessionId = await createTestSession(ctx);
    const otherSessionId = await createTestSession(ctx);

    const contactId = await ctx.mutation(api.contact.createContact, {
      sessionId,
      name: 'Work Contact',
    });
    const foreignContactId = await ctx.mutation(api.contact.createContact, {
      sessionId: otherSessionId,
      name: 'Foreign Work Contact',
    });

    const goalId = await ctx.mutation(api.dashboard.createQuarterlyGoal, {
      sessionId,
      title: 'Work Goal',
      year: 2024,
      quarter: 1,
      weekNumber: 1,
    });
    await ctx.mutation(api.dashboard.createQuarterlyGoal, {
      sessionId: otherSessionId,
      title: 'Other Goal',
      year: 2024,
      quarter: 1,
      weekNumber: 1,
    });

    const logId = await ctx.mutation(api.goalLogs.createGoalLog, {
      sessionId,
      goalId,
      logDate: Date.now(),
      content: '<p>Work log</p>',
    });

    await ctx.mutation(api.contact.setGoalContacts, {
      sessionId,
      goalId,
      contactIds: [contactId],
    });
    await ctx.mutation(api.contact.setGoalLogContacts, {
      sessionId,
      goalLogId: logId,
      contactIds: [contactId],
    });

    // Link foreign goal to own contact should not appear (foreign goal can't be set by other user)
    // But verify work only returns owned relations
    const work = await ctx.query(api.contact.getContactWork, { sessionId, contactId });
    expect(work?.contact._id).toBe(contactId);
    expect(work?.goals.map((g) => g._id)).toEqual([goalId]);
    expect(work?.logs.map((l) => l._id)).toEqual([logId]);

    const foreignWork = await ctx.query(api.contact.getContactWork, {
      sessionId,
      contactId: foreignContactId,
    });
    expect(foreignWork).toBeNull();
  });
});
