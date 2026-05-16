/**
 * Lead lifecycle notifications.
 * Spec: docs/specs/02_CRM_LIGHTWEIGHT.md §4
 */

const prisma = require('../lib/prisma');
const { createNotification } = require('./notification');

async function getParentChain(userId, depth = 2) {
  const out = [];
  let current = await prisma.user.findUnique({ where: { id: userId } });
  for (let i = 0; i < depth && current && current.parentId; i++) {
    current = await prisma.user.findUnique({ where: { id: current.parentId } });
    if (current) out.push(current.id);
  }
  return out;
}

async function onLeadCreated(leadId) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId }, include: { assignedCtv: true } });
  if (!lead) return;
  await createNotification(
    lead.assignedCtvId,
    'LEAD_ASSIGNED',
    `Lead moi: ${lead.name}`,
    `${lead.phone} — Hanh dong dau tien truoc 24h`,
    { leadId: lead.id }
  );
}

async function onLeadStageChanged(leadId, oldStage, newStage) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId }, include: { assignedCtv: true } });
  if (!lead) return;

  if (newStage === 'WON') {
    const upline = await getParentChain(lead.assignedCtvId, 2);
    const value = lead.estimatedValue ? Number(lead.estimatedValue).toLocaleString('vi-VN') : '?';
    const recipients = [lead.assignedCtvId, ...upline];
    for (const uid of recipients) {
      await createNotification(
        uid,
        'LEAD_WON',
        `🎉 ${lead.assignedCtv.name} vua chot deal`,
        `Lead "${lead.name}" — ${value} VND`,
        { leadId: lead.id }
      );
    }
  } else if (newStage === 'LOST' && lead.lostReason === 'price') {
    // alert admins so they can review pricing
    const admins = await prisma.user.findMany({ where: { role: 'admin', isActive: true } });
    for (const a of admins) {
      await createNotification(
        a.id,
        'LEAD_LOST_PRICE',
        `Lead thua vi gia: ${lead.name}`,
        `CTV: ${lead.assignedCtv.name}. Xem co nen review pricing.`,
        { leadId: lead.id }
      );
    }
  }
}

async function onLeadDueAction(leadId) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId }, include: { assignedCtv: true } });
  if (!lead || ['WON', 'LOST'].includes(lead.stage)) return;
  await createNotification(
    lead.assignedCtvId,
    'LEAD_DUE_ACTION',
    `Den gio follow-up: ${lead.name}`,
    lead.nextActionNote || 'Lien he khach hang',
    { leadId: lead.id }
  );
}

async function onLeadStale(leadId) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId }, include: { assignedCtv: true } });
  if (!lead || ['WON', 'LOST'].includes(lead.stage)) return;
  const recipients = [lead.assignedCtvId];
  const upline = await getParentChain(lead.assignedCtvId, 1);
  recipients.push(...upline);
  for (const uid of recipients) {
    await createNotification(
      uid,
      'LEAD_STALE',
      `Lead nguoi: ${lead.name}`,
      `Da khong tuong tac 7 ngay (stage: ${lead.stage})`,
      { leadId: lead.id }
    );
  }
}

module.exports = {
  onLeadCreated,
  onLeadStageChanged,
  onLeadDueAction,
  onLeadStale,
};
