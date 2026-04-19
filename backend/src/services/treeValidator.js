const prisma = require('../lib/prisma');

/**
 * Check if reassigning a CTV would create a circular reference
 * @param {number} ctvId - The CTV being moved
 * @param {number} newParentId - The proposed new parent
 * @param {Array} allCtv - All CTVs with { id, parentId }
 * @returns {boolean} true if it would create a cycle
 */
function wouldCreateCycle(ctvId, newParentId, allCtv) {
  if (ctvId === newParentId) return true;

  // Build a map for quick lookup
  const parentMap = new Map();
  for (const ctv of allCtv) {
    parentMap.set(ctv.id, ctv.parentId);
  }

  // Walk up from newParentId to root. If we encounter ctvId, it's a cycle.
  let current = newParentId;
  const visited = new Set();

  while (current !== null && current !== undefined) {
    if (current === ctvId) return true;
    if (visited.has(current)) break; // already a broken cycle in data
    visited.add(current);
    current = parentMap.get(current) ?? null;
  }

  return false;
}

/**
 * Get all descendant IDs of a CTV
 * @param {number} ctvId - Root CTV ID
 * @param {Array} allCtv - All CTVs with { id, parentId }
 * @returns {number[]} Array of descendant IDs
 */
function getDescendantIds(ctvId, allCtv) {
  const childrenMap = new Map();
  for (const ctv of allCtv) {
    if (ctv.parentId !== null) {
      if (!childrenMap.has(ctv.parentId)) childrenMap.set(ctv.parentId, []);
      childrenMap.get(ctv.parentId).push(ctv.id);
    }
  }

  const descendants = [];
  const queue = [ctvId];
  while (queue.length > 0) {
    const current = queue.shift();
    const children = childrenMap.get(current) || [];
    for (const childId of children) {
      descendants.push(childId);
      queue.push(childId);
    }
  }

  return descendants;
}

/**
 * Count all descendants of a CTV (portfolio size)
 * @param {number} ctvId - Root CTV ID
 * @returns {number} Number of descendants
 */
async function getDescendantCount(ctvId) {
  const allCtv = await prisma.user.findMany({
    where: { role: 'ctv', isActive: true },
    select: { id: true, parentId: true },
  });
  return getDescendantIds(ctvId, allCtv).length;
}

/**
 * Validate a reassignment operation
 * @param {number} ctvId - CTV to reassign
 * @param {number} newParentId - New parent ID
 * @returns {{ valid: boolean, error?: string }}
 */
async function validateReassignment(ctvId, newParentId) {
  // Self-assignment check
  if (ctvId === newParentId) {
    return { valid: false, error: 'Cannot assign a CTV as their own parent' };
  }

  // Validate both exist
  const [ctv, newParent] = await Promise.all([
    prisma.user.findUnique({ where: { id: ctvId }, select: { id: true, role: true } }),
    newParentId ? prisma.user.findUnique({ where: { id: newParentId }, select: { id: true, role: true, isActive: true } }) : null,
  ]);

  if (!ctv) return { valid: false, error: 'CTV not found' };
  if (ctv.role !== 'ctv') return { valid: false, error: 'User is not a CTV' };

  if (newParentId !== null && newParentId !== undefined) {
    if (!newParent) return { valid: false, error: 'New parent CTV not found' };
    if (newParent.role !== 'ctv') return { valid: false, error: 'New parent must be a CTV' };
    if (!newParent.isActive) return { valid: false, error: 'New parent CTV is inactive' };
  }

  // Circular reference check
  const allCtv = await prisma.user.findMany({
    where: { role: 'ctv' },
    select: { id: true, parentId: true },
  });

  if (newParentId !== null && wouldCreateCycle(ctvId, newParentId, allCtv)) {
    return { valid: false, error: 'Cannot reassign: would create circular reference in management tree' };
  }

  return { valid: true };
}

module.exports = {
  wouldCreateCycle,
  getDescendantIds,
  getDescendantCount,
  validateReassignment,
};
