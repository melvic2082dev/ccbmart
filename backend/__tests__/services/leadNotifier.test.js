/**
 * Unit tests for leadNotifier.js
 * Spec: docs/specs/02_CRM_LIGHTWEIGHT.md §4.2
 */

jest.mock('../../src/lib/prisma', () => ({
  lead: { findUnique: jest.fn() },
  user: { findUnique: jest.fn(), findMany: jest.fn() },
}));
jest.mock('../../src/services/notification', () => ({
  createNotification: jest.fn().mockResolvedValue({}),
}));

const prisma = require('../../src/lib/prisma');
const { createNotification } = require('../../src/services/notification');
const { onLeadCreated, onLeadStageChanged, onLeadDueAction, onLeadStale } = require('../../src/services/leadNotifier');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('leadNotifier.onLeadCreated', () => {
  test('sends LEAD_ASSIGNED to the assigned CTV', async () => {
    prisma.lead.findUnique.mockResolvedValue({
      id: 1, name: 'Test Khach', phone: '0900000001',
      assignedCtvId: 100, assignedCtv: { id: 100, name: 'CTV A' },
    });
    await onLeadCreated(1);
    expect(createNotification).toHaveBeenCalledWith(
      100, 'LEAD_ASSIGNED', expect.stringContaining('Test Khach'), expect.any(String), expect.any(Object),
    );
  });

  test('no-op if lead missing', async () => {
    prisma.lead.findUnique.mockResolvedValue(null);
    await onLeadCreated(999);
    expect(createNotification).not.toHaveBeenCalled();
  });
});

describe('leadNotifier.onLeadStageChanged WON', () => {
  test('notifies CTV + 2 levels upline', async () => {
    prisma.lead.findUnique.mockResolvedValue({
      id: 5, name: 'Won Khach', estimatedValue: 1800000,
      assignedCtvId: 200, assignedCtv: { id: 200, name: 'CTV Win' },
    });
    // parent chain: 200 → 201 → 202
    prisma.user.findUnique
      .mockResolvedValueOnce({ id: 200, parentId: 201 })
      .mockResolvedValueOnce({ id: 201, parentId: 202 })
      .mockResolvedValueOnce({ id: 202, parentId: null });
    await onLeadStageChanged(5, 'NEGOTIATING', 'WON');
    expect(createNotification).toHaveBeenCalledTimes(3); // 200, 201, 202
    const recipients = createNotification.mock.calls.map((c) => c[0]).sort();
    expect(recipients).toEqual([200, 201, 202]);
  });
});

describe('leadNotifier.onLeadStageChanged LOST price', () => {
  test('alerts admins when LOST with reason=price', async () => {
    prisma.lead.findUnique.mockResolvedValue({
      id: 6, name: 'Lost K', lostReason: 'price',
      assignedCtvId: 300, assignedCtv: { id: 300, name: 'CTV X' },
    });
    prisma.user.findMany.mockResolvedValue([
      { id: 1 }, { id: 2 },
    ]);
    await onLeadStageChanged(6, 'NEGOTIATING', 'LOST');
    expect(createNotification).toHaveBeenCalledTimes(2);
    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { role: 'admin', isActive: true },
    });
  });
});

describe('leadNotifier.onLeadDueAction', () => {
  test('skips closed leads', async () => {
    prisma.lead.findUnique.mockResolvedValue({ id: 1, stage: 'WON', assignedCtvId: 1, assignedCtv: {} });
    await onLeadDueAction(1);
    expect(createNotification).not.toHaveBeenCalled();
  });

  test('notifies CTV for open leads', async () => {
    prisma.lead.findUnique.mockResolvedValue({
      id: 1, stage: 'CONTACTED', nextActionNote: 'Call back',
      assignedCtvId: 100, assignedCtv: {},
    });
    await onLeadDueAction(1);
    expect(createNotification).toHaveBeenCalledWith(
      100, 'LEAD_DUE_ACTION', expect.any(String), 'Call back', expect.any(Object),
    );
  });
});

describe('leadNotifier.onLeadStale', () => {
  test('notifies CTV + 1 level upline', async () => {
    prisma.lead.findUnique.mockResolvedValue({
      id: 1, stage: 'CONTACTED', name: 'Stale K',
      assignedCtvId: 100, assignedCtv: {},
    });
    prisma.user.findUnique
      .mockResolvedValueOnce({ id: 100, parentId: 101 })
      .mockResolvedValueOnce({ id: 101, parentId: null });
    await onLeadStale(1);
    expect(createNotification).toHaveBeenCalledTimes(2); // CTV + 1 upline
  });
});
